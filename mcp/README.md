# Sikraken MCP server (spike)

This server exposes Sikraken's Test-Comp mode through MCP. Its
`generate_test_inputs` tool expects a C file with `main()` calling
`__VERIFIER_nondet_*()` and returns the generated XML test inputs. It does not
yet expose Sikraken 3.0's real-code Unity workflow; that workflow is integrated
in the VS Code extension.

## Setup (Linux x86_64)

```bash
cd mcp
npm install
```

Set `SIKRAKEN_ROOT` if Sikraken is not in `../lib/sikraken`.

## Try it with MCP Inspector

```bash
npm run inspect
```

Call `get_capabilities`, then `generate_test_inputs` with:

```json
{"file": "/absolute/path/to/SampleCode/simple_if.c", "budget_seconds": 5}
```

## Connect Claude Code

```bash
claude mcp add sikraken -- npx tsx /absolute/path/to/repo/mcp/server.ts
```

## Connect Claude Desktop

Add the server to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sikraken": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/repo/mcp/server.ts"]
    }
  }
}
```

The MCP tool intentionally remains limited to Test-Comp inputs. Function-level
Unity generation and execution are available through the extension's
**Generate and Validate Unity Tests with Sikraken** command.
