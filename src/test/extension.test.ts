import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { extractTestInputs } from '../sikrakenXml';
import { extractNondeterministicVariables } from '../variableNames';
import { parseFunction } from '../documentTransformer';
import type { FunctionContext } from '../functionContext';

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
});
