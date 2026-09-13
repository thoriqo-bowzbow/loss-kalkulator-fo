# 📡 Fiber Optic Link Budget Calculator v2

A dual-platform engineering tool (Web & CLI) to calculate optical power loss and estimate link budgets for telecommunication networks — rebuilt from the ground up as a modern React application.

---

## 🚀 Live Demo
**[Web Calculator v2](https://kalkulator-redaman.riqo.biz.id/)** · [Legacy v1](./legacy/index.html)

---

## ✨ What's New in v2

### 🧮 Smarter Calculations
- **Topology Builder** — cascade multiple segments (FEEDER → ODP → … → ONT), each with its own distance, splices, connectors, and an optional splitter at the segment end. Power is traced cumulatively per segment.
- **Margin & Sensitivity Analysis** — pick an optical class (GPON B+/C+, XGS-PON N1/N2) or enter custom TX/RX values; the app computes the power margin and gives a color-coded verdict (PASS / MARGINAL / FAIL) with automatic recommendations based on the dominant loss contributor.
- **Wavelength & Fiber Selection** — 1310 / 1490 / 1550 nm with per-fiber attenuation (G.652.D, G.657.A, G.655).
- **Custom Loss Constants** — edit splice/connector loss, fiber attenuation per wavelength, and the whole splitter catalog (PLC 1:2–1:64, FBT 50:50–99:1) in Settings; persisted in the browser.

### 🛠 Engineer Workflow
- **History** — save calculations locally and reload them anytime.
- **Share Links** — the entire topology is encoded into the URL; open the link and the calculation loads instantly.
- **Export Reports** — download the result as PNG or PDF (A5) for job reports, plus copy a WhatsApp-friendly text summary.
- **Dual Language** — Indonesian / English toggle.
- **Dark / Light Theme** — follows system preference, switchable.

### 🖥 CLI Version (cli/)
The CLI got the same v2 overhaul — multi-segment calculation, margin & verdict, batch mode, and local history, with zero external dependencies. See [How to Run the CLI Version](#-how-to-run-the-cli-version). The original v1 script is archived at `legacy/loss-calculator-terminal.js`.

## 📊 Technical Standards Used
- **Fiber cable:** 0.35 dB/km @1310 nm · 0.28 @1490 · 0.22 @1550 (G.652.D default)
- **Splicing point:** 0.1 dB per splice
- **Connectors:** 0.3 dB per connection
- **Verdict threshold:** margin ≥ 3 dB above RX sensitivity = PASS

---

## 💻 Development

```bash
npm install        # install dependencies
npm run dev        # start dev server (http://localhost:5173)
npm run test       # run unit tests (vitest — web & CLI)
npm run build      # typecheck + production build to dist/
npm run preview    # preview the production build
```

**Stack:** Vite · React 18 · TypeScript · Tailwind CSS 4 · lucide-react · html-to-image + jsPDF (lazy-loaded)

The production build uses relative paths (`base: './'`), so `dist/` can be dropped onto any static host (Cloudflare Pages, GitHub Pages, Netlify).

## 🖥 How to Run the CLI Version (v2)

Requires only [Node.js](https://nodejs.org/) — no extra dependencies.

```bash
npm run cli        # interactive wizard (multi-segment)
```

The wizard walks through optical class, wavelength, fiber type, and as many segments as you need, then prints a full breakdown with margin gauge and a color-coded verdict.

### One-shot Mode (for scripting)
```bash
npm run cli -- --tx 7 --km 10 --splice 5 --conn 4 --splitter 1:8 --rx -27
```
Options: `--wavelength 1310|1490|1550` · `--fiber g652d|g657a|g655` · `--name MYLINK` · `--json` (machine-readable) · `--plain` (no colors) · `--copy` (copy summary to clipboard) · `--out file.txt` (save report)

Splitter can be written as `1:8`, `1:8 PLC`, or `60:40 FBT`.

### Batch Mode (survey multiple links at once)
```bash
npm run cli -- --batch links.csv --out hasil.json
```
CSV header: `name,tx,km,splice,conn,splitter,rx` — one link per row. Prints a recap table of every link with its verdict; `--out` also saves full JSON results.

### History
Results are saved automatically to `cli/data/history.json` (git-ignored).
```bash
npm run cli -- --history         # list the 10 latest
npm run cli -- --history 3       # reopen entry #3 in the wizard
npm run cli -- --history clear   # wipe history
```
