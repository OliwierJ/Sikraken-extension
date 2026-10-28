import * as vscode from 'vscode';

/**
 * Determines whether to generate expected outputs for a test case.
 * @returns A promise that resolves to a boolean indicating whether to generate outputs.
 */
export async function determineOutputGeneration(): Promise<boolean> {
    // Retrieve the user's preference for test generation mode from the extension's configuration
    const testGenerationSettings = vscode.workspace.getConfiguration('sikraken').get('testGenerationMode');
    
    let generateOutputs = true; // Default to true

    // Only prompt the user if the setting is set to 'prompt'
    if (testGenerationSettings === 'prompt') {
        
        const userChoice = await vscode.window.showQuickPick(['Yes [default]', 'No'], {
            placeHolder: 'Generate expected outputs for selected function?'
        });

        if (userChoice === 'No') {
            generateOutputs = false;
        }
    }
    if (testGenerationSettings === 'userSpecified') {
        generateOutputs = false;
    }

    return generateOutputs;
}