(function () {

    let currentPalette = [];
    let currentBaseHex = "#34aca4";
    let currentMode = "monochrome";

    /* -------------------
       Colour conversions
       ------------------- */

    function hexToRGB(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        const bigint = parseInt(hex, 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }

    function rgbToHex(r, g, b) {
        return (
            "#" +
            [r, g, b]
                .map(x => {
                    const h = x.toString(16);
                    return h.length === 1 ? "0" + h : h;
                })
                .join("")
        );
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
                case g: h = ((b - r) / d + 2); break;
                case b: h = ((r - g) / d + 4); break;
            }
            h *= 60;
        }
        return { h, s, l };
    }

    function hslToRgb(h, s, l) {
        const C = (1 - Math.abs(2 * l - 1)) * s;
        const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - C / 2;

        let r1, g1, b1;
        if (h < 60) { r1 = C; g1 = X; b1 = 0; }
        else if (h < 120) { r1 = X; g1 = C; b1 = 0; }
        else if (h < 180) { r1 = 0; g1 = C; b1 = X; }
        else if (h < 240) { r1 = 0; g1 = X; b1 = C; }
        else if (h < 300) { r1 = X; g1 = 0; b1 = C; }
        else { r1 = C; g1 = 0; b1 = X; }

        return {
            r: Math.round((r1 + m) * 255),
            g: Math.round((g1 + m) * 255),
            b: Math.round((b1 + m) * 255)
        };
    }

    function clamp01(v) {
        return Math.min(1, Math.max(0, v));
    }

    function shiftHue(hex, degrees) {
        const { r, g, b } = hexToRGB(hex);
        let { h, s, l } = rgbToHsl(r, g, b);
        h = (h + degrees) % 360;
        if (h < 0) h += 360;
        const rgb = hslToRgb(h, s, l);
        return rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    function setLightness(hex, lTarget) {
        const { r, g, b } = hexToRGB(hex);
        let { h, s } = rgbToHsl(r, g, b);
        const rgb = hslToRgb(h, s, clamp01(lTarget));
        return rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    function randomHex() {
        const n = Math.floor(Math.random() * 0xffffff);
        return "#" + n.toString(16).padStart(6, "0");
    }

    /* -------------------
       Palette generators
       ------------------- */

    // Original monochrome gradient
    function generateMonochromePalette(baseHex) {
        const rgb = hexToRGB(baseHex);
        const palette = [];

        // lighter (towards white)
        for (let i = 1; i <= 5; i++) {
            const ratio = i * 0.12;
            const r = Math.round(rgb.r + (255 - rgb.r) * ratio);
            const g = Math.round(rgb.g + (255 - rgb.g) * ratio);
            const b = Math.round(rgb.b + (255 - rgb.b) * ratio);
            palette.unshift(rgbToHex(r, g, b));
        }

        // base
        palette.push(baseHex);

        // darker (towards black)
        for (let i = 1; i <= 5; i++) {
            const ratio = i * 0.10;
            const r = Math.round(rgb.r * (1 - ratio));
            const g = Math.round(rgb.g * (1 - ratio));
            const b = Math.round(rgb.b * (1 - ratio));
            palette.push(rgbToHex(r, g, b));
        }

        return palette;
    }

    function generateComplementaryPalette(baseHex) {
        const comp = shiftHue(baseHex, 180);
        return [
            setLightness(baseHex, 0.8),
            baseHex,
            setLightness(baseHex, 0.4),
            comp,
            setLightness(comp, 0.5)
        ];
    }

    function generateAnalogousPalette(baseHex) {
        return [
            shiftHue(baseHex, -30),
            shiftHue(baseHex, -15),
            baseHex,
            shiftHue(baseHex, 15),
            shiftHue(baseHex, 30)
        ];
    }

    function generateTriadicPalette(baseHex) {
        return [
            baseHex,
            shiftHue(baseHex, 120),
            shiftHue(baseHex, -120),
            setLightness(baseHex, 0.75),
            setLightness(baseHex, 0.35)
        ];
    }

    function buildPalette(baseHex, mode) {
        switch (mode) {
            case "complementary":
                return generateComplementaryPalette(baseHex);
            case "analogous":
                return generateAnalogousPalette(baseHex);
            case "triadic":
                return generateTriadicPalette(baseHex);
            case "monochrome":
            default:
                return generateMonochromePalette(baseHex);
        }
    }

    /* -------------------
       Contrast / WCAG
       ------------------- */

    function relativeLuminanceFromHex(hex) {
        const { r, g, b } = hexToRGB(hex);
        function channel(c) {
            const v = c / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        }
        const R = channel(r), G = channel(g), B = channel(b);
        return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    }

    function contrastRatio(l1, l2) {
        const L1 = Math.max(l1, l2);
        const L2 = Math.min(l1, l2);
        return (L1 + 0.05) / (L2 + 0.05);
    }

    function ratingLabel(contrast) {
        if (contrast >= 7) return "AAA";
        if (contrast >= 4.5) return "AA";
        if (contrast >= 3) return "AA (large)";
        return "Fail";
    }

    function getContrastInfo(bgHex) {
        const lumBg = relativeLuminanceFromHex(bgHex);
        const lumBlack = 0;
        const lumWhite = 1;

        const ratioBlack = contrastRatio(lumBg, lumBlack);
        const ratioWhite = contrastRatio(lumBg, lumWhite);

        const bestText = ratioBlack >= ratioWhite ? "black" : "white";

        return {
            black: {
                ratio: ratioBlack,
                label: ratingLabel(ratioBlack)
            },
            white: {
                ratio: ratioWhite,
                label: ratingLabel(ratioWhite)
            },
            bestText
        };
    }

    /* -------------------
       Rendering & state
       ------------------- */

    function renderPalette(baseHex, mode) {
        currentBaseHex = baseHex;
        currentMode = mode || currentMode;

        const container = document.getElementById('cp-grid');
        if (!container) return;

        const palette = buildPalette(baseHex, currentMode);
        currentPalette = palette.slice();

        container.innerHTML = '';

        palette.forEach(col => {
            const info = getContrastInfo(col);

            const div = document.createElement('div');
            div.className = 'cp-swatch';
            div.style.backgroundColor = col;
            div.style.color = info.bestText === 'black' ? '#000' : '#fff';

            const hexSpan = document.createElement('div');
            hexSpan.className = 'cp-hex-label';
            hexSpan.textContent = col;

            const contrastDiv = document.createElement('div');
            contrastDiv.className = 'cp-contrast';

            contrastDiv.innerHTML =
                `<strong>Black:</strong> ${info.black.ratio.toFixed(1)} (${info.black.label})<br>` +
                `<strong>White:</strong> ${info.white.ratio.toFixed(1)} (${info.white.label})`;

            div.appendChild(hexSpan);
            div.appendChild(contrastDiv);

            div.addEventListener('click', () => {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(col).catch(() => { });
                }
                div.style.boxShadow = "0 0 0 3px #ffffffaa";
                setTimeout(() => { div.style.boxShadow = ""; }, 600);
            });

            container.appendChild(div);
        });
    }

    /* -------------------
       Export helpers
       ------------------- */

    function setExportOutput(text) {
        const box = document.getElementById('cp-export-output');
        if (!box) return;
        box.value = text || "";
        if (navigator.clipboard && text) {
            navigator.clipboard.writeText(text).catch(() => { });
        }
    }

    function exportCSS() {
        if (!currentPalette.length) return;
        const lines = currentPalette.map((c, i) => `  --cp-${i + 1}: ${c};`);
        const css = `:root {\n${lines.join('\n')}\n}`;
        setExportOutput(css);
    }

    function exportTailwind() {
        if (!currentPalette.length) return;
        const lines = currentPalette.map((c, i) => `      'cp-${i + 1}': '${c}',`);
        const tw =
            `// tailwind.config.js snippet
module.exports = {
  theme: {
    extend: {
      colors: {
${lines.join('\n')}
      }
    }
  }
};`;
        setExportOutput(tw);
    }

    function exportJSON() {
        if (!currentPalette.length) return;
        const json = JSON.stringify({
            base: currentBaseHex,
            mode: currentMode,
            colours: currentPalette
        }, null, 2);
        setExportOutput(json);
    }

    function exportPNG() {
        if (!currentPalette.length) return;

        const swatchWidth = 160;
        const swatchHeight = 120;
        const count = currentPalette.length;

        const canvas = document.createElement('canvas');
        canvas.width = swatchWidth * count;
        canvas.height = swatchHeight;
        const ctx = canvas.getContext('2d');

        ctx.font = "14px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

        currentPalette.forEach((col, index) => {
            const x = index * swatchWidth;
            ctx.fillStyle = col;
            ctx.fillRect(x, 0, swatchWidth, swatchHeight);

            const info = getContrastInfo(col);
            const textColour = info.bestText === 'black' ? "#000000" : "#ffffff";

            ctx.fillStyle = textColour;
            ctx.fillText(col, x + 10, 24);
        });

        const link = document.createElement('a');
        link.href = canvas.toDataURL("image/png");
        link.download = "colour-palette.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /* -------------------
       Init & event wiring
       ------------------- */

    function init() {
        const picker = document.getElementById('cp-base');
        const text = document.getElementById('cp-hex');
        const btn = document.getElementById('cp-generate');
        const randomBtn = document.getElementById('cp-random');
        const modeSelect = document.getElementById('cp-mode');

        const btnExportCss = document.getElementById('cp-export-css');
        const btnExportTw = document.getElementById('cp-export-tailwind');
        const btnExportJson = document.getElementById('cp-export-json');
        const btnExportPng = document.getElementById('cp-export-png');

        if (!picker || !text || !modeSelect) return;

        const normaliseHex = h =>
            h.startsWith('#') ? h : '#' + h;

        function refresh() {
            const hex = normaliseHex(text.value.trim() || picker.value || currentBaseHex);
            const mode = modeSelect.value || "monochrome";
            currentMode = mode;
            picker.value = hex;
            text.value = hex;
            renderPalette(hex, mode);
        }

        function updateFromPicker() {
            text.value = picker.value;
            refresh();
        }

        function updateFromText() {
            const raw = text.value.trim();
            if (!/^[#0-9a-fA-F]{3,7}$/.test(raw)) {
                return;
            }
            picker.value = normaliseHex(raw);
            refresh();
        }

        picker.addEventListener('input', updateFromPicker);
        text.addEventListener('input', updateFromText);

        if (modeSelect) {
            modeSelect.addEventListener('change', refresh);
        }

        if (btn) {
            btn.addEventListener('click', refresh);
        }

        if (randomBtn) {
            randomBtn.addEventListener('click', () => {
                const hex = randomHex();
                picker.value = hex;
                text.value = hex;
                refresh();
            });
        }

        if (btnExportCss) btnExportCss.addEventListener('click', exportCSS);
        if (btnExportTw) btnExportTw.addEventListener('click', exportTailwind);
        if (btnExportJson) btnExportJson.addEventListener('click', exportJSON);
        if (btnExportPng) btnExportPng.addEventListener('click', exportPNG);

        // Initial render
        const initialHex = normaliseHex(text.value || picker.value || currentBaseHex);
        picker.value = initialHex;
        text.value = initialHex;
        refresh();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
