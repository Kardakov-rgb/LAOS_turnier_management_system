/**
 * calculation-module.js
 * Modul zur Berechnung von Statistiken aus den Spieldaten
 */

import { normalizeData } from '../global/data-service.js';

// ─── Turnier-Konstanten ───────────────────────────────────────────────────────
const BEER_PER_GOAL_ML = 110;     // Bier pro Tor in Milliliter (Beer Pong Regel)
const FINALE_GOAL_BASELINE = 10;  // Maximale Tore im Finale (für Bier-Berechnung)
const AVG_GOALS_BASELINE = 6;     // Durchschnittliche Tore pro Spiel (Basislinie)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Berechnet die Team-Statistiken aus Vorrunde und KO-Runde
 * @param {Array} teams - Alle Teams im Turnier
 * @param {Array} vorrundeMatches - Matches aus der Vorrunde
 * @param {Object} koMatches - Matches aus den KO-Runden
 * @returns {Array} - Berechnete Team-Statistiken
 */
export function calculateTeamStatistics(teams, vorrundeMatches, koMatches) {
  // Statistik-Objekte für jedes Team initialisieren
  const teamStats = teams.map(team => createEmptyTeamStat(team));

  // Vorrunden-Matches verarbeiten
  processVorrundeMatches(teamStats, vorrundeMatches);
  
  // Normalisiere koMatches, falls es als Firebase-Array kommt
  const normalizedKoMatches = normalizeData(koMatches);
  
  // KO-Runden-Matches verarbeiten
  processKORoundMatches(teamStats, normalizedKoMatches);
  
  // Tordifferenzen berechnen
  calculateGoalDifferences(teamStats);
  
  // Bier-Berechnungen durchführen
  calculateBeerStatistics(teamStats, normalizedKoMatches);
  
  return teamStats;
}

/**
 * Erstellt ein leeres Statistik-Objekt für ein Team
 * @param {string} team - Teamname
 * @returns {Object} - Leeres Statistik-Objekt
 */
function createEmptyTeamStat(team) {
  return {
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
    isFinalWinner: false,
    isFinalLoser: false,
    // Bier-Berechnungen
    beerDrunk: {
      all: 0,
      vorrunde: 0,
      ko: 0,
      forGoalsConceded: 0,
      forLosses: 0
    },
    beerGiven: {
      all: 0,
      vorrunde: 0,
      ko: 0,
      forGoalsScored: 0,
      forWins: 0
    },
    beerBalance: {
      all: 0,
      vorrunde: 0,
      ko: 0
    }
  };
}

/**
 * Verarbeitet die Vorrunden-Matches
 * @param {Array} teamStats - Team-Statistiken
 * @param {Array} vorrundeMatches - Vorrunden-Matches
 */
function processVorrundeMatches(teamStats, vorrundeMatches) {
  if (!Array.isArray(vorrundeMatches)) {
    console.warn('Vorrunden-Matches sind kein Array oder nicht vorhanden');
    return;
  }

  vorrundeMatches.forEach(match => {
    // Nur gespielte Matches berücksichtigen
    if (!match.played) return;
    
    const team1Index = findTeamIndex(teamStats, match.team1);
    const team2Index = findTeamIndex(teamStats, match.team2);
    
    if (team1Index === -1 || team2Index === -1) {
      console.warn(`Teams für Match nicht gefunden: ${match.team1} vs ${match.team2}`);
      return;
    }
    
    // Anzahl der Spiele erhöhen
    teamStats[team1Index].matches.all++;
    teamStats[team1Index].matches.vorrunde++;
    teamStats[team2Index].matches.all++;
    teamStats[team2Index].matches.vorrunde++;
    
    // Tore hinzufügen
    teamStats[team1Index].goalsScored.all += match.score1;
    teamStats[team1Index].goalsScored.vorrunde += match.score1;
    teamStats[team1Index].goalsConceded.all += match.score2;
    teamStats[team1Index].goalsConceded.vorrunde += match.score2;
    
    teamStats[team2Index].goalsScored.all += match.score2;
    teamStats[team2Index].goalsScored.vorrunde += match.score2;
    teamStats[team2Index].goalsConceded.all += match.score1;
    teamStats[team2Index].goalsConceded.vorrunde += match.score1;
    
    // Sieg/Niederlage/Unentschieden
    if (match.score1 > match.score2) {
      // Team 1 gewinnt
      teamStats[team1Index].wins.all++;
      teamStats[team1Index].wins.vorrunde++;
      teamStats[team2Index].losses.all++;
      teamStats[team2Index].losses.vorrunde++;
    } else if (match.score1 < match.score2) {
      // Team 2 gewinnt
      teamStats[team1Index].losses.all++;
      teamStats[team1Index].losses.vorrunde++;
      teamStats[team2Index].wins.all++;
      teamStats[team2Index].wins.vorrunde++;
    } else {
      // Unentschieden
      teamStats[team1Index].draws.all++;
      teamStats[team1Index].draws.vorrunde++;
      teamStats[team2Index].draws.all++;
      teamStats[team2Index].draws.vorrunde++;
    }
  });
}

