#!/bin/bash
#
# Script: sikraken.sh
# Author: Chris Meudec
# Date: Nov 2025
# Description: Wrapper for Sikraken symbolic execution tool from C code.
# Example: ./bin/sikraken.sh release budget[3] --ss=1 SampleCode/simple_if.c
#          ./bin/sikraken.sh release budget[3] --coverage reach --reach my_error SampleCode/simple_if.c

start_time=$(date +%s.%1N)

# clear # don't: this breaks CI because it requires a TERMINAL environment, which does not exist in CI mode
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SIKRAKEN_INSTALL_DIR="$SCRIPT_DIR/.."
VERSION_FILE="$SIKRAKEN_INSTALL_DIR/bin/version.txt"
CLI_ERROR=30

# --- Defaults ---
debug_mode="debug"
data_model="-m32"
stack_size_value="$((3 * 953))M" # default 3 GB converted to MiB
algo=""
generate_cfg_png_flag=0
coverage="branch"               # default when --coverage is absent
reach_function="reach_error"    # default when --reach is absent
reach_given=0
rel_path_c_file=""
RD='\033[31m'
YL='\033[33m'    # yellow
NC='\033[0m'

show_help() {
    echo "Usage: ./sikraken.sh <mode> <algorithm> [options] <c_file>"
    echo ""
    echo "Arguments:"
    echo "  <mode>           : debug (default) or release (only affects the test generation)."
    echo "  <algorithm>      : budget[seconds] (e.g., budget[900]), regression[restarts,tries] (e.g., regression[1,100]) or decision[restarts,counter] (e.g., decision[10,500] for 10 restarts of 500 decisions each)."
    echo "  -m32, -m64       : Set the data model (default: -m32)."
    echo "  --ss=STACK_SIZE  : Stack size in decimal GB (default: 3GB)."
    echo "  --testcomp       : Enable TestComp competition mode settings."
    echo "  --generate_cfg_png: Generate a PNG image of the Control Flow Graph."
    echo "  --ol=OUTPUT_LIMIT: Output limit in MB of log file (default 10MB)."
    echo "  --coverage GOAL  : branch (cover as many branches as possible, default)"
    echo "                     or reach (generate a test that calls the --reach function)."
    echo "  --reach FUNCTION : Function to reach with --coverage reach (default: reach_error)."
    echo "  --property-file=F: Test-Comp property file either coverage-branches.prp or coverage-error-call.prp; sets --coverage (and --reach) from its contents."
    echo "  <c_file>         : The C source file (.c or .i): an absolute path, or a path relative to the current directory"
    echo "                     or, failing that, to the Sikraken install directory (e.g., SampleCode/simple_if.c)."
    echo "  -v, --version    : Print the Sikraken version number and exit."
    echo ""
    echo "Example: ./bin/sikraken.sh release budget[1] --ss=1 SampleCode/simple_if.c"
    echo "         ./bin/sikraken.sh release budget[1] --coverage reach SampleCode/simple_if.c"
}

# Same mapping as the parser's to_prolog_var():
# lowercase first letter -> uppercase it; anything else -> prefix "UC_"
to_prolog_var() {
    local name="$1"
    if [[ "${name:0:1}" == [abcdefghijklmnopqrstuvwxyz] ]]; then
        printf '%s' "${name^}"
    else
        printf 'UC_%s' "$name"
    fi
}

# --- Version and Help Checks ---
if [[ "$1" == "-v" || "$1" == "--version" ]]; then   # keep -v: BenchExec's tool-info module uses it
    if [[ -f "$VERSION_FILE" ]]; then
        head -n 1 "$VERSION_FILE"
        exit 0
    else
        echo -e "${RD}Error: $VERSION_FILE not found.${NC}"
        exit $CLI_ERROR
    fi
elif [ "$1" == "--help" ]; then
    show_help
    exit 0
fi

