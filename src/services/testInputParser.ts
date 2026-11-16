import * as fs from 'fs/promises';
import * as path from 'node:path';
import { FunctionParameter } from './functionParsing/documentTransformer';

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
		
		let parameterIndex = 0;
		let newInputs: PreparedParameterInput[] = [];

		for (let i = 0; i < sikrakenInputs.length; i++) {
			const parameter = parameters[parameterIndex];
			if (!parameter) {
				throw new Error(
					`Sikraken returned more inputs than expected for '${testInputFile}'.`,
				);
			}
			
			switch (parameter.kind) {
				case 'scalar':
					newInputs.push({
						kind: 'scalar',
						value: parameter.baseType === 'char'
							? formatCharacterInput(sikrakenInputs[i])
							: sikrakenInputs[i],
					});
					break;
				case 'pointer':
					if (sikrakenInputs[i + 1] !== '0') {
						newInputs.push({ kind: 'pointer', value: 'NULL' });
					} else {
						newInputs.push({ kind: 'pointer', value: sikrakenInputs[i] });
					}
					i++; // Skip the next input since it's the null indicator for the pointer
					break;
				case 'array':
					// For array parameters, we need to skip the next N inputs where N is the length of the array
					const arrayParameter = parameter;
					const arrayLength = arrayParameter.inputLength;
					const values = sikrakenInputs.slice(i, i + arrayLength);
					if (values.length !== arrayLength) {
						throw new Error(
							`Sikraken returned ${values.length} values for array parameter ` +
							`${arrayParameter.name}; expected ${arrayLength}.`,
						);
					}
					newInputs.push({
						kind: 'array',
						values: arrayParameter.isString
							? values.map(value => formatCharacterInput(value))
							: values,
					});
					i += arrayLength - 1; // Skip the next N-1 inputs since we've already captured them
					break;
			}
			parameterIndex++;
		
		}

		inputs.push({ fileName: testInputFile, inputs: newInputs });
	}

	return inputs;
}

function formatCharacterInput(value: string): string {
	const numericValue = Number(value);
	if (!Number.isInteger(numericValue) || numericValue < 32 || numericValue > 126) {
		return value;
	}

	const character = String.fromCharCode(numericValue);
	if (character === "'" || character === '\\') {
		return `'\\${character}'`;
	}

	return `'${character}'`;
}
