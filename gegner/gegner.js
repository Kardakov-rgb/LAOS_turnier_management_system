/**
 * LAOS 2.0 - JavaScript für die Gegner-Übersicht
 * Dieses Script zeigt die Spiele nach Teams sortiert an mit regelmäßigen Aktualisierungen
 * Aktualisiert, um den dataService für Firebase-Integration zu verwenden
 */

// Importiere dataService für Firebase-Zugriff
import dataService from '../global/data-service.js';
import { createStatusHelper } from '../global/status.js';
// Warten bis das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', async function() {

    // DOM-Elemente
// DOM-Elemente
const statusContainer = document.getElementById('statusContainer');
    const setStatus = createStatusHelper(statusContainer);
const teamsOverviewContainer = document.getElementById('teamsOverviewContainer');
const updateTimeElement = document.getElementById('updateTime');
const connectionStatusElement = document.getElementById('connection-status');
const statusIconElement = document.getElementById('status-icon');
const statusTextElement = document.getElementById('status-text');
const pendingUpdatesElement = document.getElementById('pending-updates');
const standingsContainer = document.getElementById('standingsContainer'); // Neu hinzugefügt
// Daten-Variablen
let teams = [];
let matches = [];
let standings = []; // Neu hinzugefügt
let goldenCupResults = []; // Neu hinzugefügt
    
    // Update-Intervall in Millisekunden (5 Sekunden)
    const updateInterval = 5000;
    
    // Timer für die regelmäßige Aktualisierung
    let updateTimer;
    
    // Seite initialisieren
    init();
    
    /**
     * Initialisiert die Seite und lädt die Daten
     */
async function init() {
    console.log('Initialisiere Gegner-Übersicht-Seite');
    
    
    // Verbindungsstatus überwachen
    dataService.addStatusListener(isOnline => {

    });
    
    // Erste Daten laden
    await loadData();
    
    // Prüfen ob Teams vorhanden sind
    if (teams.length === 0) {
        setStatus('Keine Teams gefunden. Bitte füge Teams auf der Teams-Seite hinzu.', 'error');
        return;
    }
    
    // Prüfen ob Matches bereits generiert wurden
    if (matches.length === 0) {
        setStatus('Keine Spiele gefunden. Bitte initialisiere die Vorrunde.', 'warning');
        return;
    }
    
    // Erste Anzeige der Daten
    renderTeamsOverview();
    renderStandings();
    updateLastUpdateTime();
    
    // Timer für regelmäßige Aktualisierungen starten
    startUpdateTimer();
    
    // Echtzeit-Updates für Daten einrichten
    setupRealtimeUpdates();
    
    // Höhenangleichung entfernen - DIESE ZEILE HINZUFÜGEN
    höhenAngleichungEntfernen();
    
    // Regelmäßige Prüfung einrichten - DIESE ZEILEN HINZUFÜGEN
    setInterval(höhenAngleichungEntfernen, 2000);

    
}
    
    /**
     * Lädt Daten über den dataService
     */
async function loadData() {
    try {
        // Daten laden
        teams = await dataService.getData('tournamentTeams') || [];
        matches = await dataService.getData('vorrundeMatches') || [];
        standings = await dataService.getData('vorrundeStandings') || []; // Neu hinzugefügt
        goldenCupResults = await dataService.getData('goldenCupResults') || []; // Neu hinzugefügt
        
        console.log('Daten geladen:', {
            teamsCount: teams.length,
            matchesCount: matches.length,
            standingsCount: standings.length // Neu hinzugefügt
        });
    } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
        setStatus('Fehler beim Laden der Daten. Verwende lokale Daten falls verfügbar.', 'error');
    }
}
    
    /**
     * Richtet Echtzeit-Updates für die Daten ein
     */
