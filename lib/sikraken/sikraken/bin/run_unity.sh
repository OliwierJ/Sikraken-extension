#!/bin/bash
# Usage: run_unity.sh [--output-dir=DIR] <relative_path_to_c_file> <-32|-64> <function>
# 24/11/26 V3 step 0 (docs/v3_function_inputs.md): runs the Unity test that Sikraken writes in real-code mode for a function of a C file, the
# real-code mode's counterpart of run_testcov.sh. The test, <output dir>/<name>/unity/test_<name>_<function>.c (one per function since V3 step 2),
# #includes the C file by its name (so that its static functions and globals can be reached): it is compiled with the C file's folder on the
# include path and with Unity (Unity/, v2.7.0, MIT), run, and its coverage measured by gcov. Printed at the end:
#   Unity tests: N, Unity failures: F, Unity ignored: I      (from Unity's own summary; a failing test means Sikraken is wrong somewhere,
#                                                           see the rules of docs/v3_function_inputs.md for the known exceptions)
#   gcov branches: P% of B (taken at least once), lines: L% of M     (of the C file under test only, not of the test or of Unity)
# The build, the run's output and gcov's files are in <output dir>/<name>/unity/build/<function>/. Exit status: 0 all tests pass, 1 a test failed or the
# test program did not end normally, 2 the test did not compile (or is missing)
# Compiled at -O0 with -fwrapv: undefined behaviour is modelled as GCC behaves (the rules of docs/v3_function_inputs.md), and -fwrapv makes
# GCC's wrap of signed overflow certain. The floating point arithmetic is GCC's default, as Sikraken models it in real-code mode (F1 and F2 of
# the PTC-Solver): the x87's 80 bits under -m32, the type's own precision (SSE) under -m64. UNITY_SUPPORT_64: the tests assert integers with
# Unity's 64-bit macros
# 24/11/26 V3 step 3: -DSIKRAKEN_GCOV makes a test whose program aborts write its gcov counts first (an abort runs no exit handler); the stubs that
# the test defines (sikraken.sh --stub), named by its line "/* Stubs: ...", are linked in place of their functions (-Wl,--wrap=NAME: the calls of
# NAME go to the test's __wrap_NAME). The test is linked with what the function under test can reach only (-ffunction-sections, --gc-sections): the
# other functions of the file may call functions that neither the file, the C library nor a stub defines (another function's stub, a function of
# another file of the project); gcov still counts their branches, as never taken (checked with gcc 15.2, -m32 and -m64)
# --output-dir: the folder given to sikraken.sh with its own --output-dir (default: <install dir>/sikraken_output)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SIKRAKEN_INSTALL_DIR="$(realpath "$SCRIPT_DIR/..")"
echo "Running script: $0 $@"

