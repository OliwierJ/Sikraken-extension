import { FunctionParameter } from "./documentTransformer";


export type TestCase = {
    name: string;
    body: string;
};

export const nondeterministicTemplate = (parameter: FunctionParameter) =>
	`\t${parameter.type} ${parameter.name} = ` +
	`__VERIFIER_nondet_${parameter.nondeterministicName}();`;


export const unityTemplate = (testCases: TestCase[], include: string) => 
`#include "unity.h"
${include ? `#include "${include}"` : ''}\n
void setUp(void) {}
void tearDown(void) {}

// Test cases. Replace placeholder EXPECTED_RES with the expected result
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