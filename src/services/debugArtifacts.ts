import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';

export type DebugRun = {
	runDirectory: string;
	outputDirectory: string;
};

export async function createDebugRun(globalStoragePath: string): Promise<DebugRun> {
	const root = path.join(globalStoragePath, 'sikraken_debug');
	await fs.mkdir(root, { recursive: true });
	
    const runDirectory = await fs.mkdtemp(path.join(root, `run-${new Date().toISOString().replaceAll(':', '-')}-`));
	const outputDirectory = path.join(runDirectory, 'output');
	
    await fs.mkdir(outputDirectory);
	return { runDirectory, outputDirectory };
}

export async function openLatestDebugRun(globalStoragePath: string): Promise<void> {
	const root = path.join(globalStoragePath, 'sikraken_debug');
	const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
	const runs = entries.filter((entry) => entry.isDirectory()).sort((left, right) => right.name.localeCompare(left.name));
	if (runs.length === 0) {
		vscode.window.showInformationMessage('No Sikraken debug runs have been recorded.');
		return;
	}

	const stdoutPath = path.join(root, runs[0].name);
	try {
		const document = await vscode.workspace.openTextDocument(stdoutPath);
		await vscode.window.showTextDocument(document);
	} catch {
		await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(path.join(root, runs[0].name)));
	}
}

export async function openDebugArtifacts(globalStoragePath: string): Promise<void> {
	const root = path.join(globalStoragePath, 'sikraken_debug');
	await fs.mkdir(root, { recursive: true });
	await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(root));
}

export async function deleteDebugArtifacts(globalStoragePath: string): Promise<void> {
	const root = path.join(globalStoragePath, 'sikraken_debug');
	const choice = await vscode.window.showWarningMessage(
		'Delete all Sikraken debug artifacts?',
		{ modal: true },
		'Delete',
	);
	if (choice !== 'Delete') {
		return;
	}
	await fs.rm(root, { recursive: true, force: true });
	vscode.window.showInformationMessage('Sikraken debug artifacts deleted.');
}
