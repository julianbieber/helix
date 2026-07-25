; HMML highlighting.
;
; `hmml` is the same grammar as `mml` — it is a separate Helix language so that
; `.hmml` files reach the forked `hobby-mml-lsp`, which resolves spec->source
; against ~/fun_worktrees instead of ~/worktrees. Helix looks queries up by
; *language name*, not by grammar, so without this file hobby specs would render
; unhighlighted even though `grammar = "mml"` gives them the right parser.
;
; Inherit rather than copy, so the two stay in sync.
; inherits: mml
