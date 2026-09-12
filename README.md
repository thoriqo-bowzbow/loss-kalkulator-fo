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

### 🖥 CLI Version (loss-calculator-terminal.js)
The original interactive terminal calculator is still included — see [How to Run the CLI Version](#-how-to-run-the-cli-version).

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
npm run test       # run unit tests (vitest)
npm run build      # typecheck + production build to dist/
npm run preview    # preview the production build
```

**Stack:** Vite · React 18 · TypeScript · Tailwind CSS 4 · lucide-react · html2canvas + jsPDF (lazy-loaded)

The production build uses relative paths (`base: './'`), so `dist/` can be dropped onto any static host (Cloudflare Pages, GitHub Pages, Netlify).

## 📖 How to Run the CLI Version
1. Ensure you have [Node.js](https://nodejs.org/) installed.
2. Clone the repository.
3. Run the following command:
   ```bash
   node loss-calculator-terminal.js
   ```
