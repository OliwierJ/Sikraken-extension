import * as vscode from 'vscode';

export class TrackedOutputChannel {
    private channel: vscode.OutputChannel;
    private memoryLog: string[] = [];

    constructor(name: string) {
        this.channel = vscode.window.createOutputChannel(name);
    }

    public append(value: string) {
        this.memoryLog.push(value);
        this.channel.append(value);
    }

    public appendLine(value: string) {
        this.memoryLog.push(value + '\n');
        this.channel.appendLine(value);
    }

    public clear() {
        this.memoryLog = [];
        this.channel.clear();
    }

    public toString(): string {
        return this.memoryLog.join('');
    }

    public show(preserveFocus?: boolean) {
        this.channel.show(preserveFocus);
    }

    public dispose() {
        this.channel.dispose();
    }
}