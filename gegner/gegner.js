/**
 * LAOS 2.0 - JavaScript für die Gegner-Übersicht
 * Dieses Script zeigt die Spiele nach Teams sortiert an mit regelmäßigen Aktualisierungen
 * Aktualisiert, um den dataService für Firebase-Integration zu verwenden
 */

// Importiere dataService für Firebase-Zugriff
import dataService from '../global/data-service.js';
// Warten bis das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', async function() {

    // DOM-Elemente
// DOM-Elemente
const statusContainer = document.getElementById('statusContainer');
const tableCardsContainer = document.getElementById('tableCardsContainer');
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
    renderTableCards();
    renderStandings();
    updateLastUpdateTime();

    // Timer für regelmäßige Aktualisierungen starten
    startUpdateTimer();

    // Echtzeit-Updates für Daten einrichten
    setupRealtimeUpdates();

    
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
            renderTableCards();
            updateLastUpdateTime();
        }
    });

    // Echtzeit-Updates für Matches
    dataService.subscribeToData('vorrundeMatches', updatedMatches => {
        if (JSON.stringify(matches) !== JSON.stringify(updatedMatches)) {
            console.log('Matches wurden aktualisiert');
            matches = updatedMatches;
            renderTableCards();
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
            renderTableCards();
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
     * Gibt für jeden Tisch (1–6) das letzte gespielte, das nächste und übernächste Spiel zurück.
     */
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
            const unplayed = tableMatches.filter(m => !m.played);
            result[table] = {
                lastPlayed,
                current: unplayed[0] || null,
                next: unplayed[1] || null
            };
        }
        return result;
    }

    /**
     * Gibt ein lesbares Runden-Label zurück, z.B. "Rd. 3 · 1. H"
     */
    function getBatchLabel(match) {
        if (!match) return '';
        const half = match.isSecondHalf ? '2. H' : '1. H';
        return `Rd. ${match.round} · ${half}`;
    }

    /**
     * Rendert die 6 Tischkarten (ersetzt renderTeamsOverview).
     */
    function renderTableCards() {
        tableCardsContainer.innerHTML = '';
        const perTable = getMatchesPerTable();
        for (let table = 1; table <= 6; table++) {
            const { lastPlayed, current, next } = perTable[table];
            const card = createTableCard(table, lastPlayed, current, next);
            tableCardsContainer.appendChild(card);
        }
    }

    /**
     * Erstellt eine Tischkarte mit drei Sektionen: ZULETZT, JETZT, NÄCHSTES.
     */
    function createTableCard(tableNumber, lastPlayed, current, next) {
        const card = document.createElement('div');
        card.className = `table-card tisch-${tableNumber}`;

        // Header
        const header = document.createElement('div');
        header.className = 'table-card-header';
        header.textContent = `Tisch ${tableNumber}`;
        card.appendChild(header);

        // ZULETZT-Sektion
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

        // JETZT-Sektion
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

        // NÄCHSTES-Sektion
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
    
    /**
     * Setzt einen Status-Text
     * @param {string} message - Die anzuzeigende Nachricht
     * @param {string} type - Der Typ der Nachricht ('info', 'success', 'warning', 'error')
     */
    function setStatus(message, type = 'info') {
        statusContainer.className = 'status-container';
        statusContainer.classList.add(`status-${type}`);
        statusContainer.textContent = message;
    }
    
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


});