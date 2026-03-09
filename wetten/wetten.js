/**
 * LAOS 2.0 - JavaScript für die Wetten-Seite
 * Dieses Script implementiert die Wett-Funktionalität mit Quoten-Berechnung
 * Firebase-Integration für Echtzeit-Datensynchonisierung
 */

// Import des dataService für Firebase-Integration
import dataService from '../global/data-service.js';
import { createStatusHelper } from '../global/status.js';
// Warten bis das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', async function() {

    const statusContainer = document.getElementById('statusContainer');
    const setStatus = createStatusHelper(statusContainer);
    const finalistsContainer = document.getElementById('finalistsContainer');
    const bettingForm = document.getElementById('bettingForm');
    const betterNameInput = document.getElementById('betterName');
    const betAmountInput = document.getElementById('betAmount');
    const teamSelect = document.getElementById('teamSelect');
    const teamBetsContainer = document.getElementById('teamBetsContainer');
    const totalBetsCount = document.getElementById('totalBetsCount');
    const totalBetsAmount = document.getElementById('totalBetsAmount');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const resetBetsBtn = document.getElementById('resetBetsBtn');
    
    // Daten für die Anwendung
    let teams = [];
    let koMatches = {};
    let bets = [];
    
    // Finalteams und deren Statistiken
    let finalTeams = [];
    let teamStats = [];
    
    // Event-Listener
    bettingForm.addEventListener('submit', handleBetSubmit);
    exportDataBtn.addEventListener('click', exportData);
    resetBetsBtn.addEventListener('click', confirmResetBets);
    
    
    // Seite initialisieren
    await init();
    
    /**
     * Initialisiert die Wetten-Seite
     */
    async function init() {
        console.log('Initialisiere Wetten-Seite');
        
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
        renderTeamSelect();
        renderTeamBets();
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
            koMatches = koMatchesData || {};
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
            renderTeamSelect();
        });
        
        // KO-Matches abonnieren
        dataService.subscribeToData('koMatches', (newMatches) => {
            console.log('KO-Matches aktualisiert:', newMatches);
            koMatches = newMatches || {};
            loadFinalTeams();
            renderFinalists();
            renderTeamSelect();
            renderTeamBets();
        });
        
        // Wetten abonnieren
        dataService.subscribeToData('tournamentBets', (newBets) => {
            console.log('Wetten aktualisiert:', newBets);
            bets = Array.isArray(newBets) ? newBets : [];
            renderFinalists();
            renderTeamBets();
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
     * Rendert die Team-Auswahl im Wettformular
     */
    function renderTeamSelect() {
        // Dropdown-Element leeren, aber den Platzhalter behalten
        while (teamSelect.options.length > 1) {
            teamSelect.remove(1);
        }
        
        // Wenn keine Finalisten vorhanden sind, alle Teams anzeigen
        const teamsToShow = finalTeams.length > 0 ? finalTeams : teams.map(team => ({ name: team }));
        
        // Teams hinzufügen
        teamsToShow.forEach(team => {
            const option = document.createElement('option');
            option.value = team.name;
            option.textContent = team.name;
            teamSelect.appendChild(option);
        });
    }
    
    /**
     * Rendert die Team-Wetten-Tabellen mit Lösch-Buttons
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
            
            tableContainer.appendChild(header);
            
            // Tabelle erstellen
            const table = document.createElement('table');
            table.className = 'team-bets-table';
            
            // Tabellenkopf mit zusätzlicher Aktionen-Spalte
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Einsatz</th>
                        <th>Möglicher Gewinn</th>
                        <th>Aktionen</th>
                    </tr>
                </thead>
                <tbody>
                    ${teamBets.length > 0 ? 
                        teamBets.map(bet => `
                            <tr>
                                <td class="better-name">${bet.betterName}</td>
                                <td class="bet-amount">${bet.amount.toFixed(2)} €</td>
                                <td class="potential-win">${(bet.amount * odds).toFixed(2)} €</td>
                                <td class="bet-actions">
                                    <button class="delete-bet-btn" data-bet-id="${bet.id}">🗑️</button>
                                </td>
                            </tr>
                        `).join('') : 
                        `<tr><td colspan="4" class="no-bets-message">Keine Wetten vorhanden</td></tr>`
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
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="4" class="no-bets-message">Keine Wetten vorhanden</td>
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
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="4" class="no-bets-message">Keine Wetten vorhanden</td>
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
                            <th>Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="4" class="no-bets-message">Keine Wetten vorhanden</td>
                        </tr>
                    </tbody>
                </table>
            `;
            teamBetsContainer.appendChild(tableContainer);
        }
        
        // Event-Listener für Lösch-Buttons hinzufügen
        document.querySelectorAll('.delete-bet-btn').forEach(button => {
            button.addEventListener('click', function() {
                const betId = parseInt(this.dataset.betId);
                if (confirm('Möchtest du diese Wette wirklich löschen?')) {
                    deleteBet(betId);
                }
            });
        });
    }

    /**
     * Löscht eine einzelne Wette
     * @param {number} betId - Die ID der zu löschenden Wette
     */
    async function deleteBet(betId) {
        console.log(`Lösche Wette mit ID ${betId}`);
        
        // Wette finden
        const betIndex = bets.findIndex(bet => bet.id === betId);
        
        if (betIndex === -1) {
            setStatus('Wette konnte nicht gefunden werden.', 'error');
            return;
        }
        
        // Wette-Informationen für die Statusmeldung speichern
        const deletedBet = bets[betIndex];
        
        // Wette aus dem Array entfernen
        bets.splice(betIndex, 1);
        
        try {
            // In Firebase speichern
            await dataService.saveData('tournamentBets', bets);
            
            // Erfolgsmeldung
            setStatus(`Wette von ${deletedBet.betterName} auf ${deletedBet.team} (${deletedBet.amount.toFixed(2)} €) wurde gelöscht.`, 'success');
            
            // UI aktualisieren wenn keine Echtzeit-Updates vorhanden sind
            if (!dataService.isConnected()) {
                renderFinalists();
                renderTeamBets();
                updateTotalStats();
            }
        } catch (error) {
            console.error('Fehler beim Löschen der Wette:', error);
            setStatus('Fehler beim Löschen der Wette. Bitte versuche es später erneut.', 'error');
            
            // Wette zurück ins Array legen, da das Speichern fehlgeschlagen ist
            bets.splice(betIndex, 0, deletedBet);
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
            return totalAmount === 0 ? 2.0 : totalAmount;
        }
        
        return totalAmount / teamAmount;
    }
    
    /**
     * Behandelt das Absenden des Wettformulars
     * @param {Event} event - Das Submit-Event
     */
    async function handleBetSubmit(event) {
        event.preventDefault();
        
        // Eingaben validieren
        const betterName = betterNameInput.value.trim();
        const amount = parseFloat(betAmountInput.value);
        const team = teamSelect.value;
        
        if (!betterName) {
            setStatus('Bitte gib den Namen des Wettenden ein.', 'error');
            betterNameInput.focus();
            return;
        }
        
        if (isNaN(amount) || amount <= 0) {
            setStatus('Bitte gib einen gültigen Einsatz ein (größer als 0).', 'error');
            betAmountInput.focus();
            return;
        }
        
        if (!team) {
            setStatus('Bitte wähle ein Team aus.', 'error');
            teamSelect.focus();
            return;
        }
        
        // Aktuelle Quote berechnen
        const odds = calculateOdds(team);
        
        // Wette erstellen
        const bet = {
            id: Date.now(),
            betterName: betterName,
            team: team,
            amount: amount,
            odds: odds,
            date: new Date().toISOString()
        };
        
        // Zu den bestehenden Wetten hinzufügen
        bets.push(bet);
        
        try {
            // In Firebase speichern
            await dataService.saveData('tournamentBets', bets);
            
            // Formular zurücksetzen
            betterNameInput.value = '';
            betAmountInput.value = '';
            teamSelect.selectedIndex = 0;
            
            // Erfolgsmeldung
            setStatus(`Wette auf ${team} erfolgreich platziert. Quote: ${odds.toFixed(2)}, Möglicher Gewinn: ${(amount * odds).toFixed(2)} €`, 'success');
            
            // UI aktualisieren wenn keine Echtzeit-Updates vorhanden sind
            if (!dataService.isConnected()) {
                renderFinalists();
                renderTeamBets();
                updateTotalStats();
            }
        } catch (error) {
            console.error('Fehler beim Speichern der Wette:', error);
            setStatus('Fehler beim Speichern der Wette. Bitte versuche es später erneut.', 'error');
            
            // Wette aus dem Array entfernen, da das Speichern fehlgeschlagen ist
            bets.pop();
        }
    }
    
    /**
     * Exportiert die Wettdaten in einem menschenlesbaren Format
     */
    function exportData() {
        if (bets.length === 0) {
            setStatus('Es gibt keine Wetten zum Exportieren.', 'info');
            return;
        }
        
        // Daten für Export vorbereiten
        let exportText = "LAOS 2.0 - Wetten-Übersicht\n\n";
        exportText += `Erstellt am: ${new Date().toLocaleString()}\n\n`;
        
        // Statistiken hinzufügen
        const totalAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);
        exportText += `Anzahl Wetten: ${bets.length}\n`;
        exportText += `Gesamteinsatz: ${totalAmount.toFixed(2)} €\n\n`;
        
        // Nach Teams gruppieren
        const teamBets = {};
        bets.forEach(bet => {
            if (!teamBets[bet.team]) {
                teamBets[bet.team] = [];
            }
            teamBets[bet.team].push(bet);
        });
        
        // Für jedes Team die Wetten auflisten
        for (const team in teamBets) {
            const teamAmount = teamBets[team].reduce((sum, bet) => sum + bet.amount, 0);
            const odds = calculateOdds(team);
            
            exportText += `==== Team: ${team} ====\n`;
            exportText += `Quote: ${odds.toFixed(2)}\n`;
            exportText += `Gesamteinsatz: ${teamAmount.toFixed(2)} €\n\n`;
            
            exportText += "Name\t\tEinsatz\t\tMöglicher Gewinn\n";
            exportText += "-".repeat(50) + "\n";
            
            teamBets[team].forEach(bet => {
                exportText += `${bet.betterName}\t\t${bet.amount.toFixed(2)} €\t\t${(bet.amount * odds).toFixed(2)} €\n`;
            });
            
            exportText += "\n\n";
        }
        
        // Datei erstellen und herunterladen
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'laos_wetten.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setStatus('Wetten wurden exportiert.', 'success');
    }
    
    /**
     * Bestätigt das Zurücksetzen aller Wetten
     */
    function confirmResetBets() {
        if (confirm('Möchtest du wirklich ALLE Wetten zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            resetBets();
        }
    }
    
    /**
     * Setzt alle Wetten zurück
     */
    async function resetBets() {
        try {
            // Wetten-Array leeren
            bets = [];
            
            // In Firebase speichern
            await dataService.saveData('tournamentBets', bets);
            
            // Meldung
            setStatus('Alle Wetten wurden zurückgesetzt.', 'info');
            
            // UI aktualisieren wenn keine Echtzeit-Updates vorhanden sind
            if (!dataService.isConnected()) {
                renderFinalists();
                renderTeamBets();
                updateTotalStats();
            }
        } catch (error) {
            console.error('Fehler beim Zurücksetzen der Wetten:', error);
            setStatus('Fehler beim Zurücksetzen der Wetten. Bitte versuche es später erneut.', 'error');
        }
    }
    
});
