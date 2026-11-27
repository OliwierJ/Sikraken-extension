# Sikraken VS Code Extension

The extension integrates Sikraken 3.0 real-code mode into VS Code. It asks
Sikraken to generate Unity characterization tests for a C function, then
compiles and runs those tests with Sikraken's Unity runner and reports gcov
coverage. Sikraken itself provides the analysis and test generation; the
extension does not build a separate function harness.

## Features

- Generate tests for the C function under the cursor, or select a function
  from the active C file.
- Use Sikraken's v3 support for pointers, arrays, structs in reachable memory,
  globals, declared stubs, and function side effects.
- Compile and execute generated Unity tests, and show test and coverage results.
- Keep generated files and optional debug logs in the extension's storage area.

## Requirements

- VS Code `1.140` or newer and Node.js/npm when building from source.
- Linux x86_64.
- The bundled Sikraken 3.0 runtime under `lib/sikraken`.
- Bash, `timeout`, `prlimit`, GCC with 64-bit support, and `gcov`.

On Ubuntu, install the host tools with:

```bash
sudo apt install bash coreutils gcc
```

The Eclipse runtime, parser, and Unity framework are included in the Sikraken
installation. The host compiler and Linux utilities are not. Sikraken is
managed separately from npm and must be installed manually into
`lib/sikraken` if it is not present in the checkout.

## Build and run

```bash
git clone https://github.com/OliwierJ/Sikraken-extension.git
cd Sikraken-extension
# Install Sikraken 3.0 into lib/sikraken
npm install
npm run compile
```

Press `F5` in VS Code to launch the Extension Development Host.

## Usage

1. Open a C source file and place the cursor inside the function to test.
   If the cursor is not inside a function, Sik-Test offers the functions it
   found in the file.
2. Choose **Generate and Validate Unity Tests with Sikraken** from the editor
   context menu or Command Palette.
3. Sikraken generates the Unity test file; the extension compiles and runs it.
   The generated C file opens in the editor, and the **Sikraken** output
   channel shows Sikraken's output, Unity's result, and gcov coverage for the
   complete source file.

Generated test files are runtime output stored under the extension's global
storage directory in `sikraken_output/<source>/unity/`. In debug mode, output
is isolated under the corresponding debug run instead. The tests characterise
the current behavior of the selected function. Enable `sikraken.debugMode` to
save separate Sikraken and Unity logs and metadata. Adjust
`sikraken.sikrakenBudget` to change the generation time budget in seconds. Set
`sikraken.stubFunctions` to the names of declared functions Sikraken should
model as environment stubs, or enable `sikraken.ignoreInitialisers` when
initialized globals should be treated as inputs.

## Limitations

- Sikraken analyses one C file at a time. Functions declared but not defined
  must be modelled by Sikraken or listed in `sikraken.stubFunctions`.
- Tests run one function call from the C runtime's initial state. They do not
  cover behavior that requires state to persist across multiple calls.
- Input pointers do not alias or form cycles, and lazily created pointer
  chains are limited to nine objects.
- By-value struct parameters, `void *`, function pointers, and variadic
  arguments are not supported by the current real-code mode.
- Signed overflow and floating-point behavior have modelling limitations.
- Passing generated Unity tests validates that they compile and match the
  behavior Sikraken modelled; it does not prove that behavior is correct.

The Sikraken installation includes four runnable examples under
`demo/real_code/`; its demo documentation details supported inputs, generated
assertions, and current analysis limits.