/**
 * Verarbeitet die KO-Runden-Matches
 * @param {Array} teamStats - Team-Statistiken
 * @param {Object} koMatches - KO-Runden-Matches
 */
function processKORoundMatches(teamStats, koMatches) {
  // Prüfe, ob koMatches vorhanden ist und die erwartete Struktur hat
  if (!koMatches) {
    console.warn('Keine KO-Matches vorhanden');
    return;
  }

  // Alle KO-Runden durchgehen
  const rounds = ['playoff', 'quarterfinal', 'semifinal', 'final'];

  rounds.forEach(round => {
    // Prüfe, ob diese Runde existiert
    if (!koMatches[round] || !Array.isArray(koMatches[round])) {
      return;
    }
    
    koMatches[round].forEach(match => {
      // Validiere Match-Struktur
      if (!match || typeof match !== 'object') {
        console.warn(`Ungültiges Match in Runde ${round}:`, match);
        return;
      }
      
      // Prüfe, ob es ein Gewinner-Feld gibt
      if (!match.winner) {
        console.warn(`Match ohne Gewinner in Runde ${round}:`, match);
        return;
      }
      
      // Prüfe, ob teams-Array vorhanden ist
      if (!match.teams || !Array.isArray(match.teams) || match.teams.length < 2) {
        console.warn(`Match ohne gültiges teams-Array in Runde ${round}:`, match);
        return;
      }
      
      // Prüfe, ob die Teams Namen und Scores haben
      if (match.teams.some(team => !team || !team.name || team.score === null || team.score === undefined)) {
        console.warn(`Teams ohne Namen oder Scores in Runde ${round}:`, match);
        return;
      }
      
      // Beide Teams und deren Scores extrahieren
      const team1 = match.teams[0];
      const team2 = match.teams[1];
      
      const team1Index = findTeamIndex(teamStats, team1.name);
      const team2Index = findTeamIndex(teamStats, team2.name);
      
      if (team1Index === -1 || team2Index === -1) {
        console.warn(`Teams für KO-Match nicht gefunden: ${team1.name} vs ${team2.name}`);
        return;
      }
      
      // Anzahl der Spiele erhöhen
      teamStats[team1Index].matches.all++;
      teamStats[team1Index].matches.ko++;
      teamStats[team2Index].matches.all++;
      teamStats[team2Index].matches.ko++;
      
      // Tore hinzufügen
      teamStats[team1Index].goalsScored.all += team1.score;
      teamStats[team1Index].goalsScored.ko += team1.score;
      teamStats[team1Index].goalsConceded.all += team2.score;
      teamStats[team1Index].goalsConceded.ko += team2.score;
      
      teamStats[team2Index].goalsScored.all += team2.score;
      teamStats[team2Index].goalsScored.ko += team2.score;
      teamStats[team2Index].goalsConceded.all += team1.score;
      teamStats[team2Index].goalsConceded.ko += team1.score;
      
      // Sieg/Niederlage
      if (match.winner === team1.name) {
        // Team 1 gewinnt
        teamStats[team1Index].wins.all++;
        teamStats[team1Index].wins.ko++;
        teamStats[team2Index].losses.all++;
        teamStats[team2Index].losses.ko++;
        
        // Finalsieger/verlierer markieren
        if (round === 'final') {
          teamStats[team1Index].isFinalWinner = true;
          teamStats[team2Index].isFinalLoser = true;
        }
      } else if (match.winner === team2.name) {
        // Team 2 gewinnt
        teamStats[team2Index].wins.all++;
        teamStats[team2Index].wins.ko++;
        teamStats[team1Index].losses.all++;
        teamStats[team1Index].losses.ko++;
        
        // Finalsieger/verlierer markieren
        if (round === 'final') {
          teamStats[team2Index].isFinalWinner = true;
          teamStats[team1Index].isFinalLoser = true;
        }
      }
    });
  });
}

