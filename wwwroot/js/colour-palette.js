(function () {

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

    function mixChannel(channel, target, ratio) {
        return Math.round(channel + (target - channel) * ratio);
    }

    function generatePalette(baseHex) {
        const rgb = hexToRGB(baseHex);
        const palette = [];

        // lighter (towards white)
        for (let i = 1; i <= 5; i++) {
            const ratio = i * 0.15;
            const r = mixChannel(rgb.r, 255, ratio);
            const g = mixChannel(rgb.g, 255, ratio);
            const b = mixChannel(rgb.b, 255, ratio);
            palette.unshift(rgbToHex(r, g, b));
        }

        // base colour
        palette.push(baseHex);

        // darker (towards black)
        for (let i = 1; i <= 5; i++) {
            const ratio = i * 0.12;
            const r = mixChannel(rgb.r, 0, ratio);
            const g = mixChannel(rgb.g, 0, ratio);
            const b = mixChannel(rgb.b, 0, ratio);
            palette.push(rgbToHex(r, g, b));
        }

        return palette;
    }

    function renderPalette(hex) {
        const container = document.getElementById('cp-grid');
        if (!container) return;

        container.innerHTML = '';

        const colours = generatePalette(hex);

        colours.forEach(col => {
            const div = document.createElement('div');
            div.className = 'cp-swatch';
            div.style.backgroundColor = col;
            div.innerHTML = `<span>${col}</span>`;

            div.addEventListener('click', () => {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(col);
                }
                div.style.outline = '3px solid white';
                setTimeout(() => div.style.outline = '', 800);
            });

            container.appendChild(div);
        });
    }

    function randomHex() {
        const n = Math.floor(Math.random() * 0xffffff);
        return "#" + n.toString(16).padStart(6, "0");
    }

    function init() {
        const picker = document.getElementById('cp-base');
        const text = document.getElementById('cp-hex');
        const btn = document.getElementById('cp-generate');
        const randomBtn = document.getElementById('cp-random');

        if (!picker || !text) return;

        const normaliseHex = h =>
            h.startsWith('#') ? h : '#' + h;

        function updateFromPicker() {
            const hex = picker.value;
            text.value = hex;
            renderPalette(hex);
        }

        function updateFromText() {
            const raw = text.value.trim();
            if (!/^[#0-9a-fA-F]{3,7}$/.test(raw)) {
                return;
            }
            const hex = normaliseHex(raw);
            picker.value = hex;
            renderPalette(hex);
        }

        picker.addEventListener('input', updateFromPicker);
        text.addEventListener('input', updateFromText);

        if (btn) {
            btn.addEventListener('click', () => {
                const hex = normaliseHex(text.value.trim() || picker.value);
                picker.value = hex;
                text.value = hex;
                renderPalette(hex);
            });
        }

        if (randomBtn) {
            randomBtn.addEventListener('click', () => {
                const hex = randomHex();
                picker.value = hex;
                text.value = hex;
                renderPalette(hex);
            });
        }

        const initialHex = normaliseHex(text.value || picker.value || '#34aca4');
        picker.value = initialHex;
        text.value = initialHex;
        renderPalette(initialHex);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
