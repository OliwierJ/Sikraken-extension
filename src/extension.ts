import * as vscode from 'vscode';
import { showInstallInstructions } from './commands/showInstallInstructionsCommand';
import { runSikrakenOnFile } from './commands/runSikrakenOnFileCommand';
import { generateTestsOnFunction } from './commands/generateTestsOnFunctionCommand';

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('"<Sikraken Extension>" is now active!');

	context.subscriptions.push(vscode.commands.registerCommand('sikraken.showInstallInstructions', 
		() => showInstallInstructions(context))
	);

	// This command runs Sikraken on the currently active C file and extracts the test inputs
	context.subscriptions.push(vscode.commands.registerCommand('sikraken.runSikrakenOnFile', 
		async () => runSikrakenOnFile(context))
	);

	// This command generates a test suite for the currently selected function in the active C file
	context.subscriptions.push(vscode.commands.registerCommand('sikraken.generateTestsOnFunction', 
		async () => generateTestsOnFunction(context))
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
