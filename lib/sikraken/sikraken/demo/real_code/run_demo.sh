#!/bin/bash
# Usage: demo/real_code/run_demo.sh [example ...]      (examples: thermostat ring_buffer linked_list parse_port; default: all)
# Runs Sikraken in real-code mode on each function of the demo examples, then compiles and runs the Unity tests it wrote
# (bin/run_unity.sh), and prints for each function: the tests written, Unity's result, and gcov's branch coverage of that
# function (gcov's own figure for the whole file counts the functions that this run did not test). See demo/real_code/README.md
DEMO_DIR="$(cd "$(dirname "$0")" && pwd)"
SIKRAKEN_DIR="$(realpath "$DEMO_DIR/../..")"
OUTPUT_DIR="$SIKRAKEN_DIR/sikraken_output"
cd "$SIKRAKEN_DIR" || exit 2
[ -x bin/sikraken_parser.exe ] || ./bin/compile_parser.sh > /dev/null || exit 2

# example | function | the options of sikraken.sh | the functions of the file whose gcov figures are shown
demos=(
    "thermostat|thermostat_step|--stub read_temperature --stub set_heater|thermostat_step"
    "ring_buffer|rb_push||rb_push rb_valid"
    "ring_buffer|rb_pop||rb_pop rb_valid"
    "linked_list|list_find||list_find"
    "linked_list|list_remove||list_remove"
    "linked_list|list_is_sorted||list_is_sorted"
    "parse_port|parse_port||parse_port"
    "parse_port|port_or_exit||port_or_exit parse_port"
)
wanted=("$@")
status=0
for demo in "${demos[@]}"; do
    IFS='|' read -r example function options shown <<< "$demo"
    if [ ${#wanted[@]} -gt 0 ] && [[ ! " ${wanted[*]} " == *" $example "* ]]; then continue; fi
    c_file="demo/real_code/$example.c"
    echo "=== $example.c: $function"
    log="$OUTPUT_DIR/$example/sikraken_$function.log"
    mkdir -p "$OUTPUT_DIR/$example"
    # shellcheck disable=SC2086  # the options are words
    ./bin/sikraken.sh release 'budget[10]' --coverage condition --function "$function" $options "$c_file" > "$log" 2>&1
    echo "  Sikraken: $(grep -m1 -oE 'Generated: [0-9]+ tests' "$log"), its own count of gcov's branches covered: $(grep -m1 "Coverage of gcov's branches:" "$log" | sed 's/.*:[[:space:]]*//')"
    echo "  its log: $log"
    unity_log="$OUTPUT_DIR/$example/unity_$function.log"
    ./bin/run_unity.sh "$c_file" -64 "$function" > "$unity_log" 2>&1 || status=1
    echo "  $(grep -m1 '^Unity tests:' "$unity_log" || echo "Unity: see $unity_log")"
    build_dir="$OUTPUT_DIR/$example/unity/build/$function"
    gcov_text=$(cd "$build_dir" && gcov -b -c -f -n -o . "../../test_${example}_$function.c" 2>/dev/null)
    for f in $shown; do
        echo "$gcov_text" | awk -v f="$f" '
            $0 == "Function \047" f "\047" { mine = 1; next }
            mine && /^Taken at least once:/ { sub(/^Taken at least once:/, ""); printf "  gcov, %s: branches taken %s\n", f, $0; mine = 0 }
            mine && /^No branches/ { printf "  gcov, %s: no branches\n", f; mine = 0 }'
    done
    echo "  the tests: $OUTPUT_DIR/$example/unity/test_${example}_$function.c"
done
exit $status
