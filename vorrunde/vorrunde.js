/**
 * LAOS 2.0 - JavaScript für die Vorrunde
 * Dieses Script implementiert die Vorrunden-Logik mit verbesserter Circle-Methode
 * und unterstützt auch benutzerdefinierte Spielpaarungen
 */
import dataService from '../global/data-service.js';




// Warten bis das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', async function() {   

    const initVorrundeBtn = document.getElementById('initVorrundeBtn');
    document.getElementById('goldenCupBtn').addEventListener('click', showGoldenCup);
    const exportDataBtn = document.getElementById('exportDataBtn');
    const resetVorrundeBtn = document.getElementById('resetVorrundeBtn');
    const statusContainer = document.getElementById('statusContainer');
    const matchesContainer = document.getElementById('matchesContainer');
    const standingsContainer = document.getElementById('standingsContainer');
    const roundNavButtons = document.querySelectorAll('.round-nav-btn');
    const simulateMatchesBtn = document.getElementById('simulateMatchesBtn');
    
    // DEBUG: Überprüfen, ob DOM-Elemente gefunden wurden
    console.log("DOM-Elemente:", {
        initVorrundeBtn,
        exportDataBtn,
        resetVorrundeBtn,
        statusContainer,
        matchesContainer,
        standingsContainer,
        roundNavButtons
    });
    // Daten aus localStorage laden
    let teams = [];
    let customMatchups = null;
    let matches = [];
    let standings = [];
    let goldenCupResults = [];
    
    // Laden der Daten aus Firebase/localStorage über den DataService
    try {
        teams = await dataService.getData('tournamentTeams') || [];
        customMatchups = await dataService.getData('tournamentMatchups') || null;
        matches = await dataService.getData('vorrundeMatches') || [];
        standings = await dataService.getData('vorrundeStandings') || [];
        goldenCupResults = await dataService.getData('goldenCupResults') || [];
    } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
    }
    // DEBUG: Überprüfen, ob Daten geladen wurden
    console.log("Geladene Daten:", {
        teamsCount: teams.length,
        customMatchups: customMatchups ? 'vorhanden' : 'nicht vorhanden',
        matchesCount: matches.length,
        standingsCount: standings.length
    });
    
    // Aktuelle angezeigte Runde
    let currentRound = 1;
    // Event-Listener
    initVorrundeBtn.addEventListener('click', initializeVorrunde);
    exportDataBtn.addEventListener('click', exportData);
    resetVorrundeBtn.addEventListener('click', confirmReset);
    
    // Event-Listener für Rundenwechsel
    roundNavButtons.forEach(button => {
        button.addEventListener('click', function() {
            const round = parseInt(this.dataset.round);
            changeRound(round);
        });
    });
    
    //simulateMatchesBtn.addEventListener('click', simulateMatches);

    // Initialisieren der Seite
    init();
    
    /**
     * Initialisiert die Seite
     */
    function init() {
        console.log('Initialisiere Vorrunde-Seite');
        
        // Prüfen ob Teams vorhanden sind
        if (teams.length === 0) {
            setStatus('Keine Teams gefunden. Bitte füge Teams auf der Teams-Seite hinzu.', 'error');
            return;
        }
        
        // Prüfen ob Matches bereits generiert wurden
        if (matches.length === 0) {
            setStatus('Keine Spiele gefunden. Bitte initialisiere die Vorrunde.', 'warning');
        } else {
            // DEBUG: Erstes Match überprüfen
            if (matches.length > 0) {
                console.log("Erstes Match nach Laden:", matches[0]);
            }
            
            // Runde 1 standardmäßig anzeigen
            changeRound(1);
            renderStandings();
            
            // Hinweis anzeigen, wenn benutzerdefinierte Paarungen verwendet wurden
            if (customMatchups) {
                setStatus('Benutzerdefinierte Spielpaarungen werden verwendet.', 'info');
            }
        }
    }
    

    function simulateMatches() {
        console.log('Simuliere ungespielte Matches');
        
        // Ungespielte Matches finden
        const unplayedMatches = matches.filter(match => !match.played);
        
        if (unplayedMatches.length === 0) {
            setStatus('Keine ungespielten Matches gefunden.', 'warning');
            return;
        }
        
        // Zähler für simulierte Matches
        let simulatedCount = 0;
        
        // Für jedes ungespielte Match
        unplayedMatches.forEach(match => {
            // Zufällig entscheiden, welches Team 6 Punkte bekommt
            const randomTeam = Math.random() < 0.5 ? 1 : 2;
            
            let newScore1, newScore2;
            
            if (randomTeam === 1) {
                newScore1 = 6;
                newScore2 = Math.floor(Math.random() * 7); // 0-6
            } else {
                newScore1 = Math.floor(Math.random() * 7); // 0-6
                newScore2 = 6;
            }
            
            // Team-Indizes in der Tabelle finden
            const team1Index = standings.findIndex(s => s.team === match.team1);
            const team2Index = standings.findIndex(s => s.team === match.team2);
            
            if (team1Index === -1 || team2Index === -1) {
                console.error(`Teams nicht gefunden: ${match.team1}, ${match.team2}`);
                return;
            }
            
            // Neues Match-Ergebnis setzen
            match.score1 = newScore1;
            match.score2 = newScore2;
            match.played = true;
            
            // Spielstatistik für Team 1 aktualisieren
            standings[team1Index].played++;
            standings[team1Index].goalsFor += newScore1;
            standings[team1Index].goalsAgainst += newScore2;
            
            // Spielstatistik für Team 2 aktualisieren
            standings[team2Index].played++;
            standings[team2Index].goalsFor += newScore2;
            standings[team2Index].goalsAgainst += newScore1;
            
            // Sieg/Niederlage/Unentschieden bestimmen
            if (newScore1 > newScore2) {
                // Team 1 gewinnt
                standings[team1Index].won++;
                standings[team1Index].points += 2;
                standings[team2Index].lost++;
            } else if (newScore1 < newScore2) {
                // Team 2 gewinnt
                standings[team1Index].lost++;
                standings[team2Index].won++;
                standings[team2Index].points += 2;
            } else {
                // Unentschieden
                standings[team1Index].drawn++;
                standings[team1Index].points += 1;
                standings[team2Index].drawn++;
                standings[team2Index].points += 1;
            }
            
            // Tordifferenzen aktualisieren
            standings[team1Index].goalDifference = standings[team1Index].goalsFor - standings[team1Index].goalsAgainst;
            standings[team2Index].goalDifference = standings[team2Index].goalsFor - standings[team2Index].goalsAgainst;
            
            simulatedCount++;
        });
        
        // Änderungen speichern
        saveMatches();
        saveStandings();
        
        // UI aktualisieren
        renderMatches();
        renderStandings();
        
        // Status anzeigen
        setStatus(`${simulatedCount} Matches wurden erfolgreich simuliert.`, 'success');
    }

    /**
     * Wechselt die angezeigte Spielrunde
     * @param {number} round - Die anzuzeigende Runde
     */
    function changeRound(round) {
        // Round auf gültigen Bereich einschränken
        round = Math.min(Math.max(round, 1), 5);
        
        // Aktuelle Runde setzen
        currentRound = round;
        
        // DEBUG: Rundenwechsel überprüfen
        console.log(`Wechsle zu Runde ${round}`);
        
        // Navigation aktualisieren
        roundNavButtons.forEach(button => {
            if (parseInt(button.dataset.round) === round) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Spiele der ausgewählten Runde rendern
        renderMatches();
    }
    
/**
 * Initialisiert die Vorrunde
 */
function initializeVorrunde() {
    console.log('Initialisiere Vorrunde');
    
    // Prüfen ob bereits Matches existieren
    if (matches.length > 0) {
        if (!confirm('Es existieren bereits Vorrunden-Daten. Möchtest du die Vorrunde neu initialisieren? Alle bisherigen Ergebnisse gehen verloren.')) {
            return;
        }
    }
    
    // Prüfen ob Teams vorhanden sind
    if (teams.length < 2) {
        setStatus('Nicht genug Teams vorhanden. Mindestens 2 Teams werden benötigt.', 'error');
        return;
    }
    
    try {
        // Matches generieren
        if (teams.length <= 6) {
            // Bei 6 oder weniger Teams: Jeder gegen jeden (Round Robin)
            console.log('Wenige Teams: Alle Teams spielen gegeneinander (Round Robin)');
            matches = createMatchesAllPlayAll();
        } else if (customMatchups) {
            console.log('Verwende benutzerdefinierte Spielpaarungen');
            matches = createMatchesFromCustomPairings();
        } else if (teams.length === 24) {
            // Für genau 24 Teams die Gruppenmethode verwenden
            console.log('Generiere Spielpaarungen mit gruppenbasierter Methode für 24 Teams');
            matches = createMatchesWithGroupMethod();
        } else {
            console.log('Generiere Spielpaarungen mit verbesserter Circle-Methode');
            matches = createMatchesWithImprovedCircleMethod();
        }
        
        // Tischnummern und Paarungsnummern zuweisen
        assignTableAndPairingNumbers();
        
        // Tabelle initialisieren
        standings = initializeStandings();
        
        // Daten speichern
        saveMatches();
        saveStandings();
        
        // UI aktualisieren - Runde 1 anzeigen
        changeRound(1);
        renderStandings();
        
        // Status-Meldung
        if (teams.length <= 6) {
            setStatus('Vorrunde mit Round-Robin-Methode (jeder gegen jeden) initialisiert.', 'success');
        } else if (customMatchups) {
            setStatus('Vorrunde mit benutzerdefinierten Spielpaarungen initialisiert.', 'success');
        } else {
            setStatus('Vorrunde mit verbesserter Circle-Methode initialisiert.', 'success');
        }
    } catch (error) {
        console.error('Fehler beim Initialisieren der Vorrunde:', error);
        setStatus(`Fehler beim Initialisieren der Vorrunde: ${error.message}`, 'error');
    }
}
/**
 * Creates matches where all teams play against each other exactly once (Round Robin)
 * @returns {Array} - Generated matches
 */
function createMatchesAllPlayAll() {
    const generatedMatches = [];
    let matchId = 1;
    
    // For n teams, we need at most n-1 rounds
    const n = teams.length;
    const rounds = n % 2 === 0 ? n - 1 : n;
    
    // If we have an odd number of teams, we'll add a dummy team
    // that represents a "bye" (no match for the team paired with it)
    const teamsWithPossibleDummy = [...teams];
    if (n % 2 !== 0) {
        teamsWithPossibleDummy.push(null); // Dummy team
    }
    
    const teamCount = teamsWithPossibleDummy.length;
    
    // Create a circle arrangement for the teams
    // Team at index 0 stays fixed, others rotate
    const circle = [...teamsWithPossibleDummy];
    
    // Generate matches for each round
    for (let round = 1; round <= rounds; round++) {
        // In each round, pair teams from opposite sides of the circle
        for (let i = 0; i < teamCount / 2; i++) {
            const team1 = circle[i];
            const team2 = circle[teamCount - 1 - i];
            
            // Skip if one of the teams is the dummy
            if (team1 !== null && team2 !== null) {
                const match = {
                    id: matchId++,
                    round: round,
                    team1: team1,
                    team2: team2,
                    score1: null,
                    score2: null,
                    played: false
                };
                
                generatedMatches.push(match);
            }
        }
        
        // Rotate all teams except the first one
        const firstTeam = circle[0];
        const rest = circle.slice(1);
        rest.unshift(rest.pop()); // Move the last element to the beginning
        circle.splice(0, circle.length, firstTeam, ...rest);
    }
    
    return generatedMatches;
}
/**
 * Weist Tischnummern zufällig zu, nachdem die Paarungen generiert wurden
 * Diese Funktion ersetzt die bestehende assignTableAndPairingNumbers in vorrunde.js
 */
function assignTableAndPairingNumbers() {
    console.log("Starte zufällige Tischzuweisung...");
    
    // Für jede Runde
    for (let round = 1; round <= 5; round++) {
        // Spiele dieser Runde filtern
        const roundMatches = matches.filter(match => match.round === round);
        console.log(`Runde ${round}: ${roundMatches.length} Matches gefunden`);
        
        // Aufteilung in 2 Hälften
        const halfSize = Math.ceil(roundMatches.length / 2);
        console.log(`Hälftengröße für Runde ${round}: ${halfSize}`);
        
        // Erste Hälfte der Matches
        const firstHalfMatches = roundMatches.slice(0, halfSize);
        // Zweite Hälfte der Matches
        const secondHalfMatches = roundMatches.slice(halfSize);
        
        // Zufällige Tischzuweisung für erste Hälfte
        const firstHalfTables = getRandomTableNumbers(6);
        assignTablesToHalf(firstHalfMatches, firstHalfTables, false);
        
        // Zufällige Tischzuweisung für zweite Hälfte
        const secondHalfTables = getRandomTableNumbers(6);
        assignTablesToHalf(secondHalfMatches, secondHalfTables, true);
    }
    
    console.log("Zufällige Tischzuweisung abgeschlossen");
}

/**
 * Generiert eine zufällige Reihenfolge der Tischnummern 1-6
 * @param {number} tableCount - Anzahl der Tische (standardmäßig 6)
 * @returns {Array} - Zufällig gemischte Tischnummern
 */
function getRandomTableNumbers(tableCount = 6) {
    // Liste der Tischnummern erstellen
    const tables = [];
    for (let i = 1; i <= tableCount; i++) {
        tables.push(i);
    }
    
    // Zufällig mischen (Fisher-Yates Shuffle)
    for (let i = tables.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tables[i], tables[j]] = [tables[j], tables[i]];
    }
    
    return tables;
}

/**
 * Weist Tischnummern für eine Hälfte der Matches zu
 * @param {Array} matches - Die zu verarbeitenden Spiele
 * @param {Array} tables - Die zu verwendenden Tischnummern
 * @param {boolean} isSecondHalf - Ob es sich um die zweite Hälfte handelt
 */
function assignTablesToHalf(matches, tables, isSecondHalf) {
    matches.forEach((match, index) => {
        // Tischnummer zuweisen - falls mehr Matches als Tische, zyklisch wiederholen
        const tableNumber = tables[index % tables.length];
        
        // Paarungsnummer innerhalb der Hälfte (1-basiert)
        const pairingNumber = index + 1;
        
        console.log(`Match ${match.id}: Tisch ${tableNumber}, Paarung ${pairingNumber}, ${isSecondHalf ? '2.' : '1.'} Hälfte`);
        
        // Zusätzliche Informationen speichern
        match.tableNumber = tableNumber;
        match.pairingNumber = pairingNumber;
        match.isSecondHalf = isSecondHalf;
    });
}
    
    /**
     * Erstellt Spiele mit der verbesserten Circle-Methode
     * Diese Methode reduziert Schattengruppen durch zufällige Anordnung und periodisches Neuvermischen
     */
    function createMatchesWithImprovedCircleMethod() {
        const generatedMatches = [];
        let matchId = 1;
        
        // Teams-Array kopieren und IDs in Teamnamen umwandeln
        const teamNames = [...teams];
        
        // Teams IDs erstellen (1-basiert)
        const teamIds = Array.from({length: teams.length}, (_, i) => i + 1);
        
        // Teams zufällig anordnen, um Schattengruppen zu reduzieren
        teamIds.sort(() => Math.random() - 0.5);
        
        // Für ungerade Anzahl ein Dummy-Team hinzufügen
        if (teamIds.length % 2 !== 0) {
            teamIds.push(null);
        }
        
        const n = teamIds.length;
        
        // Für jede Runde
        for (let round = 1; round <= 5; round++) {
            // In jeder zweiten Runde die Teams teilweise neu mischen, um Schattengruppen zu reduzieren
            if (round % 2 === 0) {
                // Ersten Platz behalten, Rest neu mischen
                const first = teamIds[0];
                const rest = teamIds.slice(1);
                rest.sort(() => Math.random() - 0.5);
                teamIds.splice(0, teamIds.length, first, ...rest);
            }
            
            // Paarungen erstellen
            for (let i = 0; i < n/2; i++) {
                const team1Id = teamIds[i];
                const team2Id = teamIds[n-1-i];
                
                // Nur gültige Paarungen erstellen (keine Freilose)
                if (team1Id !== null && team2Id !== null) {
                    const match = {
                        id: matchId++,
                        round: round,
                        team1: teamNames[team1Id - 1],
                        team2: teamNames[team2Id - 1],
                        score1: null,
                        score2: null,
                        played: false
                    };
                    
                    generatedMatches.push(match);
                }
            }
            
            // Rotation wie bei Circle-Methode: Erstes Team bleibt, Rest rotiert
            const first = teamIds[0];
            const rest = teamIds.slice(1);
            rest.unshift(rest.pop());
            teamIds.splice(0, teamIds.length, first, ...rest);
        }
        
        return generatedMatches;
    }
/**
 * Erstellt Spiele mit der gruppenbasierten Methode für 24 Teams
 */
function createMatchesWithGroupMethod() {
    console.log('Generiere Spielpaarungen mit der gruppenbasierten Methode');
    
    const generatedMatches = [];
    let matchId = 1;
    
    // Teams-Array kopieren
    const teamNames = [...teams];
    
    // 1. Teams zufällig mischen
    const shuffledTeams = [...teamNames].sort(() => Math.random() - 0.5);
    
    // 2. Teams in 6 Gruppen mit je 4 Teams aufteilen
    const groups = [];
    const groupSize = 4;
    const numGroups = 6;
    
    for (let i = 0; i < numGroups; i++) {
        const startIndex = i * groupSize;
        groups.push(shuffledTeams.slice(startIndex, startIndex + groupSize));
    }
    
    // 3. Definiere das Matching-Schema zwischen den Gruppen für jede Runde
    const roundGroupMatches = [
        // Runde 1: Jede Gruppe spielt gegen eine andere Gruppe
        [[0, 1], [2, 3], [4, 5]],
        // Runde 2
        [[0, 2], [1, 4], [3, 5]],
        // Runde 3
        [[0, 3], [1, 5], [2, 4]],
        // Runde 4
        [[0, 4], [1, 2], [3, 5]],
        // Runde 5
        [[0, 5], [1, 3], [2, 4]]
    ];
    
    // 4. Erstelle die Matches basierend auf dem Schema
    for (let roundIndex = 0; roundIndex < 5; roundIndex++) {
        const roundNumber = roundIndex + 1;
        const roundMatches = roundGroupMatches[roundIndex];
        
        // Für jede Gruppenpaarung dieser Runde
        for (const [group1Index, group2Index] of roundMatches) {
            const group1 = groups[group1Index];
            const group2 = groups[group2Index];
            
            // Wähle ein Matching-Muster abhängig von der Runde
            const matchPattern = getMatchPatternForGroups(roundIndex);
            
            for (let i = 0; i < groupSize; i++) {
                const team1 = group1[i];
                const team2 = group2[matchPattern[i]];
                
                const match = {
                    id: matchId++,
                    round: roundNumber,
                    team1: team1,
                    team2: team2,
                    score1: null,
                    score2: null,
                    played: false
                };
                
                generatedMatches.push(match);
            }
        }
    }
    
    return generatedMatches;
}

/**
 * Hilfsfunktion: Generiert ein Matching-Muster für die Teams einer Gruppe
 */
function getMatchPatternForGroups(roundIndex) {
    // Verschiedene Muster für jede Runde
    const patterns = [
        [0, 1, 2, 3], // Runde 1: Standard-Ordnung
        [1, 0, 3, 2], // Runde 2: Erster mit zweitem, dritter mit viertem tauschen
        [2, 3, 0, 1], // Runde 3: Erste Hälfte mit zweiter Hälfte tauschen
        [3, 2, 1, 0], // Runde 4: Umgekehrte Reihenfolge
        [0, 2, 1, 3]  // Runde 5: Mittlere tauschen
    ];
    
    return patterns[roundIndex % patterns.length];
}
    /**
     * Erstellt Spiele aus benutzerdefinierten Paarungen
     */
    function createMatchesFromCustomPairings() {
        const generatedMatches = [];
        let matchId = 1;
        
        // Durch alle Runden gehen
        for (const round in customMatchups) {
            const roundNumber = parseInt(round);
            const roundPairings = customMatchups[round];
            
            // Für jede Paarung in dieser Runde
            for (const pairing of roundPairings) {
                const [team1Id, team2Id] = pairing;
                
                // IDs in Teamnamen umwandeln (1-basierte ID zu 0-basiertem Array-Index)
                const team1Name = teams[team1Id - 1];
                const team2Name = teams[team2Id - 1];
                
                // Match-Objekt erstellen
                const match = {
                    id: matchId++,
                    round: roundNumber,
                    team1: team1Name,
                    team2: team2Name,
                    score1: null,
                    score2: null,
                    played: false
                };
                
                generatedMatches.push(match);
            }
        }
        
        return generatedMatches;
    }
    
    /**
     * Initialisiert die Tabelle mit allen Teams
     */
    function initializeStandings() {
        return teams.map(team => ({
            team: team,
            played: 0,
            won: 0,
            lost: 0,
            drawn: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
        }));
    }
    
    /**
     * Rendert die Spiele der aktuellen Runde
     */
    function renderMatches() {
        console.log("Rendering Matches für Runde", currentRound);
        
        if (!matchesContainer) {
            console.error("matchesContainer nicht gefunden!");
            return;
        }
        
        // Container leeren
        matchesContainer.innerHTML = '';
        
        // Spielpaarungen-Container erstellen
        const spielpaarungenContainer = document.createElement('div');
        spielpaarungenContainer.className = 'spielpaarungen-container';
        
        const paarungenHeader = document.createElement('h3');
        paarungenHeader.className = 'paarungen-header';
        spielpaarungenContainer.appendChild(paarungenHeader);
        
        // Spiele der aktuellen Runde filtern
        const roundMatches = matches.filter(match => match.round === currentRound);
        console.log(`Gefundene Matches für Runde ${currentRound}:`, roundMatches.length);
        
        // Prüfen, ob Spiele vorhanden sind
        if (roundMatches.length === 0) {
            const noMatches = document.createElement('div');
            noMatches.className = 'no-matches';
            noMatches.textContent = 'Keine Spiele für diese Runde gefunden.';
            spielpaarungenContainer.appendChild(noMatches);
            
            // Container aktualisieren
            matchesContainer.appendChild(spielpaarungenContainer);
            return;
        }
        
        // DEBUG: Eigenschaften der gefundenen Matches überprüfen
        console.log("Erstes Match der Runde:", roundMatches[0]);
        console.log("tableNumber:", roundMatches[0].tableNumber);
        console.log("pairingNumber:", roundMatches[0].pairingNumber);
        console.log("isSecondHalf:", roundMatches[0].isSecondHalf);
        
        // Sortieren nach Hälfte und Tischnummer
        roundMatches.sort((a, b) => {
            if (a.isSecondHalf !== b.isSecondHalf) return a.isSecondHalf ? 1 : -1;
            return a.tableNumber - b.tableNumber;
        });
        
        // Erste Hälfte
        const halfte1Container = document.createElement('div');
        halfte1Container.className = 'halfte-container';
        
        const halfte1Header = document.createElement('div');
        halfte1Header.className = 'halfte-header';
        halfte1Header.textContent = '1. Hälfte';
        halfte1Container.appendChild(halfte1Header);
        
        const paarungen1Grid = document.createElement('div');
        paarungen1Grid.className = 'paarungen-grid';
        halfte1Container.appendChild(paarungen1Grid);
        
        // Zweite Hälfte
        const halfte2Container = document.createElement('div');
        halfte2Container.className = 'halfte-container';
        
        const halfte2Header = document.createElement('div');
        halfte2Header.className = 'halfte-header';
        halfte2Header.textContent = '2. Hälfte';
        halfte2Container.appendChild(halfte2Header);
        
        const paarungen2Grid = document.createElement('div');
        paarungen2Grid.className = 'paarungen-grid';
        halfte2Container.appendChild(paarungen2Grid);
        
        // Spiele auf die Hälften verteilen
        roundMatches.forEach(match => {
            const paarungCard = createPaarungCard(match);
            
            if (match.isSecondHalf) {
                paarungen2Grid.appendChild(paarungCard);
            } else {
                paarungen1Grid.appendChild(paarungCard);
            }
        });
        
        // Container zusammenfügen
        spielpaarungenContainer.appendChild(halfte1Container);
        spielpaarungenContainer.appendChild(halfte2Container);
        
        // Container aktualisieren
        matchesContainer.appendChild(spielpaarungenContainer);
        
        // Zweite Hälfte nur anzeigen, wenn Spiele enthalten sind
        if (paarungen2Grid.children.length === 0) {
            halfte2Container.style.display = 'none';
        }
    }

/**
 * Erstellt eine Paarungskarte für das Tischplan-Layout mit Buttons im Header
 */
function createPaarungCard(match) {
    const paarungCard = document.createElement('div');
    paarungCard.className = `paarung-card tisch-${match.tableNumber}`;
    paarungCard.dataset.matchId = match.id;
    
    // Spielstatus markieren
    if (match.played) {
        paarungCard.classList.add('completed');
        
        // Played-Marker hinzufügen
        const playedMarker = document.createElement('div');
        playedMarker.className = 'played-marker';
        paarungCard.appendChild(playedMarker);
    }
    
    // Paarung-Header mit Buttons
    const paarungHeader = document.createElement('div');
    paarungHeader.className = 'paarung-header';
    
    // Informationen-Bereich im Header
    const headerInfo = document.createElement('div');
    headerInfo.className = 'header-info';
    
    const paarungNumber = document.createElement('div');
    paarungNumber.className = 'paarung-number';
    paarungNumber.textContent = `${match.pairingNumber}. Match`;
    headerInfo.appendChild(paarungNumber);
    
    const tischNumber = document.createElement('div');
    tischNumber.className = 'tisch-number';
    tischNumber.textContent = `Tisch ${match.tableNumber}`;
    headerInfo.appendChild(tischNumber);
    
    paarungHeader.appendChild(headerInfo);
    
    // Action-Buttons in den Header hinzufügen
    const headerActions = document.createElement('div');
    headerActions.className = 'header-actions';
    
    if (match.played) {
        // Bearbeiten-Button mit Stift-Emoji
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn header-btn';
        editBtn.innerHTML = '✏️';
        editBtn.title = "Ergebnis bearbeiten";
        editBtn.addEventListener('click', () => editMatchResult(match.id));
        headerActions.appendChild(editBtn);
    } else {
        // Speichern-Button mit Speichern-Emoji
        const saveBtn = document.createElement('button');
        saveBtn.className = 'save-btn header-btn';
        saveBtn.innerHTML = '💾';
        saveBtn.title = "Ergebnis speichern";
        saveBtn.addEventListener('click', () => saveMatchResult(match.id));
        headerActions.appendChild(saveBtn);
    }
    
    // Zurücksetzen-Button mit Rückgängig-Emoji
    const resetBtn = document.createElement('button');
    resetBtn.className = 'reset-btn header-btn';
    resetBtn.innerHTML = '🔄';
    resetBtn.title = "Ergebnis zurücksetzen";
    resetBtn.addEventListener('click', () => resetMatchResult(match.id));
    headerActions.appendChild(resetBtn);
    
    paarungHeader.appendChild(headerActions);
    paarungCard.appendChild(paarungHeader);
    
    // Teams und Ergebnisse
    const paarungTeams = document.createElement('div');
    paarungTeams.className = 'paarung-teams';
    
    // Team 1
    const team1Row = document.createElement('div');
    team1Row.className = 'paarung-team';
    
    const team1Name = document.createElement('div');
    team1Name.className = 'team-name';
    team1Name.textContent = match.team1;
    team1Row.appendChild(team1Name);
    
    const team1Score = document.createElement('div');
    team1Score.className = 'team-score';
    
    const score1Input = document.createElement('input');
    score1Input.type = 'number';
    score1Input.className = 'score-input';
    score1Input.dataset.team = '1';
    score1Input.min = 0;
    score1Input.value = match.score1 !== null ? match.score1 : '';
    if (match.played) score1Input.disabled = true;
    
    team1Score.appendChild(score1Input);
    team1Row.appendChild(team1Score);
    paarungTeams.appendChild(team1Row);
    
    // Team 2
    const team2Row = document.createElement('div');
    team2Row.className = 'paarung-team';
    
    const team2Name = document.createElement('div');
    team2Name.className = 'team-name';
    team2Name.textContent = match.team2;
    team2Row.appendChild(team2Name);
    
    const team2Score = document.createElement('div');
    team2Score.className = 'team-score';
    
    const score2Input = document.createElement('input');
    score2Input.type = 'number';
    score2Input.className = 'score-input';
    score2Input.dataset.team = '2';
    score2Input.min = 0;
    score2Input.value = match.score2 !== null ? match.score2 : '';
    if (match.played) score2Input.disabled = true;
    
    team2Score.appendChild(score2Input);
    team2Row.appendChild(team2Score);
    paarungTeams.appendChild(team2Row);
    
    paarungCard.appendChild(paarungTeams);
    if (match.played) {
        if (match.score1 > match.score2) {
            // Team 1 hat gewonnen
            team1Row.classList.add('winner');
            team2Row.classList.add('loser');
        } else if (match.score1 < match.score2) {
            // Team 2 hat gewonnen
            team1Row.classList.add('loser');
            team2Row.classList.add('winner');
        } else {
            // Unentschieden
            team1Row.classList.add('draw');
            team2Row.classList.add('draw');
        }
    }
    
    // Teams zum Container hinzufügen
    paarungTeams.appendChild(team1Row);
    paarungTeams.appendChild(team2Row);
    
    // Hinweis: Wir entfernen den paarung-actions Container, da die Buttons jetzt im Header sind
    
    return paarungCard;
}
    
    /**
     * Erstellt einen Marker für abgeschlossene Matches
     */
    function createPlayedMarker() {
        const playedMarker = document.createElement('div');
        playedMarker.className = 'played-marker';
        return playedMarker;
    }
    

/**
 * Speichert das Ergebnis eines Matches und stellt sicher, dass alte Werte korrekt entfernt werden
 */
function saveMatchResult(matchId) {
    console.log(`Speichere Ergebnis für Match ${matchId}`);
    console.log('saveMatchResult wurde aufgerufen mit ID:', matchId);
    // Match finden
    const matchIndex = matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
        console.error(`Match mit ID ${matchId} nicht gefunden`);
        return;
    }
    
    const match = matches[matchIndex];
    
    // Ergebnisse aus Eingabefeldern holen
    const paarungCard = document.querySelector(`.paarung-card[data-match-id="${matchId}"]`);
    if (!paarungCard) {
        console.error(`Paarungskarte für Match ${matchId} nicht gefunden`);
        return;
    }
    
    const score1Input = paarungCard.querySelector('.score-input[data-team="1"]');
    const score2Input = paarungCard.querySelector('.score-input[data-team="2"]');
    
    const newScore1 = parseInt(score1Input.value);
    const newScore2 = parseInt(score2Input.value);
    
    // Validierung
    if (isNaN(newScore1) || isNaN(newScore2) || newScore1 < 0 || newScore2 < 0) {
        alert('Bitte gib gültige Ergebnisse ein (positive Zahlen).');
        return;
    }
    
    // Teams in der Tabelle finden
    const team1Index = standings.findIndex(s => s.team === match.team1);
    const team2Index = standings.findIndex(s => s.team === match.team2);
    
    if (team1Index === -1 || team2Index === -1) {
        alert(`Teams nicht gefunden: ${match.team1}, ${match.team2}`);
        return;
    }
    
    // WICHTIG: Alte Ergebnisse aus der Tabelle entfernen, falls das Match bereits gespielt wurde
    if (match.played) {
        console.log("Match wurde bereits gespielt, entferne alte Werte:", {
            oldScore1: match.score1,
            oldScore2: match.score2
        });
        
        // Spielstatistik für Team 1 zurücksetzen
        standings[team1Index].played--;
        standings[team1Index].goalsFor -= match.score1;
        standings[team1Index].goalsAgainst -= match.score2;
        
        // Spielstatistik für Team 2 zurücksetzen
        standings[team2Index].played--;
        standings[team2Index].goalsFor -= match.score2;
        standings[team2Index].goalsAgainst -= match.score1;
        
        // Sieg/Niederlage/Unentschieden zurücksetzen
        if (match.score1 > match.score2) {
            // Team 1 hatte gewonnen
            standings[team1Index].won--;
            standings[team1Index].points -= 2 + (match.score1 >= 5 ? 1 : 0) + (match.score2 === 0 ? 1 : 0);
            standings[team2Index].lost--;
            standings[team2Index].points -= (match.score2 >= 5 ? 1 : 0);
        } else if (match.score1 < match.score2) {
            // Team 2 hatte gewonnen
            standings[team1Index].lost--;
            standings[team1Index].points -= (match.score1 >= 5 ? 1 : 0);
            standings[team2Index].won--;
            standings[team2Index].points -= 2 + (match.score2 >= 5 ? 1 : 0) + (match.score1 === 0 ? 1 : 0);
        } else {
            // Unentschieden
            standings[team1Index].drawn--;
            standings[team1Index].points -= 1 + (match.score1 >= 5 ? 1 : 0);
            standings[team2Index].drawn--;
            standings[team2Index].points -= 1 + (match.score2 >= 5 ? 1 : 0);
        }
    }
    
    // Neue Ergebnisse im Match speichern
    match.score1 = newScore1;
    match.score2 = newScore2;
    match.played = true;
    
    // Neue Spielstatistik für Team 1 hinzufügen
    standings[team1Index].played++;
    standings[team1Index].goalsFor += newScore1;
    standings[team1Index].goalsAgainst += newScore2;
    
    // Neue Spielstatistik für Team 2 hinzufügen
    standings[team2Index].played++;
    standings[team2Index].goalsFor += newScore2;
    standings[team2Index].goalsAgainst += newScore1;
    
    // Neues Sieg/Niederlage/Unentschieden bestimmen
    if (newScore1 > newScore2) {
        // Team 1 gewinnt
        standings[team1Index].won++;
        standings[team1Index].points += 2 + (newScore1 >= 5 ? 1 : 0) + (newScore2 === 0 ? 1 : 0);
        standings[team2Index].lost++;
        standings[team2Index].points += (newScore2 >= 5 ? 1 : 0);
    } else if (newScore1 < newScore2) {
        // Team 2 gewinnt
        standings[team1Index].lost++;
        standings[team1Index].points += (newScore1 >= 5 ? 1 : 0);
        standings[team2Index].won++;
        standings[team2Index].points += 2 + (newScore2 >= 5 ? 1 : 0) + (newScore1 === 0 ? 1 : 0);
    } else {
        // Unentschieden
        standings[team1Index].drawn++;
        standings[team1Index].points += 1 + (newScore1 >= 5 ? 1 : 0);
        standings[team2Index].drawn++;
        standings[team2Index].points += 1 + (newScore2 >= 5 ? 1 : 0);
    }
    
    // Tordifferenz aktualisieren
    standings[team1Index].goalDifference = standings[team1Index].goalsFor - standings[team1Index].goalsAgainst;
    standings[team2Index].goalDifference = standings[team2Index].goalsFor - standings[team2Index].goalsAgainst;
    
    // Daten speichern
    saveMatches();
    saveStandings();
    
    console.log("Ergebnis gespeichert:", {
        match: match,
        team1: standings[team1Index],
        team2: standings[team2Index]
    });

    // UI aktualisieren
    renderMatches();
    renderStandings();
        highlightTeamsInTable(match.team1, match.team2);

}
    
    /**
     * Aktualisiert die Tabelle basierend auf einem Spielergebnis
     */
    function updateStandings(match) {
        console.log("Aktualisiere Tabelle für Match:", match);
        console.log("Aktueller Standings:", standings);
        
        // Team1 finden
        const team1Index = standings.findIndex(s => s.team === match.team1);
        const team2Index = standings.findIndex(s => s.team === match.team2);
        
        console.log("Gefundene Team-Indizes:", {
            team1: match.team1,
            team1Index: team1Index,
            team2: match.team2,
            team2Index: team2Index
        });
        
        if (team1Index === -1 || team2Index === -1) {
            console.error(`Teams für Match ${match.id} nicht gefunden:`, {
                team1: match.team1,
                team2: match.team2,
                availableTeams: standings.map(s => s.team)
            });
            return;
        }
        
        // Wenn Match bereits gespielt wurde, vorherige Werte zurücksetzen
        if (match.played) {
            resetMatchInStandings(match);
        }
        
        // Spielstatistik für Team 1
        standings[team1Index].played++;
        standings[team1Index].goalsFor += match.score1;
        standings[team1Index].goalsAgainst += match.score2;
        
        // Spielstatistik für Team 2
        standings[team2Index].played++;
        standings[team2Index].goalsFor += match.score2;
        standings[team2Index].goalsAgainst += match.score1;
        
        // Sieg/Niederlage/Unentschieden bestimmen
        if (match.score1 > match.score2) {
            // Team 1 gewinnt
            standings[team1Index].won++;
            standings[team1Index].points += 2;
            standings[team2Index].lost++;
        } else if (match.score1 < match.score2) {
            // Team 2 gewinnt
            standings[team1Index].lost++;
            standings[team2Index].won++;
            standings[team2Index].points += 2;
        } else {
            // Unentschieden
            standings[team1Index].drawn++;
            standings[team1Index].points += 1;
            standings[team2Index].drawn++;
            standings[team2Index].points += 1;
        }
        
        // Tordifferenz aktualisieren
        standings[team1Index].goalDifference = standings[team1Index].goalsFor - standings[team1Index].goalsAgainst;
        standings[team2Index].goalDifference = standings[team2Index].goalsFor - standings[team2Index].goalsAgainst;
        
        console.log("Aktualisierte Teams:", {
            team1: standings[team1Index],
            team2: standings[team2Index]
        });
        
        console.log("Standings nach Update:", standings);
    }
    
    /**
     * Setzt ein Match in der Tabelle zurück (vor der Aktualisierung)
     */
    function resetMatchInStandings(match) {
        // Originales Match finden
        const originalMatch = matches.find(m => m.id === match.id);
        if (!originalMatch || !originalMatch.played) return;
        
        // Team-Indizes finden
        const team1Index = standings.findIndex(s => s.team === originalMatch.team1);
        const team2Index = standings.findIndex(s => s.team === originalMatch.team2);
        
        if (team1Index === -1 || team2Index === -1) return;
        
        // Spielstatistik für Team 1 zurücksetzen
        standings[team1Index].played--;
        standings[team1Index].goalsFor -= originalMatch.score1;
        standings[team1Index].goalsAgainst -= originalMatch.score2;
        
        // Spielstatistik für Team 2 zurücksetzen
        standings[team2Index].played--;
        standings[team2Index].goalsFor -= originalMatch.score2;
        standings[team2Index].goalsAgainst -= originalMatch.score1;
        
        // Sieg/Niederlage/Unentschieden zurücksetzen
        if (originalMatch.score1 > originalMatch.score2) {
            // Team 1 hatte gewonnen
            standings[team1Index].won--;
            standings[team1Index].points -= 2;
            standings[team2Index].lost--;
        } else if (originalMatch.score1 < originalMatch.score2) {
            // Team 2 hatte gewonnen
            standings[team1Index].lost--;
            standings[team2Index].won--;
            standings[team2Index].points -= 2;
        } else {
            // Unentschieden
            standings[team1Index].drawn--;
            standings[team1Index].points -= 1;
            standings[team2Index].drawn--;
            standings[team2Index].points -= 1;
        }
        
        // Tordifferenz aktualisieren
        standings[team1Index].goalDifference = standings[team1Index].goalsFor - standings[team1Index].goalsAgainst;
        standings[team2Index].goalDifference = standings[team2Index].goalsFor - standings[team2Index].goalsAgainst;
    }
    
