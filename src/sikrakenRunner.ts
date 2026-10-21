import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
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

const DEFAULT_BUDGET = 5;

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