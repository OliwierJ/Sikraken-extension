import * as assert from "node:assert";
import { runSikraken } from "../../services/sikrakenRunner";

/**
 * This file contains unit tests for the `runSikraken` function in the Sikraken Runner service.
 * It tests various scenarios including invalid budget values, non-existent input files,
 * and non-writable output directories. The tests ensure that the function behaves as expected
 * and throws appropriate errors for invalid inputs.
 */
suite("Unit: Sikraken Runner", () => {

    const budgetValues = [-1, 0, 3.14, 'ten'];
    budgetValues.forEach((budget) => {
        test(`rejects invalid budget value: ${budget}`, async () => {
            await assert.rejects(
                async () =>
                    await runSikraken({
                        scriptPath: '/path/to/sikraken.sh',
                        inputPath: '/path/to/input.c',
                        outputFileName: 'output',
                        outputDir: '/path/to/output',
                        budget: budget as any,
                    }),
                /Sikraken budget must be a positive integer/,
            );
        });
    });

    test('rejects non-existent input file', async () => {
        await assert.rejects(
            async () =>
                await runSikraken({
                    scriptPath: '/path/to/sikraken.sh',
                    inputPath: '/path/to/nonexistent.c',
                    outputFileName: 'output',
                    outputDir: '/path/to/output',
                }),
            /Could not access Sikraken input/,
        );
    });

    test('rejects input path equal to output directory', async () => {
        const tempDir = '/tmp/sikraken_test';
        await assert.rejects(
            async () =>
                await runSikraken({
                    scriptPath: '/path/to/sikraken.sh',
                    inputPath: tempDir,
                    outputFileName: 'output',
                    outputDir: tempDir,
                }),
            /Sikraken input is not a file/,
        );
    });

    test('rejects non-writable output directory', async () => {
        const tempDir = '/fake/dir/sikraken_test';
        await assert.rejects(
            async () =>
                await runSikraken({
                    scriptPath: '/path/to/sikraken.sh',
                    inputPath: 'SampleCode/simple_if.c',
                    outputFileName: 'output',
                    outputDir: tempDir,
                }),
            /Sikraken output directory is not writable/,
        );
    }); 

    test('cancellation through AbortSignal', async () => {
        const abortController = new AbortController();
        const abortSignal = abortController.signal;

        // Start the Sikraken run in a separate async function
        const sikrakenRunPromise = runSikraken({
            scriptPath: '/path/to/sikraken.sh',
            inputPath: 'SampleCode/simple_if.c',
            outputFileName: 'output',
            outputDir: '/tmp/sikraken_test',
            signal: abortSignal,
        });

        // Immediately cancel the operation
        abortController.abort();

        await assert.rejects(
            async () => await sikrakenRunPromise,
            /Sikraken execution cancelled/,
        );
    });
});