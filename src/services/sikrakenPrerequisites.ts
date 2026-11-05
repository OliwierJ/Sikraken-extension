import * as vscode from 'vscode';
import { showInstallInstructions } from '../commands/showInstallInstructionsCommand';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type SikrakenPrerequisiteCheck = {
	ok: boolean;
	missing: string[];
};

export async function checkSikrakenPrerequisites(scriptPath: string): Promise<SikrakenPrerequisiteCheck> {
	const missing: string[] = [];
	if (process.platform !== 'linux') {
		missing.push(`Linux (detected ${process.platform})`);
	}
	if (process.arch !== 'x64') {
		missing.push(`x86_64 Linux (detected ${process.arch})`);
	}

	const requiredFiles = [
		['bundled Sikraken script', scriptPath, fs.constants.X_OK],
		[
			'bundled Sikraken parser',
			path.resolve(path.dirname(scriptPath), 'sikraken_parser.exe'),
			fs.constants.X_OK,
		],
		[
			'bundled Eclipse runtime',
			path.resolve(path.dirname(scriptPath), '../eclipse/bin/x86_64_linux/eclipse'),
			fs.constants.X_OK,
		],
	] as const;

	for (const [description, filePath, mode] of requiredFiles) {
		try {
			await fs.access(filePath, mode);
		} catch {
			missing.push(`${description} (${filePath})`);
		}
	}

	for (const command of ['bash', 'timeout', 'prlimit'] as const) {
		try {
			await execFileAsync(command, ['--version'], { windowsHide: true });
		} catch {
			missing.push(`the '${command}' command`);
		}
	}

	try {
		await execFileAsync('gcc', ['-m32', '-x', 'c', '-fsyntax-only', '/dev/null'], {
			windowsHide: true,
		});
	} catch {
		missing.push("GCC with 32-bit support ('gcc -m32')");
	}

	return {
		ok: missing.length === 0,
		missing,
	};
}

export async function ensureSikrakenPrerequisites(context: vscode.ExtensionContext, scriptPath: string): Promise<boolean> {
	const result = await checkSikrakenPrerequisites(scriptPath);
	if (result.ok) {
		return true;
	}

	const choice = await vscode.window.showErrorMessage(
		`Sikraken prerequisites are missing: ${result.missing.join('; ')}. ` + 'Install the documented Linux dependencies and try again.',
		'Show installation instructions',
	);
	if (choice === 'Show installation instructions') {
		await showInstallInstructions(context);
	}
	return false;
}