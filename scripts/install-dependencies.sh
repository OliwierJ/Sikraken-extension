#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
    echo "Sikraken dependencies can only be installed automatically on Linux."
    exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
    echo "apt-get was not found."
    echo "Install bash, coreutils, gcc, and gcc-multilib using your distribution's package manager."
    exit 1
fi

echo "The following packages will be installed:"
echo "  bash coreutils gcc gcc-multilib"
read -r -p "Continue? [y/N] " answer

if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo "Installation cancelled."
    exit 0
fi

if [[ "$(id -u)" -eq 0 ]]; then
    apt_get=(apt-get)
else
    apt_get=(sudo apt-get)
fi

"${apt_get[@]}" update
"${apt_get[@]}" install -y bash coreutils gcc gcc-multilib

echo "Sikraken dependencies installed."