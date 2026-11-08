import * as vscode from 'vscode';
import { showInstallInstructions } from './commands/showInstallInstructionsCommand';
import { runSikrakenOnFile } from './commands/runSikrakenOnFileCommand';
import { generateTestsOnFunction } from './commands/generateTestsOnFunctionCommand';
import { deleteDebugArtifacts, openDebugArtifacts, openLatestDebugRun } from './services/debugArtifacts';

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

	// This command opens the Sikraken debug artifacts directory in the OS file explorer
	context.subscriptions.push(vscode.commands.registerCommand('sikraken.openDebugArtifacts', 
		async () => openDebugArtifacts(context.globalStorageUri.fsPath))
	);

	// This command opens the latest Sikraken debug run in the OS file explorer
	context.subscriptions.push(vscode.commands.registerCommand('sikraken.openLatestDebugRun', 
		async () => openLatestDebugRun(context.globalStorageUri.fsPath))
	);

	// This command clears the Sikraken artifacts directory
	context.subscriptions.push(vscode.commands.registerCommand('sikraken.deleteDebugArtifacts', 
		async () => deleteDebugArtifacts(context.globalStorageUri.fsPath))
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
