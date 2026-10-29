# Change Log

## v0.1.1-alpha — Initial Release

This is the first alpha release of the Sikraken VS Code extension.
### Added

- Run Sikraken directly on an active C source file.
- Generate tests for the function containing the cursor.
- Generate Unity test suites from discovered inputs.
- Display generated test inputs in a dedicated VS Code output channel.
- Support scalar function parameters and return types, including:
- Signed and unsigned integer types
- char, short, int, long, and long long
- float and double
- const-qualified scalar types
- Add configurable test-generation modes and Unity framework selection.
- Include automated tests for parsing, harness generation, input evaluation, and Sikraken execution.

### Known limitations

- Function generation does not currently support arrays, pointers, structs, enums, function pointers, or variadic arguments.
- Functions returning void cannot currently generate assertions.
- Function selection depends on VS Code C document symbols.
- The bundled Sikraken runtime currently supports Linux only.
- Generated output should be validated before being treated as a fully runnable test suite.

This release provides an initial working integration between VS Code, Sikraken, and Unity-based C test generation.

Full Changelog: https://github.com/OliwierJ/Sikraken-extension/commits/