/**
 * Bearbeitet ein Match mit Header-Buttons
 */
function editMatchResult(matchId) {
    console.log(`Bearbeite Ergebnis für Match ${matchId}`);
    
    const paarungCard = document.querySelector(`.paarung-card[data-match-id="${matchId}"]`);
    const scoreInputs = paarungCard.querySelectorAll('.score-input');
    
    // Eingabefelder aktivieren
    scoreInputs.forEach(input => {
        input.disabled = false;
    });
    
    // Bearbeiten-Button durch Speichern-Button ersetzen
    const headerActions = paarungCard.querySelector('.header-actions');
    headerActions.innerHTML = '';
    
    // Speichern-Button mit Emoji
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn header-btn';
    saveBtn.innerHTML = '💾';
    saveBtn.title = "Ergebnis speichern";
    saveBtn.addEventListener('click', () => saveMatchResult(matchId));
    headerActions.appendChild(saveBtn);
    
    // Zurücksetzen-Button mit Emoji
    const resetBtn = document.createElement('button');
    resetBtn.className = 'reset-btn header-btn';
    resetBtn.innerHTML = '🔄';
    resetBtn.title = "Ergebnis zurücksetzen";
    resetBtn.addEventListener('click', () => resetMatchResult(matchId));
    headerActions.appendChild(resetBtn);
    
    // Played-Marker entfernen
    const playedMarker = paarungCard.querySelector('.played-marker');
    if (playedMarker) playedMarker.remove();
}
    
    /**
     * Setzt ein Match zurück
     */
    function resetMatchResult(matchId) {
        console.log(`Setze Ergebnis für Match ${matchId} zurück`);
        
        // Match finden
        const matchIndex = matches.findIndex(m => m.id === matchId);
        if (matchIndex === -1) {
            console.error(`Match mit ID ${matchId} nicht gefunden`);
            return;
        }
        
        const match = matches[matchIndex];
        
        // Falls Match gespielt wurde, aus Tabelle entfernen
        if (match.played) {
            resetMatchInStandings(match);
        }
        
        // Ergebnisse zurücksetzen
        match.score1 = null;
        match.score2 = null;
        match.played = false;
        
        // Daten speichern
        saveMatches();
        saveStandings();
        
        // UI aktualisieren
        renderMatches();
        renderStandings();
    }
    
    /**
     * Rendert die Tabelle
     */
