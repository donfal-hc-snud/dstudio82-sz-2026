#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "Run this script in Terminal on the Mac with openFrameworks installed." >&2
    exit 1
fi

of_root="${OF_ROOT:-/Users/donfal/Documents/openFrameworks/of_v0.12.1_osx_release}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
app_dir="$of_root/apps/myApps/spiralTrails"
project="$app_dir/spiralTrails.xcodeproj"

if [[ ! -d "$of_root/libs/openFrameworks" ]]; then
    echo "openFrameworks was not found at: $of_root" >&2
    exit 1
fi
if [[ ! -f "$repo_root/src/main.cpp" || ! -f "$repo_root/src/ofApp.cpp" ]]; then
    echo "Run the script from a complete dstudio82-sz-2026 checkout." >&2
    exit 1
fi
if ! xcodebuild -version >/dev/null 2>&1; then
    echo "Xcode is required. Install it and select it with xcode-select before retrying." >&2
    exit 1
fi

if [[ ! -f "$project/project.pbxproj" ]]; then
    pg_binary="${PG_BINARY:-}"
    if [[ -z "$pg_binary" ]]; then
        while IFS= read -r -d '' candidate; do
            if [[ -x "$candidate" ]]; then
                pg_binary="$candidate"
                break
            fi
        done < <(find "$of_root" -type f -path '*/projectGenerator.app/Contents/Resources/app/app/projectGenerator' -print0)
    fi
    if [[ -z "$pg_binary" || ! -x "$pg_binary" ]]; then
        echo "The openFrameworks Project Generator command-line tool was not found." >&2
        echo "Set PG_BINARY to its executable path, or create spiralTrails with the Project Generator GUI, then rerun." >&2
        exit 1
    fi

    echo "Generating $project"
    "$pg_binary" --ofPath="$of_root" --platforms=osx "$app_dir"
    if [[ ! -f "$project/project.pbxproj" ]]; then
        echo "Project Generator did not create $project" >&2
        exit 1
    fi
fi

if [[ -L "$app_dir/src" ]]; then
    if [[ "$(readlink "$app_dir/src")" != "$repo_root/src" ]]; then
        echo "The project already links src to another location: $app_dir/src" >&2
        exit 1
    fi
elif [[ -e "$app_dir/src" ]]; then
    if [[ -e "$app_dir/src.generated-backup" ]]; then
        echo "A source backup already exists; inspect $app_dir before retrying." >&2
        exit 1
    fi
    mv "$app_dir/src" "$app_dir/src.generated-backup"
    ln -s "$repo_root/src" "$app_dir/src"
else
    ln -s "$repo_root/src" "$app_dir/src"
fi

echo "Building spiralTrails"
xcodebuild -project "$project" -target spiralTrails -configuration Debug CODE_SIGNING_ALLOWED=NO build
echo "Build succeeded. Opening the source in Cursor and the project in Xcode."
open -a Cursor "$repo_root" || echo "Open $repo_root in Cursor manually."
open "$project"

if [[ -d "$app_dir/bin/spiralTrailsDebug.app" ]]; then
    open "$app_dir/bin/spiralTrailsDebug.app"
elif [[ -d "$app_dir/bin/spiralTrails.app" ]]; then
    open "$app_dir/bin/spiralTrails.app"
else
    echo "Press Command-R in Xcode to run the app."
fi
