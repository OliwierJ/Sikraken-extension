import { FunctionParameter } from "./documentTransformer";


export type TestCase = {
    name: string;
    body: string;
};

export const nondeterministicTemplate = (parameter: FunctionParameter) =>
	`\t${parameter.type} ${parameter.name} = ` +
	`__VERIFIER_nondet_${parameter.nondeterministicName}();`;


export const unityTemplate = (testCases: TestCase[], include: string, generateOutputs: boolean) => 
`#include "unity.h"
${include ? `#include "${include}"` : ''}\n
void setUp(void) {}
void tearDown(void) {}

${generateOutputs 
	? '// Expected values were captured by executing the current implementation.\n// These are characterization tests, not independent correctness proofs.' 
	: '// Replace the placeholder values with the expected outputs'}

${testCases.map((testCase) => testCase.body).join('\n')}\n

int main(void)
{
    UNITY_BEGIN();
    ${testCases.map((testCase) => `RUN_TEST(${testCase.name});`).join('\n\t')}
    return UNITY_END();
}
`;

export const unityTestCaseTemplate = (testCase: { name: string, body: string }) =>
`void ${testCase.name}(void)
{
    ${testCase.body}
}
`;

export function unityAssertionTemplate(expected: string, actual: string, returnType: string): string {
	const normalizedType = returnType.replace(/\s+/g, ' ').trim();
	const macro = /\bdouble\b/.test(normalizedType)
		? 'TEST_ASSERT_EQUAL_DOUBLE'
		: /\bfloat\b/.test(normalizedType)
			? 'TEST_ASSERT_EQUAL_FLOAT'
			: 'TEST_ASSERT_EQUAL';

	return `${macro}(${expected}, ${actual});`;
}