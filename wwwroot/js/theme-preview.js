(function () {
    // ================================
    // SPLITTER
    // ================================
    function initSplitter() {
        var layout = document.querySelector('.tp-split-layout');
        var sidebar = layout ? layout.querySelector('.tool-section.tool-input') : null;
        var splitter = document.getElementById('tp-splitter');

        if (!layout || !sidebar || !splitter) return;

        var dragging = false;

        splitter.addEventListener('mousedown', function () {
            dragging = true;
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;

            var rect = layout.getBoundingClientRect();
            var newWidth = e.clientX - rect.left;

            if (newWidth < 260) newWidth = 260;
            if (newWidth > 600) newWidth = 600;

            sidebar.style.width = newWidth + 'px';
            layout.style.gridTemplateColumns = newWidth + 'px 6px minmax(0, 1fr)';
        });

        document.addEventListener('mouseup', function () {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
        });
    }

    // ================================
    // THEME PREVIEW
    // ================================

    function getEl(id) {
        return document.getElementById(id);
    }

    function applyColourVar(preview, inputId, cssVar) {
        var input = getEl(inputId);
        if (!input || !preview) return;

        function sync() {
            if (input.value) {
                preview.style.setProperty(cssVar, input.value);
            }
        }

        input.addEventListener('input', sync);
        sync();
    }

    function updateRadius(preview) {
        var slider = getEl('tp-radius');
        var label = getEl('tp-radius-value');
        if (!slider || !label || !preview) return;

        function sync() {
            var px = parseInt(slider.value || '12', 10);
            preview.style.setProperty('--tp-radius', px + 'px');
            label.textContent = px + 'px';
        }

        slider.addEventListener('input', sync);
        sync();
    }

    function updateShadow(preview) {
        var slider = getEl('tp-shadow');
        var label = getEl('tp-shadow-value');
        if (!slider || !label || !preview) return;

        function sync() {
            var level = parseInt(slider.value || '2', 10);
            var elevated;
            var soft;
            var text;

            if (level === 0) {
                elevated = 'none';
                soft = 'none';
                text = 'None';
            } else if (level === 1) {
                elevated = '0 10px 18px rgba(15, 23, 42, 0.45)';
                soft = '0 6px 12px rgba(15, 23, 42, 0.4)';
                text = 'Light';
            } else if (level === 2) {
                elevated = '0 14px 28px rgba(15, 23, 42, 0.55)';
                soft = '0 8px 18px rgba(15, 23, 42, 0.45)';
                text = 'Medium';
            } else {
                elevated = '0 22px 40px rgba(15, 23, 42, 0.7)';
                soft = '0 12px 25px rgba(15, 23, 42, 0.6)';
                text = 'Strong';
            }

            preview.style.setProperty('--tp-shadow-elevated', elevated);
            preview.style.setProperty('--tp-shadow-soft', soft);
            label.textContent = text;
        }

        slider.addEventListener('input', sync);
        sync();
    }

    function updateSpacing(preview) {
        var slider = getEl('tp-spacing');
        var label = getEl('tp-spacing-value');
        if (!slider || !label || !preview) return;

        function sync() {
            var level = parseInt(slider.value || '2', 10);
            var basePx;
            var text;

            if (level === 0) {
                basePx = 3;
                text = 'Compact';
            } else if (level === 1) {
                basePx = 5;
                text = 'Tight';
            } else if (level === 2) {
                basePx = 6;
                text = 'Normal';
            } else if (level === 3) {
                basePx = 7;
                text = 'Roomy';
            } else {
                basePx = 8;
                text = 'Spacious';
            }

            preview.style.setProperty('--tp-space', basePx + 'px');
            label.textContent = text;
        }

        slider.addEventListener('input', sync);
        sync();
    }

    function updateDarkMode(preview) {
        var checkbox = getEl('tp-dark-mode');
        if (!checkbox || !preview) return;

        function sync() {
            if (checkbox.checked) {
                preview.classList.add('tp-theme-dark');
                preview.classList.remove('tp-theme-light');
            } else {
                preview.classList.remove('tp-theme-dark');
                preview.classList.add('tp-theme-light');
            }
        }

        checkbox.addEventListener('change', sync);
        sync();
    }

    function updateFonts(preview) {
        var familySelect = getEl('tp-font-family');
        var scaleSelect = getEl('tp-font-size-scale');
        if (!preview || !familySelect || !scaleSelect) return;

        function syncFamily() {
            var val = familySelect.value;
            var stack;

            if (val === 'serif') {
                stack = '"Georgia","Times New Roman",serif';
            } else if (val === 'mono') {
                stack = '"JetBrains Mono","Fira Code",ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace';
            } else {
                stack = 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
            }

            preview.style.setProperty('--tp-font-family', stack);
        }

        function syncSize() {
            var val = parseInt(scaleSelect.value || '1', 10);
            var size;

            if (val === 0) size = '13px';
            else if (val === 2) size = '16px';
            else size = '14px';

            preview.style.setProperty('--tp-font-size-base', size);
        }

        familySelect.addEventListener('change', syncFamily);
        scaleSelect.addEventListener('change', syncSize);

        syncFamily();
        syncSize();
    }

    function initModes() {
        var wrapper = getEl('tp-preview-wrapper');
        var buttons = document.querySelectorAll('.tp-mode-btn');
        if (!wrapper || !buttons.length) return;

        function setMode(btn) {
            var mode = btn.getAttribute('data-mode');
            if (!mode) return;

            for (var i = 0; i < buttons.length; i++) {
                buttons[i].classList.remove('active');
            }
            btn.classList.add('active');

            wrapper.classList.remove('tp-mode-desktop', 'tp-mode-tablet', 'tp-mode-mobile');
            wrapper.classList.add('tp-mode-' + mode);
        }

        for (var i = 0; i < buttons.length; i++) {
            (function (b) {
                b.addEventListener('click', function () {
                    setMode(b);
                });
            })(buttons[i]);
        }
    }

    function initReset() {
        var resetBtn = getEl('tp-reset');
        if (!resetBtn) return;

        resetBtn.addEventListener('click', function () {
            window.location.reload();
        });
    }

    // Sidebar list → scroll to section
    function initComponentNav() {
        var items = document.querySelectorAll('.tp-sidebar-list li');
        var preview = getEl('tp-preview');
        if (!items.length || !preview) return;

        function setActive(li) {
            for (var i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            li.classList.add('active');
        }

        for (var i = 0; i < items.length; i++) {
            (function (li) {
                li.addEventListener('click', function () {
                    var targetId = li.getAttribute('data-target');
                    var target = targetId ? getEl(targetId) : null;
                    if (target) {
                        setActive(li);
                        try {
                            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        } catch (e) {
                            target.scrollIntoView(true);
                        }
                    }
                });
            })(items[i]);
        }
    }

    function initThemePreview() {
        var preview = getEl('tp-preview');
        if (!preview) return;

        applyColourVar(preview, 'tp-primary', '--tp-primary');
        applyColourVar(preview, 'tp-secondary', '--tp-secondary');
        applyColourVar(preview, 'tp-accent', '--tp-accent');
        applyColourVar(preview, 'tp-success', '--tp-success');
        applyColourVar(preview, 'tp-warning', '--tp-warning');
        applyColourVar(preview, 'tp-danger', '--tp-danger');
        applyColourVar(preview, 'tp-bg', '--tp-bg');
        applyColourVar(preview, 'tp-surface', '--tp-surface');
        applyColourVar(preview, 'tp-text', '--tp-text');
        applyColourVar(preview, 'tp-muted', '--tp-text-muted');

        updateRadius(preview);
        updateShadow(preview);
        updateSpacing(preview);
        updateDarkMode(preview);
        updateFonts(preview);
        initModes();
        initReset();
        initComponentNav();
    }

    // ================================
    // DOM READY
    // ================================
    function onReady() {
        initSplitter();
        initThemePreview();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
})();
