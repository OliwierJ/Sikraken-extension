import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
	extractNondeterministicVariables,
	extractTestInputs,
	parseTestInputsXML,
} from '../../services/testInputParser';
import { arrayParam, pointerParam, scalarParam } from './testHelpers';

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
					{ fileName: 'test_input-1.xml', inputs: [{ kind: 'scalar', value: '1' }] },
					{ fileName: 'test_input-2.xml', inputs: [{ kind: 'scalar', value: '2' }, { kind: 'scalar', value: '3' }] },
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

	test('supports pointer parameter', async () => {
		const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sikraken-inputs-'));
		try {
			const parameters = [
				pointerParam('int*', 'ptr', 'int'),
			];
			await fs.writeFile(path.join(outputPath, 'test_input-1.xml'), '<test><input>1</input><input>0</input></test>');

			assert.deepStrictEqual(
				await extractTestInputs(['test_input-1.xml'], outputPath, parameters),
				[
					{ fileName: 'test_input-1.xml', inputs: [{ kind: 'pointer', value: '1' }] },
				],
			);
		} finally {
			await fs.rm(outputPath, { recursive: true, force: true });
		}
	});

	test('supports NULL pointer parameter', async () => {
		const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sikraken-inputs-'));
		try {
			const parameters = [
				pointerParam('int*', 'ptr', 'int'),
			];
			await fs.writeFile(path.join(outputPath, 'test_input-1.xml'), '<test><input>1</input><input>1</input></test>');

			assert.deepStrictEqual(
				await extractTestInputs(['test_input-1.xml'], outputPath, parameters),
				[
					{ fileName: 'test_input-1.xml', inputs: [{ kind: 'pointer', value: 'NULL' }] },
				],
			);
		} finally {
			await fs.rm(outputPath, { recursive: true, force: true });
		}
	});

	test('supports multiple pointer parameters', async () => {
		const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sikraken-inputs-'));
		try {
			const parameters = [
				pointerParam('int*', 'ptr', 'int'),
				pointerParam('float*', 'ptr2', 'float'),
			];
			await fs.writeFile(path.join(outputPath, 'test_input-1.xml'), '<test><input>1</input><input>0</input><input>42</input><input>0</input></test>');

			assert.deepStrictEqual(
				await extractTestInputs(['test_input-1.xml'], outputPath, parameters),
				[
					{ fileName: 'test_input-1.xml', inputs: [{ kind: 'pointer', value: '1' }, { kind: 'pointer', value: '42' }] },
				],
			);
		} finally {
			await fs.rm(outputPath, { recursive: true, force: true });
		}
	});

	test('supports scalar followed by pointer parameters', async () => {
		const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sikraken-inputs-'));
		try {
			const parameters = [
				scalarParam('int', 'a'),
				pointerParam('float*', 'ptr2', 'float'),
			];
			await fs.writeFile(path.join(outputPath, 'test_input-1.xml'), '<test><input>404</input><input>42</input><input>0</input></test>');

			assert.deepStrictEqual(
				await extractTestInputs(['test_input-1.xml'], outputPath, parameters),
				[
					{ fileName: 'test_input-1.xml', inputs: [{ kind: 'scalar', value: '404' }, { kind: 'pointer', value: '42' }] },
				],
			);
		} finally {
			await fs.rm(outputPath, { recursive: true, force: true });
		}
	});

	test('supports pointer followed by scalar parameters', async () => {
		const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sikraken-inputs-'));
		try {
			const parameters = [
				pointerParam('float*', 'ptr2', 'float'),
				scalarParam('int', 'a'),
			];
			await fs.writeFile(path.join(outputPath, 'test_input-1.xml'), '<test><input>404</input><input>0</input><input>42</input></test>');

			assert.deepStrictEqual(
				await extractTestInputs(['test_input-1.xml'], outputPath, parameters),
				[
					{ fileName: 'test_input-1.xml', inputs: [{ kind: 'pointer', value: '404' }, { kind: 'scalar', value: '42' }] },
				],
			);
		} finally {
			await fs.rm(outputPath, { recursive: true, force: true });
		}
	});

	test('supports fixed-length array parameters', async () => {
		const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sikraken-inputs-'));
		try {
			const parameters = [
				arrayParam('int[3]', 'arr', 'int', 3),
			];
			await fs.writeFile(path.join(outputPath, 'test_input-1.xml'), '<test><input>1</input><input>2</input><input>3</input></test>');
			
			assert.deepStrictEqual(
				await extractTestInputs(['test_input-1.xml'], outputPath, parameters),
				[
					{ fileName: 'test_input-1.xml', inputs: [{ kind: 'array', values: ['1', '2', '3'] }] },
				],
			);
		} finally {
			await fs.rm(outputPath, { recursive: true, force: true });
		}
	});
});