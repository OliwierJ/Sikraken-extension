import * as fs from 'fs/promises';
import * as path from 'node:path';

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

export async function extractTestInputs(files: string[], outputPath: string) {
	if (files.length === 0) {
		throw new Error(`Sikraken produced no test inputs in '${outputPath}'.`);
	}

	let inputs: TestInput[] = [];

	for (const testInputFile of files) {
		const testInput = await fs.readFile(path.join(outputPath, testInputFile), 'utf8');

		const newInputs = parseTestInputsXML(testInput);

		inputs.push({ fileName: testInputFile, inputs: newInputs });
	}

	return inputs;
}
