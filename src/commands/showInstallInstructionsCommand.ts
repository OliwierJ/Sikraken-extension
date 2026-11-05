import * as vscode from 'vscode';

export async function showInstallInstructions(context: vscode.ExtensionContext): Promise<void> {
    try {
        const readme = await vscode.workspace.openTextDocument(
            vscode.Uri.file(context.asAbsolutePath('README.md')),
        );
        await vscode.window.showTextDocument(readme);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Could not open Sikraken installation instructions: ${message}`);
    }
}