function setupRealtimeUpdates() {
    // Echtzeit-Updates für Teams
    dataService.subscribeToData('tournamentTeams', updatedTeams => {
        if (JSON.stringify(teams) !== JSON.stringify(updatedTeams)) {
            console.log('Teams wurden aktualisiert');
            teams = updatedTeams;
            renderTeamsOverview();
            updateLastUpdateTime();
        }
    });
    
    // Echtzeit-Updates für Matches
    dataService.subscribeToData('vorrundeMatches', updatedMatches => {
        if (JSON.stringify(matches) !== JSON.stringify(updatedMatches)) {
            console.log('Matches wurden aktualisiert');
            matches = updatedMatches;
            renderTeamsOverview();
            updateLastUpdateTime();
        }
    });
    
    // Echtzeit-Updates für Standings (Neu hinzugefügt)
    dataService.subscribeToData('vorrundeStandings', updatedStandings => {
        if (JSON.stringify(standings) !== JSON.stringify(updatedStandings)) {
            console.log('Standings wurden aktualisiert');
            standings = updatedStandings;
            renderStandings(); // Neue Funktion, die wir später hinzufügen
            updateLastUpdateTime();
        }
    });
    
    // Echtzeit-Updates für Golden Cup (Neu hinzugefügt)
    dataService.subscribeToData('goldenCupResults', updatedResults => {
        if (JSON.stringify(goldenCupResults) !== JSON.stringify(updatedResults)) {
            console.log('Golden Cup Ergebnisse wurden aktualisiert');
            goldenCupResults = updatedResults;
            renderStandings(); // Aktualisiere die Tabelle, wenn sich GoldenCup-Ergebnisse ändern
        }
    });
}
    
    /**
     * Startet den Timer für regelmäßige Aktualisierungen
     */
    function startUpdateTimer() {
        // Bestehenden Timer ggf. löschen
        if (updateTimer) {
            clearInterval(updateTimer);
        }
        
        // Neuen Timer starten
        updateTimer = setInterval(function() {
            refreshData();
        }, updateInterval);
        
        console.log(`Timer für Aktualisierung alle ${updateInterval/1000} Sekunden gestartet`);
    }
    
    /**
     * Aktualisiert die Daten über den dataService
     */
async function refreshData() {
    try {
        // Aktuelle Daten laden
        const currentTeams = await dataService.getData('tournamentTeams') || [];
        const currentMatches = await dataService.getData('vorrundeMatches') || [];
        const currentStandings = await dataService.getData('vorrundeStandings') || []; // Neu
        const currentGoldenCupResults = await dataService.getData('goldenCupResults') || []; // Neu
        
        // Prüfen, ob sich die Daten geändert haben
        const teamsChanged = JSON.stringify(teams) !== JSON.stringify(currentTeams);
        const matchesChanged = JSON.stringify(matches) !== JSON.stringify(currentMatches);
        const standingsChanged = JSON.stringify(standings) !== JSON.stringify(currentStandings); // Neu
        const goldenCupChanged = JSON.stringify(goldenCupResults) !== JSON.stringify(currentGoldenCupResults); // Neu
        
        // Daten aktualisieren, wenn Änderungen vorhanden
        if (teamsChanged || matchesChanged) {
            console.log('Teams oder Matches haben sich geändert, aktualisiere Anzeige');
            teams = currentTeams;
            matches = currentMatches;
            renderTeamsOverview();
        }
        
        if (standingsChanged || goldenCupChanged) { // Neu
            console.log('Standings oder Golden Cup haben sich geändert, aktualisiere Tabelle');
            standings = currentStandings;
            goldenCupResults = currentGoldenCupResults;
            renderStandings();
        }
        
        // Aktualisierungszeit immer aktualisieren
        updateLastUpdateTime();
        
    } catch (error) {
        console.error("Fehler beim Aktualisieren der Daten:", error);
    }
}
    
    
    /**
     * Aktualisiert die Anzeige der letzten Aktualisierungszeit
     */
    function updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        updateTimeElement.textContent = timeString;
    }
    
    /**
     * Rendert die Team-Übersichten
     */