/**
 * Berechnet die Tordifferenzen für alle Teams
 * @param {Array} teamStats - Team-Statistiken
 */
function calculateGoalDifferences(teamStats) {
  teamStats.forEach(team => {
    team.goalDifference.all = team.goalsScored.all - team.goalsConceded.all;
    team.goalDifference.vorrunde = team.goalsScored.vorrunde - team.goalsConceded.vorrunde;
    team.goalDifference.ko = team.goalsScored.ko - team.goalsConceded.ko;
  });
}

/**
 * Berechnet die Bier-Statistiken für jedes Team
 * @param {Array} teamStats - Team-Statistiken
 * @param {Object} koMatches - KO-Runden-Matches für Finale-Spezialfälle
 */
function calculateBeerStatistics(teamStats, koMatches) {
  teamStats.forEach(teamStat => {
    // Bier für Vorrunde Tore: BEER_PER_GOAL_ML pro Tor (gegeben und getrunken)
    teamStat.beerGiven.vorrunde = teamStat.goalsScored.vorrunde * BEER_PER_GOAL_ML;
    teamStat.beerDrunk.vorrunde = teamStat.goalsConceded.vorrunde * BEER_PER_GOAL_ML;

    // Bier für KO-Runde Tore: BEER_PER_GOAL_ML pro Tor (gegeben und getrunken)
    teamStat.beerGiven.ko = teamStat.goalsScored.ko * BEER_PER_GOAL_ML;
    teamStat.beerDrunk.ko = teamStat.goalsConceded.ko * BEER_PER_GOAL_ML;

    // Bier für Siege und Niederlagen berechnen - für Vorrunde
    // Vereinfachte Berechnung: (AVG_GOALS_BASELINE - Gegentore) * BEER_PER_GOAL_ML pro Sieg
    const avgGoalsConcededPerMatchVorrunde = teamStat.matches.vorrunde > 0 ?
      teamStat.goalsConceded.vorrunde / teamStat.matches.vorrunde : 0;

    const beerForVorrundeWins = teamStat.wins.vorrunde * Math.max(0, (AVG_GOALS_BASELINE - avgGoalsConcededPerMatchVorrunde) * BEER_PER_GOAL_ML);
    teamStat.beerGiven.vorrunde += beerForVorrundeWins;

    // Bier für Niederlagen in der Vorrunde
    const avgGoalsScoredPerMatchVorrunde = teamStat.matches.vorrunde > 0 ?
      teamStat.goalsScored.vorrunde / teamStat.matches.vorrunde : 0;

    const beerForVorrundeLosses = teamStat.losses.vorrunde * Math.max(0, (AVG_GOALS_BASELINE - avgGoalsScoredPerMatchVorrunde) * BEER_PER_GOAL_ML);
    teamStat.beerDrunk.vorrunde += beerForVorrundeLosses;

    // Bier für Siege und Niederlagen in der KO-Runde
    // Vereinfachte Berechnung: (AVG_GOALS_BASELINE - Gegentore) * BEER_PER_GOAL_ML pro Sieg
    const avgGoalsConcededPerMatchKo = teamStat.matches.ko > 0 ?
      teamStat.goalsConceded.ko / teamStat.matches.ko : 0;

    const beerForKoWins = teamStat.wins.ko * Math.max(0, (AVG_GOALS_BASELINE - avgGoalsConcededPerMatchKo) * BEER_PER_GOAL_ML);
    teamStat.beerGiven.ko += beerForKoWins;

    // Bier für Niederlagen in der KO-Runde
    const avgGoalsScoredPerMatchKo = teamStat.matches.ko > 0 ?
      teamStat.goalsScored.ko / teamStat.matches.ko : 0;

    const beerForKoLosses = teamStat.losses.ko * Math.max(0, (AVG_GOALS_BASELINE - avgGoalsScoredPerMatchKo) * BEER_PER_GOAL_ML);
    teamStat.beerDrunk.ko += beerForKoLosses;

    // Finale-Spezialfall: (FINALE_GOAL_BASELINE - Gegentore) * BEER_PER_GOAL_ML für den Sieger
    // (FINALE_GOAL_BASELINE - eigene Tore) * BEER_PER_GOAL_ML für den Verlierer
    const isFinalTeam = teamStat.isFinalWinner || teamStat.isFinalLoser;
    if (isFinalTeam && koMatches && koMatches.final && koMatches.final.length > 0) {
      const finalMatch = koMatches.final[0];
      if (finalMatch && finalMatch.teams && finalMatch.teams.length === 2) {
        const isTeam1 = finalMatch.teams[0].name === teamStat.team;
        const isTeam2 = finalMatch.teams[1].name === teamStat.team;

        if (isTeam1 || isTeam2) {
          const teamIndex = isTeam1 ? 0 : 1;
          const opponentIndex = teamIndex === 0 ? 1 : 0;

          if (teamStat.isFinalWinner) {
            // Sieger bekommt zusätzliches Bier: (FINALE_GOAL_BASELINE - Gegentore) * BEER_PER_GOAL_ML
            const extraBeer = Math.max(0, (FINALE_GOAL_BASELINE - finalMatch.teams[opponentIndex].score) * BEER_PER_GOAL_ML);
            teamStat.beerGiven.ko += extraBeer;
          } else if (teamStat.isFinalLoser) {
            // Verlierer trinkt zusätzliches Bier: (FINALE_GOAL_BASELINE - eigene Tore) * BEER_PER_GOAL_ML
            const extraBeer = Math.max(0, (FINALE_GOAL_BASELINE - finalMatch.teams[teamIndex].score) * BEER_PER_GOAL_ML);
            teamStat.beerDrunk.ko += extraBeer;
          }
        }
      }
    }
    
    // Gesamtsummen berechnen
    teamStat.beerGiven.all = teamStat.beerGiven.vorrunde + teamStat.beerGiven.ko;
    teamStat.beerDrunk.all = teamStat.beerDrunk.vorrunde + teamStat.beerDrunk.ko;
    
    // Bier-Bilanz für jede Phase
    teamStat.beerBalance.all = teamStat.beerGiven.all - teamStat.beerDrunk.all;
    teamStat.beerBalance.vorrunde = teamStat.beerGiven.vorrunde - teamStat.beerDrunk.vorrunde;
    teamStat.beerBalance.ko = teamStat.beerGiven.ko - teamStat.beerDrunk.ko;
  });
}

