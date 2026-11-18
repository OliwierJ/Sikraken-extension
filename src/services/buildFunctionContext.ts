import * as path from 'node:path';
import * as vscode from 'vscode';
import { FunctionContext } from './functionContext';
import { FunctionSymbols } from './functionParsing/types';

// This function builds a FunctionContext object based on the currently active editor and the selected function symbol.
export async function buildFunctionContext(editor: vscode.TextEditor, symbols: FunctionSymbols): Promise<FunctionContext> {
    const source = editor.document.getText();

    return {
        sourceFile: {
            path: editor.document.uri.fsPath,
            directory: path.dirname(editor.document.uri.fsPath),
            source,
        },

        selectedFunction: {
            name: symbols.selectedFunction.name,
            source: editor.document.getText(symbols.selectedFunction.range),
            range: symbols.selectedFunction.range,
            parameters: [],
        },

        includes: extractIncludes(source),

        compiler: {
            workingDirectory:
                vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath ??
                path.dirname(editor.document.uri.fsPath),
            arguments: [],
            includePaths: [],
            defines: [],
        },

        dependencies: [],
    };
}

const extractIncludes = (source: string): string[] => {
    return Array.from(
        source.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm),
        match => match[1],
    );
};