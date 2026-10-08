import * as vscode from 'vscode';

export async function waitForTerminalClose(terminal: vscode.Terminal): Promise<void> {
	return new Promise<void>((resolve) => {
		const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
			if (closedTerminal === terminal) {
				disposable.dispose();
				resolve();
			}
		});
	});
}
