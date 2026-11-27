import * as assert from 'assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { loadSikrakenSettings } from '../../settings';
import { createDebugRun } from '../../services/debugArtifacts';
import { runSikraken } from '../../services/sikrakenRunner';

suite('Unit: Extension Configuration Test Suite', () => {

	test('loads the registered default Sikraken settings', () => {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		assert.ok(workspaceFolder, 'The test must run with a workspace folder.');

		const configuration = vscode.workspace.getConfiguration('sikraken', workspaceFolder.uri);
		assert.strictEqual(configuration.inspect('sikrakenBudget')?.defaultValue, 10);
		assert.deepStrictEqual(configuration.inspect('stubFunctions')?.defaultValue, []);
		assert.strictEqual(configuration.inspect('ignoreInitialisers')?.defaultValue, false);
        assert.strictEqual(configuration.inspect('debugMode')?.defaultValue, false);
	});

	test('loads workspace-specific Sikraken settings for the source resource', async () => {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		assert.ok(workspaceFolder, 'The test must run with a workspace folder.');

		const configuration = vscode.workspace.getConfiguration('sikraken', workspaceFolder.uri);
		const keys = ['sikrakenBudget', 'stubFunctions', 'ignoreInitialisers', 'debugMode'] as const;
		const previousValues = new Map(keys.map((key) => [key, configuration.inspect(key)?.workspaceValue]));

		try {
			await configuration.update('sikrakenBudget', 23, vscode.ConfigurationTarget.Workspace);
			await configuration.update('stubFunctions', ['read_temperature'], vscode.ConfigurationTarget.Workspace);
			await configuration.update('ignoreInitialisers', true, vscode.ConfigurationTarget.Workspace);
			await configuration.update('debugMode', true, vscode.ConfigurationTarget.Workspace);

			assert.deepStrictEqual(loadSikrakenSettings(workspaceFolder.uri), {
				sikrakenBudget: 23,
				stubFunctions: ['read_temperature'],
				ignoreInitialisers: true,
                debugMode: true
			});
		} finally {
			for (const key of keys) {
				await configuration.update(key, previousValues.get(key), vscode.ConfigurationTarget.Workspace);
			}
		}
	});

    test('persists debug runner logs and metadata', async () => {
		const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sikraken-debug-test-'));
		const scriptPath = path.join(temporaryDirectory, 'fake-sikraken.sh');
		const inputPath = path.join(temporaryDirectory, 'input.c');
		await fs.writeFile(scriptPath, '#!/bin/bash\necho debug-stdout\necho debug-stderr >&2\n', 'utf8');
		await fs.writeFile(inputPath, 'int main(void) { return 0; }\n', 'utf8');

		try {
			const debugRun = await createDebugRun(temporaryDirectory);
			await runSikraken({
				scriptPath,
				inputPath,
				outputDir: debugRun.outputDirectory,
				debugMode: true,
				debugArtifactsDir: debugRun.runDirectory,
			});

			assert.match(await fs.readFile(path.join(debugRun.runDirectory, 'sikraken-stdout.log'), 'utf8'), /debug-stdout/);
			assert.match(await fs.readFile(path.join(debugRun.runDirectory, 'sikraken-stderr.log'), 'utf8'), /debug-stderr/);
			const metadata = JSON.parse(await fs.readFile(path.join(debugRun.runDirectory, 'sikraken-metadata.json'), 'utf8')) as {
				status: string;
			};
			assert.strictEqual(metadata.status, 'success');
		} finally {
			await fs.rm(temporaryDirectory, { recursive: true, force: true });
		}
	});

});
