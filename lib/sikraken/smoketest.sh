#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)" #Get the directory of the script <sikraken_install>/bin
"$SCRIPT_DIR/bin/sikraken.sh" release budget[1] --coverage branch -m32 --ss=1 SampleCode/simple_if.c