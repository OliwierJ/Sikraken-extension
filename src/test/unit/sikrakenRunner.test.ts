import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { runSikraken, runSikrakenUnityTests } from '../../services/sikrakenRunner';

suite('Unit: Sikraken Runner', () => {
	test('rejects invalid budgets', async () => {
		for (const budget of [-1, 0, 3.14]) {
			await assert.rejects(
				runSikraken({
					scriptPath: '/path/to/sikraken.sh',
					inputPath: '/path/to/input.c',
					outputDir: '/tmp/sikraken-output',
					budget,
				}),
				/Sikraken budget must be a positive integer/,
			);
		}
	});

	test('rejects invalid function names', async () => {
		await assert.rejects(
			runSikraken({
				scriptPath: '/path/to/sikraken.sh',
				inputPath: '/path/to/input.c',
				outputDir: '/tmp/sikraken-output',
				functionName: 'not-a-function',
			}),
			/Sikraken function name must be a C identifier/,
		);
	});

	test('rejects invalid stub names', async () => {
		await assert.rejects(
			runSikraken({
				scriptPath: '/path/to/sikraken.sh',
				inputPath: '/path/to/input.c',
				outputDir: '/tmp/sikraken-output',
				functionName: 'classify',
				stubFunctions: ['not-a-function'],
			}),
			/Sikraken stub name must be a C identifier/,
		);
	});

	test('rejects output directories Sikraken v3 cannot accept', async () => {
		await assert.rejects(
			runSikraken({
				scriptPath: '/path/to/sikraken.sh',
				inputPath: '/path/to/input.c',
				outputDir: '/tmp/sikraken output',
			}),
			/Sikraken output directory cannot contain whitespace/,
		);
	});

	test('rejects a missing input file', async () => {
		await assert.rejects(
			runSikraken({
				scriptPath: '/path/to/sikraken.sh',
				inputPath: '/path/to/nonexistent.c',
				outputDir: '/tmp/sikraken-output',
			}),
			/Could not access Sikraken input/,
		);
	});

	test('passes v3 function-mode options to Sikraken', async () => {
		const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sikraken-runner-'));
		const scriptPath = path.join(temporaryDirectory, 'fake-sikraken.sh');
		const inputPath = path.join(temporaryDirectory, 'input.c');
		const outputDir = path.join(temporaryDirectory, 'output');
		await fs.writeFile(scriptPath, '#!/bin/bash\nprintf "%s\\n" "$@"\n', 'utf8');
		await fs.chmod(scriptPath, 0o755);
		await fs.writeFile(inputPath, 'int classify(int value) { return value > 0; }\n', 'utf8');

		try {
			const result = await runSikraken({
				scriptPath,
				inputPath,
				outputDir,
				functionName: 'classify',
				stubFunctions: ['read_temperature', 'set_heater'],
				ignoreInitialisers: true,
				budget: 12,
			});
			assert.match(result.stdout, /budget\[12\]/);
			assert.match(result.stdout, /--coverage\ncondition/);
			assert.match(result.stdout, /--function\nclassify/);
			assert.match(result.stdout, /--ignore-initialisers/);
			assert.match(result.stdout, /--stub\nread_temperature/);
			assert.match(result.stdout, /--stub\nset_heater/);
			assert.match(result.stdout, new RegExp(inputPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
		} finally {
			await fs.rm(temporaryDirectory, { recursive: true, force: true });
		}
	});

	test('reports Unity validation failures with process output', async () => {
		const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sikraken-unity-'));
		const scriptPath = path.join(temporaryDirectory, 'fake-run-unity.sh');
		const inputPath = path.join(temporaryDirectory, 'input.c');
		await fs.writeFile(scriptPath, '#!/bin/bash\necho "compile failed"\nexit 2\n', 'utf8');
		await fs.chmod(scriptPath, 0o755);
		await fs.writeFile(inputPath, 'int classify(void) { return 1; }\n', 'utf8');

		try {
			await assert.rejects(
				runSikrakenUnityTests({
					scriptPath,
					inputPath,
					outputDir: path.join(temporaryDirectory, 'output'),
					functionName: 'classify',
				}),
				/Unity test validation failed \(2\): compile failed/,
			);
		} finally {
			await fs.rm(temporaryDirectory, { recursive: true, force: true });
		}
	});
});
