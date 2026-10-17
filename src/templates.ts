
export const nondeterministicTemplate = (parameter: { type: string; name: string; baseType: string }) =>
	`\t${parameter.type} ${parameter.name} = ` + `__VERIFIER_nondet_${parameter.baseType}();`;


export const unityTemplate = (testCases: { body: string, name: string }[], include: string) => 
`#include "unity.h"
${include ? `#include "${include}"` : ''}\n
void setUp(void) {}
void tearDown(void) {}

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