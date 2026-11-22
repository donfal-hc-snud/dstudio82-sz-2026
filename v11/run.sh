#!/bin/sh
set -eu
rhythm_web_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$rhythm_web_dir"
if command -v node >/dev/null 2>&1; then
    exec node scripts/serve.mjs
fi
rhythm_bundled_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
if [ -x "$rhythm_bundled_node" ]; then
    exec "$rhythm_bundled_node" scripts/serve.mjs
fi
printf '%s\n' 'Node.js 20 or later is required. Install Node.js, then run npm run dev.' >&2
exit 1
