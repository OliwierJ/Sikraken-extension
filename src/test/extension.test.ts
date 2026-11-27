import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { runSikraken, runSikrakenUnityTests } from '../services/sikrakenRunner';

suite('Integration: Sikraken v3 real-code workflow', () => {
	test('generates, compiles, and runs a Unity test suite for a demo function', async function () {
		this.timeout(60_000);

		const sikrakenRoot = path.resolve(__dirname, '../../lib/sikraken');
		const sourcePath = path.join(sikrakenRoot, 'demo/real_code/linked_list.c');
		const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sikraken-v3-integration-'));
		const functionName = 'list_find';
		const generatedTestPath = path.join(
			outputDir,
			'linked_list',
			'unity',
			`test_linked_list_${functionName}.c`,
		);

		try {
			await runSikraken({
				scriptPath: path.join(sikrakenRoot, 'bin/sikraken.sh'),
				inputPath: sourcePath,
				outputDir,
				functionName,
				budget: 10,
			});
			assert.ok((await fs.stat(generatedTestPath)).isFile());

			const validation = await runSikrakenUnityTests({
				scriptPath: path.join(sikrakenRoot, 'bin/run_unity.sh'),
				inputPath: sourcePath,
				outputDir,
				functionName,
			});
			assert.match(validation.stdout, /Unity tests: 2, Unity failures: 0/);
			assert.match(validation.stdout, /gcov branches: \d+(?:\.\d+)?% of \d+/);
		} finally {
			await fs.rm(outputDir, { recursive: true, force: true });
		}
	});
});
