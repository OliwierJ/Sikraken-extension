import { FunctionParameter } from "./functionParsing/types";

export type PreparedFunctionCall = {
    setupCode: string[];
    argumentsList: string[];
}

export function prepareFunctionCall(parameters: FunctionParameter[], inputs: string[]): PreparedFunctionCall {
    if (inputs.length !== parameters.length) {
        throw new Error(`Number of inputs (${inputs.length}) does not match number of parameters (${parameters.length}).`);
    }

    const setupCodeLines: string[] = [];
    const argumentsList: string[] = [];

    parameters.forEach((parameter, index) => {
        const input = inputs[index];

        if (parameter.kind === 'scalar') {
            validateScalarLiteral(input, parameter.name);
            argumentsList.push(input);
            return;
        }

        if (parameter.kind === 'pointer') {
            if (input === 'NULL') {
                setupCodeLines.push(`${parameter.type.trim()} ${parameter.name} = NULL;`);
            } else {
                validateScalarLiteral(input, parameter.name);
                setupCodeLines.push(
                    `${parameter.pointeeType} ${parameter.name}_SIK_storage = ${input};`,
                    `${parameter.type.trim()} ${parameter.name} = &${parameter.name}_SIK_storage;`,
                );
            }

            argumentsList.push(parameter.name);
        }
    });

    return {
        setupCode: setupCodeLines,
        argumentsList: argumentsList,
    };
}

function validateScalarLiteral(value: string, parameterName: string): void {
	const literalPattern =
		/^[+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|0[xX][0-9a-fA-F]+)(?:[uUlLfF]*)$/;
	if (!literalPattern.test(value.trim())) {
		throw new Error(`Unsupported generated value for parameter ${parameterName}: ${value}`);
	}
}