/**
 * Modifizierte Standard-Render-Funktion für die Tabelle,
 * Teams mit identischen Werten teilen sich den gleichen Tabellenplatz
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
            <th class="stat-col">S</th>
            <th class="stat-col">U</th>
            <th class="stat-col">N</th>
            <th class="stat-col">Tore</th>
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
            <td class="stat-col">${team.won}</td>
            <td class="stat-col">${team.drawn}</td>
            <td class="stat-col">${team.lost}</td>
            <td class="stat-col">${team.goalsFor}:${team.goalsAgainst}</td>
            <td class="stat-col">${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</td>
            <td class="stat-col">${team.points}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    standingsContainer.appendChild(table);

    console.log("Tabelle wird neu gerendert");
}
    
    /**
     * Speichert Matches im localStorage
     */
    async function saveMatches() {
        try {
            const success = await dataService.saveData('vorrundeMatches', matches);
            if (success) {
                console.log('Matches erfolgreich gespeichert');
            } else {
                console.log('Matches lokal gespeichert. Wird synchronisiert, sobald wieder online.');
            }
        } catch (error) {
            console.error('Fehler beim Speichern der Matches:', error);
        }
    }
    
    /**
     * Speichert Standings im localStorage
     */
    async function saveStandings() {
        try {
            const success = await dataService.saveData('vorrundeStandings', standings);
            if (success) {
                console.log('Standings erfolgreich gespeichert');
            } else {
                console.log('Standings lokal gespeichert. Wird synchronisiert, sobald wieder online.');
            }
        } catch (error) {
            console.error('Fehler beim Speichern der Standings:', error);
        }
    }
    
    /**
     * Exportiert die Vorrunden-Daten als JSON-Datei
     */
    function exportData() {
        if (matches.length === 0) {
            alert('Es gibt keine Daten zum Exportieren.');
            return;
        }
        
        // Daten für Export vorbereiten
        const exportData = {
            matches: matches,
            standings: standings,
            exportDate: new Date().toISOString()
        };
        
        // JSON erstellen
        const dataJSON = JSON.stringify(exportData, null, 2);
        
        // Blob erstellen
        const blob = new Blob([dataJSON], { type: 'application/json' });
        
        // Download-Link erstellen
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'laos_vorrunde.json';
        
        // Link anklicken, um Download zu starten
        document.body.appendChild(a);
        a.click();
        
        // Link entfernen
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Vorrunden-Daten wurden als JSON-Datei exportiert');
    }
    
    /**
     * Bestätigt das Zurücksetzen der Vorrunde
     */
    function confirmReset() {
        if (confirm('ACHTUNG: Möchtest du wirklich ALLE Vorrunden-Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            resetVorrunde();
        }
    }
    
    /**
     * Setzt die Vorrunde zurück
     */
    async function resetVorrunde() {
        // Daten zurücksetzen
        matches = [];
        standings = [];
        
        // Speichern
        await dataService.saveData('vorrundeMatches', []);
        await dataService.saveData('vorrundeStandings', []);
        
        // UI zurücksetzen
        if (matchesContainer) matchesContainer.innerHTML = '';
        if (standingsContainer) standingsContainer.innerHTML = '';
        
        // Status setzen
        setStatus('Die Vorrunde wurde zurückgesetzt.', 'info');
        
        console.log('Vorrunde wurde zurückgesetzt');
    }
 // Event-Listener für Golden Cup Button
document.getElementById('goldenCupBtn').addEventListener('click', showGoldenCup);


/**
 * Zeigt den Golden Cup an und analysiert Gleichstände
 */
function showGoldenCup() {
    console.log("Golden Cup Button geklickt");
    
    // Golden Cup Button als aktiv markieren und andere Buttons deaktivieren
    document.getElementById('goldenCupBtn').classList.add('active');
    document.querySelectorAll('.round-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Container leeren
    matchesContainer.innerHTML = '';
    
    // Golden Cup Container erstellen
    const goldenCupContainer = document.createElement('div');
    goldenCupContainer.className = 'tiebreaker-container';
    
    const title = document.createElement('h3');
    title.className = 'tiebreaker-title';
    title.textContent = '🏆 Golden Cup - Gleichstand-Entscheidungen';
    goldenCupContainer.appendChild(title);
    
    // Sortierte Tabelle erstellen (ALLE Teams)
    const sortedStandings = [...standings].sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });
    
    // Gleichstände finden
    const ties = findTies(sortedStandings);
    
    if (ties.length === 0) {
        const noTiesMessage = document.createElement('p');
        noTiesMessage.textContent = 'Keine Gleichstände gefunden. Alle Teams haben unterschiedliche Werte in Punkten, Tordifferenz oder erzielten Toren.';
        noTiesMessage.style.textAlign = 'center';
        noTiesMessage.style.padding = '2rem';
        goldenCupContainer.appendChild(noTiesMessage);
    } else {
        // Anzahl der Gleichstände anzeigen
        const tiesCountMessage = document.createElement('p');
        tiesCountMessage.textContent = `${ties.length} Gleichstand${ties.length !== 1 ? 'e' : ''} gefunden.`;
        tiesCountMessage.style.textAlign = 'center';
        tiesCountMessage.style.marginBottom = '1.5rem';
        goldenCupContainer.appendChild(tiesCountMessage);
        
        // Gleichstände anzeigen
        const tiebreakerMatches = document.createElement('div');
        tiebreakerMatches.className = 'tiebreaker-matches';
        
        ties.forEach((tie, index) => {
            const tiebreakerMatch = createTiebreakerMatch(tie, index);
            tiebreakerMatches.appendChild(tiebreakerMatch);
        });
        
        goldenCupContainer.appendChild(tiebreakerMatches);
    }
    
    matchesContainer.appendChild(goldenCupContainer);
    
    // Tabelle mit Gleichstand-Markierungen anzeigen
    renderStandingsWithTieMarkers(ties);
}
/**
 * Findet Gleichstände in der Tabelle - verbesserte Version
 * Erkennt alle Teams mit identischen Werten, auch wenn sie nicht direkt aufeinanderfolgen
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
 * Erstellt ein Match-Element für einen Gleichstand
 */
