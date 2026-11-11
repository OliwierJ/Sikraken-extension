import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
	extractNondeterministicVariables,
	extractTestInputs,
	parseTestInputsXML,
} from '../../services/testInputParser';

suite('Unit: Test Input Parsing', () => {
	
    test('extracts and trims XML input values', () => {
		const xml = '<test><input> 1 </input><input>\n-2\n</input></test>';

		assert.deepStrictEqual(parseTestInputsXML(xml), ['1', '-2']);
	});

	test('extracts nondeterministic variables in source order', () => {
		const source = [
			'int x = __VERIFIER_nondet_int();',
			'float result = __VERIFIER_nondet_float();',
		].join('\n');

		assert.deepStrictEqual(extractNondeterministicVariables(source), ['x', 'result']);
	});

	test('returns no values when XML has no input elements', () => {
		assert.deepStrictEqual(parseTestInputsXML('<test></test>'), []);
	});

	test('loads and parses multiple test input files', async () => {
		const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sikraken-inputs-'));
		try {
			await fs.writeFile(path.join(outputPath, 'test_input-1.xml'), '<test><input>1</input></test>');
			await fs.writeFile(path.join(outputPath, 'test_input-2.xml'), '<test><input>2</input><input>3</input></test>');

			assert.deepStrictEqual(
				await extractTestInputs(['test_input-1.xml', 'test_input-2.xml'], outputPath),
				[
					{ fileName: 'test_input-1.xml', inputs: ['1'] },
					{ fileName: 'test_input-2.xml', inputs: ['2', '3'] },
				],
			);
		} finally {
			await fs.rm(outputPath, { recursive: true, force: true });
		}
	});

	test('rejects an empty test input file list', async () => {
		await assert.rejects(
			() => extractTestInputs([], '/tmp/sikraken-output'),
			/Sikraken produced no test inputs/,
		);
	});
});