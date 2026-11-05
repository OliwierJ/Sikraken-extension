import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { runSikraken } from '../services/sikrakenRunner';
import { SikrakenSettings, loadSikrakenSettings } from '../settings';
import { extractTestInputs } from '../sikrakenXml';
import { extractNondeterministicVariables } from '../variableNames';
import { ensureSikrakenPrerequisites } from '../services/sikrakenPrerequisites';


export async function runSikrakenOnFile(context: vscode.ExtensionContext): Promise<void> {
	const activeEditor = vscode.window.activeTextEditor;

	// Check if the active editor is a C file
	if (!activeEditor || activeEditor.document.languageId !== 'c') {
		vscode.window.showInformationMessage('This command only works for C files.');
		return;
	}

	return vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Running Sikraken...',
			cancellable: true,
		},
		async (progress, token) => {
			const abortController = new AbortController();
			token.onCancellationRequested(() => abortController.abort());

			const filePath = activeEditor.document.uri.fsPath;
			const fileName = path.basename(filePath, path.extname(filePath));

			const sikrakenScriptPath = context.asAbsolutePath('lib/sikraken/bin/sikraken.sh');
			const outputDir = path.join(context.globalStorageUri.fsPath, 'sikraken_output');

			const outputPath = path.join(outputDir, fileName, 'test-suite');

			if (!(await ensureSikrakenPrerequisites(context, sikrakenScriptPath))) {
				return;
			}

			// Load Sikraken settings for the current workspace
			const sikrakenSettings: SikrakenSettings = loadSikrakenSettings(activeEditor.document.uri);

			progress.report({ increment: 10, message: 'Running Sikraken...' });
			// Invoke Sikraken script with the selected file
			try {
				const result = await runSikraken({
					scriptPath: sikrakenScriptPath,
					inputPath: filePath,
					outputFileName: fileName,
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
					vscode.window.showWarningMessage('Sikraken execution cancelled.');
				} else {
					vscode.window.showErrorMessage(`Error executing Sikraken: ${message}`);
				}
				return;
			}

			progress.report({ increment: 60, message: 'Extracting test inputs...' });
			// Find indeterminate variables from source file
			const outputChannel = vscode.window.createOutputChannel('Sikraken Test Inputs');
			try {
				const sourceCode = await fs.readFile(filePath, 'utf8');
				const variables = extractNondeterministicVariables(sourceCode);
				const testInputFiles = (await fs.readdir(outputPath)).filter((entry) => entry.startsWith('test_input-') && entry.endsWith('.xml')).sort();
				if (testInputFiles.length === 0) {
					throw new Error(`Sikraken produced no test inputs in '${outputPath}'.`);
				}

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
				const message = error instanceof Error ? error.message : String(error);
				vscode.window.showErrorMessage(`Could not read Sikraken test inputs: ${message}`);
				return;
			}

			progress.report({ increment: 100, message: `Sikraken test inputs generated successfully!` });
		},
	);
}
