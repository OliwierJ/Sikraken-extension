import { FunctionParameter } from "./functionParsing/types";
import { handlerFor } from "./kinds";
import { PreparedParameterInput } from "./testInputParser";

export type PreparedFunctionCall = {
    setupCode: string[];
    argumentsList: string[];
}

export function prepareFunctionCall(parameters: FunctionParameter[], inputs: PreparedParameterInput[]): PreparedFunctionCall {
    if (inputs.length !== parameters.length) {
        throw new Error(`Number of inputs (${inputs.length}) does not match number of parameters (${parameters.length}).`);
    }

const setupCode: string[] = [];
    const argumentsList: string[] = [];

    parameters.forEach((parameter, index) => {
        const input = inputs[index];
        if (parameter.kind !== input.kind) {
            throw new Error(`Mismatched parameter and input types for parameter ${parameter.name}.`);
        }
        const call = handlerFor(parameter).replay(parameter, input);
        setupCode.push(...call.setupCode);
        argumentsList.push(call.argument);
    });

    return { setupCode, argumentsList };
}

