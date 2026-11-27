/**
 * Sikraken MCP server (spike).
 *
 * Place this folder at <extension-repo>/mcp/. It reuses two vscode-free modules
 * from the extension (sikrakenRunner, testInputParser) so there is no duplicate logic.
 *
 * RULE: stdout is the protocol channel. Never console.log here; use console.error.
 */
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { runSikraken } from '../src/services/sikrakenRunner';
import { extractNondeterministicVariables, parseTestInputsXML } from '../src/services/testInputParser';

const SIKRAKEN_ROOT = process.env.SIKRAKEN_ROOT ?? path.resolve(__dirname, '../lib/sikraken');
const SCRIPT_PATH = path.join(SIKRAKEN_ROOT, 'bin/sikraken.sh');
const VERSION_PATH = path.join(SIKRAKEN_ROOT, 'bin/version.txt');
const MAX_BUDGET_SECONDS = 120; // an agent should not be able to block for 15 minutes

const server = new McpServer({ name: 'sikraken', version: '0.0.1' });

// ---------------------------------------------------------------------------
// Tool 1: get_capabilities. Static facts so the agent can decide if Sikraken fits.
// ---------------------------------------------------------------------------
server.registerTool(
	'get_capabilities',
	{
		title: 'Sikraken capabilities and limits',
		description:
			'Returns the Sikraken version, what it can analyse, and its known limitations. ' +
			'Call this first to decide whether Sikraken suits the code you are working on.',
	},
	async () => {
		const version = (await fs.readFile(VERSION_PATH, 'utf8').catch(() => 'unknown')).split('\n')[0].trim();
		const capabilities = {
			version,
			platform: 'Linux x86_64; real-code mode uses gcc -m64, while Test-Comp mode may require gcc -m32 support',
			approach: 'Symbolic execution with Test-Comp and real-code modes; real-code mode writes executable Unity tests',
			realCodeMode: 'Pass --function NAME to generate characterisation tests from function parameters, reachable memory, globals, and declared stubs',
			inputMechanism: 'Test-Comp mode uses __VERIFIER_nondet_<type>(); real-code mode derives inputs from the selected function',
			supported: [
				'function parameters, including pointers and reachable struct/array memory',
				'globals read before being written and explicit --stub functions',
				'function results, modified globals and input memory, stub call counts, exit and abort outcomes',
				'Unity test generation and execution with gcov coverage measurement',
			],
			notSupported: [
				'by-value struct parameters, void pointers, function pointers and variadic arguments',
				'pointer aliasing, cycles, and input pointer chains deeper than nine objects',
				'state that requires multiple calls to the function',
				'unmodelled external calls without a declared --stub',
			],
			caveats: [
				'Each real-code test starts from the C runtime initial state and characterises current behaviour',
				'Generated tests passing does not prove correctness; signed overflow and floating-point modelling have documented limits',
				'This MCP server tool currently exposes Test-Comp test-input generation; the VS Code command uses real-code Unity mode',
			],
		};
		return { content: [{ type: 'text', text: JSON.stringify(capabilities, null, 2) }] };
	},
);

// ---------------------------------------------------------------------------
// Tool 2: generate_test_inputs. Test-Comp mode remains available for C files
// that provide a nondeterministic main; the VS Code extension uses v3 real-code mode.
// ---------------------------------------------------------------------------
const inputShape = {
	file: z.string().describe('Absolute path to a C file that contains a main() calling __VERIFIER_nondet_*()'),
	budget_seconds: z
		.number().int().min(1).max(MAX_BUDGET_SECONDS).default(10)
		.describe('Time budget for the search. Larger budgets can find more paths. Default 10.'),
};

const outputShape = {
	testCount: z.number(),
	tests: z.array(z.object({
		file: z.string(),
		inputs: z.array(z.object({ variable: z.string(), value: z.string() })),
	})),
	outputDirectory: z.string(),
};

server.registerTool(
	'generate_test_inputs',
	{
		title: 'Generate Test-Comp test inputs',
		description:
			'Runs Sikraken v3 in Test-Comp mode on a C file and returns concrete input values, one set per generated test. ' +
			'The file must contain a main() that obtains its inputs from __VERIFIER_nondet_<type>() calls; ' +
			'plain functions are NOT yet supported by this tool. Blocks for up to budget_seconds. ' +
			'Linux x86_64 only.',
		inputSchema: inputShape,
		outputSchema: outputShape,
	},
	async ({ file, budget_seconds }, extra) => {
		if (!path.isAbsolute(file) || !file.endsWith('.c')) {
			return fail('`file` must be an absolute path to a .c file.');
		}

		const fileName = path.basename(file, '.c');
		const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sikraken-mcp-')); // no spaces: sikraken.sh rejects them

		try {
			await runSikraken({
				scriptPath: SCRIPT_PATH,
				inputPath: file,
				outputDir,
				budget: budget_seconds,
				signal: extra.signal, // client cancellation aborts the child process
			});

			const suiteDir = path.join(outputDir, fileName, 'test-suite');
			const xmlFiles = (await fs.readdir(suiteDir))
				.filter((f) => f.startsWith('test_input-') && f.endsWith('.xml'))
				.sort();

			const variables = extractNondeterministicVariables(await fs.readFile(file, 'utf8'));
			const tests = await Promise.all(xmlFiles.map(async (xml) => {
				const values = parseTestInputsXML(await fs.readFile(path.join(suiteDir, xml), 'utf8'));
				return {
					file: xml,
					inputs: values.map((value, i) => ({ variable: variables[i] ?? `input${i + 1}`, value })),
				};
			}));

			const result = { testCount: tests.length, tests, outputDirectory: outputDir };
			return {
				content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
				structuredContent: result,
			};
		} catch (error) {
			// Structured, actionable errors are what make a tool usable by an agent.
			return fail(error instanceof Error ? error.message : String(error));
		}
	},
);

function fail(message: string) {
	return { isError: true, content: [{ type: 'text' as const, text: message }] };
}

async function main() {
	await server.connect(new StdioServerTransport());
	console.error('Sikraken MCP server running on stdio');
}

main().catch((error) => {
	console.error('Fatal:', error);
	process.exit(1);
});