output_base_dir="$SIKRAKEN_INSTALL_DIR/sikraken_output"
if [[ "$1" == --output-dir=* ]]; then
    output_base_dir="$(realpath -m "${1#*=}")"
    shift
fi
if [ $# -ne 3 ]; then
    echo "Usage: $0 [--output-dir=DIR] <relative_path_to_c_file> <-32|-64> <function>"
    exit 2
fi
rel_path_c_file="$1"
function_name="$3"
if [[ ! "$function_name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    echo "Sikraken ERROR: the function is a C identifier, not $function_name"
    exit 2
fi
case "$2" in
    -32) model_flags=(-m32);;
    -64) model_flags=(-m64);;
    *) echo "Sikraken ERROR: the data model is -32 or -64, not $2"; exit 2;;
esac

# if user gave absolute path then keep it as-is, otherwise prepend SIKRAKEN_INSTALL_DIR
if [[ "$rel_path_c_file" = /* ]]; then
    full_c_file="$(realpath -m "$rel_path_c_file")"
else
    full_c_file="$(realpath -m "$SIKRAKEN_INSTALL_DIR/$rel_path_c_file")"
fi
c_dir="$(dirname "$full_c_file")"
base_name="$(basename "${full_c_file%.*}")"
unity_dir="$output_base_dir/$base_name/unity"
test_name="test_${base_name}_$function_name"
test_file="$unity_dir/$test_name.c"
build_dir="$unity_dir/build/$function_name"
if [ ! -f "$test_file" ]; then
    echo "Sikraken ERROR: no Unity test $test_file"
    exit 2
fi
rm -rf "$build_dir"
mkdir -p "$build_dir"

# --- Compile: the test (which includes the C file) with coverage, Unity without ---
common_flags=("${model_flags[@]}" -O0 -fwrapv -g -DUNITY_INCLUDE_DOUBLE -DUNITY_SUPPORT_64 -I"$SIKRAKEN_INSTALL_DIR/Unity" -I"$c_dir")
wrap_flags=()
for stub in $(sed -n 's|^/\* Stubs: \([A-Za-z0-9_ ]*\) (.*|\1|p' "$test_file" | head -1); do
    wrap_flags+=("-Wl,--wrap=$stub")
done
compile_log="$build_dir/compile.log"
if ! { gcc "${common_flags[@]}" --coverage -DSIKRAKEN_GCOV -ffunction-sections -c "$test_file" -o "$build_dir/$test_name.o" \
       && gcc "${common_flags[@]}" -c "$SIKRAKEN_INSTALL_DIR/Unity/unity.c" -o "$build_dir/unity.o" \
       && gcc "${model_flags[@]}" --coverage -Wl,--gc-sections "${wrap_flags[@]}" "$build_dir/$test_name.o" "$build_dir/unity.o" -lm -o "$build_dir/$test_name"; } > "$compile_log" 2>&1; then
    cat "$compile_log"
    echo "Sikraken ERROR: the Unity test did not compile (see $compile_log)"
    exit 2
fi

# --- Run: a test program that does not end within the limit is a failure ---
run_log="$build_dir/run.log"
(cd "$build_dir" && timeout 60 "./$test_name") > "$run_log" 2>&1
run_status=$?
cat "$run_log"
summary=$(grep -E "^[0-9]+ Tests [0-9]+ Failures [0-9]+ Ignored" "$run_log" | tail -1)
tests=$(echo "$summary" | awk '{print $1}')
failures=$(echo "$summary" | awk '{print $3}')
ignored=$(echo "$summary" | awk '{print $5}')

# --- Coverage of the C file under test (gcov reports each source file of the test's object: the C file is one of them) ---
gcov_log="$build_dir/gcov.log"
(cd "$build_dir" && gcov -b -c -o "$build_dir" "$test_file") > "$gcov_log" 2>&1
coverage=$(awk -v f="$full_c_file" -v b="$base_name" '
    /^File / { name = $2; gsub("\047", "", name); mine = (name == f || name ~ ("(^|/)" b "\\.[ci]$")) }
    /^$/ { mine = 0 }       # the end of a file'"'"'s section: the total that gcov prints last is not the C file'"'"'s
    mine && /^Lines executed:/ { v = $0; sub(/^Lines executed:/, "", v); split(v, a, " "); lines = a[1]; lines_of = a[3] }
    mine && /^Taken at least once:/ { v = $0; sub(/^Taken at least once:/, "", v); split(v, a, " "); branches = a[1]; branches_of = a[3] }
    mine && /^No branches/ { branches = "none"; branches_of = 0 }
    END { if (lines != "") printf "gcov branches: %s of %s (taken at least once), lines: %s of %s\n", branches, branches_of, lines, lines_of }' "$gcov_log")

echo "Unity tests: ${tests:-none}, Unity failures: ${failures:-none}, Unity ignored: ${ignored:-none}"
echo "${coverage:-gcov: no coverage found for $full_c_file (see $gcov_log)}"
if [ "$run_status" -ne 0 ] || [ -z "$summary" ] || [ "$failures" != "0" ]; then
    [ -z "$summary" ] && echo "Sikraken ERROR: the test program did not end normally (exit status $run_status, see $run_log)"
    exit 1
fi
exit 0
