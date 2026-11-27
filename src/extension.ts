import * as vscode from 'vscode';
import { generateTestsOnFunction } from './commands/generateTestsOnFunctionCommand';
import { showInstallInstructions } from './commands/showInstallInstructionsCommand';
import { deleteDebugArtifacts, openDebugArtifacts, openLatestDebugRun } from './services/debugArtifacts';

export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel('Sikraken');
	context.subscriptions.push(outputChannel);

	context.subscriptions.push(
		vscode.commands.registerCommand('sikraken.showInstallInstructions', () => showInstallInstructions(context)),
		vscode.commands.registerCommand(
			'sikraken.generateTestsOnFunction',
			() => generateTestsOnFunction(context, outputChannel),
		),
		vscode.commands.registerCommand(
			'sikraken.openDebugArtifacts',
			() => openDebugArtifacts(context.globalStorageUri.fsPath),
		),
		vscode.commands.registerCommand(
			'sikraken.openLatestDebugRun',
			() => openLatestDebugRun(context.globalStorageUri.fsPath),
		),
		vscode.commands.registerCommand(
			'sikraken.deleteDebugArtifacts',
			() => deleteDebugArtifacts(context.globalStorageUri.fsPath),
		),
	);
}

export function deactivate() {}
