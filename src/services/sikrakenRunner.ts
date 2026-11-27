import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';

export type SikrakenRun = {
	stdout: string;
	stderr: string;
};

type RunnerOptions = {
	scriptPath: string;
	inputPath: string;
	outputDir: string;
	functionName?: string;
	stubFunctions?: string[];
	ignoreInitialisers?: boolean;
	budget?: number;
	debugMode?: boolean;
	signal?: AbortSignal;
	debugArtifactsDir?: string;
};

const DEFAULT_BUDGET = 10;
const FUNCTION_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export async function runSikraken(options: RunnerOptions): Promise<SikrakenRun> {
	const budget = options.budget ?? DEFAULT_BUDGET;
	if (!Number.isInteger(budget) || budget < 1) {
		throw new Error(`Sikraken budget must be a positive integer (received ${budget}).`);
	}
	if (options.functionName && !FUNCTION_NAME_PATTERN.test(options.functionName)) {
		throw new Error(`Sikraken function name must be a C identifier (received '${options.functionName}').`);
	}
	const invalidStub = options.stubFunctions?.find((name) => !FUNCTION_NAME_PATTERN.test(name));
	if (invalidStub !== undefined) {
		throw new Error(`Sikraken stub name must be a C identifier (received '${invalidStub}').`);
	}
	if ((options.stubFunctions?.length || options.ignoreInitialisers) && !options.functionName) {
		throw new Error('Sikraken stubs and initializer options require real-code function mode.');
	}
	if (/[\s'"\\]/.test(options.outputDir)) {
		throw new Error('Sikraken output directory cannot contain whitespace, quotes, or backslashes.');
	}

	await ensureInputFile(options.inputPath);
	await ensureWritableDirectory(options.outputDir);

	const mode = options.debugMode ? 'debug' : 'release';
	const startedAt = new Date().toISOString();
	const argumentsList = [
		options.scriptPath,
		mode,
		`budget[${budget}]`,
		`--output-dir=${options.outputDir}`,
		...(options.functionName
			? [
				'--coverage', 'condition',
				'--function', options.functionName,
				...(options.ignoreInitialisers ? ['--ignore-initialisers'] : []),
				...(options.stubFunctions ?? []).flatMap((name) => ['--stub', name]),
			]
			: []),
		options.inputPath,
	];

	try {
		const result = await executeScript(argumentsList, options.signal);
		if (options.debugMode) {
			await writeDebugArtifacts(options.debugArtifactsDir, 'sikraken', {
				command: ['bash', ...argumentsList],
				startedAt,
				finishedAt: new Date().toISOString(),
				status: 'success',
				...result,
			});
		}
		return result;
	} catch (error) {
		if (isAbortError(error)) {
			throw new Error('Sikraken execution cancelled.');
		}
		const details = processErrorDetails(error);
		if (options.debugMode) {
			await writeDebugArtifacts(options.debugArtifactsDir, 'sikraken', {
				command: ['bash', ...argumentsList],
				startedAt,
				finishedAt: new Date().toISOString(),
				status: `Failed: ${details.status}`,
				stdout: details.stdout,
				stderr: details.stderr,
			});
		}
		throw new Error(`Sikraken failed (${details.status}): ${details.message}`);
	}
}

export async function runSikrakenUnityTests(options: {
	scriptPath: string;
	inputPath: string;
	outputDir: string;
	functionName: string;
	signal?: AbortSignal;
	debugArtifactsDir?: string;
}): Promise<SikrakenRun> {
	if (!FUNCTION_NAME_PATTERN.test(options.functionName)) {
		throw new Error(`Sikraken function name must be a C identifier (received '${options.functionName}').`);
	}

	await ensureInputFile(options.inputPath);
	const startedAt = new Date().toISOString();
	const argumentsList = [
		options.scriptPath,
		`--output-dir=${options.outputDir}`,
		options.inputPath,
		'-64',
		options.functionName,
	];

	try {
		const result = await executeScript(argumentsList, options.signal);
		await writeDebugArtifacts(options.debugArtifactsDir, 'unity', {
			command: ['bash', ...argumentsList],
			startedAt,
			finishedAt: new Date().toISOString(),
			status: 'success',
			...result,
		});
		return result;
	} catch (error) {
		if (isAbortError(error)) {
			throw new Error('Unity test validation cancelled.');
		}
		const details = processErrorDetails(error);
		await writeDebugArtifacts(options.debugArtifactsDir, 'unity', {
			command: ['bash', ...argumentsList],
			startedAt,
			finishedAt: new Date().toISOString(),
			status: `Failed: ${details.status}`,
			stdout: details.stdout,
			stderr: details.stderr,
		});
		throw new Error(`Unity test validation failed (${details.status}): ${details.message}`);
	}
}

async function ensureInputFile(inputPath: string): Promise<void> {
	try {
		const inputStat = await fs.stat(inputPath);
		if (!inputStat.isFile()) {
			throw new Error(`Sikraken input is not a file: ${inputPath}`);
		}
	} catch (error) {
		if (error instanceof Error && error.message.startsWith('Sikraken input is not a file:')) {
			throw error;
		}
		throw new Error(`Could not access Sikraken input '${inputPath}'.`);
	}
}

async function ensureWritableDirectory(outputDir: string): Promise<void> {
	try {
		await fs.mkdir(outputDir, { recursive: true });
		await fs.access(outputDir, fs.constants.W_OK);
	} catch {
		throw new Error(`Sikraken output directory is not writable: ${outputDir}`);
	}
}

function executeScript(argumentsList: string[], signal?: AbortSignal): Promise<SikrakenRun> {
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

function processErrorDetails(error: unknown): {
	status: number | string;
	message: string;
	stdout: string;
	stderr: string;
} {
	const processError = error as {
		code?: number | string;
		signal?: string;
		stdout?: string;
		stderr?: string;
		message?: string;
	};
	const status = processError.code ?? processError.signal ?? 'unknown status';
	const stdout = typeof processError.stdout === 'string' ? processError.stdout : '';
	const stderr = typeof processError.stderr === 'string' ? processError.stderr : '';
	const message = stderr.trim() || stdout.trim() || processError.message || 'No diagnostic output.';
	return { status, message, stdout, stderr };
}

async function writeDebugArtifacts(
	artifactDirectory: string | undefined,
	prefix: 'sikraken' | 'unity',
	metadata: {
		command: string[];
		startedAt: string;
		finishedAt: string;
		status: string;
		stdout: string;
		stderr: string;
	},
): Promise<void> {
	if (!artifactDirectory) {
		return;
	}
	await fs.mkdir(artifactDirectory, { recursive: true });
	await Promise.all([
		fs.writeFile(`${artifactDirectory}/${prefix}-stdout.log`, metadata.stdout, 'utf8'),
		fs.writeFile(`${artifactDirectory}/${prefix}-stderr.log`, metadata.stderr, 'utf8'),
		fs.writeFile(`${artifactDirectory}/${prefix}-metadata.json`, JSON.stringify({
			...metadata,
			stdout: undefined,
			stderr: undefined,
		}, null, 2), 'utf8'),
	]);
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && (
		error.name === 'AbortError' ||
		(error as NodeJS.ErrnoException).code === 'ABORT_ERR'
	);
}
