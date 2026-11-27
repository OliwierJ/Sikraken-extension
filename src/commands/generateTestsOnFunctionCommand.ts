import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { loadSikrakenSettings } from '../settings';
import { createDebugRun } from '../services/debugArtifacts';
import { ensureSikrakenPrerequisites } from '../services/sikrakenPrerequisites';
import { runSikraken, runSikrakenUnityTests } from '../services/sikrakenRunner';

type FunctionChoice = vscode.QuickPickItem & {
	functionName: string;
	range: vscode.Range;
};

const FUNCTION_NAME_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(|$)/;
const SIKRAKEN_PATH = 'lib/sikraken/bin/sikraken.sh';

export async function generateTestsOnFunction(
	context: vscode.ExtensionContext,
	outputChannel: vscode.OutputChannel,
): Promise<void> {
	const activeEditor = vscode.window.activeTextEditor;
	if (!activeEditor || activeEditor.document.languageId !== 'c') {
		void vscode.window.showInformationMessage('Open a C source file to generate Sikraken tests.');
		return;
	}
	if (activeEditor.document.uri.scheme !== 'file') {
		void vscode.window.showErrorMessage('Sikraken needs a saved C source file on disk.');
		return;
	}
	if (activeEditor.document.isDirty && !(await activeEditor.document.save())) {
		void vscode.window.showErrorMessage('Save the C source file before generating Sikraken tests.');
		return;
	}

	const sourcePath = activeEditor.document.uri.fsPath;
	const sikrakenScriptPath = context.asAbsolutePath(SIKRAKEN_PATH);
	const unityScriptPath = path.join(path.dirname(sikrakenScriptPath), 'run_unity.sh');
	if (!(await ensureSikrakenPrerequisites(context, sikrakenScriptPath))) {
		return;
	}

	const functionChoice = await selectFunction(activeEditor);
	if (!functionChoice) {
		return;
	}
	if (functionChoice.functionName === 'main') {
		void vscode.window.showInformationMessage('Generating tests for main() is not supported.');
		return;
	}

	const settings = loadSikrakenSettings(activeEditor.document.uri);
	let outputDir = path.join(context.globalStorageUri.fsPath, 'sikraken_output');
	let debugArtifactsDir: string | undefined;
	if (settings.debugMode) {
		const debugRun = await createDebugRun(context.globalStorageUri.fsPath);
		outputDir = debugRun.outputDirectory;
		debugArtifactsDir = debugRun.runDirectory;
	}

	const fileName = path.basename(sourcePath, path.extname(sourcePath));
	const generatedTestPath = path.join(
		outputDir,
		fileName,
		'unity',
		`test_${fileName}_${functionChoice.functionName}.c`,
	);

	outputChannel.clear();
	outputChannel.appendLine(`Source: ${sourcePath}`);
	outputChannel.appendLine(`Function: ${functionChoice.functionName}`);
	outputChannel.appendLine(`Output: ${generatedTestPath}`);
	outputChannel.show(true);

	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Generating and validating Sikraken Unity tests...',
			cancellable: true,
		},
		async (progress, token) => {
			const abortController = new AbortController();
			token.onCancellationRequested(() => abortController.abort());

			try {
				progress.report({ increment: 10, message: 'Generating Unity tests...' });
				await fs.rm(generatedTestPath, { force: true });
				const result = await runSikraken({
					scriptPath: sikrakenScriptPath,
					inputPath: sourcePath,
					outputDir,
					functionName: functionChoice.functionName,
					stubFunctions: settings.stubFunctions,
					ignoreInitialisers: settings.ignoreInitialisers,
					budget: settings.sikrakenBudget,
					debugMode: settings.debugMode,
					debugArtifactsDir,
					signal: abortController.signal,
				});
				appendProcessOutput(outputChannel, 'Sikraken', result);

				await fs.access(generatedTestPath);
				progress.report({ increment: 60, message: 'Compiling and running generated tests...' });

				let validationOutput = '';
				try {
					const validation = await runSikrakenUnityTests({
						scriptPath: unityScriptPath,
						inputPath: sourcePath,
						outputDir,
						functionName: functionChoice.functionName,
						debugArtifactsDir,
						signal: abortController.signal,
					});
					appendProcessOutput(outputChannel, 'Unity validation', validation);
					validationOutput = validation.stdout;
				} catch (error) {
					appendError(outputChannel, 'Unity validation failed', error);
					await openGeneratedTest(generatedTestPath);
					if (abortController.signal.aborted) {
						void vscode.window.showWarningMessage(
							`Unity validation cancelled. The generated test file is at ${generatedTestPath}`,
						);
					} else {
						void vscode.window.showErrorMessage(
							`Sikraken generated tests, but validation failed. See the Sikraken output and generated file: ${generatedTestPath}`,
						);
					}
					return;
				}

				await openGeneratedTest(generatedTestPath);
				const testSummary = validationOutput.match(/Unity tests: [^\r\n]*/)?.[0];
				const coverageSummary = validationOutput.match(/gcov branches: [^\r\n]*/)?.[0];
				const summary = [testSummary, coverageSummary].filter(Boolean).join('; ');
				progress.report({ increment: 100, message: 'Generated and validated Sikraken tests.' });
				void vscode.window.showInformationMessage(
					summary ? `Sikraken tests generated and validated: ${summary}` : 'Sikraken tests generated and validated.',
				);
			} catch (error) {
				appendError(outputChannel, 'Sikraken failed', error);
				if (abortController.signal.aborted) {
					void vscode.window.showWarningMessage('Sikraken test generation cancelled.');
				} else {
					void vscode.window.showErrorMessage(
						`Could not generate Sikraken tests: ${errorMessage(error)}`,
					);
				}
			}
		},
	);
}