function renderTeamsOverview() {
    // Container leeren
    teamsOverviewContainer.innerHTML = '';
    
    // Matches nach Teams gruppieren
    const teamMatches = groupMatchesByTeam();
    
    // Team-Karten erstellen
    teams.forEach(team => {
        const teamCard = createTeamOverviewCard(team, teamMatches[team] || []);
        teamsOverviewContainer.appendChild(teamCard);
    });
    
    // Höhenangleichung entfernen - DIESE ZEILE HINZUFÜGEN
    höhenAngleichungEntfernen();
}
    
    /**
     * Gruppiert die Matches nach Teams
     * @returns {Object} - Ein Objekt mit Team-Namen als Schlüssel und Arrays von Matches als Werte
     */
    function groupMatchesByTeam() {
        const teamMatches = {};
        
        // Für jedes Team ein leeres Array initialisieren
        teams.forEach(team => {
            teamMatches[team] = [];
        });
        
        // Matches den Teams zuordnen
        matches.forEach(match => {
            // Match für Team 1 hinzufügen
            if (teamMatches[match.team1]) {
                teamMatches[match.team1].push({
                    ...match,
                    isTeam1: true,  // Hinzufügen einer Markierung, dass dieses Team team1 ist
                });
            }
            
            // Match für Team 2 hinzufügen
            if (teamMatches[match.team2]) {
                teamMatches[match.team2].push({
                    ...match,
                    isTeam1: false,  // Hinzufügen einer Markierung, dass dieses Team team2 ist
                });
            }
        });
        
        // Matches für jedes Team nach Runden sortieren
        for (const team in teamMatches) {
            teamMatches[team].sort((a, b) => a.round - b.round);
        }
        
        return teamMatches;
    }
    
    /**
     * Erstellt eine Team-Übersichtskarte
     * @param {string} teamName - Der Name des Teams
     * @param {Array} teamMatches - Die Matches dieses Teams
     * @returns {HTMLElement} - Die erstellte Karte
     */
    function createTeamOverviewCard(teamName, teamMatches) {
        // Team-Karte erstellen
        const teamCard = document.createElement('div');
        teamCard.className = 'team-overview-card';
        
        // Header mit Team-Namen
        const teamHeader = document.createElement('div');
        teamHeader.className = 'team-overview-header';
        teamHeader.textContent = teamName;
        teamCard.appendChild(teamHeader);
        
        // Container für Matches
        const matchesContainer = document.createElement('div');
        matchesContainer.className = 'team-matches-container';
        
        if (teamMatches.length === 0) {
            // Keine Matches für dieses Team
            const noMatches = document.createElement('div');
            noMatches.className = 'no-matches';
            noMatches.textContent = 'Keine Spiele für dieses Team gefunden.';
            matchesContainer.appendChild(noMatches);
        } else {
            // Matches nach Runden gruppieren
            const matchesByRound = groupMatchesByRound(teamMatches);
            
            // Für jede Runde die Matches anzeigen
            for (const round in matchesByRound) {
                const roundGroup = createRoundGroup(round, matchesByRound[round], teamName);
                matchesContainer.appendChild(roundGroup);
            }
        }
        
        teamCard.appendChild(matchesContainer);
        
        return teamCard;
    }
    
    /**
     * Gruppiert Matches nach Runden
     * @param {Array} matches - Die zu gruppierenden Matches
     * @returns {Object} - Ein Objekt mit Runden-Nummern als Schlüssel und Arrays von Matches als Werte
     */
    function groupMatchesByRound(matches) {
        const matchesByRound = {};
        
        matches.forEach(match => {
            if (!matchesByRound[match.round]) {
                matchesByRound[match.round] = [];
            }
            
            matchesByRound[match.round].push(match);
        });
        
        return matchesByRound;
    }
    
    /**
     * Erstellt eine Rundengruppe mit Matches
     * @param {number} round - Die Rundennummer
     * @param {Array} matches - Die Matches dieser Runde
     * @param {string} teamName - Der Name des Teams, für das die Übersicht erstellt wird
     * @returns {HTMLElement} - Das erstellte Element
     */
    function createRoundGroup(round, matches, teamName) {
        const roundGroup = document.createElement('div');
        roundGroup.className = 'round-group';
        
        // Matches dieser Runde anzeigen
        matches.forEach(match => {
            const matchEntry = createMatchEntry(match, teamName, round);
            roundGroup.appendChild(matchEntry);
        });
        
        return roundGroup;
    }
    
/**
 * Erstellt einen Match-Eintrag
 * @param {Object} match - Das Match-Objekt
 * @param {string} teamName - Der Name des Teams, für das die Übersicht erstellt wird
 * @param {number} round - Die Rundennummer
 * @returns {HTMLElement} - Das erstellte Element
 */
