
export const nondeterministicTemplate = (parameter: { type: string; name: string; baseType: string }) =>
	`\t${parameter.type} ${parameter.name} = ` + `__VERIFIER_nondet_${parameter.baseType}();`;




export const unityTemplate = (testCases: { body: string, name: string }[], include?: string) => 
    `#include "unity.h"\n
    ${include ? `#include "${include}"\n` : ''}
    void setUp(void) {}\n
    void tearDown(void) {}\n

    ${testCases.map((testCase) => testCase.body).join('\n')}\n

    int main(void)\n
    {\n
        \tUNITY_BEGIN();
        \t${testCases.map((testCase) => `RUN_TEST(${testCase.name});`).join('\n\t')}
        \treturn UNITY_END();
    }\n

`;