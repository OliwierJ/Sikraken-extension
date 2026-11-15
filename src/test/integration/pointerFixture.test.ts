import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { extractTestInputs } from '../../services/testInputParser';
import { pointerParam } from '../unit/testHelpers';

suite('Integration: Pointer Parameter Handling', () => {
    test('correctly handles pointer parameters in test inputs', async () => {
        
        const sourceFunction = 'int classify(int *value)\n{if (value == NULL) {return 0;}return *value > 10 ? 1 : 0;}';
        
        const functionContext = {
            sourceFile: {
                path: '/tmp/functions.c',
                source: sourceFunction,
            },
            selectedFunction: {
                name: 'classify',
                source: sourceFunction,
            }
        };

        const outputPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sikraken-inputs-'));
        try {
            const parameters = [
                pointerParam('int*', 'ptr', 'int'),
            ];
            await fs.writeFile(path.join(outputPath, 'test_input-1.xml'), '<test><input>1</input><input>0</input></test>');

            assert.deepStrictEqual(
                await extractTestInputs(['test_input-1.xml'], outputPath, parameters),
                [
                    { fileName: 'test_input-1.xml', inputs: ['1'] },
                ],
            );
        } finally {
            await fs.rm(outputPath, { recursive: true, force: true });
        }
    });
});