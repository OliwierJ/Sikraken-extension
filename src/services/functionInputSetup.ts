import { FunctionParameter } from "./functionParsing/types";
import { validateCharacterLiteral, validateScalarLiteral } from "./kinds/ScalarHandler";
import { PreparedParameterInput } from "./testInputParser";

export type PreparedFunctionCall = {
    setupCode: string[];
    argumentsList: string[];
}

export function prepareFunctionCall(parameters: FunctionParameter[], inputs: PreparedParameterInput[]): PreparedFunctionCall {
    if (inputs.length !== parameters.length) {
        throw new Error(`Number of inputs (${inputs.length}) does not match number of parameters (${parameters.length}).`);
    }

    const setupCodeLines: string[] = [];
    const argumentsList: string[] = [];

    parameters.forEach((parameter, index) => {
        const input = inputs[index];

        if (parameter.kind === 'scalar' && input.kind === 'scalar') {
            const normalizedValue = parameter.baseType === 'char'
                ? validateCharacterLiteral(input.value, parameter.name)
                : validateScalarLiteral(input.value, parameter.name, parameter.type);
            argumentsList.push(normalizedValue);
            return;
        } 

        if (parameter.kind === 'pointer' && input.kind === 'pointer') {
            if (input.value === 'NULL') {
                setupCodeLines.push(`${parameter.type.trim()} ${parameter.name} = NULL;`);
            } else {
                const normalizedValue = validateScalarLiteral(input.value, parameter.name, parameter.pointeeType);
                setupCodeLines.push(
                    `${parameter.pointeeType} ${parameter.name}_SIK_storage = ${normalizedValue};`,
                    `${parameter.type.trim()} ${parameter.name} = &${parameter.name}_SIK_storage;`,
                );
            }

            argumentsList.push(parameter.name);
            return;
        }

        if (parameter.kind === 'array' && input.kind === 'array') {
            if (input.values.length !== parameter.inputLength) {
                throw new Error(
                    `Array parameter ${parameter.name} requires ${parameter.inputLength} values, ` +
                    `but received ${input.values.length}.`,
                );
            }

            const arrayValues = input.values.map(value => {
                return parameter.isString
                    ? validateCharacterLiteral(value, parameter.name)
                    : validateScalarLiteral(value, parameter.name, parameter.elementType);
            });
            
            setupCodeLines.push(
                parameter.isString
                    ? `${parameter.elementType} ${parameter.name}[${parameter.length}] = { ${arrayValues.join(', ')}, '\\0' };`
                    : `${parameter.elementType} ${parameter.name}[${parameter.length}] = { ${arrayValues.join(', ')} };`,
            );
            argumentsList.push(parameter.name);
            return;
        }



        throw new Error(`Mismatched parameter and input types for parameter ${parameter.name}.`);
    });

    return {
        setupCode: setupCodeLines,
        argumentsList: argumentsList,
    };
}

