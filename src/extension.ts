import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { waitForTerminalClose } from './helpers';



// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('"<Sikraken Extension>" is now active!');

	const runSikrakenOnFile = vscode.commands.registerCommand('sikraken.runSikrakenOnFile', async () => {
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
		const sikrakenCommand = `bash ${sikrakenScriptPath} release budget[10] ${filePath}`;
		const outputPath = path.join(context.extensionPath, 'lib/sikraken/sikraken_output', fileName, 'test-suite');
		const terminal = vscode.window.createTerminal('Sikraken Terminal');
	
		
		// send command and then exit
		terminal.show();
		terminal.sendText(`${sikrakenCommand} ; exit`);
		await waitForTerminalClose(terminal);


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

	context.subscriptions.push(runSikrakenOnFile);
}

// This method is called when your extension is deactivated
export function deactivate() {}