import dataService from '../global/data-service.js';
import authService from '../global/auth-service.js';

document.addEventListener('DOMContentLoaded', async function () {

    const accessDenied   = document.getElementById('accessDenied');
    const dashboardContent = document.getElementById('dashboardContent');

    let teams   = [];
    let matches = [];
    let dataLoaded = false;

    // ---- Auth-Guard ----
    authService.onStateChange(async (user) => {
        if (user) {
            accessDenied.style.display   = 'none';
            dashboardContent.style.display = 'block';
            if (!dataLoaded) {
                await loadAndRender();
                dataLoaded = true;
            }
        } else {
            accessDenied.style.display   = 'flex';
            dashboardContent.style.display = 'none';
        }
    });

    // ---- Daten laden & rendern ----
    async function loadAndRender() {
        try {
            teams   = await dataService.getData('tournamentTeams')  || [];
            matches = await dataService.getData('vorrundeMatches')   || [];
        } catch (e) {
            console.error('Dashboard: Fehler beim Laden', e);
        }

        if (matches.length === 0) {
            document.getElementById('noData').style.display = 'block';
            document.querySelector('.stat-cards').style.display = 'none';
            document.querySelector('.dash-tabs').style.display  = 'none';
            return;
        }

        renderStats();
        setupTabs();
        renderOverview();
        renderSchedule();
        renderMatrix();
    }

    // ---- Quick Stats ----
    function renderStats() {
        const totalRounds   = Math.max(...matches.map(m => m.round || 1));
        const playedMatches = matches.filter(m => m.played).length;
        const duplicates    = findDuplicates().length;

        document.getElementById('statTeams').textContent     = teams.length;
        document.getElementById('statMatches').textContent   = matches.length;
        document.getElementById('statRounds').textContent    = totalRounds;
        document.getElementById('statPlayed').textContent    = `${playedMatches}/${matches.length}`;
        document.getElementById('statDuplicates').textContent = duplicates;

        const dupCard = document.getElementById('statDupCard');
        dupCard.classList.remove('danger', 'ok');
        dupCard.classList.add(duplicates > 0 ? 'danger' : 'ok');
    }

    // ---- Tab-Navigation ----
    function setupTabs() {
        document.querySelectorAll('.dash-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.dash-tab').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.dash-tab-content').forEach(c => c.style.display = 'none');
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).style.display = 'block';
            });
        });
    }

    // ---- Tab 1: Übersicht ----
    function renderOverview() {
        const dups = findDuplicates();
        const dupWarning  = document.getElementById('duplicateWarning');
        const noDupEl     = document.getElementById('noDuplicates');
        const dupCountEl  = document.getElementById('duplicateCount');
        const dupBody     = document.getElementById('duplicateBody');

        if (dups.length > 0) {
            dupWarning.style.display = 'block';
            noDupEl.style.display    = 'none';
            dupCountEl.textContent   = `${dups.length} Paarung${dups.length > 1 ? 'en' : ''} doppelt vorhanden.`;
            dupBody.innerHTML = '';
            dups.forEach(([, ms]) => {
                const rounds = ms.map(m => `R${m.round}`).join(', ');
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${esc(ms[0].team1)}</td>
                    <td>${esc(ms[0].team2)}</td>
                    <td class="rounds-cell">${esc(rounds)}</td>`;
                dupBody.appendChild(tr);
            });
        } else {
            dupWarning.style.display = 'none';
            noDupEl.style.display    = 'flex';
        }

        // Team-Karten mit Gegnerübersicht
        const oppMap  = buildOpponentMap();
        const listEl  = document.getElementById('teamOpponentList');
        listEl.innerHTML = '';

        const sorted = [...teams].sort((a, b) => a.localeCompare(b));
        sorted.forEach(team => {
            const opponents = oppMap[team] || {};
            const hasDup    = Object.values(opponents).some(rs => rs.length > 1);
            const card      = document.createElement('div');
            card.className  = `team-opp-card${hasDup ? ' has-dup' : ''}`;

            const rows = Object.entries(opponents)
                .sort((a, b) => a[1][0] - b[1][0])
                .map(([opp, rounds]) => {
                    const isDup = rounds.length > 1;
                    return `<div class="opp-row${isDup ? ' dup-opp' : ''}">
                        <span class="opp-row-name">${esc(opp)}</span>
                        <span class="opp-row-rounds">${rounds.map(r => `R${r}`).join(', ')}</span>
                    </div>`;
                }).join('');

            card.innerHTML = `<div class="team-opp-name">${esc(team)}</div>${rows || '<span style="font-size:0.75rem;color:rgba(255,255,255,0.3)">Keine Spiele</span>'}`;
            listEl.appendChild(card);
        });
    }

    // ---- Tab 2: Spielplan ----
    function renderSchedule() {
        const totalRounds = Math.max(...matches.map(m => m.round || 1));
        const selector    = document.getElementById('roundSelector');
        selector.innerHTML = '';

        for (let r = 1; r <= totalRounds; r++) {
            const btn = document.createElement('button');
            btn.className   = `round-sel-btn${r === 1 ? ' active' : ''}`;
            btn.textContent = `R${r}`;
            btn.dataset.round = r;
            btn.addEventListener('click', () => {
                selector.querySelectorAll('.round-sel-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                showRound(parseInt(btn.dataset.round));
            });
            selector.appendChild(btn);
        }

        showRound(1);
    }

    function showRound(round) {
        const roundMatches = matches
            .filter(m => m.round === round)
            .sort((a, b) => (a.tableNumber || 0) - (b.tableNumber || 0));

        const container = document.getElementById('scheduleTable');
        if (roundMatches.length === 0) {
            container.innerHTML = '<p style="color:rgba(255,255,255,0.3);font-size:0.85rem;">Keine Spiele in dieser Runde.</p>';
            return;
        }

        const rows = roundMatches.map(m => {
            const played = m.played;
            const score  = played ? `<span class="score-display">${m.score1} : ${m.score2}</span>` : '–';
            const badge  = played
                ? '<span class="badge-played">gespielt</span>'
                : '<span class="badge-open">offen</span>';
            return `<tr class="${played ? 'played' : ''}">
                <td class="table-num">Tisch ${m.tableNumber || '?'}</td>
                <td>${esc(m.team1)}</td>
                <td style="color:rgba(255,255,255,0.35);text-align:center;">vs</td>
                <td>${esc(m.team2)}</td>
                <td>${score}</td>
                <td class="status-cell">${badge}</td>
            </tr>`;
        }).join('');

        container.innerHTML = `
            <table class="schedule-table">
                <thead>
                    <tr>
                        <th>Tisch</th>
                        <th>Team 1</th>
                        <th></th>
                        <th>Team 2</th>
                        <th>Ergebnis</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
    }

    // ---- Tab 3: Paarungsmatrix ----
    function renderMatrix() {
        const oppMap  = buildOpponentMap();
        const sorted  = [...teams].sort((a, b) => a.localeCompare(b));
        const wrapper = document.getElementById('matrixWrapper');

        if (sorted.length === 0) {
            wrapper.innerHTML = '<p style="padding:1rem;color:rgba(255,255,255,0.3)">Keine Teams vorhanden.</p>';
            return;
        }

        // Kopfzeile
        const shortName = t => t.length > 8 ? t.slice(0, 7) + '…' : t;
        let html = '<table class="matrix-table"><thead><tr><th class="row-header corner"></th>';
        sorted.forEach(t => {
            html += `<th title="${esc(t)}">${esc(shortName(t))}</th>`;
        });
        html += '</tr></thead><tbody>';

        sorted.forEach(rowTeam => {
            html += `<tr><th class="row-header" title="${esc(rowTeam)}">${esc(rowTeam)}</th>`;
            sorted.forEach(colTeam => {
                if (rowTeam === colTeam) {
                    html += '<td class="self-cell">—</td>';
                } else {
                    const rounds = (oppMap[rowTeam] && oppMap[rowTeam][colTeam]) || [];
                    if (rounds.length === 0) {
                        html += '<td class="no-match">·</td>';
                    } else if (rounds.length === 1) {
                        html += `<td class="match-once" title="Runde ${rounds[0]}">R${rounds[0]}</td>`;
                    } else {
                        html += `<td class="match-dup" title="${rounds.map(r => 'R' + r).join(', ')}">${rounds.map(r => 'R' + r).join(' ')}</td>`;
                    }
                }
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        wrapper.innerHTML = html;
    }

    // ---- Hilfsfunktionen ----

    function buildOpponentMap() {
        const map = {};
        for (const team of teams) map[team] = {};
        for (const m of matches) {
            if (!map[m.team1]) map[m.team1] = {};
            if (!map[m.team2]) map[m.team2] = {};
            if (!map[m.team1][m.team2]) map[m.team1][m.team2] = [];
            if (!map[m.team2][m.team1]) map[m.team2][m.team1] = [];
            map[m.team1][m.team2].push(m.round);
            map[m.team2][m.team1].push(m.round);
        }
        return map;
    }

    function findDuplicates() {
        const pairMap = {};
        for (const m of matches) {
            const key = [m.team1, m.team2].sort().join('|||');
            if (!pairMap[key]) pairMap[key] = [];
            pairMap[key].push(m);
        }
        return Object.entries(pairMap).filter(([, ms]) => ms.length > 1);
    }

    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
});
