import path from 'path';
import * as fs from 'node:fs/promises';
import * as vscode from 'vscode';
import { SIKRAKEN_PATH } from '../types';
import { buildFunctionContext } from '../services/buildFunctionContext';
import { parseFunctionSymbols, GeneratedHarness, ParsedFunction, parseFunction, createIncludeHarness } from '../services/documentTransformer';
import { runSikraken } from '../services/sikrakenRunner';
import { SikrakenSettings, loadSikrakenSettings, determineOutputGeneration } from '../settings';
import { unityTestCaseTemplate, unityTemplate } from '../templates';
import { ensureSikrakenPrerequisites } from '../services/sikrakenPrerequisites';
import { extractTestInputs } from '../services/testInputParser';
import { generateTestCases } from '../services/testCaseExtractor';

export async function generateTestsOnFunction(context: vscode.ExtensionContext) {
	const activeEditor = vscode.window.activeTextEditor;

	// Check if the active editor is a C file
	if (!activeEditor || activeEditor.document.languageId !== 'c') {
		vscode.window.showInformationMessage('This command only works for C files.');
		return;
	}

	const sikrakenScriptPath = context.asAbsolutePath(SIKRAKEN_PATH);
	if (!(await ensureSikrakenPrerequisites(context, sikrakenScriptPath))) {
		return;
	}

	// Get the selected function
	const functionSymbol = await parseFunctionSymbols(activeEditor);
	if (!functionSymbol) {
		vscode.window.showInformationMessage('No function selected.');
		return;
	}

	// Load Sikraken settings for the current workspace
	const sikrakenSettings: SikrakenSettings = loadSikrakenSettings(activeEditor.document.uri);

	// Check extension settings to determine whether to show the prompt
	const generateOutputs: boolean = await determineOutputGeneration(sikrakenSettings);

	return vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Generating test suite...',
			cancellable: true,
		},
		async (progress, token) => {
			// Handle cancellation
			const abortController = new AbortController();
			token.onCancellationRequested(() => abortController.abort());

			progress.report({ increment: 10, message: 'Parsing function...' });

			const functionContext = await buildFunctionContext(activeEditor, functionSymbol);

			// Replace function parameters with indeterminate variables
			let harness: GeneratedHarness;
			let parsedFunction: ParsedFunction;
			try {
				parsedFunction = parseFunction(functionContext);
				harness = createIncludeHarness(functionContext, parsedFunction);
				console.log(harness);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				vscode.window.showErrorMessage(`Error transforming function: ${message}`);
				return;
			}

			const tempRoot = context.globalStorageUri.fsPath;
			let tempDirectory: string | undefined;
			try {
				await fs.mkdir(tempRoot, { recursive: true });
				tempDirectory = await fs.mkdtemp(path.join(tempRoot, 'sikraken-'));

				// Create a temporary file for the harness with randomized name to avoid conflicts
				const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
				const tempFileName = `main-${requestId}.c`;
				const tempFilePath = path.join(tempDirectory, tempFileName);

				await fs.writeFile(tempFilePath, harness.source, 'utf8');
				const tempFileBaseName = path.basename(tempFilePath, path.extname(tempFilePath));

				const outputDir = path.join(context.globalStorageUri.fsPath, 'sikraken_output');

				const outputPath = path.join(outputDir, tempFileBaseName, 'test-suite');

				// Test to see if the temp file exists
				const tempFileExists = await fs
					.access(tempFilePath, fs.constants.F_OK)
					.then(() => true)
					.catch(() => false);
				if (!tempFileExists) {
					vscode.window.showErrorMessage('Failed to create temp file.');
					return;
				}

				progress.report({ increment: 10, message: 'Running Sikraken...' });

				try {
					const result = await runSikraken({
						scriptPath: sikrakenScriptPath,
						inputPath: tempFilePath,
						outputFileName: tempFileBaseName,
						outputDir: outputDir,
						budget: sikrakenSettings.sikrakenBudget,
						signal: abortController.signal,
					});

					if (result.stderr && result.stderr.trim()) {
						console.warn(`Sikraken stderr: ${result.stderr}`);
					}
					if (result.stdout && result.stdout.trim()) {
						console.log(`Sikraken stdout: ${result.stdout}`);
					}
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					if (abortController.signal.aborted) {
						vscode.window.showWarningMessage('Test suite generation cancelled.');
					} else {
						vscode.window.showErrorMessage(`Error executing Sikraken: ${message}`);
					}
					return;
				}

				// Find indeterminate variables from source file
				progress.report({ increment: 60, message: 'Extracting test inputs...' });

				const testInputFiles = (await fs.readdir(outputPath)).filter((entry) => entry.startsWith('test_input-') && entry.endsWith('.xml')).sort();

				const testInputs = await extractTestInputs(testInputFiles, outputPath);

				const testCases = await generateTestCases({
					testInputs,
					generateOutputs,
					progress,
					harness,
					parsedFunction,
					functionContext,
					tempDirectory,
				});

				if (!testCases) {
					return;
				}

				progress.report({ increment: 10, message: 'Generating test suite...' });

				// Generate test cases for each input
				const unityTestCases = testCases.map((testCase) => {
					return { body: unityTestCaseTemplate(testCase), name: testCase.name };
				});

				const testSuiteName = `${harness.originalName}_test_suite.c`;
				// Get current file directory
				const filePath = path.dirname(activeEditor.document.uri.fsPath);
				const testSuitePath = path.join(filePath, testSuiteName);

				// Get just the file name of the current file
				const currentFileName = path.basename(activeEditor.document.uri.fsPath);
				const testSuiteContent = unityTemplate(unityTestCases, currentFileName, generateOutputs);

				// Write test suite to file
				await fs.writeFile(testSuitePath, testSuiteContent, 'utf8');

				console.log(`Test suite generated: ${testSuitePath}`);
				progress.report({ increment: 100, message: `Test suite generated successfully! : ${testSuitePath}` });

				// Open the generated test suite in a new editor tab
				const document = await vscode.workspace.openTextDocument(testSuitePath);
				await vscode.window.showTextDocument(document);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (abortController.signal.aborted) {
					vscode.window.showWarningMessage('Test suite generation cancelled.');
				} else {
					vscode.window.showErrorMessage(`Could not generate test suite: ${message}`);
				}
			} finally {
				if (tempDirectory) {
					await fs.rm(tempDirectory, {
						recursive: true,
						force: true,
					});
					console.log('Removed temporary directory:', tempDirectory);
				}
			}
		},
	);
}
