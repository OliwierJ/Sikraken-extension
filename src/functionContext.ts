import * as vscode from 'vscode';

export type CompilerContext = {
    workingDirectory: string;
    compilerPath?: string;
    arguments: string[];
    includePaths: string[];
    defines: string[];
};

export type FunctionDependency =
    | {
            kind: 'same-file-function';
            name: string;
            supported: true;
      }
    | {
            kind: 'global-variable';
            name: string;
            type: string;
            supported: boolean;
            reason?: string;
      }
    | {
            kind: 'external-function';
            name: string;
            supported: false;
            reason: string;
      };

export type FunctionContext = {
    sourceFile: {
        path: string;
        directory: string;
        source: string;
    };

    selectedFunction: {
        name: string;
        source: string;
        range: vscode.Range;
        returnType?: string;
        parameters: FunctionParameter[];
    };

    includes: string[];
    compiler: CompilerContext;
    dependencies: FunctionDependency[];
};

export type FunctionParameter = {
    name: string;
    type: string;
};