function createTiebreakerMatch(tie, index) {
    const tieMatch = document.createElement('div');
    tieMatch.className = 'tiebreaker-match';
    tieMatch.dataset.tieId = tie.id;

    // Positionsbereich für Teams
    const positions = tie.teams.map(team => {
        const position = standings.findIndex(s => s.team === team.team) + 1;
        return position;
    });
    const minPosition = Math.min(...positions);

    // Je nach Position Klasse und Label bestimmen
    let positionInfo = 'Tabellenposition';
    let positionClass = 'tie-position-default';
    if (minPosition <= 4) {
        positionInfo = 'Direkte Qualifikation';
        positionClass = 'tie-position-direct';
    } else if (minPosition <= 12) {
        positionInfo = 'Playoff-Qualifikation';
        positionClass = 'tie-position-playoff';
    }

    const teamNames = tie.teams.map(t => t.team).join(' vs ');

    // ── Header (wie paarung-header) ──
    const matchHeader = document.createElement('div');
    matchHeader.className = 'tiebreaker-match-header';

    const headerInfo = document.createElement('div');
    headerInfo.className = 'header-info';

    const matchTitle = document.createElement('span');
    matchTitle.className = 'tiebreaker-match-title';
    matchTitle.textContent = `Gleichstand ${index + 1}`;
    headerInfo.appendChild(matchTitle);

    matchHeader.appendChild(headerInfo);

    // Buttons im Header
    const headerActions = document.createElement('div');
    headerActions.className = 'tiebreaker-match-actions';

    if (tie.result) {
        const editBtn = document.createElement('button');
        editBtn.className = 'header-btn';
        editBtn.innerHTML = '✏️';
        editBtn.addEventListener('click', () => editTiebreakerResult(tie.id));
        headerActions.appendChild(editBtn);
    } else {
        const saveBtn = document.createElement('button');
        saveBtn.className = 'header-btn';
        saveBtn.innerHTML = '💾';
        saveBtn.addEventListener('click', () => saveTiebreakerResult(tie.id));
        headerActions.appendChild(saveBtn);
    }

    const resetBtn = document.createElement('button');
    resetBtn.className = 'header-btn';
    resetBtn.innerHTML = '🔄';
    resetBtn.addEventListener('click', () => resetTiebreakerResult(tie.id));
    headerActions.appendChild(resetBtn);

    matchHeader.appendChild(headerActions);
    tieMatch.appendChild(matchHeader);

    // ── Stats-Info ──
    const matchDetails = document.createElement('div');
    matchDetails.className = 'tiebreaker-info';
    matchDetails.innerHTML = `
        <div><strong>${positionInfo}:</strong> Platz ${minPosition}</div>
        <div><strong>Gleichwerte:</strong>
            Punkte: <b>${tie.teams[0].points}</b>,
            Tordifferenz: <b>${tie.teams[0].goalDifference}</b>,
            Erzielte Tore: <b>${tie.teams[0].goalsFor}</b>
        </div>
    `;
    tieMatch.appendChild(matchDetails);

    // ── Teams (wie paarung-teams) ──
    const matchTeams = document.createElement('div');
    matchTeams.className = 'tiebreaker-teams';

    tie.teams.forEach(team => {
        const teamEl = document.createElement('div');
        teamEl.className = 'tiebreaker-team';

        const teamName = document.createElement('span');
        teamName.className = 'team-name';
        teamName.textContent = team.team;
        teamEl.appendChild(teamName);

        const scoreInput = document.createElement('input');
        scoreInput.type = 'number';
        scoreInput.className = 'score-input';
        scoreInput.dataset.team = team.team;
        scoreInput.min = 0;

        if (tie.result) {
            const teamResult = tie.result.teams.find(t => t.team === team.team);
            if (teamResult) {
                scoreInput.value = teamResult.score;
                scoreInput.disabled = true;
            }
        }

        teamEl.appendChild(scoreInput);
        matchTeams.appendChild(teamEl);
    });

    tieMatch.appendChild(matchTeams);

    return tieMatch;
}

