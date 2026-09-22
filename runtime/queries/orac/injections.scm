; Injections for the ORA Conversation Format (`.orac`).
; The format embeds three foreign languages verbatim. Highlighting them is the
; main thing a grammar buys a reader here: a Vega-Lite spec or a JSON tool
; result is the least readable part of a transcript.

; Inline `vega-lite` fenced blocks (spec 8.1) and the `vega spec:` payload of a
; legacy `Plot:` block (8.2). Both are Vega-Lite JSON.
((vega_spec) @injection.content
 (#set! injection.language "json"))

; The `csv:` payload of a legacy `Plot:` block (spec 8.2) — CSV with a header
; row, joined to the spec by the renderer.
((csv_payload) @injection.content
 (#set! injection.language "csv"))

; A tool call's JSON arguments and its inline JSON result (spec 6.5).
((json_value) @injection.content
 (#set! injection.language "json"))
