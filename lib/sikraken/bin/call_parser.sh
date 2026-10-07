#!/bin/bash
#
# Script: call_parser.sh
# Author: Chris Meudec / Refactored
# Date: Nov 2025
# Description: Preprocesses C source and runs the Sikraken parser.

# --- Formatting ---
RD='\033[31m'
NC='\033[0m'

# --- Directory Setup ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SIKRAKEN_INSTALL_DIR="$SCRIPT_DIR/.."

# --- Defaults ---
data_model="-m32" # Default to -m32
debug_flag=""
skip_syntax=0
rel_path_c_file=""

# --- Help Function ---
show_help() {
    echo "Usage: $0 [options] <c_file>"
    echo ""
    echo "Options:"
    echo "  -m32, -m64       Set the data model (default: -m32)"
    echo "  -d               Enable debug mode"
    echo "  --nosyntaxcheck  Bypass GCC syntax-only pre-check in debug mode"
    echo "  -h               Show this help message"
    echo ""
    echo "Example: $0 -m64 -d --nosyntaxcheck SampleCode/atry_bitwise.c"
}

# --- Parse Arguments ---
# Using a loop to handle flags and the final positional argument
while [[ $# -gt 0 ]]; do
    case "$1" in
        -m32|-m64)
            data_model="$1"
            shift
            ;;
        -d)
            debug_flag="-d"
            shift
            ;;
        --nosyntaxcheck)
            skip_syntax=1
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            echo -e "${RD}Sikraken ERROR: Unknown option $1${NC}"
            show_help
            exit 20
            ;;
        *)
            # The first non-flag argument is the C file
            rel_path_c_file="$1"
            shift
            ;;
    esac
done

# --- Validation ---
if [[ -z "$rel_path_c_file" ]]; then
    echo -e "${RD}Sikraken ERROR: No C source file specified.${NC}"
    show_help
    exit 20
fi

# an absolute path is used as is; a relative path is looked for from the current directory first,
# then from the Sikraken install directory (same resolution as in sikraken.sh)
if [[ "$rel_path_c_file" = /* ]]; then
    full_path_c_file="$rel_path_c_file"
elif [[ -f "$rel_path_c_file" ]]; then
    full_path_c_file="$PWD/$rel_path_c_file"
else
    full_path_c_file="$SIKRAKEN_INSTALL_DIR/$rel_path_c_file"
fi

if [[ ! -f "$full_path_c_file" ]]; then
    echo -e "${RD}Sikraken ERROR: File not found: $full_path_c_file${NC}"
    exit 21
fi

# --- Path Processing ---
input_file_base=$(basename "$rel_path_c_file")
input_file_no_ext="${input_file_base%.*}"
file_extension="${rel_path_c_file##*.}"
output_directory="$SIKRAKEN_INSTALL_DIR/sikraken_output/$input_file_no_ext"

# Create output directory
mkdir -p "$output_directory" || { echo -e "${RD}Error: Could not create $output_directory${NC}"; exit 21; }

# --- Preprocessing ---
if [[ "$file_extension" == "i" ]]; then
    # If already preprocessed (.i), copy to output directory
    dest_file="$output_directory/$input_file_base"
    if [[ "$(realpath "$full_path_c_file")" != "$(realpath "$dest_file")" ]]; then
        cp "$full_path_c_file" "$output_directory/" || exit 21
    fi
else
    # Run GCC syntax check only if in debug mode AND --nosyntaxcheck was not passed
    if [[ "$debug_flag" == "-d" ]] && [[ $skip_syntax -eq 0 ]]; then 
        gcc -fsyntax-only -std=c99 $data_model "$full_path_c_file"
        syntax_ret_code=$?
        if [ $syntax_ret_code -ne 0 ]; then
            echo "Sikraken ERROR from $0: error code $syntax_ret_code, syntax check (-fsyntax-only) failed on $full_path_c_file"
            exit 23
        fi
    fi

    # Preprocess with GCC using the selected data model
    preprocessed_file="$output_directory/$input_file_no_ext.i"
    if ! gcc -E -P "$full_path_c_file" "$data_model" -o "$preprocessed_file"; then
        echo -e "${RD}Sikraken ERROR: GCC preprocessing failed for $rel_path_c_file${NC}"
        exit 22
    fi
fi

# --- Run Parser ---
echo "Sikraken: Running parser on $input_file_no_ext ($data_model)..."
parser_exe="$SIKRAKEN_INSTALL_DIR/bin/sikraken_parser.exe"

# Execute the parser with organized arguments
if ! "$parser_exe" $debug_flag "$data_model" -p"$output_directory" "$input_file_no_ext"; then
    echo -e "${RD}Sikraken ERROR: Parser execution failed.${NC}"
    exit 24
fi

echo "Sikraken: Successfully processed $input_file_no_ext."
exit 0