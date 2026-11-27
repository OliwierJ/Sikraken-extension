import * as assert from 'node:assert';
import { extractNondeterministicVariables, parseTestInputsXML } from '../../services/testInputParser';

suite('Unit: legacy Test-Comp input parsing', () => {
	test('extracts nondeterministic variable names in source order', () => {
		assert.deepStrictEqual(
			extractNondeterministicVariables([
				'int count = __VERIFIER_nondet_int();',
				'unsigned char flag = __VERIFIER_nondet_uchar();',
			].join('\n')),
			['count', 'flag'],
		);
	});

	test('extracts Test-Comp input values from XML', () => {
		assert.deepStrictEqual(
			parseTestInputsXML('<test><input> 1 </input><input>NULL</input></test>'),
			['1', 'NULL'],
		);
	});
});