/**
 * Speichert das Ergebnis eines Tiebreaker-Matches - verbesserte Version
 */
async function saveTiebreakerResult(tieId) {
    console.log(`Speichere Ergebnis für Tiebreaker ${tieId}`);
    
    // Match-Element finden
    const tieMatch = document.querySelector(`.tiebreaker-match[data-tie-id="${tieId}"]`);
    if (!tieMatch) {
        console.error(`Tiebreaker-Match mit ID ${tieId} nicht gefunden`);
        return;
    }
    
    // Alle Score-Inputs
    const scoreInputs = tieMatch.querySelectorAll('.score-input');
    if (scoreInputs.length === 0) {
        console.error(`Keine Score-Inputs gefunden für Tiebreaker ${tieId}`);
        return;
    }
    
    // Ergebnisse sammeln
    const teamResults = [];
    let allValid = true;
    
    scoreInputs.forEach(input => {
        const teamName = input.dataset.team;
        const score = parseInt(input.value);
        
        if (isNaN(score) || score < 0) {
            allValid = false;
            return;
        }
        
        teamResults.push({
            team: teamName,
            score: score
        });
    });
    
    if (!allValid) {
        alert('Bitte gib für alle Teams gültige Ergebnisse ein (positive Zahlen).');
        return;
    }
    
    // Prüfen, ob die Scores wirklich unterschiedlich sind
    const uniqueScores = new Set(teamResults.map(tr => tr.score));
    if (uniqueScores.size === 1) {
        alert('Die Ergebnisse müssen unterschiedlich sein, um den Gleichstand aufzulösen.');
        return;
    }
    
    // Ergebnis speichern
    const tieResult = {
        id: tieId,
        teams: teamResults,
        date: new Date().toISOString()
    };
    
    // Zu den Golden Cup Ergebnissen hinzufügen oder aktualisieren
    const existingIndex = goldenCupResults.findIndex(result => result.id === tieId);
    if (existingIndex !== -1) {
        goldenCupResults[existingIndex] = tieResult;
    } else {
        goldenCupResults.push(tieResult);
    }
    
    // In localStorage speichern
    await dataService.saveData('goldenCupResults', goldenCupResults);
        console.log('Golden Cup Ergebnisse gespeichert:', goldenCupResults);
    
    // Golden Cup neu anzeigen
    showGoldenCup();
    
    // Hinweis anzeigen
    setStatus('Golden Cup Ergebnis gespeichert. Die Tabelle wurde aktualisiert.', 'success');
}