function createMatchEntry(match, teamName, round) {
    const matchEntry = document.createElement('div');
    matchEntry.className = `match-entry tisch-${match.tableNumber || 1}`;
    
    // Match-Info mit Halbzeit-Symbol
    const matchInfo = document.createElement('div');
    matchInfo.className = 'match-info';
    
    // Halbzeit-Symbol erstellen
    const roundHalfInfo = document.createElement('div');
    roundHalfInfo.className = 'round-half-info';
    
    // Symbol je nach Halbzeit wählen
    if (match.isSecondHalf) {
        // Zweite Hälfte: Zwei Punkte übereinander
        roundHalfInfo.innerHTML = `
            <div class="half-symbol second-half-symbol">
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
        `;
    } else {
        // Erste Hälfte: Ein einzelner Punkt
        roundHalfInfo.innerHTML = `
            <div class="half-symbol first-half-symbol">
                <span class="dot"></span>
            </div>
        `;
    }
    
    // Halbzeit-Symbol zur Match-Info hinzufügen
    matchInfo.appendChild(roundHalfInfo);
    
    // Match-Info zum Match-Entry hinzufügen
    matchEntry.appendChild(matchInfo);
    
    // Gegner und Ergebnis nebeneinander
    const matchContent = document.createElement('div');
    matchContent.className = 'match-content';
    
    // Gegner-Name bestimmen
    const isTeam1 = match.isTeam1;
    const opponentName = isTeam1 ? match.team2 : match.team1;
    
    // Eigener Score und Gegner-Score
    const ownScore = isTeam1 ? match.score1 : match.score2;
    const opponentScore = isTeam1 ? match.score2 : match.score1;
    
    // Gegner-Name und Ergebnis nebeneinander anzeigen
    if (match.played) {
        // Ergebnis anzeigen
        let resultClass = '';
        if (ownScore > opponentScore) {
            resultClass = 'team-won';
        } else if (ownScore < opponentScore) {
            resultClass = 'team-lost';
        } else {
            resultClass = 'team-draw';
        }
        
        matchContent.innerHTML = `
            <span class="opponent-name">${opponentName}</span>
            <span class="match-score ${resultClass}">${ownScore}:${opponentScore}</span>
        `;
    } else {
        // Noch kein Ergebnis
        matchContent.innerHTML = `
            <span class="opponent-name">${opponentName}</span>
            <span class="no-result">-:-</span>
        `;
    }
    
    // Match-Content zum Match-Entry hinzufügen
    matchEntry.appendChild(matchContent);
    
    return matchEntry;
}
    
    /**
     * Setzt einen Status-Text
     * @param {string} message - Die anzuzeigende Nachricht
     * @param {string} type - Der Typ der Nachricht ('info', 'success', 'warning', 'error')
     */
    
    // Bei Verlassen der Seite den Timer stoppen
    window.addEventListener('beforeunload', function() {
        if (updateTimer) {
            clearInterval(updateTimer);
        }
    });
/**
 * Rendert die Tabelle
 */
