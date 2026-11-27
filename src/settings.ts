import * as vscode from 'vscode';

export type SikrakenSettings = {
	sikrakenBudget: number;
	stubFunctions: string[];
	ignoreInitialisers: boolean;
	debugMode: boolean;
}

export function loadSikrakenSettings(resource: vscode.Uri): SikrakenSettings {
	const config = vscode.workspace.getConfiguration('sikraken', resource);
	return {
		sikrakenBudget: config.get<number>('sikrakenBudget', 10),
		stubFunctions: config.get<string[]>('stubFunctions', []),
		ignoreInitialisers: config.get<boolean>('ignoreInitialisers', false),
		debugMode: config.get<boolean>('debugMode', false),
	};
}
