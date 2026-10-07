// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('"<Sikraken Extension>" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const helloWorldCommand = vscode.commands.registerCommand('sikraken.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello VS Code!');
	});


	const helloTimeCommand = vscode.commands.registerCommand('sikraken.helloTime', () => {
		const time = new Date().toLocaleTimeString();
		vscode.window.showInformationMessage(`Current time is: ${time}`);
	});

	const test = vscode.commands.registerCommand('sikraken.testCommand', async () => {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return;
		}
		
		// Check if the active editor is a C file
		if (activeEditor.document.languageId !== 'c') {
			vscode.window.showInformationMessage('This command only works for C files.');
			return;
		}
		
		const path = activeEditor.document.uri.fsPath;
		console.log('Active editor path:', path);
		// Run sikraken with the active editor's path as an argument
		const terminal = vscode.window.createTerminal('Sikraken Terminal');
		terminal.show();
		
		const sikrakenCommand = `/home/oliwier/Projects/Extension/Sikraken-extension/lib/sikraken/bin/sikraken.sh release budget[10] ${path}`;
		// send command and then exit
		terminal.sendText(`${sikrakenCommand} ; exit`);
		
		new Promise<void>((resolve) => {
			const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
				if (closedTerminal === terminal) {
					disposable.dispose();
					resolve();
				}
			});
		});

		vscode.window.showInformationMessage('Test command executed!');
		
	
	});
	context.subscriptions.push(helloWorldCommand);
	context.subscriptions.push(helloTimeCommand);
	context.subscriptions.push(test);
}

// This method is called when your extension is deactivated
export function deactivate() {}
