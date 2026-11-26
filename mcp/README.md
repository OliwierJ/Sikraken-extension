# Sikraken MCP spike

## Setup (Linux x86_64, same machine that runs Sikraken)
    cd mcp && npm install

## Try it without an AI: MCP Inspector
    npm run inspect
Call `get_capabilities`, then `generate_test_inputs` with
`{"file": "/abs/path/SampleCode/simple_if.c", "budget_seconds": 5}`.
Expected: two tests (one with x > 0, one without).

## Connect Claude Code
    claude mcp add sikraken -- npx tsx /abs/path/to/repo/mcp/server.ts

## Connect Claude Desktop (claude_desktop_config.json)
    { "mcpServers": { "sikraken": {
        "command": "npx",
        "args": ["tsx", "/abs/path/to/repo/mcp/server.ts"] } } }

Then ask: "Use Sikraken to find inputs covering all branches of
/abs/path/SampleCode/simple_if.c".

## Known gaps (next steps)
1. Function-level tool: needs parseFunction/createIncludeHarness moved out of
   documentTransformer.ts (it imports `vscode` at top level) into a vscode-free module.
2. check_function: return structured reasons (unsupported_param: struct UartConfig).
3. Progress notifications and the constraints file (.vscode/sikraken.json) as tool input.
4. testInputParser.ts should use `import type` for FunctionParameter so it never pulls in vscode.