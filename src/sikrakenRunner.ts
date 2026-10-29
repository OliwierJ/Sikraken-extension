import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type SikrakenRun = {
	stdout: string;
	stderr: string;
};

type RunnerOptions = {
	scriptPath: string;
	inputPath: string;
	outputFileName: string;
	outputDir: string;
	budget?: number;
};

export type SikrakenPrerequisiteCheck = {
	ok: boolean;
	missing: string[];
};

const DEFAULT_BUDGET = 5;

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

export async function runSikraken(options: RunnerOptions): Promise<SikrakenRun> {
	const budget = options.budget ?? DEFAULT_BUDGET;
	
	let result;
	try {
		result = await execFileAsync('bash', [
			options.scriptPath,
			'release',
			`budget[${budget}]`,
			`--output-dir=${options.outputDir}`,
			options.inputPath,
		], {
			windowsHide: true,
		});
	} catch (error) {
		const processError = error as {
			code?: number | string;
			signal?: string;
			stderr?: string;
			message?: string;
		};
		const status = processError.code ?? processError.signal ?? 'unknown status';
		const details = processError.stderr?.trim() || processError.message || 'No diagnostic output.';
		throw new Error(`Sikraken failed (${status}): ${details}`);
	}


	return {
		stdout: result.stdout,
		stderr: result.stderr,
	};
}