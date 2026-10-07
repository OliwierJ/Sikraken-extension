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


	context.subscriptions.push(helloWorldCommand);
	context.subscriptions.push(helloTimeCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
