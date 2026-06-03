/**
 * LAOS 2.0 - JavaScript für die Wetten-Display-Seite
 * Display-Version der Wetten-Seite ohne Eingabeformular
 * Firebase-Integration für Echtzeit-Datensynchonisierung
 */

// Import des dataService für Firebase-Integration
import dataService from '../global/data-service.js';
// Warten bis das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', async function() {

    const statusContainer = document.getElementById('statusContainer');
    const finalistsContainer = document.getElementById('finalistsContainer');
    const teamBetsContainer = document.getElementById('teamBetsContainer');
    const totalBetsCount = document.getElementById('totalBetsCount');
    const totalBetsAmount = document.getElementById('totalBetsAmount');
    
    // Daten für die Anwendung
    let teams = [];
    let koMatches = {};
    let bets = [];
    
    // Finalteams und deren Statistiken
    let finalTeams = [];
    let teamStats = [];
    
    // Seite initialisieren
    await init();
    
    /**
     * Initialisiert die Wetten-Display-Seite
     */
    async function init() {
        console.log('Initialisiere Wetten-Display-Seite');
        
        // Grundlegende Daten laden
        await loadInitialData();
        
        // Grundlegende Prüfungen
        if (teams.length === 0) {
            setStatus('Keine Teams gefunden. Bitte füge zuerst Teams hinzu.', 'error');
            return;
        }
        
        // Finalisten aus KO-Runde ermitteln
        loadFinalTeams();
        
        // Team-Statistiken laden
        await loadTeamStats();
        
        // UI rendern
        renderFinalists();
        renderTeamBets();
        renderDistributionChart();
        renderLastBetTicker();
        updateTotalStats();

        // Echtzeit-Aktualisierungen aktivieren
        setupRealTimeUpdates();
    }
    
    /**
     * Lädt die Anfangsdaten aus Firebase
     */
    async function loadInitialData() {
        try {
            // Teams laden
            const teamsData = await dataService.getData('tournamentTeams');
            teams = Array.isArray(teamsData) ? teamsData : [];
            console.log('Teams geladen:', teams);
            
            // KO-Matches laden
            const koMatchesData = await dataService.getData('koMatches');
            koMatches = normalizeKoMatches(koMatchesData || {});
            console.log('KO-Matches geladen:', koMatches);
            
            // Wetten laden
            const betsData = await dataService.getData('tournamentBets');
            bets = Array.isArray(betsData) ? betsData : [];
            console.log('Wetten geladen:', bets);
        } catch (error) {
            console.error('Fehler beim Laden der Anfangsdaten:', error);
            setStatus('Fehler beim Laden der Daten. Bitte aktualisiere die Seite.', 'error');
        }
    }

    
    /**
     * Richtet Echtzeit-Aktualisierungen für Firebase ein
     */
    function setupRealTimeUpdates() {
        // Teams abonnieren
        dataService.subscribeToData('tournamentTeams', (newTeams) => {
            console.log('Teams aktualisiert:', newTeams);
            teams = Array.isArray(newTeams) ? newTeams : [];
        });
        
        // KO-Matches abonnieren
        dataService.subscribeToData('koMatches', (newMatches) => {
            console.log('KO-Matches aktualisiert:', newMatches);
            koMatches = normalizeKoMatches(newMatches || {});
            loadFinalTeams();
            renderFinalists();
            renderTeamBets();
            renderDistributionChart();
        });
        
        // Wetten abonnieren
        dataService.subscribeToData('tournamentBets', (newBets) => {
            console.log('Wetten aktualisiert:', newBets);
            bets = Array.isArray(newBets) ? newBets : [];
            renderFinalists();
            renderTeamBets();
            renderDistributionChart();
            renderLastBetTicker();
            updateTotalStats();
        });
        
        // Teamstatistiken abonnieren
        dataService.subscribeToData('teamStats', (newStats) => {
            console.log('Teamstatistiken aktualisiert:', newStats);
            teamStats = newStats || [];
            renderFinalists();
        });
    }
    
    /**
     * Normalisiert koMatches nach Firebase-Round-Trip:
     * Firebase speichert Arrays als Integer-Objekte ({0:…,1:…}) — diese Funktion
     * stellt sicher, dass alle Runden echte Arrays sind und jedes Match genau 2 Team-Slots hat.
     */
    function normalizeKoMatches(data) {
        if (!data || typeof data !== 'object') return {};
        const result = {};
        ['playoff', 'quarterfinal', 'semifinal', 'final'].forEach(round => {
            const roundData = data[round];
            if (!roundData) { result[round] = []; return; }
            const matchArray = Array.isArray(roundData) ? roundData : Object.values(roundData);
            result[round] = matchArray.map(match => {
                if (!match || typeof match !== 'object') return match;
                let teams = match.teams;
                if (!teams) {
                    teams = [{ name: null }, { name: null }];
                } else if (!Array.isArray(teams)) {
                    teams = Object.values(teams);
                }
                while (teams.length < 2) teams.push({ name: null });
                teams = teams.map(t => (t && typeof t === 'object') ? t : { name: null });
                return { ...match, teams };
            });
        });
        return result;
    }

    /**
     * Lädt die Finalisten aus der KO-Runde
     */
    function loadFinalTeams() {
        finalTeams = [];

        // Prüfen, ob Finalspiel existiert
        if (koMatches.final && koMatches.final.length > 0) {
            const finalMatch = koMatches.final[0];

            // Beide Teams extrahieren, wenn vorhanden
            if (finalMatch.teams && finalMatch.teams.length === 2) {
                finalMatch.teams.forEach(team => {
                    if (team.name) {
                        finalTeams.push({
                            name: team.name,
                            isWinner: finalMatch.winner === team.name
                        });
                    }
                });
            }
        }
        
        console.log('Ermittelte Finalteams:', finalTeams);
    }

    /**
     * Lädt die Team-Statistiken
     */
    async function loadTeamStats() {
        try {
            // Team-Statistiken aus Firebase laden
            const savedStats = await dataService.getData('teamStats');
            
            if (savedStats && Array.isArray(savedStats) && savedStats.length > 0) {
                console.log('Detaillierte Teamstatistiken aus Firebase geladen');
                teamStats = savedStats;
            } else {
                console.log('Keine gespeicherten Teamstatistiken gefunden - erstelle vereinfachte Statistiken');
                // Alternativ, vereinfachte Statistiken auf Basis der Matches erstellen
                await createSimplifiedStats();
            }
            
            console.log('Geladene Team-Statistiken:', teamStats);
        } catch (error) {
            console.error('Fehler beim Laden der Teamstatistiken:', error);
            setStatus('Fehler beim Laden der Teamstatistiken.', 'error');
        }
    }
    
    /**
     * Erstellt vereinfachte Statistiken, falls keine detaillierten verfügbar sind
     */
    async function createSimplifiedStats() {
        // Vorrunden-Matches laden
        const vorrundeMatches = await dataService.getData('vorrundeMatches') || [];
        
        // Alle möglichen KO-Matches zusammenfassen
        const allKoMatches = [];
        ['playoff', 'quarterfinal', 'semifinal', 'final'].forEach(round => {
            if (koMatches[round]) {
                koMatches[round].forEach(match => {
                    if (match.teams && match.teams.length === 2 && match.teams[0].name && match.teams[1].name) {
                        allKoMatches.push(match);
                    }
                });
            }
        });
        
        // Statistiken initialisieren
        teamStats = teams.map(team => ({
            team: team,
            matches: {
                all: 0,
                vorrunde: 0,
                ko: 0
            },
            wins: {
                all: 0,
                vorrunde: 0,
                ko: 0
            },
            draws: {
                all: 0,
                vorrunde: 0,
                ko: 0
            },
            losses: {
                all: 0,
                vorrunde: 0,
                ko: 0
            },
            goalsScored: {
                all: 0,
                vorrunde: 0,
                ko: 0
            },
            goalsConceded: {
                all: 0,
                vorrunde: 0,
                ko: 0
            },
            goalDifference: {
                all: 0,
                vorrunde: 0,
                ko: 0
            },
            beerDrunk: {
                all: 0
            },
            beerGiven: {
                all: 0
            },
            beerBalance: 0
        }));
        
        // Vereinfachte Berechnung der Bier-Bilanz
        // 1 Tor = 100ml Bier
        teamStats.forEach(teamStat => {
            if (finalTeams.some(team => team.name === teamStat.team)) {
                // Bierberechnung basierend auf Matches
                const beerGiven = teamStat.goalsScored.all * 100;
                const beerDrunk = teamStat.goalsConceded.all * 100;
                
                teamStat.beerGiven.all = beerGiven;
                teamStat.beerDrunk.all = beerDrunk;
                teamStat.beerBalance = beerGiven - beerDrunk;
            }
        });
        
        // Speichern der vereinfachten Statistiken in Firebase
        await dataService.saveData('teamStats', teamStats);
    }
    
    /**
     * Rendert die Finalisten mit ihren Statistiken
     */
    function renderFinalists() {
        // Container leeren
        finalistsContainer.innerHTML = '';

        // Prüfen, ob Finalisten ermittelt wurden
        if (finalTeams.length === 0) {
            finalistsContainer.innerHTML = `
                <div class="finalist-not-determined">
                    Die Finalisten stehen noch nicht fest. Die Teams werden noch ausgespielt.
                </div>
            `;
            return;
        }

        // Für jeden Finalisten eine Karte erstellen
        finalTeams.forEach(finalTeam => {
            // Statistiken für dieses Team finden
            let teamStat = teamStats.find(stat => stat.team === finalTeam.name);

            // Wenn keine Statistiken gefunden wurden, Standardwerte verwenden
            if (!teamStat) {
                teamStat = {
                    team: finalTeam.name,
                    matches: { all: 0 },
                    wins: { all: 0 },
                    draws: { all: 0 },
                    losses: { all: 0 },
                    goalsScored: { all: 0 },
                    goalsConceded: { all: 0 },
                    goalDifference: { all: 0 },
                    beerDrunk: { all: 0 },
                    beerGiven: { all: 0 },
                    beerBalance: 0
                };
            }

            // Aktuelle Quote berechnen
            const odds = calculateOdds(finalTeam.name);

            // Bier-Bilanz-Wert korrekt extrahieren
            const beerBalance = typeof teamStat.beerBalance === 'object' ? 
                teamStat.beerBalance.all : 
                teamStat.beerBalance;

            // Bier-Bilanz-Klasse bestimmen
            const beerBalanceClass = beerBalance > 0 ? 'positive' : (beerBalance < 0 ? 'negative' : 'neutral');

            // Karte erstellen
            const finalistCard = document.createElement('div');
            finalistCard.className = 'finalist-card';

            // Wenn das Team der Sieger ist, stärker hervorheben
            if (finalTeam.isWinner) {
                finalistCard.style.background = 'linear-gradient(135deg, var(--color-green-light), var(--color-green-dark))';
                finalistCard.innerHTML = `<div style="position: absolute; top: 10px; right: 10px; font-size: 2rem;">🏆</div>`;
            }

            finalistCard.innerHTML += `
                <h3 class="finalist-name">${finalTeam.name}</h3>
                <div class="finalist-stats">
                    <div class="stat-group">
                        <div class="stat-group-title">Spiele</div>
                        <div class="stat-row">
                            <span class="stat-label">Siege:</span>
                            <span class="stat-value">${teamStat.wins.all}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Unentschieden:</span>
                            <span class="stat-value">${teamStat.draws.all}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Niederlagen:</span>
                            <span class="stat-value">${teamStat.losses.all}</span>
                        </div>
                    </div>
                    <div class="stat-group">
                        <div class="stat-group-title">Tore</div>
                        <div class="stat-row">
                            <span class="stat-label">Erzielt:</span>
                            <span class="stat-value">${teamStat.goalsScored.all}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Kassiert:</span>
                            <span class="stat-value">${teamStat.goalsConceded.all}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Differenz:</span>
                            <span class="stat-value">${teamStat.goalDifference.all}</span>
                        </div>
                    </div>
                    <div class="stat-group">
                        <div class="stat-group-title">Bier-Bilanz</div>
                        <div class="stat-row">
                            <span class="stat-label">Verteilt:</span>
                            <span class="stat-value">${(teamStat.beerGiven.all / 1000).toFixed(1)} L</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Getrunken:</span>
                            <span class="stat-value">${(teamStat.beerDrunk.all / 1000).toFixed(1)} L</span>
                        </div>
                        <div class="beer-balance-value ${beerBalanceClass}">
                            Bilanz: ${beerBalance > 0 ? '+' : ''}${(beerBalance / 1000).toFixed(1)} L
                        </div>
                    </div>
                </div>
                <div class="current-odds">
                    <div class="odds-value">${odds.toFixed(2)}</div>
                    <div class="odds-label">Dynamische Quote</div>
                </div>
            `;

            finalistsContainer.appendChild(finalistCard);
        });
    }
    
    /**
     * Rendert die Team-Wetten-Tabellen (ohne Lösch-Buttons)
     */
    function renderTeamBets() {
        // Container leeren
        teamBetsContainer.innerHTML = '';
        
        // Wenn keine Finalisten vorhanden sind, leere Tabellen anzeigen
        const teamsToShow = finalTeams.length > 0 ? finalTeams : teams.slice(0, 2).map(team => ({ name: team }));
        
        // Für bis zu zwei Teams Tabellen erstellen
        teamsToShow.slice(0, 2).forEach(team => {
            // Wetten für dieses Team filtern
            const teamBets = bets.filter(bet => bet.team === team.name);
            
            // Aktuelle Quote berechnen
            const odds = calculateOdds(team.name);
            
            // Tabellen-Container erstellen
            const tableContainer = document.createElement('div');
            tableContainer.className = 'team-bets-table-container';
            
            // Header mit Teamnamen und Quote
            const header = document.createElement('div');
            header.className = 'team-bets-header';
            header.innerHTML = `
                <h3 class="team-bets-title">${team.name}</h3>
                <div class="team-bets-odds">Quote: ${odds.toFixed(2)}</div>
            `;

            tableContainer.appendChild(header);
            
            // Tabelle erstellen (ohne Aktionen-Spalte)
            const table = document.createElement('table');
            table.className = 'team-bets-table';
            
            // Tabellenkopf ohne Aktionen-Spalte
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Einsatz</th>
                        <th>Möglicher Gewinn</th>
                    </tr>
                </thead>
                <tbody>
                    ${teamBets.length > 0 ? 
                        teamBets.map(bet => `
                            <tr>
                                <td class="better-name">${bet.betterName}</td>
                                <td class="bet-amount">${bet.amount.toFixed(2)} €</td>
                                <td class="potential-win">${(bet.amount * odds).toFixed(2)} €</td>
                            </tr>
                        `).join('') : 
                        `<tr><td colspan="3" class="no-bets-message">Keine Wetten vorhanden</td></tr>`
                    }
                </tbody>
            `;
            tableContainer.appendChild(table);
            
            teamBetsContainer.appendChild(tableContainer);
        });
        
        // Wenn keine oder nur ein Team angezeigt wird, Platzhalter hinzufügen
        if (teamsToShow.length === 0) {
            teamBetsContainer.innerHTML = `
                <div class="team-bets-table-container">
                    <div class="team-bets-header">
                        <h3 class="team-bets-title">Team 1</h3>
                        <div class="team-bets-odds">Quote: 0.00</div>
                    </div>
                    <table class="team-bets-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Einsatz</th>
                                <th>Möglicher Gewinn</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="3" class="no-bets-message">Keine Wetten vorhanden</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="team-bets-table-container">
                    <div class="team-bets-header">
                        <h3 class="team-bets-title">Team 2</h3>
                        <div class="team-bets-odds">Quote: 0.00</div>
                    </div>
                    <table class="team-bets-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Einsatz</th>
                                <th>Möglicher Gewinn</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="3" class="no-bets-message">Keine Wetten vorhanden</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        } else if (teamsToShow.length === 1) {
            const tableContainer = document.createElement('div');
            tableContainer.className = 'team-bets-table-container';
            tableContainer.innerHTML = `
                <div class="team-bets-header">
                    <h3 class="team-bets-title">Team 2</h3>
                    <div class="team-bets-odds">Quote: 0.00</div>
                </div>
                <table class="team-bets-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Einsatz</th>
                            <th>Möglicher Gewinn</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="3" class="no-bets-message">Keine Wetten vorhanden</td>
                        </tr>
                    </tbody>
                </table>
            `;
            teamBetsContainer.appendChild(tableContainer);
        }
    }
    
    /**
     * Aktualisiert die Gesamt-Statistiken
     */
    function updateTotalStats() {
        // Anzahl der Wetten
        totalBetsCount.textContent = bets.length;
        
        // Gesamteinsatz
        const total = bets.reduce((sum, bet) => sum + bet.amount, 0);
        totalBetsAmount.textContent = `${total.toFixed(2)} €`;
    }
    
    /**
     * Berechnet die Quote für ein Team
     * @param {string} teamName - Name des Teams
     * @returns {number} - Berechnete Quote
     */
    function calculateOdds(teamName) {
        // Gesamteinsatz
        const totalAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);
        
        // Einsatz auf dieses Team
        const teamAmount = bets
            .filter(bet => bet.team === teamName)
            .reduce((sum, bet) => sum + bet.amount, 0);
        
        // Quote berechnen (Gesamteinsatz / Teameinsatz)
        if (teamAmount === 0) {
            return 2.0;
        }
        
        return totalAmount / teamAmount;
    }
    
    /**
     * Rendert das Wett-Verteilungs-Balkendiagramm
     */
    function renderDistributionChart() {
        const container = document.getElementById('distributionChart');
        if (!container) return;

        const teamsToShow = finalTeams.length > 0
            ? finalTeams
            : teams.slice(0, 2).map(t => ({ name: t }));

        if (teamsToShow.length === 0 || bets.length === 0) {
            container.innerHTML = '';
            return;
        }

        const totalAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);

        const rows = teamsToShow.map((team, idx) => {
            const teamAmount = bets
                .filter(bet => bet.team === team.name)
                .reduce((sum, bet) => sum + bet.amount, 0);
            const pct = totalAmount > 0 ? Math.round((teamAmount / totalAmount) * 100) : 0;
            const fillClass = idx === 1 ? 'dist-bar-fill second-team' : 'dist-bar-fill';
            return `
                <div class="dist-bar-row">
                    <span class="dist-team-label">${team.name}</span>
                    <div class="dist-bar-track">
                        <div class="${fillClass}" style="width: ${pct}%"></div>
                    </div>
                    <span class="dist-percent-label">${pct}% · ${teamAmount.toFixed(0)}€</span>
                </div>
            `;
        });

        container.innerHTML = `
            <div class="distribution-title">Wett-Verteilung</div>
            ${rows.join('')}
        `;
    }

    /**
     * Zeigt die zuletzt platzierte Wette als Live-Ticker
     */
    function renderLastBetTicker() {
        const tickerContent = document.getElementById('tickerContent');
        if (!tickerContent) return;

        if (bets.length === 0) {
            tickerContent.innerHTML = 'Noch keine Wetten vorhanden...';
            return;
        }

        const lastBet = bets.reduce((latest, bet) =>
            (bet.id > latest.id ? bet : latest), bets[0]);

        const minutesAgo = Math.floor((Date.now() - lastBet.id) / 60000);
        const timeLabel = minutesAgo < 1
            ? 'gerade eben'
            : minutesAgo === 1
                ? 'vor 1 Minute'
                : `vor ${minutesAgo} Minuten`;

        tickerContent.innerHTML = `
            <span class="ticker-pulse"></span>
            <strong>${lastBet.betterName}</strong> hat
            <strong>${lastBet.amount.toFixed(2)}€</strong> auf
            <span class="ticker-team">${lastBet.team}</span> gesetzt
            <span class="ticker-time">${timeLabel}</span>
        `;
    }

    /**
     * Setzt eine Status-Nachricht
     * @param {string} message - Die Nachricht
     * @param {string} type - Der Nachrichtentyp (info, success, warning, error)
     */
    function setStatus(message, type = 'info') {
        if (!statusContainer) return;
        statusContainer.className = 'status-container';
        statusContainer.classList.add(`status-${type}`);
        statusContainer.textContent = message;

        // Nach 5 Sekunden ausblenden
        setTimeout(() => {
            statusContainer.style.opacity = '0';
            setTimeout(() => {
                statusContainer.className = 'status-container';
                statusContainer.style.opacity = '1';
            }, 500);
        }, 5000);
    }
});