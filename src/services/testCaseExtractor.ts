import * as vscode from 'vscode';
import { TestInput } from './testInputParser';
import { TestFunction } from '../types';
import { unityAssertionTemplate } from '../templates';
import { evaluateFunctionInput } from './inputEvaluator';

interface GenerateTestCasesParams {
	testInputs: TestInput[];
	generateOutputs: boolean;
	progress: vscode.Progress<{ increment: number; message?: string }>;
	harness: any;
	parsedFunction: any;
	functionContext: any;
	tempDirectory: string;
}

export async function generateTestCases(params: GenerateTestCasesParams) {
	let currentIndex = 1;
	let loopProgress = 0;
	let testCases: TestFunction[] = [];
	const outputChannel = vscode.window.createOutputChannel('Sikraken Test Inputs');

	for (const testInput of params.testInputs) {
		outputChannel.appendLine(`--- ${testInput.fileName} ---`);

		// Check to see if there are any inputs
		if (testInput.inputs.length === 0) {
			vscode.window.showWarningMessage(`Sikraken found no test inputs for ${params.harness.originalName}. 
                Sikraken requires at least one branching point in the function to generate test inputs. Please ensure 
                that the function has at least one branching point (e.g., if statement, loop, etc.) and try again.`);
			return;
		}

		for (let index = 0; index < testInput.inputs.length; index++) {
			const variable = params.harness.parameters[index].name ?? `input${index + 1}`;
			outputChannel.appendLine(`${variable} = ${testInput.inputs[index]}`);
		}

		const testCaseName = `test_case_${currentIndex}`;
		let expectedResult = 'EXPECTED_RESULT';

		loopProgress = params.testInputs.length / 30; // 30% of the progress bar is allocated to extracting test inputs
		params.progress.report({ increment: loopProgress, message: `Extracting test inputs... (${currentIndex}/${params.testInputs.length})` });

		if (params.generateOutputs) {
			// Evaluate the function with the generated inputs to an expected result
			try {
				expectedResult = await evaluateFunctionInput({
					sourcePath: params.functionContext.sourceFile.path,
					functionName: params.harness.originalName,
					returnType: params.parsedFunction.returnType,
					parameters: params.harness.parameters,
					inputs: testInput.inputs,
					workingDirectory: params.tempDirectory,
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				vscode.window.showErrorMessage(`Could not evaluate ${testInput.fileName}: ${message}`);
				return;
			}
		}
		// If not generating outputs, put a placeholder in the test case body
		const testCaseBody = unityAssertionTemplate(
			expectedResult,
			`${params.harness.originalName}(${testInput.inputs.join(', ')})`,
			params.parsedFunction.returnType,
		);
		testCases.push({
			name: testCaseName,
			body: testCaseBody,
		});

		currentIndex++;
	}

	outputChannel.show(true);

	return testCases;
}