version=$(head -n 1 "$VERSION_FILE" 2>/dev/null)
echo "Sikraken version: $version"
echo "Invoked with command: $0 $@"
testcomp_flag=0
# --- Parse all arguments except last ---
while [[ $# -gt 1 ]]; do
    case "$1" in
        debug|release)
            debug_mode="$1"
            ;;
        budget*|regression*|decision*)
            # Capture the full algorithm string, normalizing delimiters
            algo="${1//[/\(}"
            algo="${algo//]/\)}"
            ;;
        -m32|-m64)
            data_model="$1"
            ;;
        --ss=*)
            # 1. Extract the value after the '=' sign
            stack_size_gb="${1#*=}"
            
            # 2. Validation
            if [[ -z "$stack_size_gb" || ! "$stack_size_gb" =~ ^[0-9]+$ || "$stack_size_gb" -le 0 ]]; then
                echo -e "${RD}Sikraken ERROR: STACK_SIZE for --ss must be a positive integer (GB). Value found: $stack_size_gb${NC}"
                exit $CLI_ERROR
            fi
            
            # 3. Calculate and set the final value in MiB
            stack_size_value="$(( stack_size_gb * 953 ))M"
            ;;
        --ol=*)
            output_limit_mb="${1#*=}"
            if [[ -z "$output_limit_mb" || ! "$output_limit_mb" =~ ^[0-9]+$ || "$output_limit_mb" -le 0 ]]; then
                echo -e "${RD}Sikraken ERROR: OUTPUT_LIMIT for --ol must be a positive integer (MB). Value found: $output_limit_mb${NC}"
                exit $CLI_ERROR
            fi
            ;;
        --testcomp) 
            testcomp_flag=1
            ;;
        --generate_cfg_png)
            generate_cfg_png_flag=1
            ;;
        --coverage)
            # takes a separate value; $# -lt 3 stops the C file being taken as the value
            if [[ $# -lt 3 || ! "$2" =~ ^(branch|reach)$ ]]; then
                echo -e "${RD}Sikraken ERROR: --coverage expects 'branch' or 'reach'${NC}"
                show_help
                exit $CLI_ERROR
            fi
            coverage="$2"
            shift
            ;;
        --property-file=*)
            property_file="${1#*=}"
            if [[ ! -f "$property_file" ]]; then
                property_file="$SIKRAKEN_INSTALL_DIR/properties/$(basename "$property_file")"
                if [[ ! -f "$property_file" ]]; then
                    echo -e "${RD}Sikraken ERROR: property file '${1#*=}' not found.${NC}"
                    exit $CLI_ERROR
                fi
            fi
            prp_contents=$(tr -d '[:space:]' < "$property_file")
            if [[ "$prp_contents" =~ @CALL\(([A-Za-z_][A-Za-z0-9_]*)\) ]]; then
                coverage="reach"
                reach_function="${BASH_REMATCH[1]}"
            elif [[ "$prp_contents" == *"@DECISIONEDGE"* ]]; then
                coverage="branch"
            else
                echo -e "${RD}Sikraken ERROR: unsupported property in '$property_file'.${NC}"
                exit $CLI_ERROR
            fi
            ;;
        --reach)
            if [[ $# -lt 3 || ! "$2" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
                echo -e "${RD}Sikraken ERROR: --reach expects a C function name${NC}"
                show_help
                exit $CLI_ERROR
            fi
            reach_function="$2"
            reach_given=1
            shift
            ;;
        "")
            # .vscode/tasks.json uses an empty pickString value to mean "flag not wanted"
            ;;
        *)
            echo -e "${RD}Sikraken ERROR: Unknown argument: $1${NC}"
            show_help
            exit $CLI_ERROR
            ;;
    esac
    shift
done
if [[ "$reach_given" -eq 1 && "$coverage" != "reach" ]]; then
    echo -e "${RD}Sikraken ERROR: --reach is only valid with --coverage reach${NC}"
    show_help
    exit $CLI_ERROR
fi
local_control_stack_size="953M" #"2000M" #"953M"     #that's in MiB so about 1000MB

