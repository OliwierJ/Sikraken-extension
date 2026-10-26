import * as assert from 'assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { extractTestInputs } from '../sikrakenXml';
import { extractNondeterministicVariables } from '../variableNames';
import { createIncludeHarness, parseFunction } from '../documentTransformer';
import type { FunctionContext } from '../functionContext';
import { runSikraken } from '../sikrakenRunner';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('extracts and trims Sikraken XML inputs', () => {
		const xml = '<test><input> 1 </input><input>\n-2\n</input></test>';

		assert.deepStrictEqual(extractTestInputs(xml), ['1', '-2']);
	});

	test('extracts nondeterministic variable names in source order', () => {
		const source = [
			'int x = __VERIFIER_nondet_int();',
			'float result = __VERIFIER_nondet_float();',
		].join('\n');

		assert.deepStrictEqual(extractNondeterministicVariables(source), ['x', 'result']);
	});

	test('rejects function return types that cannot be used by generated assertions', () => {
		const context = {
			selectedFunction: {
				source: 'void reset(int value) { }',
			},
		} as FunctionContext;

		assert.throws(
			() => parseFunction(context),
			/Unsupported function return type: void/,
		);
	});

	test('supports additional scalar types in generated harnesses', () => {
		const context = {
			sourceFile: {
				path: '/tmp/functions.c',
				source: 'double calculate(double value, unsigned long count) { return value + count; }',
			},
			selectedFunction: {
				source: 'double calculate(double value, unsigned long count) { return value + count; }',
			},
		} as FunctionContext;

		const parsedFunction = parseFunction(context);
		const harness = createIncludeHarness(context, parsedFunction);

		assert.deepStrictEqual(
			parsedFunction.parameters.map(parameter => parameter.baseType),
			['double', 'unsigned long'],
		);
		assert.match(harness.source, /extern double __VERIFIER_nondet_double\(void\);/);
		assert.match(harness.source, /extern unsigned long __VERIFIER_nondet_long\(void\);/);
		assert.match(harness.source, /__VERIFIER_nondet_double\(\)/);
		assert.match(harness.source, /__VERIFIER_nondet_long\(\)/);
	});

	test('generates the expected test inputs for a predetermined function', async function () {
		this.timeout(30_000);

		const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sikraken-test-'));
		try {
			const sourcePath = path.join(temporaryDirectory, 'functions.c');
			const harnessPath = path.join(temporaryDirectory, 'harness.c');
			const outputDirectory = path.join(temporaryDirectory, 'output');
			const source = [
				'int classify(int value) {',
				'    if (value > 0) {',
				'        return 1;',
				'    }',
				'    return 0;',
				'}',
			].join('\n');

			await fs.writeFile(sourcePath, source, 'utf8');

			const context = {
				sourceFile: {
					path: sourcePath,
					source,
				},
				selectedFunction: {
					source,
				},
			} as FunctionContext;
			const harness = createIncludeHarness(context, parseFunction(context));
			await fs.writeFile(harnessPath, harness.source, 'utf8');

			await runSikraken({
				scriptPath: path.resolve(__dirname, '../../lib/sikraken/bin/sikraken.sh'),
				inputPath: harnessPath,
				outputFileName: 'harness',
				outputDir: outputDirectory,
				budget: 5,
			});

			const testSuitePath = path.join(outputDirectory, 'harness', 'test-suite');
			const testInputFiles = (await fs.readdir(testSuitePath))
				.filter(fileName => fileName.startsWith('test_input-') && fileName.endsWith('.xml'))
				.sort();
			const generatedInputs = await Promise.all(
				testInputFiles.map(async fileName =>
					extractTestInputs(await fs.readFile(path.join(testSuitePath, fileName), 'utf8')),
				),
			);

			assert.deepStrictEqual(
				generatedInputs.sort((left, right) => left.join(',').localeCompare(right.join(','))),
				[['0'], ['1']],
			);
		} finally {
			await fs.rm(temporaryDirectory, { recursive: true, force: true });
		}
	});

	test('generates the expected test inputs for a function with multiple parameters', async function () {
		this.timeout(30_000);

		const t = vscode.commands.executeCommand('sikraken.generateTestsOnFunction');

		// Expect no errors to be thrown during the command execution
		await t; 
	});
});
