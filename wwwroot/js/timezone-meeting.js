(function () {
    if (typeof luxon === 'undefined' || !luxon.DateTime) {
        console.error('Luxon not loaded – Time Zone Meeting Finder disabled.');
        return;
    }

    const { DateTime } = luxon;

    const dateInput = document.getElementById('tz-date');
    const timeInput = document.getElementById('tz-time');
    const timeRange = document.getElementById('tz-time-range');
    const timeRangeLabel = document.getElementById('tz-time-range-label');


    const baseCityInput = document.getElementById('tz-base-city-input');
    const baseCitySuggestions = document.getElementById('tz-base-city-suggestions');
    const baseCityTzHidden = document.getElementById('tz-base-city-tz');
    const baseCityTzLabel = document.getElementById('tz-base-city-tzlabel');

    const addParticipantBtn = document.getElementById('tz-add-participant');
    const saveParticipantsBtn = document.getElementById('tz-save-participants');
    const loadParticipantsBtn = document.getElementById('tz-load-participants');
    const copyTimesBtn = document.getElementById('tz-copy-times');

    const participantsBody = document.getElementById('tz-participants-body');
    const summaryEl = document.getElementById('tz-summary');

    const workingStartInput = document.getElementById('tz-working-start');
    const workingEndInput = document.getElementById('tz-working-end');
    const socialStartInput = document.getElementById('tz-social-start');
    const socialEndInput = document.getElementById('tz-social-end');



    if (!dateInput || !timeInput || !participantsBody || !addParticipantBtn) {
        return;
    }

    let cities = [];
    let userDefaultZone = DateTime.local().zoneName || 'UTC';
    const STORAGE_KEY = 'qt-timezone-participants-v1';

    // -------------------------
    // Load cities JSON
    // -------------------------
    fetch('/data/cities-timezones.json')
        .then(r => r.json())
        .then(data => {
            cities = data || [];
        })
        .catch(err => {
            console.error('Failed to load cities-timezones.json', err);
        });

    // -------------------------
    // Helper: suggestions
    // -------------------------
    function createSuggestionItem(cityObj, onClick) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'tz-suggestion-item';
        item.textContent = `${cityObj.city}, ${cityObj.country}`;
        item.addEventListener('click', function () {
            onClick(cityObj);
        });
        return item;
    }

    function attachCityAutocomplete(inputEl, suggestionsEl, tzHiddenEl, tzLabelEl) {
        function updateSuggestions() {
            const query = (inputEl.value || '').trim().toLowerCase();
            suggestionsEl.innerHTML = '';

            if (query.length < 2 || cities.length === 0) {
                suggestionsEl.classList.remove('tz-suggestions-visible');
                return;
            }

            const matches = cities.filter(c => {
                const combined = `${c.city} ${c.country}`.toLowerCase();
                return combined.includes(query);
            }).slice(0, 10);

            if (matches.length === 0) {
                suggestionsEl.classList.remove('tz-suggestions-visible');
                return;
            }

            matches.forEach(cityObj => {
                const item = createSuggestionItem(cityObj, function (selected) {
                    inputEl.value = `${selected.city}, ${selected.country}`;
                    tzHiddenEl.value = selected.tz;
                    if (tzLabelEl) {
                        tzLabelEl.textContent = `Time zone: ${selected.tz}`;
                    }
                    suggestionsEl.innerHTML = '';
                    suggestionsEl.classList.remove('tz-suggestions-visible');
                    recalculateAll();
                });
                suggestionsEl.appendChild(item);
            });

            suggestionsEl.classList.add('tz-suggestions-visible');
        }

        inputEl.addEventListener('input', function () {
            tzHiddenEl.value = '';
            if (tzLabelEl && inputEl === baseCityInput) {
                tzLabelEl.textContent = 'Select a city to set the base time zone';
            }
            updateSuggestions();
        });

        inputEl.addEventListener('focus', updateSuggestions);

        inputEl.addEventListener('blur', function () {
            setTimeout(function () {
                suggestionsEl.classList.remove('tz-suggestions-visible');
            }, 150);
        });
    }

    // Attach autocomplete to base city input
    attachCityAutocomplete(baseCityInput, baseCitySuggestions, baseCityTzHidden, baseCityTzLabel);

    // -------------------------
    // Participants row creation
    // -------------------------
    function createParticipantRow() {
        const tr = document.createElement('tr');
        tr.className = 'tz-participant-row';

        tr.innerHTML = `
            <td>
                <input type="text" class="form-input tz-name-input" placeholder="Name (optional)" />
            </td>
            <td>
                <div class="tz-city-picker">
                    <input type="text" class="form-input tz-city-input" autocomplete="off"
                           placeholder="City, e.g. Berlin, Sydney" />
                    <div class="tz-city-suggestions"></div>
                    <input type="hidden" class="tz-city-tz" />
                    <div class="tz-city-tzlabel small"></div>
                </div>
            </td>
            <td class="tz-localtime-cell">–</td>
            <td class="tz-status-cell">–</td>
            <td>
                <button type="button" class="btn btn-outline-secondary btn-sm tz-remove-row">Remove</button>
            </td>
        `;

        const cityInput = tr.querySelector('.tz-city-input');
        const suggestionsEl = tr.querySelector('.tz-city-suggestions');
        const tzHiddenEl = tr.querySelector('.tz-city-tz');
        const tzLabelEl = tr.querySelector('.tz-city-tzlabel');

        attachCityAutocomplete(cityInput, suggestionsEl, tzHiddenEl, tzLabelEl);

        const removeBtn = tr.querySelector('.tz-remove-row');
        removeBtn.addEventListener('click', function () {
            tr.remove();
            recalculateAll();
        });

        return tr;
    }

    function addParticipantRow(prefill) {
        const row = createParticipantRow();
        participantsBody.appendChild(row);

        if (prefill) {
            const nameInput = row.querySelector('.tz-name-input');
            const cityInput = row.querySelector('.tz-city-input');
            const tzHiddenEl = row.querySelector('.tz-city-tz');
            const tzLabelEl = row.querySelector('.tz-city-tzlabel');

            if (nameInput && prefill.name) nameInput.value = prefill.name;
            if (cityInput && prefill.cityDisplay) cityInput.value = prefill.cityDisplay;
            if (tzHiddenEl && prefill.tz) {
                tzHiddenEl.value = prefill.tz;
                if (tzLabelEl) {
                    tzLabelEl.textContent = `Time zone: ${prefill.tz}`;
                }
            }
        }
    }

    addParticipantBtn.addEventListener('click', function () {
        addParticipantRow();
    });

    // Create one row initially
    addParticipantRow();

    // -------------------------
    // Hours parsing
    // -------------------------
    function timeInputToMinutes(inputEl, fallbackMinutes) {
        if (!inputEl || !inputEl.value) return fallbackMinutes;
        const parts = inputEl.value.split(':');
        if (parts.length < 2) return fallbackMinutes;
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) return fallbackMinutes;
        return h * 60 + m;
    }
    function minutesToTimeString(mins) {
        if (typeof mins !== 'number' || isNaN(mins)) {
            return '--:--';
        }
        mins = Math.max(0, Math.min(1439, mins)); // clamp just in case
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        return `${hh}:${mm}`;
    }
    function updateTimeRangeLabel() {
        if (!timeRange || !timeRangeLabel) return;

        const mins = parseInt(timeRange.value, 10);
        const timeStr = minutesToTimeString(mins);
        timeRangeLabel.textContent = `Time: ${timeStr}`;
    }


    function getHoursConfig() {
        const workingStart = timeInputToMinutes(workingStartInput, 9 * 60);   // 09:00
        const workingEnd = timeInputToMinutes(workingEndInput, 17 * 60);      // 17:00
        const socialStart = timeInputToMinutes(socialStartInput, 7 * 60);     // 07:00
        const socialEnd = timeInputToMinutes(socialEndInput, 21 * 60);        // 21:00

        return { workingStart, workingEnd, socialStart, socialEnd };
    }

    function getBaseDateTime() {
        const dateStr = (dateInput.value || '').trim();
        const timeStr = (timeInput.value || '').trim();

        if (!dateStr || !timeStr) return null;

        let zone = baseCityTzHidden.value;
        if (!zone) zone = userDefaultZone || 'UTC';

        const iso = `${dateStr}T${timeStr}`;
        const dt = DateTime.fromISO(iso, { zone });

        if (!dt.isValid) return null;
        return dt;
    }

    function classifyWorkingTime(dt, hoursCfg) {
        if (!dt || !dt.isValid) {
            return { label: 'Unknown', className: 'tz-status-unknown' };
        }

        const mins = dt.hour * 60 + dt.minute;
        const { workingStart, workingEnd, socialStart, socialEnd } = hoursCfg;

        // Normalize (in case working > social etc, just assume simple ranges for now)
        const inWorking = mins >= workingStart && mins < workingEnd;
        const inSocial = mins >= socialStart && mins < socialEnd;

        if (inWorking) {
            return { label: 'Within working hours', className: 'tz-status-ok' };
        }

        if (inSocial) {
            return { label: 'Within sociable hours', className: 'tz-status-social' };
        }

        return { label: 'Unsociable hours', className: 'tz-status-bad' };
    }

    function recalculateAll() {
        const baseDt = getBaseDateTime();
        const hoursCfg = getHoursConfig();

        if (!baseDt) {
            summaryEl.textContent = 'Choose a valid meeting date and time to see participant times.';
            Array.from(participantsBody.querySelectorAll('.tz-localtime-cell')).forEach(td => td.textContent = '–');
            Array.from(participantsBody.querySelectorAll('.tz-status-cell')).forEach(td => {
                td.textContent = '–';
                td.className = 'tz-status-cell';
            });
            return;
        }

        const rows = Array.from(participantsBody.querySelectorAll('.tz-participant-row'));
        if (rows.length === 0) {
            summaryEl.textContent = 'Add participants to see how the time works in different locations.';
            return;
        }

        let workingOk = 0;
        let sociableOk = 0;
        let badCount = 0;

        rows.forEach(row => {
            const tzHiddenEl = row.querySelector('.tz-city-tz');
            const localCell = row.querySelector('.tz-localtime-cell');
            const statusCell = row.querySelector('.tz-status-cell');

            const tz = (tzHiddenEl.value || '').trim();
            if (!tz) {
                localCell.textContent = 'Select a location';
                statusCell.textContent = 'Unknown';
                statusCell.className = 'tz-status-cell tz-status-unknown';
                return;
            }

            const localDt = baseDt.setZone(tz);

            if (!localDt.isValid) {
                localCell.textContent = 'Invalid time';
                statusCell.textContent = 'Unknown';
                statusCell.className = 'tz-status-cell tz-status-unknown';
                return;
            }

            localCell.textContent = localDt.toFormat('ccc dd LLL yyyy HH:mm');

            const { label, className } = classifyWorkingTime(localDt, hoursCfg);
            statusCell.textContent = label;
            statusCell.className = 'tz-status-cell ' + className;

            if (className === 'tz-status-ok') workingOk++;
            if (className === 'tz-status-social') sociableOk++;
            if (className === 'tz-status-bad') badCount++;
        });

        if (badCount === 0 && (workingOk > 0 || sociableOk > 0)) {
            summaryEl.textContent = 'Good time: everyone is within working or sociable hours.';
        } else if (badCount > 0 && workingOk === 0 && sociableOk === 0) {
            summaryEl.textContent = 'This time is unsociable for all participants.';
        } else {
            summaryEl.textContent = 'Some participants are outside your defined working or sociable hours.';
        }
    }

    // -------------------------
    // Save / load participants
    // -------------------------
    function saveParticipants() {
        const rows = Array.from(participantsBody.querySelectorAll('.tz-participant-row'));
        const data = [];

        rows.forEach(row => {
            const nameInput = row.querySelector('.tz-name-input');
            const cityInput = row.querySelector('.tz-city-input');
            const tzHiddenEl = row.querySelector('.tz-city-tz');

            const name = nameInput ? (nameInput.value || '').trim() : '';
            const cityDisplay = cityInput ? (cityInput.value || '').trim() : '';
            const tz = tzHiddenEl ? (tzHiddenEl.value || '').trim() : '';

            if (cityDisplay && tz) {
                data.push({ name, cityDisplay, tz });
            }
        });

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            summaryEl.textContent = 'Participants saved in your browser.';
        } catch (e) {
            console.error('Error saving participants', e);
            summaryEl.textContent = 'Unable to save participants.';
        }
    }

    function loadParticipants() {
        let raw = null;
        try {
            raw = localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            console.error('Error accessing saved participants', e);
        }

        if (!raw) {
            summaryEl.textContent = 'No saved participants found.';
            return;
        }

        let list = [];
        try {
            list = JSON.parse(raw) || [];
        } catch (e) {
            console.error('Error parsing saved participants', e);
            summaryEl.textContent = 'Saved participants data is invalid.';
            return;
        }

        // Clear current rows
        participantsBody.innerHTML = '';

        if (list.length === 0) {
            addParticipantRow();
            summaryEl.textContent = 'No saved participants found.';
            recalculateAll();
            return;
        }

        list.forEach(p => addParticipantRow(p));
        summaryEl.textContent = 'Participants loaded from your browser.';
        recalculateAll();
    }

    if (saveParticipantsBtn) {
        saveParticipantsBtn.addEventListener('click', saveParticipants);
    }

    if (loadParticipantsBtn) {
        loadParticipantsBtn.addEventListener('click', loadParticipants);
    }

    if (copyTimesBtn) {
        copyTimesBtn.addEventListener('click', copyMeetingTimes);
    }

    // -------------------------
    // Copy meeting times to clipboard
    // -------------------------
    function copyMeetingTimes() {
        const baseDt = getBaseDateTime();
        if (!baseDt) {
            summaryEl.textContent = 'Set a valid meeting date and time before copying.';
            return;
        }

        const rows = Array.from(participantsBody.querySelectorAll('.tz-participant-row'));
        if (rows.length === 0) {
            summaryEl.textContent = 'Add at least one participant before copying.';
            return;
        }

        const lines = [];
        const baseCityDisplay = (baseCityInput.value || '').trim();
        const baseZone = baseCityTzHidden.value || baseDt.zoneName || 'UTC';
        const baseTimeStr = baseDt.toFormat('ccc dd LLL yyyy HH:mm');

        lines.push(`Meeting time: ${baseTimeStr} (${baseZone}${baseCityDisplay ? ', ' + baseCityDisplay : ''})`);
        lines.push('');

        let validCount = 0;

        rows.forEach((row, index) => {
            const nameInput = row.querySelector('.tz-name-input');
            const cityInput = row.querySelector('.tz-city-input');
            const tzHiddenEl = row.querySelector('.tz-city-tz');

            const tz = (tzHiddenEl && tzHiddenEl.value || '').trim();
            if (!tz) return;

            const localDt = baseDt.setZone(tz);
            if (!localDt.isValid) return;

            const localTimeStr = localDt.toFormat('ccc dd LLL yyyy HH:mm');

            const name = (nameInput && nameInput.value.trim()) || '';
            const cityDisplay = (cityInput && cityInput.value.trim()) || '';

            const label =
                name && cityDisplay
                    ? `${name} – ${cityDisplay}`
                    : name
                        ? name
                        : cityDisplay
                            ? cityDisplay
                            : `Participant ${index + 1}`;

            const line = `${label}: ${localTimeStr} (${tz})`;

            lines.push(line);
            validCount++;
        });

        if (validCount === 0) {
            summaryEl.textContent = 'No participant times could be calculated to copy.';
            return;
        }

        const text = lines.join('\n');

        function onSuccess() {
            summaryEl.textContent = 'Meeting times copied to clipboard.';
        }

        function onFailure() {
            summaryEl.textContent = 'Unable to copy to clipboard. You can copy manually.';
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(onSuccess, onFailure);
        } else {
            const area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', '');
            area.style.position = 'absolute';
            area.style.left = '-9999px';
            document.body.appendChild(area);
            area.select();
            try {
                document.execCommand('copy');
                onSuccess();
            } catch (e) {
                console.error('Clipboard copy failed', e);
                onFailure();
            } finally {
                document.body.removeChild(area);
            }
        }
    }



    // -------------------------
    // Wire up recalc triggers
    // -------------------------
    dateInput.addEventListener('change', recalculateAll);
    timeInput.addEventListener('change', function () {
        // When user manually edits the time field, sync the slider
        if (timeRange) {
            const mins = timeInputToMinutes(timeInput, 9 * 60);
            timeRange.value = mins;
            updateTimeRangeLabel();
        }
        recalculateAll();
    });


    if (timeRange) {
        timeRange.addEventListener('input', function () {
            const mins = parseInt(timeRange.value, 10);
            const timeStr = minutesToTimeString(mins);

            // Update the time input so everything stays in sync
            if (timeInput) {
                timeInput.value = timeStr;
            }

            updateTimeRangeLabel();
            recalculateAll();
        });
    }

    if (workingStartInput) workingStartInput.addEventListener('change', recalculateAll);
    if (workingEndInput) workingEndInput.addEventListener('change', recalculateAll);
    if (socialStartInput) socialStartInput.addEventListener('change', recalculateAll);
    if (socialEndInput) socialEndInput.addEventListener('change', recalculateAll);

    // -------------------------
    // Init: default to tomorrow at next half hour
    // -------------------------
    (function initDateTime() {
        const now = DateTime.local();
        const rounded = now.plus({ minutes: 30 - (now.minute % 30) })
            .set({ second: 0, millisecond: 0 });

        dateInput.value = rounded.plus({ days: 1 }).toISODate();
        timeInput.value = rounded.toFormat('HH:mm');

        // Initialise the slider from the time input
        if (timeRange) {
            const mins = timeInputToMinutes(timeInput, 9 * 60); // fallback 09:00
            timeRange.value = mins;
            updateTimeRangeLabel();
        }

        if (baseCityTzLabel && !baseCityTzHidden.value) {
            baseCityTzLabel.textContent =
                `Using your browser time zone by default (${userDefaultZone})`;
        }

        recalculateAll();
    })();

})();
