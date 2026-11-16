import { FunctionParameter } from "../../services/functionParsing/types";

export const scalarParam = (type: string, name: string): FunctionParameter => {
    return { kind: "scalar", baseType: type, nondeterministicName: type, name, type };
};

export const pointerParam = (type: string, name: string, pointeeType: string): FunctionParameter => {
    return {
        kind: "pointer", name, type, pointeeBaseType: pointeeType, pointeeNondeterministicName: pointeeType, pointeeType, nullIndicatorName: `${name}_is_null`,
    };
};

export const arrayParam = (type: string, name: string, elementType: string, length: number): FunctionParameter => {
    return {
        kind: "array", name, type, elementBaseType: elementType, elementNondeterministicName: elementType, elementType, length,
        inputLength: elementType === 'char' ? length - 1 : length,
        isString: elementType === 'char',
        isConst: /\bconst\b/.test(type),
    };
};