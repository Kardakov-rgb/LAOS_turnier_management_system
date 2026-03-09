/**
 * vorrunde-algorithm.js
 * Spielplan-Algorithmen für die Vorrunde (Round-Robin, Circle-Methode, Gruppen-Methode)
 *
 * Alle Funktionen sind reine Funktionen: kein globaler Zustand, nur Parameter und Rückgabewerte.
 */

/**
 * Round-Robin (alle gegen alle) – für ≤6 Teams
 * @param {string[]} teams - Array der Teamnamen
 * @returns {Object[]} - Generierte Spiele
 */
export function createMatchesAllPlayAll(teams) {
    const generatedMatches = [];
    let matchId = 1;

    const n = teams.length;
    const rounds = n % 2 === 0 ? n - 1 : n;

    const teamsWithPossibleDummy = [...teams];
    if (n % 2 !== 0) {
        teamsWithPossibleDummy.push(null); // Dummy für Freilos
    }

    const teamCount = teamsWithPossibleDummy.length;
    const circle = [...teamsWithPossibleDummy];

    for (let round = 1; round <= rounds; round++) {
        for (let i = 0; i < teamCount / 2; i++) {
            const team1 = circle[i];
            const team2 = circle[teamCount - 1 - i];

            if (team1 !== null && team2 !== null) {
                generatedMatches.push({
                    id: matchId++,
                    round,
                    team1,
                    team2,
                    score1: null,
                    score2: null,
                    played: false
                });
            }
        }

        // Rotation: erstes Team bleibt fest, Rest rotiert
        const firstTeam = circle[0];
        const rest = circle.slice(1);
        rest.unshift(rest.pop());
        circle.splice(0, circle.length, firstTeam, ...rest);
    }

    return generatedMatches;
}

/**
 * Verbesserte Circle-Methode – für 7-23 Teams (5 Runden)
 * @param {string[]} teams - Array der Teamnamen
 * @returns {Object[]} - Generierte Spiele
 */
export function createMatchesWithImprovedCircleMethod(teams) {
    const generatedMatches = [];
    let matchId = 1;

    const teamNames = [...teams];
    const teamIds = Array.from({ length: teams.length }, (_, i) => i + 1);

    // Zufällige Anordnung reduziert Schattengruppen
    teamIds.sort(() => Math.random() - 0.5);

    if (teamIds.length % 2 !== 0) {
        teamIds.push(null); // Dummy für ungerade Anzahl
    }

    const n = teamIds.length;

    for (let round = 1; round <= 5; round++) {
        // In geraden Runden teilweise neu mischen
        if (round % 2 === 0) {
            const first = teamIds[0];
            const rest = teamIds.slice(1);
            rest.sort(() => Math.random() - 0.5);
            teamIds.splice(0, teamIds.length, first, ...rest);
        }

        for (let i = 0; i < n / 2; i++) {
            const team1Id = teamIds[i];
            const team2Id = teamIds[n - 1 - i];

            if (team1Id !== null && team2Id !== null) {
                generatedMatches.push({
                    id: matchId++,
                    round,
                    team1: teamNames[team1Id - 1],
                    team2: teamNames[team2Id - 1],
                    score1: null,
                    score2: null,
                    played: false
                });
            }
        }

        const first = teamIds[0];
        const rest = teamIds.slice(1);
        rest.unshift(rest.pop());
        teamIds.splice(0, teamIds.length, first, ...rest);
    }

    return generatedMatches;
}

/**
 * Gruppen-basierte Methode – für exakt 24 Teams (6 Gruppen à 4)
 * @param {string[]} teams - Array der Teamnamen (genau 24)
 * @returns {Object[]} - Generierte Spiele
 */
export function createMatchesWithGroupMethod(teams) {
    const generatedMatches = [];
    let matchId = 1;

    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    const groupSize = 4;
    const numGroups = 6;

    const groups = [];
    for (let i = 0; i < numGroups; i++) {
        groups.push(shuffledTeams.slice(i * groupSize, (i + 1) * groupSize));
    }

    // Matchplan: welche Gruppen spielen in welcher Runde gegeneinander
    const roundGroupMatches = [
        [[0, 1], [2, 3], [4, 5]],
        [[0, 2], [1, 4], [3, 5]],
        [[0, 3], [1, 5], [2, 4]],
        [[0, 4], [1, 2], [3, 5]],
        [[0, 5], [1, 3], [2, 4]]
    ];

    for (let roundIndex = 0; roundIndex < 5; roundIndex++) {
        const roundNumber = roundIndex + 1;
        for (const [group1Index, group2Index] of roundGroupMatches[roundIndex]) {
            const group1 = groups[group1Index];
            const group2 = groups[group2Index];
            const matchPattern = getMatchPatternForGroups(roundIndex);

            for (let i = 0; i < groupSize; i++) {
                generatedMatches.push({
                    id: matchId++,
                    round: roundNumber,
                    team1: group1[i],
                    team2: group2[matchPattern[i]],
                    score1: null,
                    score2: null,
                    played: false
                });
            }
        }
    }

    return generatedMatches;
}

