import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { FunctionParameter } from './documentTransformer';

const execFileAsync = promisify(execFile);
const RESULT_PREFIX = 'SIKRAKEN_RESULT:';

export type EvaluateInputOptions = {
	sourcePath: string;
	functionName: string;
	returnType: string;
	parameters: FunctionParameter[];
	inputs: string[];
	workingDirectory: string;
};

export async function evaluateFunctionInput(options: EvaluateInputOptions): Promise<string> {
	if (options.inputs.length !== options.parameters.length) {
		throw new Error(
			`Sikraken returned ${options.inputs.length} inputs for ${options.parameters.length} parameters.`,
		);
	}

	const argumentsList = options.inputs.map((input, index) => {
		validateScalarLiteral(input, options.parameters[index].name);
		return input;
	}).join(', ');
	const driverSource = createEvaluatorSource(
		options.sourcePath,
		options.functionName,
		options.returnType,
		argumentsList,
	);
	const temporaryDirectory = await fs.mkdtemp(path.join(options.workingDirectory, 'sikraken-eval-'));
	const driverPath = path.join(temporaryDirectory, 'driver.c');
	const executablePath = path.join(temporaryDirectory, 'driver');
	const sourceDirectory = path.dirname(options.sourcePath);

	try {
		await fs.writeFile(driverPath, driverSource, 'utf8');
		await execFileAsync('gcc', [
			'-std=gnu11',
			'-O0',
			`-I${sourceDirectory}`,
			driverPath,
			'-o',
			executablePath,
		], { cwd: options.workingDirectory });

		const result = await execFileAsync(executablePath, [], {
			cwd: options.workingDirectory,
			maxBuffer: 1024 * 1024,
		});
		const marker = result.stdout
			.split(/\r?\n/)
			.find(line => line.startsWith(RESULT_PREFIX));

		if (!marker) {
			throw new Error('The evaluator did not produce a return value.');
		}

		const value = marker.slice(RESULT_PREFIX.length).trim();
		if (!value) {
			throw new Error('The evaluator produced an empty return value.');
		}
		return value;
	} catch (error) {
		const details = error instanceof Error ? error.message : String(error);
		throw new Error(`Could not evaluate Sikraken input: ${details}`);
	} finally {
		await fs.rm(temporaryDirectory, { recursive: true, force: true });
	}
}

function createEvaluatorSource(
	sourcePath: string,
	functionName: string,
	returnType: string,
	argumentsList: string,
): string {
	const includePath = toCStringLiteral(sourcePath);
	const call = `${functionName}(${argumentsList})`;
	const normalizedReturnType = returnType.replace(/\s+/g, ' ').trim();
	const output = isFloatingPointType(normalizedReturnType)
		? `printf("${RESULT_PREFIX}%.*g\\n", 17, (double)(${call}));`
		: `printf("${RESULT_PREFIX}%lld\\n", (long long)(${call}));`;

	return [
		'#include <stdio.h>',
		'#define main sikraken_original_main',
		`#include ${includePath}`,
		'#undef main',
		'',
		'/* The original source may contain a main harness using verifier inputs. */',
		'char __VERIFIER_nondet_char(void) { return 0; }',
		'short __VERIFIER_nondet_short(void) { return 0; }',
		'int __VERIFIER_nondet_int(void) { return 0; }',
		'long __VERIFIER_nondet_long(void) { return 0; }',
		'long long __VERIFIER_nondet_long_long(void) { return 0; }',
		'float __VERIFIER_nondet_float(void) { return 0.0f; }',
		'double __VERIFIER_nondet_double(void) { return 0.0; }',
		'',
		'int main(void)',
		'{',
		`    ${output}`,
		'    return 0;',
		'}',
		'',
	].join('\n');
}

function isFloatingPointType(type: string): boolean {
	return /\b(float|double)\b/.test(type);
}

function validateScalarLiteral(value: string, parameterName: string): void {
	const literalPattern =
		/^[+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|0[xX][0-9a-fA-F]+)(?:[uUlLfF]*)$/;
	if (!literalPattern.test(value.trim())) {
		throw new Error(`Unsupported generated value for parameter ${parameterName}: ${value}`);
	}
}

function toCStringLiteral(value: string): string {
	return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}
