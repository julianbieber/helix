# Build and install this Helix fork, its grammars and its config on the current machine.
#
# The checkout is the only source: `languages.toml` here is the config, and
# `grammars/` holds the tree-sitter grammars it adds. `~/.config/helix/languages.toml`
# is an output — edit this checkout and re-run `just install-config`.

CFG := env('XDG_CONFIG_HOME', env('HOME') / '.config') / 'helix'

GRAMMARS := 'hmml hstruct hresearch'

# List the recipes
default:
    @just --list

# Install hx, the config and every grammar
install: build install-config grammars

# Install the hx binary, without building grammars (a dead grammar remote cannot fail it)
build:
    HELIX_DISABLE_AUTO_GRAMMAR_BUILD=1 cargo install --path helix-term --locked

# Copy languages.toml to the config dir, declaring this checkout's grammars by absolute path, and link the runtime
install-config:
    #!/usr/bin/env bash
    set -euo pipefail
    root="$(pwd)"
    mkdir -p "{{CFG}}"
    target="{{CFG}}/languages.toml"
    [ -L "$target" ] && rm "$target"
    {
        cat languages.toml
        for g in {{GRAMMARS}}; do
            printf '\n[[grammar]]\nname = "%s"\nsource = { path = "%s/grammars/tree-sitter-%s" }\n' "$g" "$root" "$g"
        done
    } > "$target.tmp"
    mv "$target.tmp" "$target"
    echo "installed $target"
    link="{{CFG}}/runtime"
    if [ -L "$link" ] || [ ! -e "$link" ]; then
        ln -sfn "$root/runtime" "$link"
        echo "linked $link -> $root/runtime"
    else
        echo "$link exists and is not a symlink — leaving it; remove it to use this checkout's runtime" >&2
    fi

# Fetch and build the grammars the installed config declares; one failing grammar does not stop the rest
grammars:
    hx --grammar fetch || echo "some grammar fetches failed"
    hx --grammar build || echo "some grammars failed to build — hx itself is usable"