function renderStandings() {
    if (!standingsContainer) return;
    
    // Container leeren
    standingsContainer.innerHTML = '';
    
    // Gleichstände finden
    const sortedForTies = [...standings].sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });
    
    const ties = findTies(sortedForTies);
    
    // Tabelle mit Golden Cup Berücksichtigung sortieren
    let sortedStandings = [...standings].sort((a, b) => {
        // Primäre Kriterien: Punkte, Tordifferenz, erzielte Tore
        if (a.points !== b.points) return b.points - a.points;
        if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
        if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
        
        // Wenn alle Kriterien gleich sind, prüfe Golden Cup Ergebnisse
        for (const tie of ties) {
            if (tie.result) {
                const isAInTie = tie.teams.some(t => t.team === a.team);
                const isBInTie = tie.teams.some(t => t.team === b.team);
                
                if (isAInTie && isBInTie) {
                    // Finde die entsprechenden Scores im Tie-Ergebnis
                    const aScore = tie.result.teams.find(t => t.team === a.team)?.score || 0;
                    const bScore = tie.result.teams.find(t => t.team === b.team)?.score || 0;
                    
                    // Sortiere absteigend nach Score (höhere Scores zuerst)
                    return bScore - aScore;
                }
            }
        }
        
        // Alphabetische Sortierung als letztes Kriterium
        return a.team.localeCompare(b.team);
    });
    
    // Tabelle erstellen
    const table = document.createElement('table');
    table.className = 'standings-table';
    
    // Tabellenkopf
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
    
    // Tabellenkörper
    const tbody = document.createElement('tbody');
    
    // Aktuelle Position und Werte für Vergleich initialisieren
    let currentPosition = 1;
    let positionCounter = 0;
    let lastTeamValues = null;
    
    sortedStandings.forEach((team, index) => {
        const row = document.createElement('tr');
        
        // Aktuelle Werte des Teams
        const teamValues = {
            points: team.points,
            goalDifference: team.goalDifference,
            goalsFor: team.goalsFor
        };
        
        // Für Golden Cup-Entscheidungen prüfen, ob dies den gleichen Platz beeinträchtigt
        let isAffectedByGoldenCup = false;
        for (const tie of ties) {
            if (tie.result && tie.teams.some(t => t.team === team.team)) {
                isAffectedByGoldenCup = true;
                break;
            }
        }
        
        // Position bestimmen
        if (index === 0) {
            // Erste Position ist immer 1
            currentPosition = 1;
        } else if (isAffectedByGoldenCup) {
            // Bei Golden Cup-Entscheidungen inkrementieren wir den Counter
            currentPosition = positionCounter + 1;
        } else if (JSON.stringify(teamValues) === JSON.stringify(lastTeamValues)) {
            // Gleiche Werte -> gleiche Position (keine Änderung)
        } else {
            // Unterschiedliche Werte -> neue Position basierend auf aktuellem Counter
            currentPosition = positionCounter + 1;
        }
        
        // Zähler für die nächste Position aktualisieren
        positionCounter = index + 1;
        
        // Werte für den nächsten Vergleich speichern
        lastTeamValues = teamValues;
        
        // CSS-Klasse für direkte Qualifikation und Playoff-Qualifikation
        // Basierend auf tatsächlicher Position in der sortierten Tabelle
        if (index < 4) {
            row.className = 'direct-qualifier';
        } else if (index < 12) {
            row.className = 'playoff-qualifier';
        }
        
        // Team-Zelle OHNE Marker für Gleichstand in der normalen Ansicht
        const teamCell = document.createElement('td');
        teamCell.className = 'team-col';
        teamCell.textContent = team.team;
        
        // Restliche Zellen
        row.innerHTML = `
            <td class="pos-col">${currentPosition}</td>
        `;
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

/**
 * Findet Gleichstände in der Tabelle
 */
function findTies(sortedStandings) {
    // Gruppiere Teams nach ihren Sortierkriterien
    const teamsByValues = {};
    
    sortedStandings.forEach(team => {
        // Erstelle einen Schlüssel aus den Sortierkriterien
        const key = `${team.points}-${team.goalDifference}-${team.goalsFor}`;
        
        if (!teamsByValues[key]) {
            teamsByValues[key] = [];
        }
        
        teamsByValues[key].push(team);
    });
    
    // Nur Gruppen mit mehr als einem Team sind Gleichstände
    const ties = [];
    
    for (const key in teamsByValues) {
        if (teamsByValues[key].length > 1) {
            // Erstelle eine stabile ID für diesen Gleichstand
            const teamsSorted = teamsByValues[key].map(t => t.team).sort().join('_');
            const tieId = btoa(teamsSorted).replace(/=/g, ''); // Base64-kodierte eindeutige ID
            
            ties.push({
                teams: teamsByValues[key],
                id: tieId
            });
        }
    }
    
    // Überprüfen, ob es Golden Cup Ergebnisse für diese Ties gibt
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

/**
 * Entfernt die Höhenangleichung der Runden-Gruppen
 */
function höhenAngleichungEntfernen() {
    // Entferne die Klasse, die für die Höhenangleichung sorgt
    document.querySelectorAll('.round-groups-equalized').forEach(element => {
        element.classList.remove('round-groups-equalized');
    });
    
    // Setze alle manuell gesetzten Höhen zurück
    document.querySelectorAll('.round-group, .team-matches-container, .team-overview-card').forEach(element => {
        element.style.height = 'auto';
        element.style.minHeight = '0';
    });
}

});