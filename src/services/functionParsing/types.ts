export type FunctionParameter = 
| ScalarParameter 
| PointerParameter
| ArrayParameter;


export type ArrayParameter = {
    kind: 'array';
    type: string;
    name: string;
    elementType: string;
    elementBaseType: string;
    elementNondeterministicName: string;
    length: number;
    isConst: boolean;
}

export type PointerParameter = {
    kind: 'pointer';
    type: string;
    name: string;
    pointeeType: string;
    pointeeBaseType: string;
    pointeeNondeterministicName: string;
    nullIndicatorName: string;
}

export type ScalarParameter = {
    kind: 'scalar';
    type: string;
    name: string;
    baseType: string;
    nondeterministicName: string;
    signedness?: 'signed' | 'unsigned';
}

export type TransformedFunction = {
    source: string;
    originalName: string;
    returnType: string;
    parameters: FunctionParameter[];
};

export type GeneratedHarness = {
    source: string;
    originalName: string;
    parameters: FunctionParameter[];
};

export type ParsedFunction = {
    name: string;
    returnType: string;
    parameters: FunctionParameter[];
};