import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type SikrakenRun = {
	outputPath: string;
	stdout: string;
	stderr: string;
};

type RunnerOptions = {
	scriptPath: string;
	inputPath: string;
	outputKey: string;
	outputDir: string;
	budget?: number;
};

const DEFAULT_BUDGET = 5;

export async function runSikraken(options: RunnerOptions): Promise<SikrakenRun> {
	const budget = options.budget ?? DEFAULT_BUDGET;

	const result = await execFileAsync('bash', [
		options.scriptPath,
		'release',
		`budget[${budget}]`,
		`--output-dir=${options.outputDir}`,
		options.inputPath,
	], {
		windowsHide: true,
	});

	return {
		outputPath: path.join(options.outputKey, 'test-suite'),
		stdout: result.stdout,
		stderr: result.stderr,
	};
}