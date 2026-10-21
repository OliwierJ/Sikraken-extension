import { nondeterministicTemplate } from "./templates";


export type FunctionParameter = {
    type: string;
    name: string;
    baseType: string;
};

export type TransformedFunction = {
    source: string;
    originalName: string;
    returnType: string;
    parameters: FunctionParameter[];
};


export function createIndeterminateFunction(functionSource: string): TransformedFunction {

	const leftBracketIndex = functionSource.indexOf('(');
	const rightBracketIndex = functionSource.indexOf(')', leftBracketIndex);
	const bodyStartIndex = functionSource.indexOf('{', rightBracketIndex);

	const functionHeader = functionSource.slice(0, leftBracketIndex);
	const functionNameMatch = functionHeader.match(/([A-Za-z_]\w*)\s*$/);

	if (!functionNameMatch) {
		throw new Error('Could not parse the function name.');
	}

	const functionName = functionNameMatch[1];
	
	const functionNameStart =
		leftBracketIndex - functionNameMatch[0].length +
		functionNameMatch[0].indexOf(functionName);

	if (leftBracketIndex === -1 || rightBracketIndex === -1 || bodyStartIndex === -1) {
		throw new Error('Could not parse the function signature.');
	}

	const parameterText = functionSource
		.slice(leftBracketIndex + 1, rightBracketIndex)
		.trim();

	const parameters = parameterText && parameterText !== 'void'
		? parameterText.split(',').map(parameter => parameter.trim())
		: [];

	const parameterRegex =
		/^((?:(?:const|unsigned|signed)\s+)*(?:int|char|float))\s+([A-Za-z_]\w*)$/;

	const parsedParameters = parameters.map(parameter => {
		const match = parameter.match(parameterRegex);

		if (!match) {
			throw new Error(`Unsupported parameter: ${parameter}`);
		}

		return {
			type: match[1],
			name: match[2],
			baseType: match[1].match(/\b(int|char|float)\b/)![1],
		};
	});

	const nondeterministicDeclarations = parsedParameters
		.map(parameter => nondeterministicTemplate(parameter))
		.join('\n');

	const functionWithoutParameters =
		functionSource.slice(0, functionNameStart) +
		'main' +
		functionSource.slice(functionNameStart + functionName.length, leftBracketIndex + 1) +
		')' +
		functionSource.slice(rightBracketIndex + 1);

	const transformedBodyStart = functionWithoutParameters.indexOf('{');

	const nondeterministicPrototypes = [...new Set(parsedParameters.map(parameter => parameter.baseType))]
		.map(baseType =>
			`extern ${baseType} __VERIFIER_nondet_${baseType}();`
		)
		.join('\n');

	const transformedFunction = 
		functionWithoutParameters.slice(0, transformedBodyStart + 1) +
		'\n' +
		nondeterministicDeclarations +
		functionWithoutParameters.slice(transformedBodyStart + 1);
	
	return {
		source: nondeterministicPrototypes + '\n\n' + transformedFunction,
		originalName: functionName,
		returnType: "",
		parameters: parsedParameters,
	};
}
