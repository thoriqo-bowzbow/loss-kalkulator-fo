#!/usr/bin/env node

const readline = require('readline');

// ANSI Escape Codes for Colors
const Reset = "\x1b[0m";
const Bright = "\x1b[1m";
const Dim = "\x1b[2m";
const Underscore = "\x1b[4m";
const Blink = "\x1b[5m";
const Reverse = "\x1b[7m";
const Hidden = "\x1b[8m";

const FgBlack = "\x1b[30m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgYellow = "\x1b[33m";
const FgBlue = "\x1b[34m";
const FgMagenta = "\x1b[35m";
const FgCyan = "\x1b[36m";
const FgWhite = "\x1b[37m";
const FgGray = "\x1b[90m"; // Light Gray

const BgBlack = "\x1b[40m";
const BgRed = "\x1b[41m";
const BgGreen = "\x1b[42m";
const BgYellow = "\x1b[43m";
const BgBlue = "\x1b[44m";
const BgMagenta = "\x1b[45m";
const BgCyan = "\x1b[46m";
const BgWhite = "\x1b[47m";

// Daftar splitter & loss (urut dari umum sampai spesial)
const splitterOptions = [
    { label: "1:2", loss: 3.5 },
    { label: "1:4", loss: 7.0 },
    { label: "1:8", loss: 10.5 },
    { label: "1:16", loss: 13.5 },
    { label: "1:32", loss: 17.0 },
    { label: "1:64", loss: 19.5 },
    { label: "1:99", loss: 21.5 },
    { label: "5:95", loss: 14.0 },
    { label: "10:90", loss: 12.5 },
    { label: "20:80", loss: 11.0 },
    { label: "30:70", loss: 9.5 },
    { label: "40:60", loss: 8.5 },
    { label: "50:50", loss: 7.0 },
    { label: "60:40", loss: 8.5 },
    { label: "70:30", loss: 9.5 },
    { label: "80:20", loss: 11.0 },
    { label: "90:10", loss: 12.5 },
    { label: "95:5", loss: 14.0 },
    { label: "99:1", loss: 21.5 },
];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to display the banner
function displayBanner() {
    console.log(FgCyan + Bright + "========================================" + Reset);
    console.log(FgYellow + Bright + "   VENOUS LOSS RATIO CALCULATOR (v1.0)" + Reset);
    console.log(FgCyan + Bright + "========================================\n" + Reset);
}

// Function to display splitter options
function displaySplitterOptions() {
    console.log(FgGreen + Bright + "Daftar Splitter Tersedia:" + Reset);
    splitterOptions.forEach((opt, idx) => {
        console.log(`${FgWhite}${idx + 1}. ${opt.label}${Dim} (Loss: ${opt.loss} dB)${Reset}`);
    });
    console.log();
}

// Main application logic
function startCalculator() {
    displayBanner();
    displaySplitterOptions();

    rl.question(`${FgBlue}❓ Masukkan nilai daya awal (dBm)${FgGray} (contoh: 10.5)${FgBlue}: ${Reset}`, (sfpInput) => {
        const sfpPower = parseFloat(sfpInput);
        if (isNaN(sfpPower)) {
            console.log(`${FgRed}❌ Kesalahan: Nilai daya tidak valid. Harap masukkan angka.${Reset}`);
            rl.close();
            return;
        }

        rl.question(`${FgBlue}❓ Pilih nomor splitter dari daftar [1-${splitterOptions.length}]: ${Reset}`, (indexInput) => {
            const idx = parseInt(indexInput, 10);
            if (isNaN(idx) || idx < 1 || idx > splitterOptions.length) {
                console.log(`${FgRed}❌ Kesalahan: Pilihan splitter tidak valid. Harap masukkan nomor yang benar.${Reset}`);
                rl.close();
                return;
            }

            const selected = splitterOptions[idx - 1];
            const outputPower = sfpPower - selected.loss;

            console.log(`\n${FgMagenta}=== Hasil Perhitungan ===${Reset}`);
            console.log(`${FgGreen}  ➡️ Daya Awal SFP : ${FgYellow}${sfpPower.toFixed(2)} dBm${Reset}`);
            console.log(`${FgGreen}  ➡️ Splitter Dipilih: ${FgYellow}${selected.label}${Reset} ${Dim}(Loss: ${selected.loss} dB)${Reset}`);
            console.log(`${FgGreen}  ➡️ Daya Output Akhir: ${FgYellow}${outputPower.toFixed(2)} dBm${Reset}\n`);
            console.log(`${FgCyan}========================================${Reset}`);
            console.log(`${FgCyan}     Terima Kasih Telah Menggunakan     ${Reset}`);
            console.log(`${FgCyan}========================================${Reset}\n`);


            rl.close();
        });
    });
}

// Start the calculator
startCalculator();

