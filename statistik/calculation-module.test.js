/**
 * calculation-module.test.js
 * Minimales Test-Harness für calculation-module.js (kein npm/Build-Tool nötig).
 *
 * Ausführen: Diese Datei im Browser öffnen (als ES-Modul via <script type="module">)
 * oder mit einem lokalen Dev-Server (z.B. Live Server in VS Code).
 */

import {
    calculateTeamStatistics,
    sortTeamStats,
    findBestGoalDifferenceForTeam,
    findTies
} from './calculation-module.js';

// ─── Minimales Test-Harness ───────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (e) {
        console.error(`✗ ${name}: ${e.message}`);
        failed++;
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion fehlgeschlagen');
}

function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
        throw new Error(msg || `Erwartet: ${expected}, Erhalten: ${actual}`);
    }
}

function assertClose(actual, expected, tolerance, msg) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(msg || `Erwartet ~${expected}, Erhalten: ${actual} (Toleranz: ${tolerance})`);
    }
}

// ─── Hilfsfunktionen für Testdaten ───────────────────────────────────────────

function makeVorrundeMatch(id, team1, score1, team2, score2) {
    return { id, round: 1, team1, team2, score1, score2, played: true };
}

function makeUnplayedMatch(id, team1, team2) {
    return { id, round: 1, team1, team2, score1: null, score2: null, played: false };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// 1. Leere Eingaben
test('calculateTeamStatistics — leere Arrays geben leeres Ergebnis zurück', () => {
    const result = calculateTeamStatistics([], [], null);
    assert(Array.isArray(result), 'Ergebnis ist kein Array');
    assertEqual(result.length, 0, 'Ergebnis sollte leer sein');
});

test('calculateTeamStatistics — Teams ohne Matches haben alle Nullwerte', () => {
    const result = calculateTeamStatistics(['Alpha', 'Beta'], [], null);
    assertEqual(result.length, 2, 'Sollte 2 Teams enthalten');
    assertEqual(result[0].matches.all, 0, 'matches.all sollte 0 sein');
    assertEqual(result[0].wins.all, 0, 'wins.all sollte 0 sein');
    assertEqual(result[0].beerDrunk.all, 0, 'beerDrunk.all sollte 0 sein');
});

// 2. Vorrunden-Statistiken
test('calculateTeamStatistics — Sieg erhöht won und points korrekt', () => {
    const teams = ['Alpha', 'Beta'];
    const matches = [makeVorrundeMatch(1, 'Alpha', 6, 'Beta', 3)];
    const result = calculateTeamStatistics(teams, matches, null);

    const alpha = result.find(t => t.team === 'Alpha');
    const beta = result.find(t => t.team === 'Beta');

    assertEqual(alpha.wins.vorrunde, 1, 'Alpha sollte 1 Sieg haben');
    assertEqual(alpha.losses.vorrunde, 0, 'Alpha sollte 0 Niederlagen haben');
    assertEqual(beta.wins.vorrunde, 0, 'Beta sollte 0 Siege haben');
    assertEqual(beta.losses.vorrunde, 1, 'Beta sollte 1 Niederlage haben');
});

test('calculateTeamStatistics — Unentschieden erhöht draws für beide Teams', () => {
    const teams = ['Alpha', 'Beta'];
    const matches = [makeVorrundeMatch(1, 'Alpha', 4, 'Beta', 4)];
    const result = calculateTeamStatistics(teams, matches, null);

    const alpha = result.find(t => t.team === 'Alpha');
    const beta = result.find(t => t.team === 'Beta');

    assertEqual(alpha.draws.vorrunde, 1, 'Alpha sollte 1 Unentschieden haben');
    assertEqual(beta.draws.vorrunde, 1, 'Beta sollte 1 Unentschieden haben');
    assertEqual(alpha.wins.vorrunde, 0, 'Alpha sollte keinen Sieg haben');
});

test('calculateTeamStatistics — Tore werden korrekt gezählt', () => {
    const teams = ['Alpha', 'Beta'];
    const matches = [makeVorrundeMatch(1, 'Alpha', 5, 'Beta', 2)];
    const result = calculateTeamStatistics(teams, matches, null);

    const alpha = result.find(t => t.team === 'Alpha');
    const beta = result.find(t => t.team === 'Beta');

    assertEqual(alpha.goalsScored.vorrunde, 5, 'Alpha Tore: 5');
    assertEqual(alpha.goalsConceded.vorrunde, 2, 'Alpha Gegentore: 2');
    assertEqual(beta.goalsScored.vorrunde, 2, 'Beta Tore: 2');
    assertEqual(beta.goalsConceded.vorrunde, 5, 'Beta Gegentore: 5');
});

test('calculateTeamStatistics — ungespielte Matches werden ignoriert', () => {
    const teams = ['Alpha', 'Beta'];
    const matches = [makeUnplayedMatch(1, 'Alpha', 'Beta')];
    const result = calculateTeamStatistics(teams, matches, null);

    const alpha = result.find(t => t.team === 'Alpha');
    assertEqual(alpha.matches.all, 0, 'Ungespielte Matches sollen nicht gezählt werden');
});

// 3. Bier-Berechnung
test('calculateTeamStatistics — Bier pro Tor: 110ml pro erzieltem Tor (Vorrunde)', () => {
    const teams = ['Alpha', 'Beta'];
    // Alpha schießt 4 Tore, Beta 2 Tore
    const matches = [makeVorrundeMatch(1, 'Alpha', 4, 'Beta', 2)];
    const result = calculateTeamStatistics(teams, matches, null);

    const alpha = result.find(t => t.team === 'Alpha');
    // Alpha erzielt 4 Tore → gibt 4 * 110ml = 440ml Bier
    assert(alpha.beerGiven.vorrunde >= 440, `Alpha beerGiven.vorrunde sollte >= 440 sein, war: ${alpha.beerGiven.vorrunde}`);
    // Alpha kassiert 2 Tore → trinkt 2 * 110ml = 220ml Bier
    assert(alpha.beerDrunk.vorrunde >= 220, `Alpha beerDrunk.vorrunde sollte >= 220 sein, war: ${alpha.beerDrunk.vorrunde}`);
});

test('calculateTeamStatistics — Tordifferenz wird korrekt berechnet', () => {
    const teams = ['Alpha', 'Beta', 'Gamma'];
    const matches = [
        makeVorrundeMatch(1, 'Alpha', 6, 'Beta', 3),
        makeVorrundeMatch(2, 'Alpha', 4, 'Gamma', 1)
    ];
    const result = calculateTeamStatistics(teams, matches, null);

    const alpha = result.find(t => t.team === 'Alpha');
    // Alpha: 6+4=10 Tore, 3+1=4 Gegentore → Differenz = 6
    assertEqual(alpha.goalDifference.vorrunde, 6, 'Alpha Tordifferenz sollte 6 sein');
});

// 4. sortTeamStats
test('sortTeamStats — sortiert nach wins DESC', () => {
    const teams = ['Alpha', 'Beta', 'Gamma'];
    const matches = [
        makeVorrundeMatch(1, 'Alpha', 6, 'Beta', 3),
        makeVorrundeMatch(2, 'Alpha', 5, 'Gamma', 2),
        makeVorrundeMatch(3, 'Beta', 4, 'Gamma', 1)
    ];
    const stats = calculateTeamStatistics(teams, matches, null);
    const sorted = sortTeamStats(stats, 'wins', 'desc', 'vorrunde');

    assertEqual(sorted[0].team, 'Alpha', 'Alpha sollte an erster Stelle stehen (2 Siege)');
    assert(sorted[0].wins.vorrunde >= sorted[1].wins.vorrunde, 'Reihenfolge: absteigend nach Siegen');
});

test('sortTeamStats — sortiert nach team ASC (alphabetisch)', () => {
    const teams = ['Zeta', 'Alpha', 'Mitte'];
    const stats = calculateTeamStatistics(teams, [], null);
    const sorted = sortTeamStats(stats, 'team', 'asc', 'all');

    assertEqual(sorted[0].team, 'Alpha', 'Alpha sollte alphabetisch zuerst stehen');
    assertEqual(sorted[2].team, 'Zeta', 'Zeta sollte alphabetisch zuletzt stehen');
});

test('sortTeamStats — Originalarray wird nicht verändert', () => {
    const teams = ['Zeta', 'Alpha'];
    const stats = calculateTeamStatistics(teams, [], null);
    const originalFirst = stats[0].team;
    sortTeamStats(stats, 'team', 'asc', 'all');
    assertEqual(stats[0].team, originalFirst, 'Original-Array darf nicht verändert werden');
});

// 5. findTies (aus calculation-module)
test('findTies — Teams ohne Gleichstand ergeben leere ties', () => {
    const teams = ['Alpha', 'Beta'];
    const matches = [makeVorrundeMatch(1, 'Alpha', 6, 'Beta', 3)];
    const stats = calculateTeamStatistics(teams, matches, null);

    // Sortierung wie in der App (nach points.all absteigend)
    const sorted = sortTeamStats(stats, 'wins', 'desc', 'all');
    const ties = findTies(sorted);
    assertEqual(ties.length, 0, 'Keine Gleichstände erwartet');
});

test('findTies — Teams mit identischen Stats ergeben einen Gleichstand', () => {
    const teams = ['Alpha', 'Beta', 'Gamma'];
    // Alpha schlägt Gamma, Beta schlägt Gamma — Alpha und Beta sind gleich
    const matches = [
        makeVorrundeMatch(1, 'Alpha', 6, 'Gamma', 3),
        makeVorrundeMatch(2, 'Beta', 6, 'Gamma', 3)
    ];
    const stats = calculateTeamStatistics(teams, matches, null);
    const ties = findTies(stats);

    assert(ties.length >= 1, 'Mindestens 1 Gleichstand erwartet');
    const alpBetaTie = ties.find(tie =>
        tie.teams.some(t => t.team === 'Alpha') &&
        tie.teams.some(t => t.team === 'Beta')
    );
    assert(alpBetaTie !== undefined, 'Alpha und Beta sollten als Gleichstand erkannt werden');
});

// 6. findBestGoalDifferenceForTeam
test('findBestGoalDifferenceForTeam — gibt beste Tordifferenz in einem Spiel zurück', () => {
    const matches = [
        makeVorrundeMatch(1, 'Alpha', 6, 'Beta', 1),  // Diff = +5
        makeVorrundeMatch(2, 'Alpha', 4, 'Gamma', 3), // Diff = +1
    ];
    const best = findBestGoalDifferenceForTeam('Alpha', matches, null);
    assertEqual(best, 5, 'Beste Tordifferenz sollte 5 sein');
});

test('findBestGoalDifferenceForTeam — gibt 0 zurück wenn keine Spiele vorhanden', () => {
    const best = findBestGoalDifferenceForTeam('Alpha', [], null);
    assertEqual(best, 0, 'Sollte 0 zurückgeben wenn keine Matches vorhanden');
});

// ─── Zusammenfassung ──────────────────────────────────────────────────────────
console.log(`\n─── Testergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ───`);
if (failed === 0) {
    console.log('✅ Alle Tests bestanden!');
} else {
    console.error(`❌ ${failed} Test(s) fehlgeschlagen.`);
}
