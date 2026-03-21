/**
 * LAOS 2.0 - Gegner-Übersicht (kombiniert: Tischkarten + Team-Ansicht)
 */

import dataService from '../global/data-service.js';

document.addEventListener('DOMContentLoaded', async function() {

    // ─── DOM-Elemente ───
    const statusContainer       = document.getElementById('statusContainer');
    const tableCardsContainer   = document.getElementById('tableCardsContainer');
    const teamsOverviewContainer = document.getElementById('teamsOverviewContainer');
    const updateTimeElement     = document.getElementById('updateTime');
    const standingsContainer    = document.getElementById('standingsContainer');
    const tabButtons            = document.querySelectorAll('.gegner-tab-btn');

    // ─── Daten-Variablen ───
    let teams           = [];
    let matches         = [];
    let standings       = [];
    let goldenCupResults = [];

    // ─── Tab-Status ───
    let activeTab = 'tischkarten';

    // ─── Timer ───
    const updateInterval = 5000;
    let updateTimer;

    init();

    // ════════════════════════════════════════
    // INITIALISIERUNG
    // ════════════════════════════════════════

    async function init() {
        console.log('Initialisiere Gegner-Übersicht-Seite');

        dataService.addStatusListener(isOnline => {});

        await loadData();

        if (teams.length === 0) {
            setStatus('Keine Teams gefunden. Bitte füge Teams auf der Teams-Seite hinzu.', 'error');
            return;
        }
        if (matches.length === 0) {
            setStatus('Keine Spiele gefunden. Bitte initialisiere die Vorrunde.', 'warning');
            return;
        }

        // Tab-Buttons verdrahten
        tabButtons.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

        // Erste Anzeige
        renderActiveTab();
        renderStandings();
        updateLastUpdateTime();

        startUpdateTimer();
        setupRealtimeUpdates();

        // Höhenangleichung regelmäßig entfernen (für Teams-Tab)
        setInterval(höhenAngleichungEntfernen, 2000);
    }

    // ════════════════════════════════════════
    // TAB-LOGIK
    // ════════════════════════════════════════

    function switchTab(tabName) {
        activeTab = tabName;
        tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
        document.getElementById('tischkarten-content').style.display = tabName === 'tischkarten' ? '' : 'none';
        document.getElementById('teams-content').style.display       = tabName === 'teams'        ? '' : 'none';
        renderActiveTab();
        if (tabName === 'teams') höhenAngleichungEntfernen();
    }

    function renderActiveTab() {
        if (activeTab === 'tischkarten') renderTableCards();
        else renderTeamsOverview();
    }

    // ════════════════════════════════════════
    // DATEN LADEN & ECHTZEIT-UPDATES
    // ════════════════════════════════════════

    async function loadData() {
        try {
            teams            = await dataService.getData('tournamentTeams')  || [];
            matches          = await dataService.getData('vorrundeMatches')  || [];
            standings        = await dataService.getData('vorrundeStandings') || [];
            goldenCupResults = await dataService.getData('goldenCupResults') || [];
            console.log('Daten geladen:', { teamsCount: teams.length, matchesCount: matches.length, standingsCount: standings.length });
        } catch (error) {
            console.error('Fehler beim Laden der Daten:', error);
            setStatus('Fehler beim Laden der Daten. Verwende lokale Daten falls verfügbar.', 'error');
        }
    }

    function setupRealtimeUpdates() {
        dataService.subscribeToData('tournamentTeams', updatedTeams => {
            if (JSON.stringify(teams) !== JSON.stringify(updatedTeams)) {
                teams = updatedTeams;
                renderActiveTab();
                updateLastUpdateTime();
            }
        });
        dataService.subscribeToData('vorrundeMatches', updatedMatches => {
            if (JSON.stringify(matches) !== JSON.stringify(updatedMatches)) {
                matches = updatedMatches;
                renderActiveTab();
                updateLastUpdateTime();
            }
        });
        dataService.subscribeToData('vorrundeStandings', updatedStandings => {
            if (JSON.stringify(standings) !== JSON.stringify(updatedStandings)) {
                standings = updatedStandings;
                renderStandings();
                updateLastUpdateTime();
            }
        });
        dataService.subscribeToData('goldenCupResults', updatedResults => {
            if (JSON.stringify(goldenCupResults) !== JSON.stringify(updatedResults)) {
                goldenCupResults = updatedResults;
                renderStandings();
            }
        });
    }

    function startUpdateTimer() {
        if (updateTimer) clearInterval(updateTimer);
        updateTimer = setInterval(refreshData, updateInterval);
        console.log(`Timer für Aktualisierung alle ${updateInterval / 1000} Sekunden gestartet`);
    }

    async function refreshData() {
        try {
            const currentTeams            = await dataService.getData('tournamentTeams')  || [];
            const currentMatches          = await dataService.getData('vorrundeMatches')  || [];
            const currentStandings        = await dataService.getData('vorrundeStandings') || [];
            const currentGoldenCupResults = await dataService.getData('goldenCupResults') || [];

            const teamsChanged      = JSON.stringify(teams)            !== JSON.stringify(currentTeams);
            const matchesChanged    = JSON.stringify(matches)          !== JSON.stringify(currentMatches);
            const standingsChanged  = JSON.stringify(standings)        !== JSON.stringify(currentStandings);
            const goldenCupChanged  = JSON.stringify(goldenCupResults) !== JSON.stringify(currentGoldenCupResults);

            if (teamsChanged || matchesChanged) {
                teams   = currentTeams;
                matches = currentMatches;
                renderActiveTab();
            }
            if (standingsChanged || goldenCupChanged) {
                standings        = currentStandings;
                goldenCupResults = currentGoldenCupResults;
                renderStandings();
            }
            updateLastUpdateTime();
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Daten:', error);
        }
    }

    function updateLastUpdateTime() {
        updateTimeElement.textContent = new Date().toLocaleTimeString();
    }

    // ════════════════════════════════════════
    // TISCHKARTEN-VIEW
    // ════════════════════════════════════════

    function getMatchesPerTable() {
        const result = {};
        for (let table = 1; table <= 6; table++) {
            const tableMatches = matches
                .filter(m => m.tableNumber === table)
                .sort((a, b) => {
                    if (a.round !== b.round) return a.round - b.round;
                    return (a.isSecondHalf ? 1 : 0) - (b.isSecondHalf ? 1 : 0);
                });
            const lastPlayed = [...tableMatches].reverse().find(m => m.played) || null;
            const unplayed   = tableMatches.filter(m => !m.played);
            result[table] = { lastPlayed, current: unplayed[0] || null, next: unplayed[1] || null };
        }
        return result;
    }

    function getBatchLabel(match) {
        if (!match) return '';
        const half = match.isSecondHalf ? '2. H' : '1. H';
        return `Rd. ${match.round} · ${half}`;
    }

    function renderTableCards() {
        tableCardsContainer.innerHTML = '';
        const perTable = getMatchesPerTable();
        for (let table = 1; table <= 6; table++) {
            const { lastPlayed, current, next } = perTable[table];
            tableCardsContainer.appendChild(createTableCard(table, lastPlayed, current, next));
        }
    }

    function createTableCard(tableNumber, lastPlayed, current, next) {
        const card = document.createElement('div');
        card.className = `table-card tisch-${tableNumber}`;

        // Header
        const header = document.createElement('div');
        header.className = 'table-card-header';
        header.textContent = `Tisch ${tableNumber}`;
        card.appendChild(header);

        // ZULETZT
        const zuletztSection = document.createElement('div');
        zuletztSection.className = 'table-card-section section-last';
        const zuletztLabel = document.createElement('div');
        zuletztLabel.className = 'section-label last';
        zuletztLabel.textContent = 'Zuletzt';
        zuletztSection.appendChild(zuletztLabel);
        if (lastPlayed) {
            const team1Won = lastPlayed.score1 > lastPlayed.score2;
            const team2Won = lastPlayed.score2 > lastPlayed.score1;
            zuletztSection.innerHTML += `
                <div class="match-result-row">
                    <span class="team-name ${team1Won ? 'winner' : ''}">${lastPlayed.team1}</span>
                    <span class="result-score">${lastPlayed.score1}:${lastPlayed.score2}</span>
                    <span class="team-name ${team2Won ? 'winner' : ''}">${lastPlayed.team2}</span>
                </div>
                <div class="round-info">${getBatchLabel(lastPlayed)}</div>
            `;
        } else {
            zuletztSection.innerHTML += `<div class="no-games-text">–</div>`;
        }
        card.appendChild(zuletztSection);

        // JETZT
        const jetztSection = document.createElement('div');
        jetztSection.className = 'table-card-section section-current';
        const jetztLabel = document.createElement('div');
        jetztLabel.className = 'section-label current';
        jetztLabel.textContent = 'Jetzt';
        jetztSection.appendChild(jetztLabel);
        if (current) {
            jetztSection.innerHTML += `
                <div class="match-teams-row">
                    <span class="team-name">${current.team1}</span>
                    <span class="vs-sep">vs</span>
                    <span class="team-name">${current.team2}</span>
                </div>
                <div class="round-info">${getBatchLabel(current)}</div>
            `;
        } else {
            jetztSection.innerHTML += `<div class="pause-text">Pause</div>`;
        }
        card.appendChild(jetztSection);

        // NÄCHSTES
        const naechstesSection = document.createElement('div');
        naechstesSection.className = 'table-card-section section-next';
        const naechstesLabel = document.createElement('div');
        naechstesLabel.className = 'section-label next';
        naechstesLabel.textContent = 'Nächstes';
        naechstesSection.appendChild(naechstesLabel);
        if (next) {
            naechstesSection.innerHTML += `
                <div class="match-teams-row">
                    <span class="team-name">${next.team1}</span>
                    <span class="vs-sep">vs</span>
                    <span class="team-name">${next.team2}</span>
                </div>
                <div class="round-info">${getBatchLabel(next)}</div>
            `;
        } else {
            naechstesSection.innerHTML += `<div class="no-games-text">–</div>`;
        }
        card.appendChild(naechstesSection);

        return card;
    }

    // ════════════════════════════════════════
    // TEAM-ANSICHT
    // ════════════════════════════════════════

    function renderTeamsOverview() {
        teamsOverviewContainer.innerHTML = '';
        const teamMatches = groupMatchesByTeam();
        teams.forEach((team, index) => {
            const tischIndex = (index % 6) + 1;
            teamsOverviewContainer.appendChild(createTeamOverviewCard(team, teamMatches[team] || [], tischIndex));
        });
        höhenAngleichungEntfernen();
    }

    function groupMatchesByTeam() {
        const teamMatches = {};
        teams.forEach(team => { teamMatches[team] = []; });
        matches.forEach(match => {
            if (teamMatches[match.team1]) teamMatches[match.team1].push({ ...match, isTeam1: true });
            if (teamMatches[match.team2]) teamMatches[match.team2].push({ ...match, isTeam1: false });
        });
        for (const team in teamMatches) {
            teamMatches[team].sort((a, b) => a.round - b.round);
        }
        return teamMatches;
    }

    function createTeamOverviewCard(teamName, teamMatches, tischIndex) {
        const teamCard = document.createElement('div');
        teamCard.className = `team-overview-card tisch-${tischIndex}`;

        const teamHeader = document.createElement('div');
        teamHeader.className = 'team-overview-header';
        teamHeader.textContent = teamName;
        teamCard.appendChild(teamHeader);

        const matchesContainer = document.createElement('div');
        matchesContainer.className = 'team-matches-container';

        if (teamMatches.length === 0) {
            const noMatches = document.createElement('div');
            noMatches.className = 'no-matches';
            noMatches.textContent = 'Keine Spiele für dieses Team gefunden.';
            matchesContainer.appendChild(noMatches);
        } else {
            const matchesByRound = groupMatchesByRound(teamMatches);
            for (const round in matchesByRound) {
                matchesContainer.appendChild(createRoundGroup(round, matchesByRound[round], teamName));
            }
        }

        teamCard.appendChild(matchesContainer);
        return teamCard;
    }

    function groupMatchesByRound(matches) {
        const matchesByRound = {};
        matches.forEach(match => {
            if (!matchesByRound[match.round]) matchesByRound[match.round] = [];
            matchesByRound[match.round].push(match);
        });
        return matchesByRound;
    }

    function createRoundGroup(round, matches, teamName) {
        const roundGroup = document.createElement('div');
        roundGroup.className = 'round-group';
        matches.forEach(match => roundGroup.appendChild(createMatchEntry(match, teamName, round)));
        return roundGroup;
    }

    function createMatchEntry(match, teamName, round) {
        const matchEntry = document.createElement('div');
        matchEntry.className = `match-entry tisch-${match.tableNumber || 1}`;

        const matchInfo = document.createElement('div');
        matchInfo.className = 'match-info';

        const roundHalfInfo = document.createElement('div');
        roundHalfInfo.className = 'round-half-info';
        if (match.isSecondHalf) {
            roundHalfInfo.innerHTML = `
                <div class="half-symbol second-half-symbol">
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
            `;
        } else {
            roundHalfInfo.innerHTML = `
                <div class="half-symbol first-half-symbol">
                    <span class="dot"></span>
                </div>
            `;
        }
        matchInfo.appendChild(roundHalfInfo);
        matchEntry.appendChild(matchInfo);

        const matchContent = document.createElement('div');
        matchContent.className = 'match-content';

        const isTeam1      = match.isTeam1;
        const opponentName = isTeam1 ? match.team2 : match.team1;
        const ownScore     = isTeam1 ? match.score1 : match.score2;
        const opponentScore = isTeam1 ? match.score2 : match.score1;

        if (match.played) {
            const resultClass = ownScore > opponentScore ? 'team-won' : ownScore < opponentScore ? 'team-lost' : 'team-draw';
            matchContent.innerHTML = `
                <span class="opponent-name">${opponentName}</span>
                <span class="match-score ${resultClass}">${ownScore}:${opponentScore}</span>
            `;
        } else {
            matchContent.innerHTML = `
                <span class="opponent-name">${opponentName}</span>
                <span class="no-result">-:-</span>
            `;
        }

        matchEntry.appendChild(matchContent);
        return matchEntry;
    }

    function höhenAngleichungEntfernen() {
        document.querySelectorAll('.round-groups-equalized').forEach(el => el.classList.remove('round-groups-equalized'));
        document.querySelectorAll('.round-group, .team-matches-container, .team-overview-card').forEach(el => {
            el.style.height    = 'auto';
            el.style.minHeight = '0';
        });
    }

    // ════════════════════════════════════════
    // HILFSFUNKTIONEN
    // ════════════════════════════════════════

    function setStatus(message, type = 'info') {
        statusContainer.className = 'status-container';
        statusContainer.classList.add(`status-${type}`);
        statusContainer.textContent = message;
    }

    window.addEventListener('beforeunload', () => { if (updateTimer) clearInterval(updateTimer); });

    // ════════════════════════════════════════
    // STANDINGS
    // ════════════════════════════════════════

    function renderStandings() {
        if (!standingsContainer) return;
        standingsContainer.innerHTML = '';

        const sortedForTies = [...standings].sort((a, b) => {
            if (a.points !== b.points) return b.points - a.points;
            if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });
        const ties = findTies(sortedForTies);

        let sortedStandings = [...standings].sort((a, b) => {
            if (a.points !== b.points) return b.points - a.points;
            if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
            if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
            for (const tie of ties) {
                if (tie.result) {
                    const isAInTie = tie.teams.some(t => t.team === a.team);
                    const isBInTie = tie.teams.some(t => t.team === b.team);
                    if (isAInTie && isBInTie) {
                        const aScore = tie.result.teams.find(t => t.team === a.team)?.score || 0;
                        const bScore = tie.result.teams.find(t => t.team === b.team)?.score || 0;
                        return bScore - aScore;
                    }
                }
            }
            return a.team.localeCompare(b.team);
        });

        const table = document.createElement('table');
        table.className = 'standings-table';
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th class="pos-col">Pos</th>
                <th class="team-col">Team</th>
                <th class="stat-col">Sp</th>
                <th class="stat-col">Diff</th>
                <th class="stat-col">Pkt</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        let currentPosition = 1;
        let positionCounter = 0;
        let lastTeamValues  = null;

        sortedStandings.forEach((team, index) => {
            const row = document.createElement('tr');
            const teamValues = { points: team.points, goalDifference: team.goalDifference, goalsFor: team.goalsFor };

            let isAffectedByGoldenCup = false;
            for (const tie of ties) {
                if (tie.result && tie.teams.some(t => t.team === team.team)) {
                    isAffectedByGoldenCup = true;
                    break;
                }
            }

            if (index === 0) {
                currentPosition = 1;
            } else if (isAffectedByGoldenCup) {
                currentPosition = positionCounter + 1;
            } else if (JSON.stringify(teamValues) !== JSON.stringify(lastTeamValues)) {
                currentPosition = positionCounter + 1;
            }
            positionCounter = index + 1;
            lastTeamValues  = teamValues;

            if (index < 4)       row.className = 'direct-qualifier';
            else if (index < 12) row.className = 'playoff-qualifier';

            const teamCell = document.createElement('td');
            teamCell.className   = 'team-col';
            teamCell.textContent = team.team;

            row.innerHTML = `<td class="pos-col">${currentPosition}</td>`;
            row.appendChild(teamCell);
            row.innerHTML += `
                <td class="stat-col">${team.played}</td>
                <td class="stat-col">${team.goalsFor - team.goalsAgainst}</td>
                <td class="stat-col">${team.points}</td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        standingsContainer.appendChild(table);
    }

    function findTies(sortedStandings) {
        const teamsByValues = {};
        sortedStandings.forEach(team => {
            const key = `${team.points}-${team.goalDifference}-${team.goalsFor}`;
            if (!teamsByValues[key]) teamsByValues[key] = [];
            teamsByValues[key].push(team);
        });

        const ties = [];
        for (const key in teamsByValues) {
            if (teamsByValues[key].length > 1) {
                const teamsSorted = teamsByValues[key].map(t => t.team).sort().join('_');
                const tieId = btoa(teamsSorted).replace(/=/g, '');
                ties.push({ teams: teamsByValues[key], id: tieId });
            }
        }

        ties.forEach(tie => {
            const result = goldenCupResults.find(result =>
                result.id === tie.id ||
                (result.teams.every(team => tie.teams.some(t => t.team === team.team)) &&
                 tie.teams.every(team => result.teams.some(t => t.team === team.team)))
            );
            tie.result = result || null;
        });

        return ties;
    }

});
