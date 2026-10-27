import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { unityTemplate, unityTestCaseTemplate } from './templates';
import { runSikraken } from './sikrakenRunner';
import { createIndeterminateFunction as createHarness, createIncludeHarness, GeneratedHarness, parseFunction, parseFunctionSymbols } from './documentTransformer';
import { extractTestInputs } from './sikrakenXml';
import { extractNondeterministicVariables } from './variableNames';
import { buildFunctionContext } from './buildFunctionContext';

export type TestFunction = {
	name: string;
	body: string;
};


// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('"<Sikraken Extension>" is now active!');

	vscode.commands.registerCommand('sikraken.runSikrakenOnFile', async () => {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Running Sikraken...',
			cancellable: true
		}, async (progress, token) => {
		
			token.onCancellationRequested(() => {
				vscode.window.showWarningMessage('Sikraken execution cancelled.');
				return;
			});

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

			progress.report({ increment: 10, message: 'Running Sikraken...' });
			// Invoke Sikraken script with the selected file
			try {
				const result = await runSikraken({
					scriptPath: sikrakenScriptPath,
					inputPath: filePath,
					outputFileName: fileName,
					outputDir: outputDir
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

			progress.report({ increment: 70, message: 'Extracting test inputs...' });
			// Find indeterminate variables from source file
			const sourceCode = await fs.readFile(filePath, 'utf8');
			const variables = extractNondeterministicVariables(sourceCode);
			
			
			const outputChannel = vscode.window.createOutputChannel('Sikraken Test Inputs');
			try {
				const testInputFiles = (await fs.readdir(outputPath))
					.filter((entry) => entry.startsWith('test_input-') && entry.endsWith('.xml'))
					.sort();

					for (const testInputFile of testInputFiles) {
						const testInput = await fs.readFile(path.join(outputPath, testInputFile), 'utf8');
						outputChannel.appendLine(`--- ${testInputFile} ---`);
						
						const inputs = extractTestInputs(testInput);
						
						for (let index = 0; index < inputs.length; index++) {
							const variable = variables[index] ?? `input${index + 1}`;
							outputChannel.appendLine(`${variable} = ${inputs[index]}`);
						}
				}
				outputChannel.show(true);
			} catch (error) {
				vscode.window.showErrorMessage(`Could not read Sikraken test inputs: ${error}`);
			}

			progress.report({ increment: 100, message: `Sikraken test inputs generated successfully!` });
		});
		
	});
	
	
	vscode.commands.registerCommand('sikraken.generateTestsOnFunction', async () => {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Generating test suite...',
			cancellable: true
		}, async (progress, token) => {

			// Handle cancellation
			token.onCancellationRequested(async () => {
				vscode.window.showWarningMessage('Test suite generation cancelled.');
				
				// Clean up any temporary files or directories if needed
				await fs.rm(tempDirectory, { recursive: true });
				return;
			});

			const activeEditor = vscode.window.activeTextEditor;
			if (!activeEditor) {
				return;
			}

			// Check if the active editor is a C file
			if (activeEditor.document.languageId !== 'c') {
				vscode.window.showInformationMessage('This command only works for C files.');
				return;
			}

			progress.report({ increment: 10, message: 'Parsing function...' });

			// Get the selected function
			const functionSymbol = await parseFunctionSymbols(activeEditor);
			if (!functionSymbol) {
				vscode.window.showInformationMessage('No function selected.');
				return;
			}		
			const functionContext = await buildFunctionContext(activeEditor, functionSymbol);

			
			// Replace function parameters with indeterminate variables
			let harness: GeneratedHarness;
			try {
				const parsedFunction = parseFunction(functionContext);
				harness = createIncludeHarness(functionContext, parsedFunction);
				console.log(harness);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				vscode.window.showErrorMessage(`Error transforming function: ${message}`);
				return;
			}


			const tempRoot = context.globalStorageUri.fsPath;
			await fs.mkdir(tempRoot, { recursive: true });

			const tempDirectory = await fs.mkdtemp(path.join(tempRoot, 'sikraken-'));

			const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			const tempFileName = `main-${requestId}.c`;
			const tempFilePath = path.join(tempDirectory, tempFileName);

			await fs.writeFile(tempFilePath, harness.source, 'utf8');
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

			progress.report({ increment: 30, message: 'Running Sikraken...' });

			try {
				const result = await runSikraken({
					scriptPath: sikrakenScriptPath,
					inputPath: tempFilePath,
					outputFileName: tempFileBaseName,
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
			const variables = extractNondeterministicVariables(sourceCode);
			progress.report({ increment: 70, message: 'Extracting test inputs...' });

			let testCases: TestFunction[] = [];

			const outputChannel = vscode.window.createOutputChannel('Sikraken Test Inputs');
			try {
				const testInputFiles = (await fs.readdir(outputPath))
					.filter((entry) => entry.startsWith('test_input-') && entry.endsWith('.xml'))
					.sort();

				let index = 1;
				for (const testInputFile of testInputFiles) {
					const testInput = await fs.readFile(path.join(outputPath, testInputFile), 'utf8');
					outputChannel.appendLine(`--- ${testInputFile} ---`);

					const inputs = extractTestInputs(testInput);

					// Check to see if there are any inputs
					if (inputs.length === 0) {
						vscode.window.showWarningMessage(`Sikraken found no test inputs for ${harness.originalName}. 
							Sikraken requires at least one branching point in the function to generate test inputs. Please ensure 
							that the function has at least one branching point (e.g., if statement, loop, etc.) and try again.`
						);
						return;
					}

					for (let index = 0; index < inputs.length; index++) {
						const variable = variables[index] ?? `input${index + 1}`;
						outputChannel.appendLine(`${variable} = ${inputs[index]}`);
					
					}
					// Create test case for each input
					const testCaseName = `test_case_${index}`;
					const testCaseBody = `TEST_ASSERT_EQUAL(EXPECTED_RES, ${harness.originalName}(${inputs.join(', ')}));`;
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
			
			progress.report({ increment: 90, message: 'Generating test suite...' });

			// Generate test cases for each input
			const unityTestCases = testCases.map(testCase => {return {body: unityTestCaseTemplate(testCase), name: testCase.name};});
			
			const testSuiteName = `${harness.originalName}_test_suite.c`;
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

			console.log(`Test suite generated: ${testSuitePath}`);
			progress.report({ increment: 100, message: `Test suite generated successfully! : ${testSuitePath}` });

			// Open the generated test suite in a new editor tab
			const document = await vscode.workspace.openTextDocument(testSuitePath);
			await vscode.window.showTextDocument(document);
		});
	});
}
	
// This method is called when your extension is deactivated
export function deactivate() {}
