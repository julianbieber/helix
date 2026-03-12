# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Helix is a terminal-based text editor written in Rust, inspired by Kakoune and Vim. It uses a modal editing model with built-in LSP, DAP, and tree-sitter support.

## Build & Development Commands

```bash
# Build and run (debug mode, fastest compilation)
cargo run

# Release build (thin LTO)
cargo build --release

# Fully optimized build (fat LTO)
cargo build --profile opt

# Run all unit tests
cargo test --workspace

# Run integration tests (custom alias defined in .cargo/config.toml)
cargo integration-test

# Run a single integration test
cargo test --features integration --profile integration --workspace --test integration <test_name>

# Formatting
cargo fmt --all --check       # check
cargo fmt --all               # fix

# Linting
cargo clippy --workspace --all-targets -- -D warnings

# Validate tree-sitter queries
cargo xtask query-check              # all languages
cargo xtask query-check rust python  # specific languages

# Validate themes
cargo xtask theme-check

# Regenerate documentation (checked into repo, CI verifies no drift)
cargo xtask docgen

# Preview the user manual
mdbook serve book
```

## Rust Toolchain

- Pinned to Rust **1.90.0** via `rust-toolchain.toml`
- MSRV (Minimum Supported Rust Version): **1.87** — avoid using features newer than this
- The MSRV is tracked in three places: `Cargo.toml` (rust-version), `.github/workflows/build.yml` (env.MSRV), and `rust-toolchain.toml`

## Debugging

Use `log::info!`, `log::warn!`, `log::error!` for debug output. View logs by running with `-v` flags (`hx -v file` for info level, more `-v` for higher verbosity) or redirect: `cargo run -- --log foo.log`.

## Architecture

The workspace contains 13 crates in a layered architecture:

```
helix-term          Terminal application, event loop, commands, UI components
  ├── helix-tui     TUI widget library (forked from tui-rs)
  ├── helix-view    Editor state: Document, View, Tree (window layout), Theme
  │     ├── helix-core    Core editing: Rope, Selection, Transaction, Movement, Syntax
  │     │     ├── helix-stdx    Std library extensions
  │     │     ├── helix-loader  Grammar/config loading, runtime file discovery
  │     │     └── helix-parsec  Parser combinators
  │     ├── helix-lsp     LSP client (async JSON-RPC over stdin/stdout)
  │     ├── helix-dap     Debug Adapter Protocol client
  │     ├── helix-vcs     Git integration (optional, via gix)
  │     └── helix-event   Event dispatch, async hooks, debouncing
  └── xtask         Build tasks (docgen, query-check, theme-check)
```

### Key Design Patterns

- **Functional core / imperative shell**: `helix-core` is functional and pure (inspired by CodeMirror 6). `helix-view` is the imperative shell managing state.
- **Rope-based text buffer**: All text is stored in `ropey::Rope` for efficient large-file editing.
- **Transactions**: All text mutations go through `Transaction` (OT-like), enabling undo/redo and LSP change tracking.
- **Multi-cursor**: `Selection` contains one or more `Range` (anchor + head pairs). Every command must work with multiple selections.
- **Tree-sitter**: Syntax highlighting, indentation, text objects, and injections via tree-sitter grammars. Queries live in `runtime/queries/<lang>/`.
- **Arc-Swap config**: `Arc<ArcSwap<Config>>` enables hot-reloading configuration without restart.
- **SlotMap IDs**: `DocumentId` and `ViewId` use generational arenas for stable references.
- **Component/Compositor**: UI uses a layer stack. Events propagate top-to-bottom; rendering bottom-to-top.

### Application Flow

`main.rs` → parse args → load config → `Application::new()` → async event loop (`tokio::select!` on terminal events, OS signals, LSP/DAP responses, job callbacks) → `compositor.render()` → terminal draw.

### Key Files

| File | Purpose |
|------|---------|
| `helix-term/src/application.rs` | Main event loop, rendering pipeline, signal handling |
| `helix-term/src/commands.rs` | All editor commands (~235KB, largest file) |
| `helix-term/src/commands/typed.rs` | `:` command implementations |
| `helix-term/src/keymap/default.rs` | Default key bindings |
| `helix-term/src/ui/editor.rs` | Main editing surface component |
| `helix-view/src/editor.rs` | `Editor` struct — global state container |
| `helix-view/src/document.rs` | `Document` — text + selections + syntax + history |
| `helix-view/src/view.rs` | `View` — viewport into a document |
| `helix-view/src/tree.rs` | Binary tree for window split layout |
| `helix-core/src/syntax.rs` | Tree-sitter integration and language config |
| `helix-core/src/transaction.rs` | OT-like change tracking |
| `helix-core/src/selection.rs` | Multi-cursor selection model |
| `helix-lsp/src/client.rs` | LSP client implementation |
| `languages.toml` | Language server and grammar configuration |

## Integration Test Conventions

Tests use a DSL with cursor markers: `#[|]#` for cursor position, `#[selection]#` for selections.

```rust
#[tokio::test(flavor = "multi_thread")]
async fn test_example() -> anyhow::Result<()> {
    // (initial_state, key_sequence, expected_state)
    test(("#[|hello]#", "d", "#[|\n]#")).await?;
    Ok(())
}
```

Test helpers are in `helix-term/tests/test/helpers.rs`. The `.cargo/config.toml` sets `tokio_unstable` to allow parallel test isolation.

## Runtime Resources

- `runtime/queries/<lang>/` — tree-sitter queries (highlights, indents, textobjects, injections)
- `runtime/themes/` — color themes
- `runtime/grammars/` — compiled tree-sitter grammar shared libraries
- `languages.toml` — language definitions, LSP server configs, grammar sources
