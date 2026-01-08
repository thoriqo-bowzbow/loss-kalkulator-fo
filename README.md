# 📡 Fiber Optic Link Budget Calculator

A dual-platform engineering tool (Web-based & CLI) designed to calculate optical power loss and estimate link budgets for telecommunication networks. This tool helps technicians and engineers ensure signal integrity before field deployment.

---

## 🚀 Live Demo
**[CLICK HERE TO VIEW THE WEB CALCULATOR]([https://your-username.github.io/loss-kalkulator-fo/](https://riqolosskalkulator.netlify.app/)**

---

## ✨ Key Features

### 🌐 Web Interface (index.html)
- **Comprehensive Loss Parameters:** Calculates attenuation based on cable length, splicing points, and connector counts.
- **Splitter Support:** Includes presets for both **PLC Splitters** (1:2 to 1:64) and **FBT Splitters** with specific ratios (99:1 to 50:50).
- **Dynamic Feedback:** Real-time color-coded signal strength indicators (Good, Marginal, Critical).
- **Mobile Optimized:** Fully responsive design using Tailwind CSS, perfect for field use on smartphones.

### 💻 CLI Version (loss-calculator-terminal.js)
- **Node.js Integration:** Interactive terminal-based calculator.
- **Color-coded Output:** Uses ANSI escape codes for clear, readable data presentation.
- **Efficiency:** Designed for quick calculations without leaving the terminal environment.

## 🛠️ Tech Stack
- **Frontend:** HTML5, Tailwind CSS, FontAwesome.
- **Backend/Scripting:** JavaScript (ES6+), Node.js (for CLI version).
- **Styling:** Inter Font Family, Custom Dark Theme.

## 📊 Technical Standards Used
The calculator follows industry-standard attenuation values:
- **Fiber Cable:** 0.35 dB/km (Standard for 1310/1550nm).
- **Splicing Point:** 0.1 dB per splice.
- **Connectors:** 0.3 dB per connection.

## 📖 How to Run the CLI Version
1. Ensure you have [Node.js](https://nodejs.org/) installed.
2. Clone the repository.
3. Run the following command:
   ```bash
   node loss-calculator-terminal.js