/**
 * Findet den Index eines Teams im teamStats-Array
 * @param {Array} teamStats - Team-Statistiken
 * @param {string} teamName - Zu findender Teamname
 * @returns {number} - Index des Teams oder -1 wenn nicht gefunden
 */
function findTeamIndex(teamStats, teamName) {
  return teamStats.findIndex(stat => stat.team === teamName);
}

/**
 * Sortiert die Team-Statistiken nach der angegebenen Spalte und Reihenfolge
 * @param {Array} stats - Team-Statistiken
 * @param {string} sortCol - Spalte, nach der sortiert werden soll
 * @param {string} sortOrder - Sortierreihenfolge ('asc' oder 'desc')
 * @param {string} phase - Die Phase (all, vorrunde, ko)
 * @returns {Array} - Sortierte Team-Statistiken
 */
export function sortTeamStats(stats, sortCol, sortOrder, phase) {
  return [...stats].sort((a, b) => {
    let comparison = 0;
    
    switch (sortCol) {
      case 'team':
        comparison = a.team.localeCompare(b.team);
        break;
      case 'matches':
        comparison = a.matches[phase] - b.matches[phase];
        break;
      case 'wins':
        comparison = a.wins[phase] - b.wins[phase];
        break;
      case 'draws':
        comparison = a.draws[phase] - b.draws[phase];
        break;
      case 'losses':
        comparison = a.losses[phase] - b.losses[phase];
        break;
      case 'goals':
        // Primär nach erzielten Toren sortieren
        comparison = a.goalsScored[phase] - b.goalsScored[phase];
        break;
      case 'goalDifference':
        comparison = a.goalDifference[phase] - b.goalDifference[phase];
        break;
      case 'beerGiven':
        comparison = a.beerGiven[phase] - b.beerGiven[phase];
        break;
      case 'beerDrunk':
        comparison = a.beerDrunk[phase] - b.beerDrunk[phase];
        break;
      case 'beerBalance':
        comparison = a.beerBalance[phase] - b.beerBalance[phase];
        break;
      default:
        comparison = 0;
    }
    
    // Je nach Sortierrichtung Vergleich umkehren
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

/**
 * Findet die beste Tordifferenz eines Teams in einem einzelnen Spiel
 * @param {string} teamName - Teamname
 * @param {Array} vorrundeMatches - Vorrunden-Matches
 * @param {Object} koMatches - KO-Runden-Matches
 * @returns {number} - Beste Tordifferenz
 */
export function findBestGoalDifferenceForTeam(teamName, vorrundeMatches, koMatches) {
  let bestDiff = -Infinity;
  
  // Alle Spiele des Teams holen
  const teamMatches = getAllMatchesForTeam(teamName, vorrundeMatches, koMatches);
  
  // Durch alle Spiele gehen und beste Differenz finden
  teamMatches.forEach(match => {
    if (match.goalDiff > bestDiff) {
      bestDiff = match.goalDiff;
    }
  });
  
  return bestDiff === -Infinity ? 0 : bestDiff;
}

/**
 * Sammelt alle Spiele eines Teams aus Vorrunde und KO-Runde
 * @param {string} teamName - Teamname
 * @param {Array} vorrundeMatches - Vorrunden-Matches
 * @param {Object} koMatches - KO-Runden-Matches
 * @returns {Array} - Alle Spiele des Teams
 */
export function getAllMatchesForTeam(teamName, vorrundeMatches, koMatches) {
  const allMatches = [];
  
  // Normalisierung von koMatches, falls es vom Firebase-Format kommt
  const normalizedKoMatches = normalizeData(koMatches);
  
  // Vorrunden-Matches
  if (Array.isArray(vorrundeMatches)) {
    vorrundeMatches.forEach(match => {
      if (!match.played) return;
      
      if (match.team1 === teamName || match.team2 === teamName) {
        const isTeam1 = match.team1 === teamName;
        const opponent = isTeam1 ? match.team2 : match.team1;
        const ownScore = isTeam1 ? match.score1 : match.score2;
        const opponentScore = isTeam1 ? match.score2 : match.score1;
        
        // Bier-Berechnung für dieses Spiel
        const beerGiven = ownScore * BEER_PER_GOAL_ML;
        const beerDrunk = opponentScore * BEER_PER_GOAL_ML;

        // Zusätzliches Bier für Sieg/Niederlage
        let additionalBeerGiven = 0;
        let additionalBeerDrunk = 0;

        if (ownScore > opponentScore) {
          // Sieg: (AVG_GOALS_BASELINE - Gegentore) * BEER_PER_GOAL_ML
          additionalBeerGiven = Math.max(0, (AVG_GOALS_BASELINE - opponentScore) * BEER_PER_GOAL_ML);
        } else if (ownScore < opponentScore) {
          // Niederlage: (AVG_GOALS_BASELINE - eigene Tore) * BEER_PER_GOAL_ML
          additionalBeerDrunk = Math.max(0, (AVG_GOALS_BASELINE - ownScore) * BEER_PER_GOAL_ML);
        }
        
        allMatches.push({
          type: 'vorrunde',
          round: match.round,
          opponent,
          ownScore,
          opponentScore,
          isWin: ownScore > opponentScore,
          isDraw: ownScore === opponentScore,
          isLoss: ownScore < opponentScore,
          goalDiff: ownScore - opponentScore,
          beerGiven: beerGiven + additionalBeerGiven,
          beerDrunk: beerDrunk + additionalBeerDrunk,
          beerBalance: (beerGiven + additionalBeerGiven) - (beerDrunk + additionalBeerDrunk)
        });
      }
    });
  }
  
  // KO-Runden-Matches
  if (normalizedKoMatches) {
    ['playoff', 'quarterfinal', 'semifinal', 'final'].forEach(round => {
      if (!normalizedKoMatches[round] || !Array.isArray(normalizedKoMatches[round])) return;
      
      normalizedKoMatches[round].forEach(match => {
        // Validiere Match-Struktur
        if (!match || !match.teams || !Array.isArray(match.teams) || !match.winner) {
          return;
        }
        
        // Prüfen, ob die Teams Namen und Scores haben
        if (match.teams.some(team => !team || !team.name || team.score === null || team.score === undefined)) {
          return;
        }
        
        // Prüfen, ob das Team in diesem Match gespielt hat
        const team1Index = match.teams.findIndex(t => t.name === teamName);
        if (team1Index === -1) return;
        
        const team2Index = team1Index === 0 ? 1 : 0;
        if (team2Index >= match.teams.length) return; // Sicherheitsprüfung
        
        const opponent = match.teams[team2Index].name;
        const ownScore = match.teams[team1Index].score;
        const opponentScore = match.teams[team2Index].score;
        
        // Bier-Berechnung für KO-Spiel
        const beerGiven = ownScore * BEER_PER_GOAL_ML;
        const beerDrunk = opponentScore * BEER_PER_GOAL_ML;

        // Zusätzliches Bier für Sieg/Niederlage
        let additionalBeerGiven = 0;
        let additionalBeerDrunk = 0;

        if (match.winner === teamName) {
          // Sieg: (AVG_GOALS_BASELINE - Gegentore) * BEER_PER_GOAL_ML
          additionalBeerGiven = Math.max(0, (AVG_GOALS_BASELINE - opponentScore) * BEER_PER_GOAL_ML);

          // Finale: Zusätzliches Bier für den Sieger
          if (round === 'final') {
            additionalBeerGiven += Math.max(0, (FINALE_GOAL_BASELINE - opponentScore) * BEER_PER_GOAL_ML);
          }
        } else {
          // Niederlage: (AVG_GOALS_BASELINE - eigene Tore) * BEER_PER_GOAL_ML
          additionalBeerDrunk = Math.max(0, (AVG_GOALS_BASELINE - ownScore) * BEER_PER_GOAL_ML);

          // Finale: Zusätzliches Bier für den Verlierer
          if (round === 'final') {
            additionalBeerDrunk += Math.max(0, (FINALE_GOAL_BASELINE - ownScore) * BEER_PER_GOAL_ML);
          }
        }
        
        allMatches.push({
          type: 'ko',
          round,
          opponent,
          ownScore,
          opponentScore,
          isWin: match.winner === teamName,
          isDraw: false, // In KO-Runde gibt es keine Unentschieden
          isLoss: match.winner !== teamName,
          goalDiff: ownScore - opponentScore,
          beerGiven: beerGiven + additionalBeerGiven,
          beerDrunk: beerDrunk + additionalBeerDrunk,
          beerBalance: (beerGiven + additionalBeerGiven) - (beerDrunk + additionalBeerDrunk)
        });
      });
    });
  }
  
  // Nach Datum/ID sortieren
  allMatches.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'vorrunde' ? -1 : 1;
    }
    
    if (a.type === 'vorrunde') {
      return a.round - b.round;
    }
    
    // KO-Runden nach Runde sortieren
    const rounds = ['playoff', 'quarterfinal', 'semifinal', 'final'];
    return rounds.indexOf(a.round) - rounds.indexOf(b.round);
  });
  
  return allMatches;
}

/**
 * Findet Gleichstände in der Tabelle
 * @param {Array} sortedStandings - Sortierte Tabelle
 * @returns {Array} - Array mit Gleichständen
 */
export function findTies(sortedStandings) {
  // Gruppiere Teams nach ihren Sortierkriterien
  const teamsByValues = {};
  
  sortedStandings.forEach(team => {
    // Erstelle einen Schlüssel aus den Sortierkriterien
    const key = `${team.points.all}-${team.goalDifference.all}-${team.goalsScored.all}`;
    
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
        id: tieId,
        result: null // wird später gefüllt, wenn Golden Cup-Ergebnisse verfügbar sind
      });
    }
  }
  
  return ties;
}