import * as assert from 'node:assert';
import { createIncludeHarness, parseFunction } from '../../services/documentTransformer';
import type { FunctionContext } from '../../services/functionContext';

function createContext(source: string, sourcePath = '/tmp/functions.c'): FunctionContext {
	return {
		sourceFile: {
			path: sourcePath,
			source,
		},
		selectedFunction: {
			source,
		},
	} as FunctionContext;
}

const unsupportedReturnTypes = [
	'void',
	'int*',
	'float*',
	'double*',
	'char*',
	'unsigned char*',
	'long long*',
	'unsigned long long*',
] as const;

const unsupportedParameterTypes = [
    'int*',
    'float*',
    'char*',
    'unsigned char*',
    'long long*',
    'unsigned long long*',
    'struct MyStruct',
    'union MyUnion',
    'enum MyEnum',
    'void*',
] as const;

suite('Unit: Document Transformer', () => {
	test('parses a function return type, name, and parameters', () => {
		const parsedFunction = parseFunction(createContext(
			'double calculate(double value, unsigned long count) { return value + count; }',
		));

		assert.strictEqual(parsedFunction.name, 'calculate');
		assert.strictEqual(parsedFunction.returnType, 'double');
		assert.deepStrictEqual(parsedFunction.parameters, [
			{
				type: 'double',
				name: 'value',
				baseType: 'double',
                signedness: 'signed',
				nondeterministicName: 'double',
			},
			{
				type: 'unsigned long',
				name: 'count',
				baseType: 'unsigned long',
                signedness: 'unsigned',
				nondeterministicName: 'ulong',
			},
		]);
	});

	test('parses a function with no parameters', () => {
		const parsedFunction = parseFunction(createContext(
			'int reset(void) { return 0; }',
		));

		assert.strictEqual(parsedFunction.name, 'reset');
		assert.deepStrictEqual(parsedFunction.parameters, []);
	});

	test('rejects unsupported parameter types', () => {
		assert.throws(
			() => parseFunction(createContext('int read(int *value) { return *value; }')),
			/Unsupported parameter: int \*value/,
		);
	});

	test('creates a harness with nondeterministic declarations and a function call', () => {
		const source = 'int classify(int value, unsigned int flags) { return value + flags; }';
		const parsedFunction = parseFunction(createContext(source));
		const harness = createIncludeHarness(createContext(source), parsedFunction);

		assert.match(harness.source, /#include "\/tmp\/functions\.c"/);
		assert.match(harness.source, /extern int __VERIFIER_nondet_int\(void\);/);
		assert.match(harness.source, /extern unsigned int __VERIFIER_nondet_uint\(void\);/);
		assert.match(harness.source, /int value = __VERIFIER_nondet_int\(\);/);
		assert.match(harness.source, /unsigned int flags = __VERIFIER_nondet_uint\(\);/);
		assert.match(harness.source, /classify\(value, flags\);/);
		assert.strictEqual(harness.originalName, 'classify');
	});

	test('renames an existing main function in the included source', () => {
		const source = [
			'int classify(int value) { return value; }',
			'int main(void) { return 0; }',
		].join('\n');
		const parsedFunction = parseFunction(createContext(source));
		const harness = createIncludeHarness(createContext(source), parsedFunction);

		assert.match(harness.source, /#define main sikraken_original_main/);
		assert.match(harness.source, /#undef main/);
	});

    test('duplicate parameter types generate only one prototype', () => {
        const source = 'int sum(int a, int b) { return a + b; }';
        const parsedFunction = parseFunction(createContext(source));
        const harness = createIncludeHarness(createContext(source), parsedFunction);

        // There should be only one prototype for the int type
        const prototypes = harness.source.match(/extern int __VERIFIER_nondet_int\(void\);/g);
        assert.strictEqual(prototypes?.length, 1);
    });

    test("signed and unsigned variants generate different prototypes", () => {
        const source = 'int process(int a, unsigned int b) { return a + b; }';
        const parsedFunction = parseFunction(createContext(source));
        const harness = createIncludeHarness(createContext(source), parsedFunction);

        // There should be one prototype for int and one for unsigned int
        const signedPrototype = harness.source.match(/extern int __VERIFIER_nondet_int\(void\);/g);
        const unsignedPrototype = harness.source.match(/extern unsigned int __VERIFIER_nondet_uint\(void\);/g);
        assert.strictEqual(signedPrototype?.length, 1);
        assert.strictEqual(unsignedPrototype?.length, 1);
    });

    test("const qualifiers are preserved", () => {
        const source = 'int process(const int a, const unsigned int b, const int c) { return a + b; }';
        const parsedFunction = parseFunction(createContext(source));
        const harness = createIncludeHarness(createContext(source), parsedFunction);

        // The const qualifiers should be preserved in the generated harness
        assert.match(harness.source, /const int __VERIFIER_nondet_int\(void\);/);
        assert.match(harness.source, /const unsigned int __VERIFIER_nondet_uint\(void\);/);
    });

    test('source paths containing spaces or quotes are escaped', () => {
        const sourcePath = '/tmp/my functions.c';
        const source = 'int add(int a, int b) { return a + b; }';
        const parsedFunction = parseFunction(createContext(source, sourcePath));
        const harness = createIncludeHarness(createContext(source, sourcePath), parsedFunction);

        // The include path should be properly escaped
        assert.match(harness.source, /#include "\/tmp\/my functions\.c"/);
    });

    unsupportedReturnTypes.forEach((returnType) => {
        test(`rejects unsupported return type: ${returnType}`, () => {
            assert.throws(
                () => parseFunction(createContext(`${returnType} myFunction() { return 0; }`)),
                (error: unknown) =>
                    error instanceof Error &&
                    error.message === `Unsupported function return type: ${returnType}`,
            );
        });
    });

    unsupportedParameterTypes.forEach((parameterType) => {
        test(`rejects unsupported parameter type: ${parameterType}`, () => {
            assert.throws(
                () => parseFunction(createContext(`int myFunction(${parameterType} param) { return 0; }`)),
                (error: unknown) =>
                    error instanceof Error &&
                    error.message === `Unsupported parameter: ${parameterType} param`,
            );
        });
    });
});