# --- Last argument must be C source path ---
# resolved to an absolute path so that Sikraken can be called from any directory: an absolute path is used as is,
# a relative path is looked for from the current directory first, then from the Sikraken install directory
# (the same resolution is done by call_parser.sh, which is also called directly)
rel_path_c_file="$1"
if [[ "$rel_path_c_file" = /* ]]; then
    full_path_c_file="$rel_path_c_file"
elif [[ -f "$rel_path_c_file" ]]; then
    full_path_c_file="$PWD/$rel_path_c_file"
else
    full_path_c_file="$SIKRAKEN_INSTALL_DIR/$rel_path_c_file"
fi
if [[ ! -f "$full_path_c_file" ]]; then
    echo -e "${RD}Sikraken ERROR: C source file '$rel_path_c_file' not found.${NC}"
    show_help
    exit $CLI_ERROR
fi

# -------------------------------------------------------------
# --- SPECIAL CASE OVERRIDE LOGIC ---
# -------------------------------------------------------------
if [ "$testcomp_flag" -eq 1 ]; then
    echo "Sikraken WARNING: --testcomp option detected. Overwriting settings for TestComp run."
    #debug_mode="debug"                 # for pre-runs to get all the debug messages
    #algo="budget(800)"                 # for pre-runs to get the full stats at the end of Sikraken run 
    #stack_size_value="$((2 * 953))M"   # for pre-runs so as not to hit the limit of 3 GB
    debug_mode="release"                # for Test-Comp final-run : less time wasted writing out messages
    algo="budget(900)"                  # for Test-Comp final-run : to use up all the time available
    #stack_size_value="2382M"
    stack_size_value="2859M"           # in MiB 1 GB ==  953 MiB for Test-Comp final-run : high enough GB to be of benefit, but below competition threshold of 15 GB to ensure Sikraken does not get killed
fi
# -------------------------------------------------------------
if [[ -z "$algo" ]]; then
    echo -e "${RD}Sikraken ERROR: no <algorithm> given (budget[..], regression[..] or decision[..]).${NC}"
    show_help
    exit $CLI_ERROR
fi

echo "SIKRAKEN_INSTALL_DIR: $SIKRAKEN_INSTALL_DIR"
echo "Mode: $debug_mode"
echo "Algorithm: $algo"
echo "Data model: $data_model"
echo "Stack size: $stack_size_value"
echo "Coverage: $coverage"
if [[ "$coverage" == "reach" ]]; then
    echo "Reach function: $reach_function"
fi
echo "C file: $rel_path_c_file"

file_name_no_ext="${rel_path_c_file%.*}"
file_name_no_ext=$(basename "$file_name_no_ext")

call_parser="$SIKRAKEN_INSTALL_DIR/bin/call_parser.sh $data_model $full_path_c_file"
echo "Sikraken from $0 says: $call_parser"
$call_parser
ret_code=$?
if [ $ret_code -ne 0 ]; then
    echo "Sikraken ERROR from $0: error code $ret_code, parser failed on: $call_parser"
    exit $ret_code
fi

echo "Sikraken from $0 Successfully preprocessed $rel_path_c_file and ran sikraken_parser."
if [[ $algo =~ ^budget\([0-9]+\)$ ]]; then
  budget="${algo//[!0-9]/}"
  echo "Sikraken from $0 says: Please wait $budget seconds for Sikraken to complete"
else
  budget=900
  echo "Sikraken from $0 says: Please wait for Sikraken to complete its $algo search strategy" 
fi

# Prepare additional options for Prolog
extra_options=""
if [ "$generate_cfg_png_flag" -eq 1 ]; then
    extra_options=", generate_cfg_png"
fi
if [[ -n "$output_limit_mb" ]]; then    #the string is non empty
    output_limit_bytes=$(( output_limit_mb * 1000 * 1000 ))
    extra_options="${extra_options}, ol($output_limit_bytes)"
fi
# the function name is converted as the parser does, and passed quoted so its name survives
# the -e goal parsing (a bare Prolog variable would lose its name)
# both names are passed: the Prolog one for matching calls during symbolic execution,
# the original C one for the <specification> in metadata.xml (the mangling is not reversible)
# quoting is safe: --reach and --property-file only accept [A-Za-z_][A-Za-z0-9_]* names
if [[ "$coverage" == "reach" ]]; then
    reach_prolog_var=$(to_prolog_var "$reach_function")
    extra_options="${extra_options}, coverage(reach('$reach_prolog_var', '$reach_function'))"
else
    extra_options="${extra_options}, coverage(branch)"
fi

# Call the symbolic executor via ECLiPSe
se_main_file="$SIKRAKEN_INSTALL_DIR/SymbolicExecutor/se_main.pl"
if [[ ! -f "$se_main_file" ]]; then
    se_main_file="$SIKRAKEN_INSTALL_DIR/SymbolicExecutor/se_main.eco"
fi
eclipse_call="$SIKRAKEN_INSTALL_DIR/eclipse/bin/x86_64_linux/eclipse -f $se_main_file -e \"se_main(['$SIKRAKEN_INSTALL_DIR', '${full_path_c_file}', '$file_name_no_ext', main, testcomp, $algo $extra_options])\" -g $stack_size_value -l $local_control_stack_size -- -$debug_mode $data_model"
echo "Calling Sikraken using: $eclipse_call"

end_time=$(date +%s.%1N)

cpu_spent=$(awk -v start="$start_time" -v end="$end_time" 'BEGIN {
    diff = end - start;
    if (diff <= 0) print 1;
    else print int(diff + 0.999);
}')

# Optional: if you still want the raw decimal for your debug echo:
cpu_spent_raw=$(awk -v start="$start_time" -v end="$end_time" 'BEGIN { print end - start }')

echo "Sikraken: Preprocessing used ${cpu_spent_raw}s (Rounded up to ${cpu_spent}s for safety)"

# Add generous wall-clock timeout with safety margin 20% extra or 10 seconds to allow for CPU limit to trigger first 
# to end then kill processes that just hang without reaching cpu limit
wall_timeout=$(( budget + (budget/5 > 10 ? budget/5 : 10) ))

budget=$((budget-cpu_spent))
# 3 seconds is the minimum, to allow to get stats info. prlimit only take integers
if [ "$budget" -lt 3 ]; then
    budget=3
fi
echo "Remaining budget is $budget"
dump_time=$((budget - 1))
# Run with both CPU limit and wall-clock timeout
# 2> >(head -c 100K >&2) limits the messages to stderr (2>) to 100KB (trap '' PIPE tells bash to ignore the SIGPIPE (141) signal and carry on)
timeout --kill-after=5 "${wall_timeout}" prlimit --cpu="${dump_time}:${budget}" bash -c "trap '' PIPE; $eclipse_call" 2> >(head -c 100K >&2)
 
ret_code=$?
if [ $ret_code -eq 124 ]; then
    echo -e "${RD}Sikraken ERROR: Process hung and exceeded wall-clock timeout of ${wall_timeout}s without consuming CPU time.${NC}"
    echo -e "${RD}This likely indicates a hang condition (deadlock, infinite wait, or I/O block).${NC}"
    exit 124
elif [ $ret_code -eq 137 ]; then  #sigkill
    echo "Like tears in rain..."
    exit 0
elif [ $ret_code -ne 0 ]; then
    echo "Sikraken ERROR from $0: error code $ret_code, call to ECLiPSe failed on: $eclipse_call"
    exit $ret_code
else
    echo "Sikraken from $0 generated test inputs for $file_name_no_ext in $SIKRAKEN_INSTALL_DIR/sikraken_output/$file_name_no_ext/"
    testcov_data_model="${data_model#-m}"      # -m32 -> 32, -m64 -> 64
    testcov_data_model="-$testcov_data_model"  # TestCov expects -32 or -64
    echo "Sikraken from $0 says, now run: ./bin/run_testcov.sh $rel_path_c_file $testcov_data_model ${property_file:+ $property_file}"
    exit 0
fi