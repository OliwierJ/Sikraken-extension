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
	signal?: AbortSignal;
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
	if (!Number.isInteger(budget) || budget < 1) {
		throw new Error(`Sikraken budget must be a positive integer (received ${budget}).`);
	}

	try {
		const inputStat = await fs.stat(options.inputPath);
		if (!inputStat.isFile()) {
			throw new Error(`Sikraken input is not a file: ${options.inputPath}`);
		}
	} catch (error) {
		if (error instanceof Error && error.message.startsWith('Sikraken input is not a file:')) {
			throw error;
		}
		throw new Error(`Could not access Sikraken input '${options.inputPath}'.`);
	}

	try {
		await fs.mkdir(options.outputDir, { recursive: true });
		await fs.access(options.outputDir, fs.constants.W_OK);
	} catch {
		throw new Error(`Sikraken output directory is not writable: ${options.outputDir}`);
	}

	try {
		const result = await executeSikraken([
			options.scriptPath,
			'release',
			`budget[${budget}]`,
			`--output-dir=${options.outputDir}`,
			options.inputPath,
		], options.signal);
		return {
			stdout: result.stdout,
			stderr: result.stderr,
		};
	} catch (error) {
		if (isAbortError(error)) {
			throw new Error('Sikraken execution cancelled.');
		}
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
}

function executeSikraken(argumentsList: string[], signal?: AbortSignal): Promise<SikrakenRun> {
	return new Promise((resolve, reject) => {
		execFile('bash', argumentsList, {
			windowsHide: true,
			signal,
			maxBuffer: 10 * 1024 * 1024,
		}, (error, stdout, stderr) => {
			if (error) {
				Object.assign(error, { stdout, stderr });
				reject(error);
				return;
			}
			resolve({ stdout, stderr });
		});
	});
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && (
		error.name === 'AbortError' ||
		(error as NodeJS.ErrnoException).code === 'ABORT_ERR'
	);
}