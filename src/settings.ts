import * as vscode from 'vscode';

type TestGenerationMode = 'prompt' | 'characterization' | 'userSpecified';

export type SikrakenSettings = {
    framework: string | 'Unity';
    testGenerationMode: TestGenerationMode;
    sikrakenBudget: number;
    testSuiteOutputDirectory: string;
    debugMode?: boolean;
}

/**
 * Loads the Sikraken settings from the VS Code configuration for the given resource.
 * @param resource The URI of the resource for which to load settings.
 * @returns The Sikraken settings.
 */
export function loadSikrakenSettings(resource: vscode.Uri): SikrakenSettings {
    const config = vscode.workspace.getConfiguration('sikraken', resource);

    return {
        framework: config.get<'Unity'>('framework', 'Unity'),
        testGenerationMode: config.get<TestGenerationMode>('testGenerationMode', 'prompt'),
        sikrakenBudget: config.get<number>('sikrakenBudget', 10),
        testSuiteOutputDirectory: config.get<string>('testSuiteOutputDirectory', './tests'),
        debugMode: config.get<boolean>('debugMode', false),
    };
}

/**
 * Determines whether to generate expected outputs for a test case.
 * @param sikrakenConfig The Sikraken configuration.
 * @returns A promise that resolves to a boolean indicating whether to generate outputs.
 */
export async function determineOutputGeneration(sikrakenConfig: SikrakenSettings): Promise<boolean> {
    // Retrieve the user's preference for test generation mode from the extension's configuration
    const testGenerationSettings = sikrakenConfig.testGenerationMode;    
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