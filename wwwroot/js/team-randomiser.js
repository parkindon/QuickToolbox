(function () {
    const textarea = document.getElementById('tr-players');
    const generateBtn = document.getElementById('tr-generate');
    const reshuffleBtn = document.getElementById('tr-reshuffle');
    const copyBtn = document.getElementById('tr-copy');

    const modeNumTeamsRadio = document.getElementById('tr-mode-numteams');
    const modeTeamSizeRadio = document.getElementById('tr-mode-size');
    const numTeamsRow = document.getElementById('tr-numteams-row');
    const teamSizeRow = document.getElementById('tr-teamsize-row');

    const numTeamsInput = document.getElementById('tr-numteams');
    const teamSizeInput = document.getElementById('tr-teamsize');

    const teamsContainer = document.getElementById('tr-teams-container');
    const messageEl = document.getElementById('tr-message');

    if (!textarea || !generateBtn || !teamsContainer) return;

    // State
    let lastPlayers = [];     // [{ name, rating }]
    let lastMode = 'numTeams';
    let lastNumTeams = 2;
    let lastTeamSize = 5;
    let lastTeams = [];       // [{ members: [{name,rating}], totalRating }]

    const DEFAULT_RATING = 5; // treat as 5/10 by default

    function parsePlayers(raw) {
        return raw
            .split(/\r?\n/)
            .map(x => x.trim())
            .filter(x => x.length > 0)
            .map(line => {
                // Try parse formats like:
                // "Alice - 8", "Bob, 7", "Charlie | 3", "Dave 10", or just "Eve"
                let name = line;
                let rating = DEFAULT_RATING;

                // Named separator: comma, dash or pipe
                const sepMatch = line.match(/^(.+?)[,\-\|]\s*(\d+(?:\.\d+)?)\s*$/);
                if (sepMatch) {
                    name = sepMatch[1].trim();
                    rating = parseFloat(sepMatch[2]);
                } else {
                    // Fallback: e.g. "Name 8"
                    const spaceMatch = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*$/);
                    if (spaceMatch) {
                        name = spaceMatch[1].trim();
                        rating = parseFloat(spaceMatch[2]);
                    }
                }

                if (!isFinite(rating) || rating < 0) {
                    rating = DEFAULT_RATING;
                }

                return { name, rating };
            });
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    function computeNumTeams(playersCount, mode, numTeams, teamSize) {
        if (playersCount <= 0) return 0;

        if (mode === 'numTeams') {
            const n = Math.max(2, Math.min(numTeams, playersCount));
            return n;
        } else {
            // teamSize mode
            const size = Math.max(2, teamSize);
            const n = Math.max(1, Math.floor(playersCount / size));
            return Math.max(1, n);
        }
    }

    // Balanced team creation:
    // 1. shuffle players for randomness
    // 2. sort by rating DESC
    // 3. assign each player to the team with the lowest totalRating
    function createBalancedTeams(players, numTeams) {
        if (numTeams <= 0) return [];

        const teams = [];
        for (let i = 0; i < numTeams; i++) {
            teams.push({
                members: [],
                totalRating: 0
            });
        }

        const pool = players.slice();
        shuffleArray(pool); // randomise equal-rating ordering

        pool.sort((a, b) => b.rating - a.rating);

        pool.forEach(player => {
            let bestIndex = 0;
            let bestTotal = teams[0].totalRating;

            for (let i = 1; i < teams.length; i++) {
                if (teams[i].totalRating < bestTotal) {
                    bestTotal = teams[i].totalRating;
                    bestIndex = i;
                }
            }

            teams[bestIndex].members.push(player);
            teams[bestIndex].totalRating += player.rating;
        });

        return teams;
    }

    function renderTeams(teams) {
        teamsContainer.innerHTML = '';

        if (!teams || teams.length === 0) {
            messageEl.textContent = 'Enter players and generate teams to see them here.';
            copyBtn.disabled = true;
            return;
        }

        messageEl.textContent = '';

        teams.forEach((team, index) => {
            const card = document.createElement('div');
            card.className = 'team-card';

            const memberCount = team.members.length;
            const totalRating = team.totalRating;
            const avgRating = memberCount > 0 ? (totalRating / memberCount) : 0;

            const title = document.createElement('div');
            title.className = 'team-card-title';
            title.textContent = `Team ${index + 1} (${memberCount} player${memberCount === 1 ? '' : 's'})`;

            const meta = document.createElement('div');
            meta.style.fontSize = '0.8rem';
            meta.style.opacity = '0.8';
            meta.textContent = `Total rating: ${totalRating.toFixed(1)} · Avg: ${avgRating.toFixed(2)}`;

            const list = document.createElement('ul');
            team.members.forEach(p => {
                const li = document.createElement('li');
                li.textContent = `${p.name} (${p.rating})`;
                list.appendChild(li);
            });

            card.appendChild(title);
            card.appendChild(meta);
            card.appendChild(list);
            teamsContainer.appendChild(card);
        });

        copyBtn.disabled = false;
    }

    function generateTeams() {
        const players = parsePlayers(textarea.value);
        if (players.length < 2) {
            alert('Enter at least two players.');
            return;
        }

        const mode = modeTeamSizeRadio.checked ? 'teamSize' : 'numTeams';
        lastMode = mode;

        const numTeamsVal = parseInt(numTeamsInput.value, 10) || 2;
        const teamSizeVal = parseInt(teamSizeInput.value, 10) || 5;

        lastNumTeams = numTeamsVal;
        lastTeamSize = teamSizeVal;

        const numTeams = computeNumTeams(players.length, mode, numTeamsVal, teamSizeVal);
        if (numTeams < 1) {
            alert('Unable to determine number of teams. Check your settings.');
            return;
        }

        const teams = createBalancedTeams(players, numTeams);

        lastPlayers = players;
        lastTeams = teams;

        renderTeams(teams);
        reshuffleBtn.disabled = false;
    }

    function reshuffleTeams() {
        if (!lastPlayers || lastPlayers.length < 2) {
            return;
        }

        const players = lastPlayers.slice();
        const mode = lastMode;
        const numTeams = computeNumTeams(players.length, mode, lastNumTeams, lastTeamSize);
        if (numTeams < 1) return;

        const teams = createBalancedTeams(players, numTeams);
        lastTeams = teams;
        renderTeams(teams);
    }

    function copyTeamsToClipboard() {
        if (!lastTeams || lastTeams.length === 0) return;

        let lines = [];
        lastTeams.forEach((team, index) => {
            const memberCount = team.members.length;
            const totalRating = team.totalRating;
            const avgRating = memberCount > 0 ? (totalRating / memberCount) : 0;

            lines.push(
                `Team ${index + 1} (${memberCount} players, total ${totalRating.toFixed(1)}, avg ${avgRating.toFixed(2)}):`
            );
            team.members.forEach(p => lines.push(`- ${p.name} (${p.rating})`));
            lines.push(''); // blank line between teams
        });

        const text = lines.join('\n');

        navigator.clipboard.writeText(text)
            .then(() => {
                if (messageEl) {
                    messageEl.textContent = 'Teams copied to clipboard.';
                }
            })
            .catch(() => {
                alert('Unable to copy to clipboard.');
            });
    }

    // Mode toggle UI
    function updateModeUI() {
        const mode = modeTeamSizeRadio.checked ? 'teamSize' : 'numTeams';
        if (mode === 'teamSize') {
            numTeamsRow.style.display = 'none';
            teamSizeRow.style.display = '';
        } else {
            numTeamsRow.style.display = '';
            teamSizeRow.style.display = 'none';
        }
    }

    // Event wiring
    generateBtn.addEventListener('click', generateTeams);
    reshuffleBtn.addEventListener('click', reshuffleTeams);
    copyBtn.addEventListener('click', copyTeamsToClipboard);

    if (modeNumTeamsRadio && modeTeamSizeRadio) {
        modeNumTeamsRadio.addEventListener('change', updateModeUI);
        modeTeamSizeRadio.addEventListener('change', updateModeUI);
    }

    // Initial UI state
    reshuffleBtn.disabled = true;
    copyBtn.disabled = true;
    updateModeUI();
})();