/**
 * Bearbeitet das Ergebnis eines Tiebreaker-Matches
 */
function editTiebreakerResult(tieId) {
    console.log(`Bearbeite Ergebnis für Tiebreaker ${tieId}`);
    
    // Match-Element finden
    const tieMatch = document.querySelector(`.tiebreaker-match[data-tie-id="${tieId}"]`);
    if (!tieMatch) {
        console.error(`Tiebreaker-Match mit ID ${tieId} nicht gefunden`);
        return;
    }
    
    // Score-Inputs aktivieren
    const scoreInputs = tieMatch.querySelectorAll('.score-input');
    if (scoreInputs.length === 0) {
        console.error(`Keine Score-Inputs gefunden für Tiebreaker ${tieId}`);
        return;
    }
    
    scoreInputs.forEach(input => {
        input.disabled = false;
    });
    
    // Aktionen aktualisieren
    const actionsDiv = tieMatch.querySelector('.tiebreaker-actions');
    if (!actionsDiv) {
        console.error(`Keine Actions-Div gefunden für Tiebreaker ${tieId}`);
        return;
    }
    
    actionsDiv.innerHTML = '';
    
    // Speichern-Button mit Emoji
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.innerHTML = '💾';
    saveBtn.addEventListener('click', () => saveTiebreakerResult(tieId));
    actionsDiv.appendChild(saveBtn);
    
    // Zurücksetzen-Button mit Emoji
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-danger';
    resetBtn.innerHTML = '🔄';
    resetBtn.addEventListener('click', () => resetTiebreakerResult(tieId));
    actionsDiv.appendChild(resetBtn);
}

