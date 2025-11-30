(function () {
    const textarea = document.getElementById('lg-teams');
    const generateBtn = document.getElementById('lg-generate');
    const undoBtn = document.getElementById('lg-undo');
    const saveBtn = document.getElementById('lg-save');
    const loadBtn = document.getElementById('lg-load');

    const tableBody = document.querySelector('#lg-table tbody');
    const fixturesBody = document.querySelector('#lg-fixtures tbody');
    const msgEl = document.getElementById('lg-message');
    const fixturesNote = document.getElementById('lg-fixtures-note');

    const nextFixtureRoundEl = document.getElementById('lg-next-fixture-round');
    const nextHomeEl = document.getElementById('lg-next-home');
    const nextAwayEl = document.getElementById('lg-next-away');

    const homeWinBtn = document.getElementById('lg-home-win');
    const drawBtn = document.getElementById('lg-draw');
    const awayWinBtn = document.getElementById('lg-away-win');

    const trackGoalsCheckbox = document.getElementById('lg-track-goals');
    const outcomeButtonsContainer = document.getElementById('lg-outcome-buttons');
    const goalInputsContainer = document.getElementById('lg-goal-inputs');
    const homeGoalsInput = document.getElementById('lg-home-goals');
    const awayGoalsInput = document.getElementById('lg-away-goals');
    const saveScoreBtn = document.getElementById('lg-save-score');

    const teamsBlock = document.getElementById('lg-teams-block');

    const STORAGE_KEY = 'qt-league-state-v1';

    if (!textarea || !generateBtn) return;

    let teams = [];
    let fixtures = [];      // flat list of matches
    let league = {};        // teamName -> stats
    let history = [];       // stack of previous state (for undo)
    let currentFixtureIndex = -1;

    function parseTeams(raw) {
        return raw
            .split(/\r?\n/)
            .map(t => t.trim())
            .filter(t => t.length > 0);
    }

    function initLeague(teamsList) {
        league = {};
        teamsList.forEach(t => {
            league[t] = {
                team: t,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                gf: 0,
                ga: 0,
                points: 0
            };
        });
    }

    function cloneState() {
        return {
            teams: teams.slice(),
            fixtures: JSON.parse(JSON.stringify(fixtures)),
            league: JSON.parse(JSON.stringify(league)),
            currentFixtureIndex: currentFixtureIndex
        };
    }

    function pushHistory() {
        history.push(cloneState());
        undoBtn.disabled = history.length === 0;
    }

    function applyState(state) {
        teams = state.teams || [];
        fixtures = state.fixtures || [];
        league = state.league || {};
        currentFixtureIndex = typeof state.currentFixtureIndex === 'number'
            ? state.currentFixtureIndex
            : firstUnplayedIndex();

        renderLeagueTable();
        renderFixtures();
        updateNextFixtureSummary();
        updateResultButtonsState();
        minimiseTeamsBlockIfNeeded();
        initSaveLoadButtons();
    }

    function restoreHistory() {
        if (history.length === 0) return;
        const prev = history.pop();
        applyState(prev);
        undoBtn.disabled = history.length === 0;
    }

    function generateRoundRobin(teamsList, doubleRound) {
        const n = teamsList.length;
        const fixturesList = [];
        if (n < 2) return fixturesList;

        const arr = teamsList.slice();
        if (n % 2 === 1) {
            arr.push(null); // bye
        }
        const roundsCount = arr.length - 1;
        const half = arr.length / 2;

        let roundNumber = 1;

        function makeRounds() {
            let current = arr.slice();
            for (let r = 0; r < roundsCount; r++) {
                for (let i = 0; i < half; i++) {
                    const home = current[i];
                    const away = current[current.length - 1 - i];
                    if (home && away) {
                        fixturesList.push({
                            round: roundNumber,
                            home,
                            away,
                            homeGoals: null,
                            awayGoals: null,
                            played: false
                        });
                    }
                }
                roundNumber++;

                const fixed = current[0];
                const rest = current.slice(1);
                rest.unshift(rest.pop());
                current = [fixed].concat(rest);
            }
        }

        makeRounds();

        if (doubleRound) {
            const firstSet = fixturesList.slice();
            firstSet.forEach(f => {
                fixturesList.push({
                    round: roundNumber + f.round - 1,
                    home: f.away,
                    away: f.home,
                    homeGoals: null,
                    awayGoals: null,
                    played: false
                });
            });
        }

        fixturesList.sort((a, b) => a.round - b.round);
        return fixturesList;
    }

    function applyResult(match, homeGoals, awayGoals) {
        const home = league[match.home];
        const away = league[match.away];
        if (!home || !away) return;

        home.played++;
        away.played++;
        home.gf += homeGoals;
        home.ga += awayGoals;
        away.gf += awayGoals;
        away.ga += homeGoals;

        if (homeGoals > awayGoals) {
            home.won++;
            away.lost++;
            home.points += 3;
        } else if (homeGoals < awayGoals) {
            away.won++;
            home.lost++;
            away.points += 3;
        } else {
            home.drawn++;
            away.drawn++;
            home.points += 1;
            away.points += 1;
        }
    }

    function sortLeagueRows() {
        const rows = Object.values(league);
        rows.forEach(r => {
            r.gd = r.gf - r.ga;
        });
        rows.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.gd !== a.gd) return b.gd - a.gd;
            if (b.gf !== a.gf) return b.gf - a.gf;
            return a.team.localeCompare(b.team);
        });
        return rows;
    }

    function renderLeagueTable() {
        tableBody.innerHTML = '';
        if (!teams.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 10;
            td.textContent = 'No league generated yet.';
            tr.appendChild(td);
            tableBody.appendChild(tr);
            return;
        }

        const rows = sortLeagueRows();
        rows.forEach((row, index) => {
            const tr = document.createElement('tr');

            function td(text) {
                const cell = document.createElement('td');
                cell.textContent = text;
                return cell;
            }

            tr.appendChild(td(index + 1));
            tr.appendChild(td(row.team));
            tr.appendChild(td(row.played));
            tr.appendChild(td(row.won));
            tr.appendChild(td(row.drawn));
            tr.appendChild(td(row.lost));
            tr.appendChild(td(row.gf));
            tr.appendChild(td(row.ga));
            tr.appendChild(td(row.gf - row.ga));
            tr.appendChild(td(row.points));

            tableBody.appendChild(tr);
        });
    }

    function renderFixtures() {
        fixturesBody.innerHTML = '';
        if (!fixtures.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 4;
            td.textContent = 'No fixtures yet.';
            tr.appendChild(td);
            fixturesBody.appendChild(tr);
            return;
        }

        let lastRound = null;

        fixtures.forEach((match, index) => {
            const tr = document.createElement('tr');

            if (match.played) {
                tr.classList.add('fixture-played');
            }

            if (index === currentFixtureIndex) {
                tr.classList.add('fixture-selected');
            }

            const roundCell = document.createElement('td');
            if (match.round !== lastRound) {
                roundCell.textContent = match.round;
                lastRound = match.round;
            } else {
                roundCell.textContent = '';
            }

            const homeCell = document.createElement('td');
            homeCell.textContent = match.home;

            const scoreCell = document.createElement('td');
            if (match.played) {
                scoreCell.textContent = `${match.homeGoals} - ${match.awayGoals}`;
            } else {
                scoreCell.textContent = '–';
            }

            const awayCell = document.createElement('td');
            awayCell.textContent = match.away;

            tr.appendChild(roundCell);
            tr.appendChild(homeCell);
            tr.appendChild(scoreCell);
            tr.appendChild(awayCell);

            if (!match.played) {
                tr.style.cursor = 'pointer';
                tr.addEventListener('click', function () {
                    selectFixture(index);
                });
            }

            fixturesBody.appendChild(tr);
        });

        if (fixturesNote) {
            fixturesNote.textContent = '';
        }
    }

    function firstUnplayedIndex() {
        return fixtures.findIndex(m => !m.played);
    }

    function selectFixture(index) {
        const match = fixtures[index];
        if (!match || match.played) return;
        currentFixtureIndex = index;
        updateNextFixtureSummary();
        updateResultButtonsState();
        renderFixtures();
    }

    function updateNextFixtureSummary() {
        if (!fixtures.length) {
            nextFixtureRoundEl.textContent = 'Round –';
            nextHomeEl.textContent = 'Home';
            nextAwayEl.textContent = 'Away';
            return;
        }

        if (currentFixtureIndex < 0 || !fixtures[currentFixtureIndex]) {
            const idx = firstUnplayedIndex();
            if (idx === -1) {
                nextFixtureRoundEl.textContent = 'All fixtures completed';
                nextHomeEl.textContent = '–';
                nextAwayEl.textContent = '–';
                currentFixtureIndex = -1;
                return;
            }
            currentFixtureIndex = idx;
        }

        const match = fixtures[currentFixtureIndex];
        if (match.played) {
            const idx = firstUnplayedIndex();
            if (idx === -1) {
                nextFixtureRoundEl.textContent = 'All fixtures completed';
                nextHomeEl.textContent = '–';
                nextAwayEl.textContent = '–';
                currentFixtureIndex = -1;
                return;
            }
            currentFixtureIndex = idx;
        }

        const m = fixtures[currentFixtureIndex];
        nextFixtureRoundEl.textContent = `Round ${m.round}`;
        nextHomeEl.textContent = m.home;
        nextAwayEl.textContent = m.away;
    }

    function updateResultButtonsState() {
        const disabled = currentFixtureIndex === -1 ||
            !fixtures[currentFixtureIndex] ||
            fixtures[currentFixtureIndex].played;

        const trackingGoals = trackGoalsCheckbox && trackGoalsCheckbox.checked;

        if (trackingGoals) {
            homeWinBtn.disabled = true;
            drawBtn.disabled = true;
            awayWinBtn.disabled = true;
            saveScoreBtn.disabled = disabled;
        } else {
            homeWinBtn.disabled = disabled;
            drawBtn.disabled = disabled;
            awayWinBtn.disabled = disabled;
            saveScoreBtn.disabled = true;
        }
    }

    function recordQuickResult(outcome) {
        if (currentFixtureIndex === -1) return;
        const match = fixtures[currentFixtureIndex];
        if (!match || match.played) return;

        pushHistory();

        let hg = 0;
        let ag = 0;

        if (outcome === 'home') {
            hg = 1; ag = 0;
        } else if (outcome === 'away') {
            hg = 0; ag = 1;
        } else { // draw
            hg = 1; ag = 1;
        }

        match.homeGoals = hg;
        match.awayGoals = ag;
        match.played = true;

        applyResult(match, hg, ag);
        renderLeagueTable();
        renderFixtures();

        const nextIndex = firstUnplayedIndex();
        currentFixtureIndex = nextIndex;
        updateNextFixtureSummary();
        updateResultButtonsState();
    }

    function recordManualResult() {
        if (currentFixtureIndex === -1) return;
        const match = fixtures[currentFixtureIndex];
        if (!match || match.played) return;

        const hg = parseInt(homeGoalsInput.value, 10);
        const ag = parseInt(awayGoalsInput.value, 10);

        if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) {
            alert('Please enter valid non-negative numbers for goals.');
            return;
        }

        pushHistory();

        match.homeGoals = hg;
        match.awayGoals = ag;
        match.played = true;

        applyResult(match, hg, ag);
        renderLeagueTable();
        renderFixtures();

        const nextIndex = firstUnplayedIndex();
        currentFixtureIndex = nextIndex;
        updateNextFixtureSummary();
        updateResultButtonsState();
    }

    // ---------- SAVE / LOAD STATE ----------

    function hasSavedLeague() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return !!raw;
        } catch {
            return false;
        }
    }

    function saveLeagueState() {
        if (!teams.length || !fixtures.length) {
            alert('Generate a league first before saving.');
            return;
        }

        const state = cloneState();

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            if (msgEl) {
                msgEl.textContent = 'League saved in your browser.';
            }
            if (loadBtn) loadBtn.disabled = false;
        } catch (e) {
            console.error('Failed to save league state', e);
            alert('Unable to save league – storage may be full or disabled.');
        }
    }

    function loadLeagueState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                alert('No saved league found.');
                return;
            }
            const state = JSON.parse(raw);
            history = [];
            undoBtn.disabled = true;
            applyState(state);

            if (msgEl) {
                msgEl.textContent = 'Loaded saved league from your browser.';
            }
        } catch (e) {
            console.error('Failed to load league state', e);
            alert('Unable to load league – saved data may be corrupted.');
        }
    }

    function initSaveLoadButtons() {
        if (saveBtn) {
            saveBtn.disabled = !teams.length || !fixtures.length;
        }
        if (loadBtn) {
            loadBtn.disabled = !hasSavedLeague();
        }
    }

    function minimiseTeamsBlockIfNeeded() {
        if (!teamsBlock) return;
        if (teams.length > 0) {
            teamsBlock.classList.add('minimised');
        }
    }

    // --- Event wiring ---

    generateBtn.addEventListener('click', function () {
        teams = parseTeams(textarea.value);
        if (teams.length < 2) {
            alert('Enter at least two teams.');
            return;
        }

        const doubleRound = document.getElementById('lg-format-double').checked;

        initLeague(teams);
        fixtures = generateRoundRobin(teams, doubleRound);
        history = [];
        currentFixtureIndex = firstUnplayedIndex();

        undoBtn.disabled = true;
        renderLeagueTable();
        renderFixtures();
        updateNextFixtureSummary();
        updateResultButtonsState();
        minimiseTeamsBlockIfNeeded();
        initSaveLoadButtons();

        if (msgEl) {
            msgEl.textContent = '';
        }
    });

    homeWinBtn.addEventListener('click', function () {
        recordQuickResult('home');
        initSaveLoadButtons();
    });

    drawBtn.addEventListener('click', function () {
        recordQuickResult('draw');
        initSaveLoadButtons();
    });

    awayWinBtn.addEventListener('click', function () {
        recordQuickResult('away');
        initSaveLoadButtons();
    });

    if (saveScoreBtn) {
        saveScoreBtn.addEventListener('click', function () {
            recordManualResult();
            initSaveLoadButtons();
        });
    }

    if (trackGoalsCheckbox) {
        trackGoalsCheckbox.addEventListener('change', function () {
            const trackingGoals = trackGoalsCheckbox.checked;
            if (trackingGoals) {
                outcomeButtonsContainer.style.display = 'none';
                goalInputsContainer.style.display = 'flex';
            } else {
                outcomeButtonsContainer.style.display = 'flex';
                goalInputsContainer.style.display = 'none';
            }
            updateResultButtonsState();
        });
    }

    undoBtn.addEventListener('click', function () {
        restoreHistory();
        initSaveLoadButtons();
    });

    if (saveBtn) {
        saveBtn.addEventListener('click', function () {
            saveLeagueState();
        });
    }

    if (loadBtn) {
        loadBtn.addEventListener('click', function () {
            loadLeagueState();
        });
    }

    initSaveLoadButtons();
})();
