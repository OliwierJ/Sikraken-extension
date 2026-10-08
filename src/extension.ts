// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';


const localPath = '/home/oliwier/Projects/Extension/Sikraken-extension/';

async function waitForTerminalClose(terminal: vscode.Terminal): Promise<void> {
	return new Promise<void>((resolve) => {
		const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
			if (closedTerminal === terminal) {
				disposable.dispose();
				resolve();
			}
		});
	});
}
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
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

		const outputPath = path.join(localPath, 'lib/sikraken/sikraken_output', fileName, 'test-suite');
		const sikrakenCommand = `${localPath}lib/sikraken/bin/sikraken.sh release budget[10] ${filePath}`;
		const terminal = vscode.window.createTerminal('Sikraken Terminal');
	
		
		// send command and then exit
		terminal.show();
		terminal.sendText(`${sikrakenCommand} ; exit`);
		await waitForTerminalClose(terminal);

		const outputChannel = vscode.window.createOutputChannel('Sikraken Test Inputs');
		try {
			const testInputFiles = (await fs.readdir(outputPath))
				.filter((entry) => entry.startsWith('test_input-') && entry.endsWith('.xml'))
				.sort();

			for (const testInputFile of testInputFiles) {
				const testInput = await fs.readFile(path.join(outputPath, testInputFile), 'utf8');
				outputChannel.appendLine(`--- ${testInputFile} ---`);
				outputChannel.appendLine(testInput);
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