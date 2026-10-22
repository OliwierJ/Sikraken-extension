import * as path from 'node:path';
import * as vscode from 'vscode';
import { FunctionContext } from './functionContext';


export async function buildFunctionContext(
    editor: vscode.TextEditor,
    symbol: vscode.DocumentSymbol,
): Promise<FunctionContext> {
    const source = editor.document.getText();

    return {
        sourceFile: {
            path: editor.document.uri.fsPath,
            directory: path.dirname(editor.document.uri.fsPath),
            source,
        },

        selectedFunction: {
            name: symbol.name,
            source: editor.document.getText(symbol.range),
            range: symbol.range,
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