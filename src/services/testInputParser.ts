import * as fs from 'fs/promises';
import * as path from 'node:path';
import { FunctionParameter } from './functionParsing/documentTransformer';
import { handlerFor } from './kinds';

const inputElementPattern = /<input>\s*([\s\S]*?)\s*<\/input>/g;
const nondeterministicVariablePattern = /\b([A-Za-z_]\w*)\s*=\s*__VERIFIER_nondet_\w+\s*\(\s*\)\s*;/g;

export type TestInput = {
	fileName: string;
	inputs: PreparedParameterInput[];
};

export type PreparedParameterInput =
	| { kind: 'scalar'; value: string }
	| { kind: 'pointer'; value: string | 'NULL' }
	| { kind: 'array'; values: string[] }
	| { kind: 'string'; value: string };

export function extractNondeterministicVariables(source: string): string[] {
	return Array.from(source.matchAll(nondeterministicVariablePattern), (match) => match[1]);
}

export function parseTestInputsXML(xml: string): string[] {
	return Array.from(xml.matchAll(inputElementPattern), (match) => match[1].trim());
}

export async function extractTestInputs(files: string[], outputPath: string, parameters?: FunctionParameter[]): Promise<TestInput[]> {
	if (files.length === 0) {
		throw new Error(`Sikraken produced no test inputs in '${outputPath}'.`);
	}

	let inputs: TestInput[] = [];

	for (const testInputFile of files) {
		const testInput = await fs.readFile(path.join(outputPath, testInputFile), 'utf8');

		const sikrakenInputs = parseTestInputsXML(testInput);

		// Running sikraken directly, so no parameters are provided. Just return the inputs as-is.
		if (!parameters) {
			inputs.push({ fileName: testInputFile, inputs: sikrakenInputs.map((value) => ({ kind: 'scalar', value })) });
			continue;
		}

		if (sikrakenInputs.length === 0) {
			// Let generateTestCases report this with its friendlier "no branching point" message
			inputs.push({ fileName: testInputFile, inputs: [] });
			continue;
		}

		let cursor = 0;
		const decoded = parameters.map((parameter) => {
			const handler = handlerFor(parameter);
			const count = handler.slots(parameter).length;
			const chunk = sikrakenInputs.slice(cursor, cursor + count);
			if (chunk.length !== count) {
				throw new Error(`Sikraken returned too few inputs for parameter '${parameter.name}' in '${testInputFile}'.`);
			}
			cursor += count;
			return handler.decode(parameter, chunk);
		});

		if (cursor !== sikrakenInputs.length) {
			throw new Error(`Sikraken returned more inputs than expected for '${testInputFile}'.`);
		}
		inputs.push({ fileName: testInputFile, inputs: decoded });
	}

	return inputs;
}