/**
 * Hilfsfunktion: Matching-Muster zwischen zwei Gruppen je Runde
 * @param {number} roundIndex - 0-basierter Rundenindex
 * @returns {number[]} - Positions-Mapping
 */
export function getMatchPatternForGroups(roundIndex) {
    const patterns = [
        [0, 1, 2, 3],
        [1, 0, 3, 2],
        [2, 3, 0, 1],
        [3, 2, 1, 0],
        [0, 2, 1, 3]
    ];
    return patterns[roundIndex % patterns.length];
}

/**
 * Erstellt Spiele aus benutzerdefinierten Paarungen
 * @param {string[]} teams - Array der Teamnamen
 * @param {Object} customMatchups - Objekt { runde: [[team1Id, team2Id], ...] }
 * @returns {Object[]} - Generierte Spiele
 */
export function createMatchesFromCustomPairings(teams, customMatchups) {
    const generatedMatches = [];
    let matchId = 1;

    for (const round in customMatchups) {
        const roundNumber = parseInt(round);
        for (const [team1Id, team2Id] of customMatchups[round]) {
            generatedMatches.push({
                id: matchId++,
                round: roundNumber,
                team1: teams[team1Id - 1],
                team2: teams[team2Id - 1],
                score1: null,
                score2: null,
                played: false
            });
        }
    }

    return generatedMatches;
}

/**
 * Weist zufällige Tischnummern und Paarungsnummern zu (5 Runden, je 2 Hälften)
 * @param {Object[]} matches - Spiel-Array (wird in-place modifiziert)
 */
export function assignTableAndPairingNumbers(matches) {
    for (let round = 1; round <= 5; round++) {
        const roundMatches = matches.filter(m => m.round === round);
        const halfSize = Math.ceil(roundMatches.length / 2);

        assignTablesToHalf(roundMatches.slice(0, halfSize), getRandomTableNumbers(6), false);
        assignTablesToHalf(roundMatches.slice(halfSize), getRandomTableNumbers(6), true);
    }
}

/**
 * Generiert eine zufällig gemischte Liste von Tischnummern 1–n
 * @param {number} tableCount - Anzahl Tische
 * @returns {number[]} - Gemischte Tischnummern
 */
export function getRandomTableNumbers(tableCount = 6) {
    const tables = Array.from({ length: tableCount }, (_, i) => i + 1);
    for (let i = tables.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tables[i], tables[j]] = [tables[j], tables[i]];
    }
    return tables;
}

/**
 * Weist Tischnummern für eine Hälfte der Spiele zu
 * @param {Object[]} halfMatches - Spiele dieser Hälfte
 * @param {number[]} tables - Tischnummern
 * @param {boolean} isSecondHalf - Zweite Hälfte?
 */
export function assignTablesToHalf(halfMatches, tables, isSecondHalf) {
    halfMatches.forEach((match, index) => {
        match.tableNumber = tables[index % tables.length];
        match.pairingNumber = index + 1;
        match.isSecondHalf = isSecondHalf;
    });
}

/**
 * Initialisiert die Tabelle (Standings) für alle Teams
 * @param {string[]} teams - Array der Teamnamen
 * @returns {Object[]} - Tabellen-Einträge
 */
export function initializeStandings(teams) {
    return teams.map(team => ({
        team,
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
 * Findet Teams mit identischen Sortierkriterien (Gleichstände)
 * @param {Object[]} sortedStandings - Tabelle (sortiert)
 * @returns {Object[]} - Liste der Gleichstand-Gruppen
 */
export function findTies(sortedStandings) {
    const teamsByValues = {};

    sortedStandings.forEach(team => {
        const key = `${team.points}-${team.goalDifference}-${team.goalsFor}`;
        if (!teamsByValues[key]) teamsByValues[key] = [];
        teamsByValues[key].push(team);
    });

    const ties = [];
    for (const key in teamsByValues) {
        if (teamsByValues[key].length > 1) {
            ties.push({
                id: key,
                teams: teamsByValues[key]
            });
        }
    }

    return ties;
}
