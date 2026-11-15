import * as fs from 'fs/promises';
import * as path from 'node:path';
import { FunctionParameter } from './functionParsing/documentTransformer';

const inputElementPattern = /<input>\s*([\s\S]*?)\s*<\/input>/g;
const nondeterministicVariablePattern = /\b([A-Za-z_]\w*)\s*=\s*__VERIFIER_nondet_\w+\s*\(\s*\)\s*;/g;

export type TestInput = {
	fileName: string;
	inputs: string[];
};

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
		
		let newInputs = parseTestInputsXML(testInput);
		let parameterIndex = 0;

		if (!parameters) {
			inputs.push({ fileName: testInputFile, inputs: newInputs });
			continue;
		}
		
		for (let i = 0; i < newInputs.length; i++) {
			if (parameters[parameterIndex].kind === 'pointer') {
				// Combine pointer and pointer null indicator variables into a single entry for each pointer parameter
				if (newInputs[i + 1] !== '0') {
					newInputs[i + 1] = 'NULL';
				} else {
					newInputs[i + 1] = newInputs[i];
				}
				newInputs[i] = '__';
				i++; // Skip the next input since it's the null indicator for the pointer
			}
			parameterIndex++;
		
		}
		newInputs = newInputs.filter((input) => input !== '__'); // Remove placeholder entries for NULL pointers

		inputs.push({ fileName: testInputFile, inputs: newInputs });
	}

	return inputs;
}
