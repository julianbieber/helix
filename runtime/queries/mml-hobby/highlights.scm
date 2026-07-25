; MML highlighting for hobby specs.
;
; `mml-hobby` is the same language as `mml` — it exists only so Helix can route
; hobby specs to the forked `hobby-mml-lsp`, which resolves spec->source against
; ~/fun_worktrees instead of ~/worktrees. Helix looks queries up by *language
; name*, not by grammar, so without this file hobby specs would render
; unhighlighted even though `grammar = "mml"` gives them the right parser.
;
; Inherit rather than copy, so the two stay in sync.
; inherits: mml