async function selectFunction(editor: vscode.TextEditor): Promise<FunctionChoice | undefined> {
	let symbols: vscode.DocumentSymbol[] | undefined;
	try {
		symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
			'vscode.executeDocumentSymbolProvider',
			editor.document.uri,
		);
	} catch (error) {
		void vscode.window.showErrorMessage(
			`Could not read C function symbols: ${errorMessage(error)}`,
		);
		return undefined;
	}
	if (!symbols) {
		void vscode.window.showErrorMessage('No C function symbols are available for this file.');
		return undefined;
	}

	const choices = flattenSymbols(symbols)
		.filter((symbol) => symbol.kind === vscode.SymbolKind.Function)
		.map((symbol): FunctionChoice | undefined => {
			const match = symbol.name.match(FUNCTION_NAME_PATTERN);
			if (!match) {
				return undefined;
			}
			return {
				label: symbol.name,
				description: `${editor.document.fileName}:${symbol.range.start.line + 1}`,
				functionName: match[1],
				range: symbol.range,
			};
		})
		.filter((choice): choice is FunctionChoice => choice !== undefined);

	if (choices.length === 0) {
		void vscode.window.showInformationMessage('No supported C functions were found in this file.');
		return undefined;
	}

	const cursorPosition = editor.selection.active;
	const containingFunction = choices
		.filter((choice) => choice.range.contains(cursorPosition))
		.sort((left, right) => {
			const leftLength = editor.document.offsetAt(left.range.end) - editor.document.offsetAt(left.range.start);
			const rightLength = editor.document.offsetAt(right.range.end) - editor.document.offsetAt(right.range.start);
			return leftLength - rightLength;
		})[0];
	if (containingFunction) {
		return containingFunction;
	}

	return vscode.window.showQuickPick(choices, {
		placeHolder: 'Select the function to generate Unity tests for',
	});
}

function flattenSymbols(symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
	return symbols.flatMap((symbol) => [symbol, ...flattenSymbols(symbol.children)]);
}

async function openGeneratedTest(testPath: string): Promise<void> {
	const document = await vscode.workspace.openTextDocument(testPath);
	await vscode.window.showTextDocument(document);
}

function appendProcessOutput(
	outputChannel: vscode.OutputChannel,
	title: string,
	result: { stdout: string; stderr: string },
): void {
	outputChannel.appendLine(`--- ${title}: stdout ---`);
	outputChannel.append(result.stdout || '(no output)\n');
	outputChannel.appendLine(`--- ${title}: stderr ---`);
	outputChannel.append(result.stderr || '(no output)\n');
}

function appendError(outputChannel: vscode.OutputChannel, title: string, error: unknown): void {
	outputChannel.appendLine(`--- ${title} ---`);
	outputChannel.appendLine(errorMessage(error));
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
