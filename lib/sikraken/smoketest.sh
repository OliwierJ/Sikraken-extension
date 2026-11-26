#!/usr/bin/env bash
# The quickest check that Sikraken runs: a small program, and no error or warning of ECLiPSe while it loads the symbolic executor.
# 13/11/26: a run goes on, and exits 0, after ECLiPSe has refused clauses of a file ("procedure clauses are not consecutive", a syntax
# error): what they defined is missing from that run, silently (atry_strcpy wrote no test for a day). Such a message fails the smoke test.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)" #Get the directory of the script <sikraken_install>/bin
output=$("$SCRIPT_DIR/bin/sikraken.sh" release budget[1] --coverage branch -m32 --ss=1 SampleCode/simple_if.c 2>&1)
status=$?
echo "$output"
if [ $status -ne 0 ]; then
    echo "Smoke test failed: sikraken.sh exited with status $status"
    exit 1
fi
load_messages=$(echo "$output" | grep -E -i -A2 '^ERROR: |^WARNING: |syntax error|not consecutive')
if [ -n "$load_messages" ]; then
    echo "Smoke test failed: ECLiPSe reported errors or warnings while loading the symbolic executor:"
    echo "$load_messages"
    exit 1
fi
exit 0
