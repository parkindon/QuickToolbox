(function () {

    function $(id) {
        return document.getElementById(id);
    }

    function parseNumber(id, fallback) {
        const el = $(id);
        if (!el) return fallback;
        const v = parseFloat(el.value);
        return isNaN(v) ? fallback : v;
    }

    function getScaleRatio() {
        const select = $('typo-scale');
        if (!select) return 1.25;

        if (select.value === 'custom') {
            return parseNumber('typo-scale-custom', 1.25);
        }

        const v = parseFloat(select.value);
        return isNaN(v) ? 1.25 : v;
    }

    function randomFriendlyScale() {
        // Some nice-ish presets
        const options = [
            { base: 16, ratio: 1.2 },
            { base: 16, ratio: 1.25 },
            { base: 17, ratio: 1.25 },
            { base: 16, ratio: 1.333 },
            { base: 18, ratio: 1.333 },
            { base: 16, ratio: 1.5 },
        ];

        const pick = options[Math.floor(Math.random() * options.length)];

        $('typo-base-size').value = pick.base;
        $('typo-scale').value = pick.ratio.toString();
        $('typo-scale-custom-row').style.display = 'none';

        updateAll();
    }

    function generateSteps() {
        const baseSize = parseNumber('typo-base-size', 16);
        const stepsBelow = Math.max(0, parseInt($('typo-steps-below').value || '0', 10));
        const stepsAbove = Math.max(0, parseInt($('typo-steps-above').value || '0', 10));
        const ratio = getScaleRatio();

        const minVw = parseNumber('typo-min-vw', 320);
        const maxVw = parseNumber('typo-max-vw', 1200);
        const fluidFactor = parseFloat($('typo-fluid-factor').value || '0.2') || 0;

        const totalMinVw = Math.max(1, Math.min(minVw, maxVw));
        const totalMaxVw = Math.max(totalMinVw + 1, Math.max(minVw, maxVw));

        const steps = [];
        const roles = buildRoleMap(stepsBelow, stepsAbove);

        for (let i = -stepsBelow; i <= stepsAbove; i++) {
            const token = i === 0 ? 'var(--font-step-0)' :
                i < 0 ? `var(--font-step--${Math.abs(i)})` :
                    `var(--font-step-${i})`;

            const stepName = i === 0 ? '0' : (i > 0 ? `+${i}` : `${i}`);

            const px = baseSize * Math.pow(ratio, i);
            const rem = px / 16;

            // Simple heuristic: smaller sizes get higher line-height
            const lineHeight = suggestLineHeight(px);
            const tracking = suggestTracking(px);

            // Fluid sizing:
            // We create a min/max around the base px using the fluidFactor.
            // Example: fluidFactor 0.2 → clamp(0.8*px, something vw + something rem, 1.2*px)
            const minPx = px * (1 - fluidFactor);
            const maxPx = px * (1 + fluidFactor);

            // Convert to rem for CSS output
            const minRem = minPx / 16;
            const maxRem = maxPx / 16;

            // Solve for y = m * vw + b across viewport range
            // At vw = totalMinVw => y = minPx
            // At vw = totalMaxVw => y = maxPx
            const mPxPerVw = (maxPx - minPx) / (totalMaxVw - totalMinVw);
            const bPx = minPx - mPxPerVw * totalMinVw;

            // Convert slope/intercept to rem units (1rem = 16px)
            const mRem = mPxPerVw / 16;
            const bRem = bPx / 16;

            const clampExpr = fluidFactor === 0
                ? `${rem.toFixed(3)}rem`
                : `clamp(${minRem.toFixed(3)}rem, ${mRem.toFixed(3)}vw + ${bRem.toFixed(3)}rem, ${maxRem.toFixed(3)}rem)`;

            steps.push({
                index: i,
                stepName,
                token,
                px,
                rem,
                lineHeight,
                tracking,
                clampExpr,
                role: roles[i] || ''
            });
        }

        return {
            steps,
            meta: {
                baseSize,
                ratio,
                stepsBelow,
                stepsAbove,
                minVw: totalMinVw,
                maxVw: totalMaxVw,
                fluidFactor
            }
        };
    }

    function buildRoleMap(stepsBelow, stepsAbove) {
        // Opinionated mapping. You can tweak this easily later.
        // Try to map biggest step to h1, then downwards.
        const roles = {};

        const pool = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        let current = stepsAbove;
        let idx = 0;

        while (current >= -stepsBelow && idx < pool.length) {
            roles[current] = pool[idx];
            current--;
            idx++;
        }

        // Body & smaller: we favour base and below
        if (roles[0] == null) roles[0] = 'body';
        if (stepsBelow >= 1 && !roles[-1]) roles[-1] = 'small';
        if (stepsBelow >= 2 && !roles[-2]) roles[-2] = 'caption';

        return roles;
    }

    function suggestLineHeight(px) {
        if (px >= 40) return 1.1;
        if (px >= 28) return 1.15;
        if (px >= 20) return 1.3;
        if (px >= 16) return 1.4;
        return 1.5;
    }

    function suggestTracking(px) {
        // Simple heuristic: tiny sizes get a bit of positive letter-spacing
        if (px >= 32) return 0;      // headings: let them breathe with lh instead
        if (px >= 20) return 0;
        if (px >= 16) return 0.01;   // 0.01em
        if (px >= 12) return 0.02;
        return 0.03;
    }

    function buildCssVars(scale) {
        const lines = [];
        lines.push(':root {');

        scale.steps.forEach(s => {
            const name =
                s.index === 0 ? '--font-step-0' :
                    s.index < 0 ? `--font-step--${Math.abs(s.index)}` :
                        `--font-step-${s.index}`;

            lines.push(`  ${name}: ${s.clampExpr};`);
        });

        lines.push('');
        scale.steps.forEach(s => {
            if (!s.role) return;
            const lh = s.lineHeight.toFixed(2);
            const track = s.tracking === 0 ? '0' : `${s.tracking.toFixed(2)}em`;

            if (s.role === 'body') {
                lines.push(`  --font-body-size: var(${tokenFromIndex(s.index)});`);
                lines.push(`  --font-body-line-height: ${lh};`);
                lines.push(`  --font-body-tracking: ${track};`);
            } else if (s.role === 'small' || s.role === 'caption') {
                lines.push(`  --font-${s.role}-size: var(${tokenFromIndex(s.index)});`);
                lines.push(`  --font-${s.role}-line-height: ${lh};`);
                lines.push(`  --font-${s.role}-tracking: ${track};`);
            } else if (/^h[1-6]$/.test(s.role)) {
                lines.push(`  --font-${s.role}-size: var(${tokenFromIndex(s.index)});`);
                lines.push(`  --font-${s.role}-line-height: ${lh};`);
                lines.push(`  --font-${s.role}-tracking: ${track};`);
            }
        });

        lines.push('}');
        return lines.join('\n');
    }

    function tokenFromIndex(i) {
        if (i === 0) return '--font-step-0';
        return i < 0 ? `--font-step--${Math.abs(i)}` : `--font-step-${i}`;
    }

    function buildTailwindConfig(scale) {
        const entries = scale.steps.map(s => {
            const lh = s.lineHeight.toFixed(2);
            const track = s.tracking === 0 ? '0' : `${s.tracking.toFixed(2)}em`;

            const key =
                s.index === 0 ? 'step-0' :
                    s.index < 0 ? `step--${Math.abs(s.index)}` :
                        `step-${s.index}`;

            return `      "${key}": ["${s.clampExpr}", { "lineHeight": "${lh}", "letterSpacing": "${track}" }]`;
        });

        return `// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontSize: {
${entries.join(',\n')}
      }
    }
  }
}`;
    }

    function buildJson(scale) {
        const obj = {
            meta: scale.meta,
            steps: {}
        };

        scale.steps.forEach(s => {
            const key = tokenFromIndex(s.index);
            obj.steps[key] = {
                px: parseFloat(s.px.toFixed(3)),
                rem: parseFloat(s.rem.toFixed(3)),
                lineHeight: s.lineHeight,
                tracking: s.tracking,
                clamp: s.clampExpr,
                role: s.role
            };
        });

        return JSON.stringify(obj, null, 2);
    }

    function renderTable(scale) {
        const tbody = $('typo-steps-body');
        if (!tbody) return;

        if (!scale.steps.length) {
            tbody.innerHTML = '<tr><td colspan="7">No steps generated.</td></tr>';
            return;
        }

        let html = '';

        scale.steps.forEach(s => {
            const px = s.px.toFixed(2);
            const rem = s.rem.toFixed(3);
            const lh = s.lineHeight.toFixed(2);
            const track = s.tracking === 0 ? '0' : `${s.tracking.toFixed(2)}em`;

            const roleLabel = s.role ? s.role.toUpperCase() : '';

            html += `<tr>
                <td><code>${tokenFromIndex(s.index)}</code></td>
                <td>${roleLabel}</td>
                <td>${px}</td>
                <td>${rem}</td>
                <td>${lh}</td>
                <td>${track}</td>
                <td><code>${s.clampExpr}</code></td>
            </tr>`;
        });

        tbody.innerHTML = html;
    }

    function renderPreview(scale) {
        const container = $('typo-preview');
        if (!container) return;

        const theme = $('typo-preview-theme')?.value || 'light';
        container.setAttribute('data-theme', theme);

        const bodyStep = scale.steps.find(s => s.role === 'body') || scale.steps.find(s => s.index === 0);
        const h1Step = scale.steps.find(s => s.role === 'h1') || scale.steps[scale.steps.length - 1];
        const h2Step = scale.steps.find(s => s.role === 'h2') || scale.steps[scale.steps.length - 2];
        const smallStep = scale.steps.find(s => s.role === 'small') || scale.steps.find(s => s.index < 0) || bodyStep;

        const sample = (step, label, text) => {
            const lh = step.lineHeight.toFixed(2);
            const track = step.tracking === 0 ? '0' : `${step.tracking.toFixed(2)}em`;
            return `<div class="typo-preview-row">
                <div class="typo-preview-label">${label}</div>
                <div class="typo-preview-text"
                     style="font-size:${step.clampExpr};line-height:${lh};letter-spacing:${track};">
                    ${text}
                </div>
            </div>`;
        };

        const baseSentence = 'The quick brown fox jumps over the lazy dog. 0123456789';

        container.innerHTML = [
            sample(h1Step, 'H1', 'Typography scale generator – H1'),
            sample(h2Step, 'H2', 'Design tokens that actually line up'),
            sample(bodyStep, 'Body', baseSentence),
            sample(smallStep, 'Small', 'Supporting caption text, metadata etc.')
        ].join('');
    }

    function copyText(id) {
        const el = $(id);
        if (!el) return;

        el.select();
        el.setSelectionRange(0, el.value.length);
        document.execCommand('copy');
    }

    function updateAll() {
        const scale = generateSteps();

        renderTable(scale);
        renderPreview(scale);

        $('typo-css-output').value = buildCssVars(scale);
        $('typo-tw-output').value = buildTailwindConfig(scale);
        $('typo-json-output').value = buildJson(scale);
    }

    function init() {
        if (!$('typo-base-size')) return; // not on this page

        const inputs = document.querySelectorAll(
            '#typo-base-size, #typo-scale, #typo-scale-custom, #typo-min-vw, #typo-max-vw, #typo-steps-below, #typo-steps-above, #typo-fluid-factor'
        );

        inputs.forEach(el => {
            if (!el) return;
            el.addEventListener('input', updateAll);
            el.addEventListener('change', updateAll);
        });

        $('typo-scale').addEventListener('change', function () {
            const showCustom = this.value === 'custom';
            $('typo-scale-custom-row').style.display = showCustom ? '' : 'none';
            updateAll();
        });

        $('typo-preview-theme')?.addEventListener('change', updateAll);

        $('typo-random-btn')?.addEventListener('click', randomFriendlyScale);

        $('typo-copy-css')?.addEventListener('click', function () { copyText('typo-css-output'); });
        $('typo-copy-tw')?.addEventListener('click', function () { copyText('typo-tw-output'); });
        $('typo-copy-json')?.addEventListener('click', function () { copyText('typo-json-output'); });

        updateAll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
