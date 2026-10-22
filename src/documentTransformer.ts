import { FunctionContext } from "./functionContext";
import { nondeterministicTemplate } from "./templates";
import * as vscode from 'vscode';

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

export type GeneratedHarness = {
    source: string;
    originalName: string;
    parameters: FunctionParameter[];
};

export type ParsedFunction = {
    name: string;
    parameters: FunctionParameter[];
};

export async function parseFunctionSymbols(activeEditor: vscode.TextEditor) {
	let functionSymbol: vscode.DocumentSymbol | undefined;
	const selectedFileURI = activeEditor.document.uri;
	const position = activeEditor.selection.active;

	try {
		const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
			'vscode.executeDocumentSymbolProvider',
			selectedFileURI
		);

		functionSymbol = symbols?.flatMap(symbol =>
				'children' in symbol ? [symbol, ...symbol.children] : [symbol]
			)
			.find(symbol =>
				symbol.kind === vscode.SymbolKind.Function &&
				symbol.range.contains(position)
			);

		if (!functionSymbol) {
			vscode.window.showInformationMessage(
				'Place the cursor inside a function.'
			);
			return;
		}

		// Ignore main function for now
		if (functionSymbol.name === 'main()' || functionSymbol.name === 'main' || functionSymbol.name === 'main(void)') {
			vscode.window.showInformationMessage(
				'Generating tests for the main function is not supported.'
			);
			return;
		}


		console.log(`Selected function: ${functionSymbol.name}`);
	} catch (error) {
		console.error('Failed to fetch symbols:', error);
	}

	return functionSymbol;
}


export function parseFunction(
    functionContext: FunctionContext,
): ParsedFunction {
    const functionSource = functionContext.selectedFunction.source;

    const leftBracketIndex = functionSource.indexOf('(');
    const rightBracketIndex = functionSource.indexOf(')', leftBracketIndex);

    if (leftBracketIndex === -1 || rightBracketIndex === -1) {
        throw new Error('Could not parse the function signature.');
    }

    const functionHeader = functionSource.slice(0, leftBracketIndex);
    const functionNameMatch = functionHeader.match(/([A-Za-z_]\w*)\s*$/);

    if (!functionNameMatch) {
        throw new Error('Could not parse the function name.');
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

    return {
        name: functionNameMatch[1],
        parameters: parsedParameters,
    };
}

export function createIncludeHarness(context: FunctionContext, parsedFunction: ParsedFunction): GeneratedHarness {
    const sourcePath = toCStringLiteral(context.sourceFile.path);
    const hasMain = /\bmain\s*\(/.test(context.sourceFile.source);

    const mainRename = hasMain ? '#define main sikraken_original_main\n' : '';

    const mainRestore = hasMain ? '\n#undef main\n' : '';

    const nondeterministicDeclarations = parsedFunction.parameters
        .map(parameter => nondeterministicTemplate(parameter))
        .join('\n');

    const nondeterministicPrototypes = [
        ...new Set(
            parsedFunction.parameters.map(parameter => parameter.baseType),
        )].map(type => `extern ${type} __VERIFIER_nondet_${type}(void);`)
        .join('\n');

    const argumentsList = parsedFunction.parameters
        .map(parameter => parameter.name)
        .join(', ');

    const source = [
        mainRename,
        `#include ${sourcePath}`,
        mainRestore,
        '',
        nondeterministicPrototypes,
        '',
        'int main(void)',
        '{',
        nondeterministicDeclarations,
        '',
        `\t${parsedFunction.name}(${argumentsList});`,
        '\treturn 0;',
        '}',
    ].join('\n');

    return {
        source,
        originalName: parsedFunction.name,
        parameters: parsedFunction.parameters,
    };
}

function toCStringLiteral(value: string): string {
    return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

export function createIndeterminateFunction(functionContext: FunctionContext): TransformedFunction {
	const functionSource = functionContext.selectedFunction.source;

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
