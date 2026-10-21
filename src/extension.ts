import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { nondeterministicTemplate, unityTemplate, unityTestCaseTemplate } from './templates';
import { runSikraken } from './sikrakenRunner';


type FunctionParameter = {
    type: string;
    name: string;
    baseType: string;
};

type TransformedFunction = {
    source: string;
    originalName: string;
    returnType: string;
    parameters: FunctionParameter[];
};

type TestCase = {
	name: string;
	body: string;
};

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('"<Sikraken Extension>" is now active!');

	vscode.commands.registerCommand('sikraken.runSikrakenOnFile', async () => {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return;
		}
		
		// Check if the active editor is a C file
		if (activeEditor.document.languageId !== 'c') {
			vscode.window.showInformationMessage('This command only works for C files.');
			return;
		}
		
		const filePath = activeEditor.document.uri.fsPath;
		const fileName = path.basename(filePath, path.extname(filePath));

		const sikrakenScriptPath = context.asAbsolutePath('lib/sikraken/bin/sikraken.sh');
		const outputDir = path.join(context.globalStorageUri.fsPath, '/sikraken_output');

		const outputPath = path.join(outputDir, fileName, 'test-suite');

		// Invoke Sikraken script with the selected file
		try {
			const result = await runSikraken({
				scriptPath: sikrakenScriptPath,
				inputPath: filePath,
				outputKey: fileName,
				outputDir: outputDir,
			});

			if (result.stderr && result.stderr.trim()) {
				console.warn(`Sikraken stderr: ${result.stderr}`);
			}
			if (result.stdout && result.stdout.trim()) {
				console.log(`Sikraken stdout: ${result.stdout}`);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Error executing Sikraken: ${message}`);
			return;
		}

		// Find indeterminate variables from source file
		const sourceCode = await fs.readFile(filePath, 'utf8');
		const variableRegex = /\b([A-Za-z_]\w*)\s*=\s*__VERIFIER_nondet_\w+\s*\(\s*\)\s*;/g;

		const variables: string[] = [];
		let variableMatch: RegExpExecArray | null;

		while ((variableMatch = variableRegex.exec(sourceCode)) !== null) {
			variables.push(variableMatch[1]);
		}


		const outputChannel = vscode.window.createOutputChannel('Sikraken Test Inputs');
		try {
			const testInputFiles = (await fs.readdir(outputPath))
				.filter((entry) => entry.startsWith('test_input-') && entry.endsWith('.xml'))
				.sort();

			for (const testInputFile of testInputFiles) {
				const testInput = await fs.readFile(path.join(outputPath, testInputFile), 'utf8');
				outputChannel.appendLine(`--- ${testInputFile} ---`);

				const inputRegex = /<input>\s*([\s\S]*?)\s*<\/input>/g;
				const inputs: string[] = [];
				let inputMatch: RegExpExecArray | null;

				while ((inputMatch = inputRegex.exec(testInput)) !== null) {
					inputs.push(inputMatch[1].trim());
				}

				for (let index = 0; index < inputs.length; index++) {
					const variable = variables[index] ?? `input${index + 1}`;
					outputChannel.appendLine(`${variable} = ${inputs[index]}`);
				}
			}
			outputChannel.show(true);
		} catch (error) {
			vscode.window.showErrorMessage(`Could not read Sikraken test inputs: ${error}`);
		}

		vscode.window.showInformationMessage('Test command executed!');
		
	});


	vscode.commands.registerCommand('sikraken.generateTestsOnFunction', async () => {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return;
		}

		// Check if the active editor is a C file
		if (activeEditor.document.languageId !== 'c') {
			vscode.window.showInformationMessage('This command only works for C files.');
			return;
		}

		// Get the selected function
		const selectedFileURI = activeEditor.document.uri;
		const selection = activeEditor.selection;

		const position = selection.active;

		let functionSymbol: vscode.DocumentSymbol | undefined;
		let functionSource: string | undefined;
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
			if (functionSymbol.name === 'main()') {
				vscode.window.showInformationMessage(
					'Generating tests for the main function is not supported.'
				);
				return;
			}

			functionSource = activeEditor.document.getText(functionSymbol.range);

			console.log(`Selected function: ${functionSymbol.name}`);
			console.log(functionSource);
		} catch (error) {
			console.error('Failed to fetch symbols:', error);
		}

		// Replace function parameters with indeterminate variables
		if (!functionSource) {
			return;
		}

		const transformedFunction = createIndeterminateFunction(functionSource);
		if (!transformedFunction) {
			vscode.window.showErrorMessage('Failed to transform the selected function.');
			return;
		}

		console.log(transformedFunction);

		const tempRoot = context.globalStorageUri.fsPath;
		await fs.mkdir(tempRoot, { recursive: true });

		const tempDirectory = await fs.mkdtemp(path.join(tempRoot, 'sikraken-'));

		const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		const tempFileName = `main-${requestId}.c`;
		const tempFilePath = path.join(tempDirectory, tempFileName);

		await fs.writeFile(tempFilePath, transformedFunction.source, 'utf8');
		const sikrakenScriptPath = context.asAbsolutePath('lib/sikraken/bin/sikraken.sh');

		const tempFileBaseName = path.basename(
			tempFilePath,
			path.extname(tempFilePath)
		);

		const outputDir = path.join(context.globalStorageUri.fsPath, '/sikraken_output');

		const outputPath = path.join(outputDir, tempFileBaseName, 'test-suite');

		// Test to see if the temp file exists
		const tempFileExists = await fs.access(tempFilePath, fs.constants.F_OK).then(() => true).catch(() => false);
		if (!tempFileExists) {
			vscode.window.showErrorMessage('Temp file not found.');
			return;
		}

		try {
			const result = await runSikraken({
				scriptPath: sikrakenScriptPath,
				inputPath: tempFilePath,
				outputKey: tempFileBaseName,
				outputDir: outputDir,
			});

			if (result.stderr && result.stderr.trim()) {
				console.warn(`Sikraken stderr: ${result.stderr}`);
			}
			if (result.stdout && result.stdout.trim()) {
				console.log(`Sikraken stdout: ${result.stdout}`);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Error executing Sikraken: ${message}`);
			return;
		}

		// Find indeterminate variables from source file
		const sourceCode = await fs.readFile(tempFilePath, 'utf8');
		const variableRegex = /\b([A-Za-z_]\w*)\s*=\s*__VERIFIER_nondet_\w+\s*\(\s*\)\s*;/g;

		const variables: string[] = [];
		let variableMatch: RegExpExecArray | null;

		while ((variableMatch = variableRegex.exec(sourceCode)) !== null) {
			variables.push(variableMatch[1]);
		}


		let testCases: TestCase[] = [];

		const outputChannel = vscode.window.createOutputChannel('Sikraken Test Inputs');
		try {
			const testInputFiles = (await fs.readdir(outputPath))
				.filter((entry) => entry.startsWith('test_input-') && entry.endsWith('.xml'))
				.sort();

			let index = 1;
			for (const testInputFile of testInputFiles) {
				const testInput = await fs.readFile(path.join(outputPath, testInputFile), 'utf8');
				outputChannel.appendLine(`--- ${testInputFile} ---`);

				const inputRegex = /<input>\s*([\s\S]*?)\s*<\/input>/g;
				const inputs: string[] = [];
				let inputMatch: RegExpExecArray | null;

				while ((inputMatch = inputRegex.exec(testInput)) !== null) {
					inputs.push(inputMatch[1].trim());
				}

				for (let index = 0; index < inputs.length; index++) {
					const variable = variables[index] ?? `input${index + 1}`;
					outputChannel.appendLine(`${variable} = ${inputs[index]}`);
				
				}
				// Create test case for each input
				const testCaseName = `test_case_${index}`;
				const testCaseBody = `TEST_ASSERT_EQUAL(EXPECTED_RES, ${transformedFunction.originalName}(${inputs.join(', ')}));`;
				testCases.push({
					name: testCaseName,
					body: testCaseBody
				});
				index++;
			}
			outputChannel.show(true);
		} catch (error) {
			vscode.window.showErrorMessage(`Could not read Sikraken test inputs: ${error}`);
		}

		await fs.rm(tempDirectory, {
			recursive: true,
			force: true,
		});
		console.log('Removed temporary directory:', tempDirectory);
		
		// Generate test cases for each input
		const unityTestCases = testCases.map(testCase => {return {body: unityTestCaseTemplate(testCase), name: testCase.name};});
		
		const testSuiteName = `${transformedFunction.originalName}_test_suite.c`;
		// Get current file directory
		const filePath = path.dirname(activeEditor.document.uri.fsPath);
		const testSuitePath = path.join(filePath, testSuiteName);
		
		// Get just the file name of the current file
		const currentFileName = path.basename(activeEditor.document.uri.fsPath);
		const testSuiteContent = unityTemplate(unityTestCases, currentFileName);
		
		// Write test suite to file
		await fs.writeFile(testSuitePath, testSuiteContent, 'utf8').catch((error) => {
			vscode.window.showErrorMessage(`Could not write test suite: ${error}`);
			return;
		});

		vscode.window.showInformationMessage(`Test suite generated: ${testSuitePath}`);
		console.log(`Test suite generated: ${testSuitePath}`);

		// Open the generated test suite in a new editor tab
		const document = await vscode.workspace.openTextDocument(testSuitePath);
		await vscode.window.showTextDocument(document);
	});
}
	
// This method is called when your extension is deactivated
export function deactivate() {}

function createIndeterminateFunction(functionSource: string): TransformedFunction | undefined {

	const leftBracketIndex = functionSource.indexOf('(');
	const rightBracketIndex = functionSource.indexOf(')', leftBracketIndex);
	const bodyStartIndex = functionSource.indexOf('{', rightBracketIndex);

	// Change the function name to main()
	const functionHeader = functionSource.slice(0, leftBracketIndex);
	const functionNameMatch = functionHeader.match(/([A-Za-z_]\w*)\s*$/);

	if (!functionNameMatch) {
		vscode.window.showErrorMessage('Could not find the function name.');
		return undefined;
	}

	const functionName = functionNameMatch[1];
	
	const functionNameStart =
		leftBracketIndex - functionNameMatch[0].length +
		functionNameMatch[0].indexOf(functionName);

	if (leftBracketIndex === -1 || rightBracketIndex === -1 || bodyStartIndex === -1) {
		vscode.window.showErrorMessage('Could not parse the selected function.');
		return undefined;
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