/**
 * Setzt das Ergebnis eines Tiebreaker-Matches zurück
 */
function resetTiebreakerResult(tieId) {
    console.log(`Setze Ergebnis für Tiebreaker ${tieId} zurück`);
    
    if (!confirm('Möchtest du das Ergebnis dieses Gleichstand-Entscheidungsspiels wirklich zurücksetzen?')) {
        return;
    }
    
    // Ergebnis aus goldenCupResults entfernen
    const index = goldenCupResults.findIndex(result => result.id === tieId);
    if (index !== -1) {
        // Aus Array entfernen
        goldenCupResults.splice(index, 1);
        
        // In localStorage speichern
        localStorage.setItem('goldenCupResults', JSON.stringify(goldenCupResults));
        console.log('Golden Cup Ergebnisse nach Zurücksetzen:', goldenCupResults);
    }
    
    // Golden Cup neu anzeigen
    showGoldenCup();
}


/**
 * Rendert die Tabelle mit deutlichen Markierungen für Gleichstände
 * und Hinweisen auf Golden Cup-Entscheidungen im Golden Cup-Bereich
 * Teams mit gleichen Werten teilen sich den gleichen Tabellenplatz
 */
function renderStandingsWithTieMarkers(ties) {
    if (!standingsContainer) return;
    
    // Container leeren
    standingsContainer.innerHTML = '';
    
    // Tabelle sortieren mit verbesserter Logik
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
            <th class="stat-col">S</th>
            <th class="stat-col">U</th>
            <th class="stat-col">N</th>
            <th class="stat-col">Tore</th>
            <th class="stat-col">Diff</th>
            <th class="stat-col">Pkt</th>
            <th class="stat-col">Hinweis</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Tabellenkörper
    const tbody = document.createElement('tbody');
    
    // Verfolge Teams, deren Position durch Golden Cup entschieden wurde
    const teamsWithGoldenCupDecision = new Set();
    ties.forEach(tie => {
        if (tie.result) {
            tie.teams.forEach(team => teamsWithGoldenCupDecision.add(team.team));
        }
    });
    
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
        
        // Prüfen, ob Team in einem Tie ist
        const isInTie = ties.some(tie => tie.teams.some(t => t.team === team.team));
        
        // CSS-Klasse für direkte Qualifikation und Playoff-Qualifikation
        if (index < 4) {
            row.className = 'direct-qualifier';
        } else if (index < 12) {
            row.className = 'playoff-qualifier';
        }
        
        // Team-Zelle mit Marker für Gleichstand
        const teamCell = document.createElement('td');
        teamCell.className = 'team-col';
        
        if (isInTie) {
            const tieMarker = document.createElement('span');
            tieMarker.className = 'tie-marker';
            teamCell.appendChild(tieMarker);
        }
        
        const teamName = document.createTextNode(team.team);
        teamCell.appendChild(teamName);
        
        // Grundlegende Zellen
        row.innerHTML = `
            <td class="pos-col">${currentPosition}</td>
        `;
        row.appendChild(teamCell);
        row.innerHTML += `
            <td class="stat-col">${team.played}</td>
            <td class="stat-col">${team.won}</td>
            <td class="stat-col">${team.drawn}</td>
            <td class="stat-col">${team.lost}</td>
            <td class="stat-col">${team.goalsFor}:${team.goalsAgainst}</td>
            <td class="stat-col">${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</td>
            <td class="stat-col">${team.points}</td>
        `;
        
        // Hinweis-Zelle für Golden Cup
        const notesCell = document.createElement('td');
        notesCell.className = 'stat-col';
        
        if (teamsWithGoldenCupDecision.has(team.team)) {
            notesCell.innerHTML = '<span style="font-size: 1.1rem; color: #FFD700;">Golden Cup</span>';
            notesCell.title = 'Platzierung durch Golden Cup-Entscheidung';
        }
        
        row.appendChild(notesCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    standingsContainer.appendChild(table);
    
    // Hinweis unterhalb der Tabelle
    if (teamsWithGoldenCupDecision.size > 0) {
        const legend = document.createElement('div');
        legend.style.marginTop = '1rem';
        legend.style.padding = '0.5rem';
        legend.style.backgroundColor = '#f8f9fa';
        legend.style.borderRadius = '4px';
        legend.style.fontSize = '0.9rem';
        legend.innerHTML = `
            <p><span style="color: #FFD700;">🏆</span> Teams mit <strong>Golden Cup</strong> Markierung werden in der Tabelle 
            basierend auf Golden Cup-Entscheidungen platziert.</p>
            <p>Teams mit identischen Werten (Punkte, Tordifferenz, Tore) teilen sich denselben Tabellenplatz, 
            es sei denn, eine Golden Cup-Entscheidung wurde getroffen.</p>
        `;
        standingsContainer.appendChild(legend);
    }
}





/**
 * Aktualisiert Spielstatistiken für reguläre Matches
 */
function updateMatchStats(match, team1Index, team2Index) {
    // Spielstatistik für Team 1
    standings[team1Index].played++;
    standings[team1Index].goalsFor += match.score1;
    standings[team1Index].goalsAgainst += match.score2;
    
    // Spielstatistik für Team 2
    standings[team2Index].played++;
    standings[team2Index].goalsFor += match.score2;
    standings[team2Index].goalsAgainst += match.score1;
    
    // Sieg/Niederlage/Unentschieden bestimmen
    if (match.score1 > match.score2) {
        // Team 1 gewinnt
        standings[team1Index].won++;
        standings[team1Index].points += 2;
        standings[team2Index].lost++;
    } else if (match.score1 < match.score2) {
        // Team 2 gewinnt
        standings[team1Index].lost++;
        standings[team2Index].won++;
        standings[team2Index].points += 2;
    } else {
        // Unentschieden
        standings[team1Index].drawn++;
        standings[team1Index].points += 1;
        standings[team2Index].drawn++;
        standings[team2Index].points += 1;
    }
    
    // Tordifferenz aktualisieren
    standings[team1Index].goalDifference = standings[team1Index].goalsFor - standings[team1Index].goalsAgainst;
    standings[team2Index].goalDifference = standings[team2Index].goalsFor - standings[team2Index].goalsAgainst;
}
    

    /**
     * Setzt einen Status-Text
     */
    function setStatus(message, type = 'info') {
        statusContainer.className = 'status-container';
        statusContainer.classList.add(`status-${type}`);
        statusContainer.textContent = message;
    }
    
    // Für Debug-Zwecke global verfügbar machen
    window.appMatches = matches;
    window.appStandings = standings;


// Echtzeit-Updates für matches und standings
dataService.subscribeToData('vorrundeMatches', updatedMatches => {
    if (JSON.stringify(matches) !== JSON.stringify(updatedMatches)) {
        console.log('Matches wurden aktualisiert, rendere UI neu');
        matches = updatedMatches;
        renderMatches();
    }
});

dataService.subscribeToData('vorrundeStandings', updatedStandings => {
    if (JSON.stringify(standings) !== JSON.stringify(updatedStandings)) {
        console.log('Standings wurden aktualisiert, rendere UI neu');
        standings = updatedStandings;
        renderStandings();
    }
});

    // Auf Authentifizierungsänderungen reagieren
    auth.onAuthStateChanged(function(user) {
        updateAuthStatus();
    });

/**
 * Verbesserte Funktion zum Hervorheben der Teams in der Tabelle mit Verzögerung
 * Diese Version sorgt für eine bessere visuelle Wirkung, wenn zwei Teams hervorgehoben werden
 * @param {string} team1 - Name des ersten Teams
 * @param {string} team2 - Name des zweiten Teams
 */
function highlightTeamsInTable(team1, team2) {
    // Teams in der Tabelle finden
    const teamRows = document.querySelectorAll('.standings-table tbody tr');
    let team1Row = null;
    let team2Row = null;
    
    teamRows.forEach(row => {
        const teamCell = row.querySelector('.team-col');
        if (!teamCell) return;
        
        // Prüfen ob es eines der betroffenen Teams ist (exakter Textabgleich)
        const teamName = teamCell.textContent.trim();
        if (teamName === team1) {
            team1Row = row;
        } else if (teamName === team2) {
            team2Row = row;
        }
    });
    
    // Teams nacheinander hervorheben, für besseren visuellen Effekt
    if (team1Row) {
        team1Row.classList.add('highlight-pulse');
        
        // Nach einer Verzögerung die Klasse wieder entfernen
        setTimeout(() => {
            team1Row.classList.remove('highlight-pulse');
        }, 3000);
    }
    
    if (team2Row) {
        // Leichte Verzögerung für das zweite Team (150ms)
        setTimeout(() => {
            team2Row.classList.add('highlight-pulse');
            
            // Nach einer Verzögerung die Klasse wieder entfernen
            setTimeout(() => {
                team2Row.classList.remove('highlight-pulse');
            }, 3000);
        }, 150);
    }
}

    
});