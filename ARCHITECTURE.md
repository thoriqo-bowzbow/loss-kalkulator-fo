# Architecture

Technical decisions behind Loss Kalkulator FO, and why they were made.

## Big Picture

```
┌──────────────────────────────┐   ┌──────────────────────────────┐
│  Web  (src/)                 │   │  CLI  (cli/)                 │
│  Vite · React 18 · TS        │   │  Pure Node ESM, zero deps    │
│  Tailwind CSS 4 · lucide     │   │  readline + ANSI             │
└──────────────┬───────────────┘   └──────────────┬───────────────┘
               │  import                          │  import
               ▼                                  ▼
       ┌─────────────────────────────────────────────────┐
       │  shared/  — the single calculation engine       │
       │  calculator.js (tree engine, verdict, taps)     │
       │  constants.js  (splitter/fiber/optical catalog) │
       │  types.d.ts    (domain types)                   │
       └─────────────────────────────────────────────────┘
```

**One engine, two frontends.** The calculation never lives in either UI. Web and CLI import the exact same `calculate()` from `shared/`, so a link budget computed in the browser always matches the terminal to the second decimal (enforced by unit tests on both sides). Before this refactor the two platforms had drifted apart — different splitter tables, different verdicts for the same input. Unifying was the single highest-value change of v2.

## Domain Model

- **Topology** = ordered `Segment[]`. Each segment has cable length (km), splice count, connector count, and an optional end-of-segment splitter (PLC uniform loss, or FBT dual-ratio with separate main/tap losses).
- **Branching** — every segment may declare a `parentId`, forming a tree (ODC → many ODPs → customers). Segments without a parent continue from the previous array entry, which keeps legacy linear topologies working.
- **Paths** — every leaf segment (no children) is an endpoint. Each endpoint yields a path whose loss is accumulated along its parent chain. FBT ratio splitters additionally emit a *tap* power at that point.
- **Verdict** — computed from the *weakest* signal across all endpoint paths and all taps: margin ≥ +3 dB → PASS, > 0 → MARGINAL, else FAIL.

### Deliberate safety behaviors

- **Cycle guards** — a bad `parentId` (or imported data with a cycle) cannot hang the engine; `resolveCumulative` tracks visited nodes and `buildTree` falls back to treating cyclic nodes as roots.
- **Input clamping** — negative or non-finite distances/counts clamp to 0 at the engine boundary; TX/RX may be negative by nature (dBm).
- **List order is cosmetic** — reordering segments in the UI never changes the math; parent links are resolved by id, not by index.

## Web (`src/`)

- **Vite + React 18 + TypeScript strict** (`noUnusedLocals`, `noUnusedParameters`).
- **Tailwind CSS 4** via the Vite plugin — no CDN. Neo-brutalist design system: 2px borders, hard offset shadows, uppercase-black typography, dual theme (dark/light).
- **All state derived, minimal stored** — the result panel is a pure function of the topology (recomputed live on every keystroke). Only drafts, history, constants, theme, and language touch `localStorage`.
- **Lazy exports** — `html-to-image` + `jsPDF` are dynamically imported, keeping the main bundle at ~205 kB (63 kB gzip). `html-to-image` replaced `html2canvas` specifically because the latter cannot parse Tailwind 4's `oklch()` colors and silently failed to capture.
- **Share links** — the whole topology is base64-encoded into the URL hash; opening the link restores the calculation without a backend.

## CLI (`cli/`)

- **Pure Node ESM, zero runtime dependencies** — clones run with `npm run cli` and nothing else.
- A custom **line-buffering prompter** replaces `rl.question()`: `readline/promises` misbehaves with piped stdin on modern Node (second question never resolves), and piped input arrives faster than prompts render. The prompter buffers early lines, so scripted input (`node cli < answers.txt`) is deterministic while interactive TTY use still gets full line editing via `rl.setPrompt`/`rl.prompt`.
- **Modes**: interactive full-screen wizard (screen clears per step with a progress summary), one-shot CLI args for scripting, CSV/JSON batch with a recap table, and auto-saved local history (`cli/data/`, git-ignored).
- **Thin glue only** — `cli/core.js` holds nothing mathematical: topology adaptation, splitter lookup by *label* ("1:8", "60:40 FBT"), and the Indonesian-language summary/recommendations.

## Testing

`vitest` runs one suite across both platforms:

- `src/lib/calculator.test.ts` — tree branching, FBT taps, cycle tolerance, constants overrides (web types).
- `cli/core.test.js` — the same reference case through the CLI adapter, plus verdict thresholds and clamping.

Reference case enforced on both sides: **7 dBm TX · 10 km · 5 splices · 4 connectors · 1:8 PLC → −8.70 dBm, PASS.**

## CI/CD

- **ci.yml** — install → typecheck + build → tests, on every push and PR.
- **deploy.yml** — on green `main` pushes: test → build → deploy `dist/` to GitHub Pages (relative `base: './'` makes `dist/` host-agnostic).
