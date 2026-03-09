import dataService, { normalizeData } from '../global/data-service.js';

class KoTournamentModel {
  constructor() {
    this.koMatches = {
      playoff: [],
      quarterfinal: [],
      semifinal: [],
      final: []
    };
    this.currentEditingMatch = null;
  }

  // Daten laden
  async loadData() {
    try {
      const loadedMatches = await dataService.getData('koMatches');
      
      if (loadedMatches) {
        // Normalisiere Datenstruktur (von Firebase oder localStorage)
        const normalized = normalizeData(loadedMatches);
        if (normalized !== loadedMatches) {
          this.koMatches = normalized;
        } else if (loadedMatches.playoff || loadedMatches.quarterfinal ||
                  loadedMatches.semifinal || loadedMatches.final) {
          this.koMatches = loadedMatches;
        }
        
        // Stelle sicher, dass jede Runde ein Array ist
        if (!Array.isArray(this.koMatches.playoff)) this.koMatches.playoff = [];
        if (!Array.isArray(this.koMatches.quarterfinal)) this.koMatches.quarterfinal = [];
        if (!Array.isArray(this.koMatches.semifinal)) this.koMatches.semifinal = [];
        if (!Array.isArray(this.koMatches.final)) this.koMatches.final = [];
        
        // Stelle sicher, dass jedes Match ein teams-Array hat
        this.ensureValidMatches();
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Fehler beim Laden der KO-Matches:', error);
      return false;
    }
  }
  
  // Sicherstellen, dass alle Matches gültige Strukturen haben
  ensureValidMatches() {
    ['playoff', 'quarterfinal', 'semifinal', 'final'].forEach(round => {
      this.koMatches[round].forEach(match => {
        if (!match.teams) {
          match.teams = [
            { name: null, seed: null, score: null },
            { name: null, seed: null, score: null }
          ];
        }
      });
    });
  }

  // Daten speichern
  async saveData() {
    try {
      const success = await dataService.saveData('koMatches', this.koMatches);
      return true;
    } catch (error) {
      console.error('Fehler beim Speichern der KO-Matches:', error);
      return false;
    }
  }

  // Tournament aus Vorrunden-Standings initialisieren
  async initializeFromStandings() {
    try {
      // Vorrunden-Tabelle laden
      let standings = await dataService.getData('vorrundeStandings');
      
      // Normalisieren, falls es ein Array-Wrapper ist
      standings = normalizeData(standings);
      
      if (!standings || !Array.isArray(standings) || standings.length === 0) {
        console.error('Keine Vorrunden-Daten gefunden');
        return false;
      }
      
      // Nach Punkten, Tordifferenz und erzielten Toren sortieren
      standings.sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });
      
      // Mit Freilosen auffüllen, wenn weniger als 12 Teams
      const filledStandings = this.fillWithByes(standings);
      
      // Direktqualifikanten (Platz 1-4)
      const directQualifiers = filledStandings.slice(0, 4);
      
      // Playoff-Teams (Platz 5-12)
      const playoffTeams = filledStandings.slice(4, 12);
      
      // Matches erstellen
      this.koMatches.playoff = this.createPlayoffPairings(playoffTeams);
      this.koMatches.quarterfinal = this.createQuarterfinalPlaceholders(directQualifiers);
      this.koMatches.semifinal = this.createEmptyRound('semifinal', 2);
      this.koMatches.final = this.createEmptyRound('final', 1);
      
      // Tischnummern zuweisen
      this.assignTableNumbers();
      
      // Speichern
      await this.saveData();
      
      return true;
    } catch (error) {
      console.error('Fehler beim Initialisieren der KO-Runde:', error);
      return false;
    }
  }

  // Mit Freilosen auffüllen
  fillWithByes(standings) {
    const filledStandings = [...standings];
    
    // Anzahl der fehlenden Teams berechnen
    const missingTeams = 12 - filledStandings.length;
    
    // Wenn Teams fehlen, Freilose hinzufügen
    if (missingTeams > 0) {
      for (let i = 1; i <= missingTeams; i++) {
        filledStandings.push({
          team: `Freilos ${i}`,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          isFreilos: true
        });
      }
    }
    
    return filledStandings;
  }

  // Playoff-Paarungen erstellen: 5v12, 6v11, 7v10, 8v9
  createPlayoffPairings(playoffTeams) {
    const pairings = [];
    
    // Playoffteams müssen genau 8 sein
    if (playoffTeams.length !== 8) {
      throw new Error(`Ungültige Anzahl an Playoff-Teams: ${playoffTeams.length}`);
    }
    
    const matchups = [
      { index1: 3, index2: 4, seed1: 8, seed2: 9, matchId: 1, nextMatchId: 1 },   // 8 vs 9 -> gegen Platz 1
      { index1: 0, index2: 7, seed1: 5, seed2: 12, matchId: 2, nextMatchId: 2 },  // 5 vs 12 -> gegen Platz 4
      { index1: 2, index2: 5, seed1: 7, seed2: 10, matchId: 3, nextMatchId: 3 },  // 7 vs 10 -> gegen Platz 2
      { index1: 1, index2: 6, seed1: 6, seed2: 11, matchId: 4, nextMatchId: 4 }   // 6 vs 11 -> gegen Platz 3
    ];
    
    // Erstelle die 4 Paarungen
    matchups.forEach(matchup => {
      const team1 = playoffTeams[matchup.index1];
      const team2 = playoffTeams[matchup.index2];
      
      // Freilos-Checks
      let winner = null;
      if (team1.isFreilos && !team2.isFreilos) {
        // Wenn Team1 ein Freilos ist, gewinnt Team2 automatisch
        winner = team2.team;
      } else if (!team1.isFreilos && team2.isFreilos) {
        // Wenn Team2 ein Freilos ist, gewinnt Team1 automatisch
        winner = team1.team;
      }
      
      pairings.push({
        id: `playoff-${matchup.matchId}`,
        round: 'playoff',
        matchNumber: matchup.matchId,
        teams: [
          {
            name: team1.team,
            seed: matchup.seed1,
            score: team1.isFreilos ? 0 : null
          },
          {
            name: team2.team,
            seed: matchup.seed2,
            score: team2.isFreilos ? 0 : null
          }
        ],
        winner: winner,
        nextMatchId: `quarterfinal-${matchup.nextMatchId}`
      });
    });
    
    return pairings;
  }

  // Viertelfinale-Platzhalter mit den direkten Qualifikanten erstellen
  createQuarterfinalPlaceholders(directQualifiers) {
    const matches = [];
    
    // Es müssen genau 4 direkte Qualifikanten sein
    if (directQualifiers.length !== 4) {
      throw new Error(`Ungültige Anzahl an direkten Qualifikanten: ${directQualifiers.length}`);
    }
// Definiere die Zuordnung von Qualifikanten zu Viertelfinals
const qualifierAssignments = [
  { qualifierIndex: 0, seedNumber: 1 }, // Platz 1 ins Viertelfinale 1
  { qualifierIndex: 3, seedNumber: 4 }, // Platz 4 ins Viertelfinale 2
  { qualifierIndex: 1, seedNumber: 2 }, // Platz 2 ins Viertelfinale 3
  { qualifierIndex: 2, seedNumber: 3 }  // Platz 3 ins Viertelfinale 4
];

// Erstelle 4 Viertelfinal-Matches
for (let i = 0; i < 4; i++) {
  const assignment = qualifierAssignments[i];
  const qualifierTeam = directQualifiers[assignment.qualifierIndex];
  
  matches.push({
    id: `quarterfinal-${i+1}`,
    round: 'quarterfinal',
    matchNumber: i + 1,
    teams: [
      {
        name: qualifierTeam.team,
        seed: assignment.seedNumber,
        score: null
      },
      {
        name: "TBA", // TBD from playoff
        seed: null,
        score: null
      }
    ],
    winner: null,
    nextMatchId: i < 2 ? 'semifinal-1' : 'semifinal-2'
  });
}
    
    return matches;
  }

  // Leere Runden erstellen (Halbfinale, Finale)
  createEmptyRound(round, count) {
    const matches = [];
    
    for (let i = 0; i < count; i++) {
      matches.push({
        id: `${round}-${i+1}`,
        round: round,
        matchNumber: i + 1,
        teams: [
          {
            name: null, // TBD
            seed: null,
            score: null
          },
          {
            name: null, // TBD
            seed: null,
            score: null
          }
        ],
        winner: null,
        nextMatchId: round === 'semifinal' ? 'final-1' : null
      });
    }
    
    return matches;
  }

  // Tischnummern zuweisen
  assignTableNumbers() {
    // Tischnummern für jede Runde zuweisen (zyklisch 1-4)
    const assignTableNumbersForRound = (matches, startIndex = 0) => {
      matches.forEach((match, index) => {
        match.tableNumber = ((index + startIndex) % 4) + 1;
      });
    };
    
    // Tischnummern für jede Runde zuweisen
    assignTableNumbersForRound(this.koMatches.playoff);
    assignTableNumbersForRound(this.koMatches.quarterfinal);
    assignTableNumbersForRound(this.koMatches.semifinal);
    assignTableNumbersForRound(this.koMatches.final);
  }

  // Match anhand ID finden
  findMatchById(matchId) {
    // In allen Runden suchen
    for (const round in this.koMatches) {
      if (!Array.isArray(this.koMatches[round])) continue;
      
      const matchIndex = this.koMatches[round].findIndex(m => m && m.id === matchId);
      
      if (matchIndex !== -1) {
        return {
          round,
          index: matchIndex,
          match: this.koMatches[round][matchIndex]
        };
      }
    }
    
    return null;
  }

  // Mapping für Viertelfinale zu Halbfinale
  getQFtoSFMapping() {
    return {
      'quarterfinal-1': { sfId: 'semifinal-1', position: 0 },
      'quarterfinal-2': { sfId: 'semifinal-1', position: 1 },
      'quarterfinal-3': { sfId: 'semifinal-2', position: 0 },
      'quarterfinal-4': { sfId: 'semifinal-2', position: 1 }
    };
  }

  // Ergebnis eines Matches speichern
  async saveMatchResult(matchId, team1Score, team2Score) {
    // Aktuelles Match für die Nachverfolgung speichern
    this.currentEditingMatch = matchId;
    
    // Match finden
    const matchInfo = this.findMatchById(matchId);
    if (!matchInfo) {
      console.error(`Match mit ID ${matchId} nicht gefunden`);
      return false;
    }
    
    const { match } = matchInfo;
    
    // Ergebnisse speichern
    match.teams[0].score = team1Score;
    match.teams[1].score = team2Score;
    
    // Sieger ermitteln
    const winnerIndex = team1Score > team2Score ? 0 : 1;
    match.winner = match.teams[winnerIndex].name;
    
    // Nächstes Match aktualisieren, falls vorhanden
    if (match.nextMatchId) {
      this.updateNextMatch(match.nextMatchId, match.winner, match.teams[winnerIndex].seed);
    }
    
    // Änderungen speichern
    await this.saveData();
    
    // Zurücksetzen der Variable
    this.currentEditingMatch = null;
    
    return true;
  }

  // Nächstes Match mit dem Sieger aktualisieren
  updateNextMatch(nextMatchId, winnerName, winnerSeed) {
    // Nächstes Match finden
    const nextMatchInfo = this.findMatchById(nextMatchId);
    if (!nextMatchInfo) {
      console.error(`Nächstes Match mit ID ${nextMatchId} nicht gefunden`);
      return;
    }
    
    const { round, match: nextMatch } = nextMatchInfo;
    
    // Aktuelles Match-ID speichern
    
    let teamIndex = 0;
    
    if (round === 'quarterfinal') {
      // In Viertelfinale ist ein Team immer bereits ein direkter Qualifikant
      // Daher kommt der Playoff-Sieger immer auf Position 1
      teamIndex = 1;
    } else if (round === 'semifinal') {
      // SPEZIELLE LOGIK FÜR VIERTELFINALE ZU HALBFINALE
      if (this.currentEditingMatch && this.currentEditingMatch.startsWith('quarterfinal-')) {
        // Verwende das Mapping für die feste Zuordnung
        const QF_TO_SF_MAPPING = this.getQFtoSFMapping();
        const mapping = QF_TO_SF_MAPPING[this.currentEditingMatch];
        if (mapping && mapping.sfId === nextMatchId) {
          teamIndex = mapping.position;
        } else {
          // Fallback: Prüfe, ob Position 0 bereits belegt ist
          teamIndex = nextMatch.teams[0].name !== null ? 1 : 0;
        }
      } else {
        // Fallback: Prüfe, ob Position 0 bereits belegt ist
        teamIndex = nextMatch.teams[0].name !== null ? 1 : 0;
      }
    } else if (round === 'final') {
      // Für Halbfinale zu Finale:
      if (this.currentEditingMatch && this.currentEditingMatch.startsWith('semifinal-')) {
        const sfNumber = parseInt(this.currentEditingMatch.split('-')[1]);
        teamIndex = sfNumber - 1; // SF1 -> Position 0, SF2 -> Position 1
      } else {
        // Fallback
        teamIndex = nextMatch.teams[0].name !== null ? 1 : 0;
      }
    }
    
    // Sieger ins nächste Match eintragen mit Quell-ID
    nextMatch.teams[teamIndex] = {
      name: winnerName,
      seed: winnerSeed,
      score: null,
      sourceMatchId: this.currentEditingMatch // Speichert, woher das Team kommt
    };
  }

  // Ergebnis eines Matches zurücksetzen
  async resetMatchResult(matchId) {
    // Aktuelles Match für die Nachverfolgung speichern
    this.currentEditingMatch = matchId;
    
    // Match finden
    const matchInfo = this.findMatchById(matchId);
    if (!matchInfo) {
      console.error(`Match mit ID ${matchId} nicht gefunden`);
      return false;
    }
    
    const { match } = matchInfo;
    
    // Speicher den aktuellen Sieger, bevor wir zurücksetzen
    const currentWinner = match.winner;
    
    // Ergebnisse zurücksetzen
    match.teams[0].score = null;
    match.teams[1].score = null;
    
    // Wenn es einen Sieger gab, setze Folgerunden zurück
    if (currentWinner) {
      // Winner erst NACH dem Aufruf von resetDependentMatches zurücksetzen,
      // damit wir den richtigen Sieger finden können
      this.resetDependentMatches(matchId);
      match.winner = null;
    }
    
    // Änderungen speichern
    await this.saveData();
    
    // Zurücksetzen der Variable
    this.currentEditingMatch = null;
    
    return true;
  }

  // Abhängige Matches zurücksetzen
  resetDependentMatches(matchId) {
    
    // Match finden
    const matchInfo = this.findMatchById(matchId);
    if (!matchInfo || !matchInfo.match.nextMatchId) return;
    
    const { match } = matchInfo;
    const nextMatchId = match.nextMatchId;
    
    // Nächstes Match finden
    const nextMatchInfo = this.findMatchById(nextMatchId);
    if (!nextMatchInfo) return;
    
    const { match: nextMatch } = nextMatchInfo;
    
    // METHODE 1: Nach sourceMatchId suchen (wenn vorhanden)
    let foundIndex = -1;
    nextMatch.teams.forEach((team, idx) => {
      if (team && team.sourceMatchId === matchId) {
        foundIndex = idx;
      }
    });
    
    // METHODE 2: Nach Siegernamen suchen (falls keine sourceMatchId)
    if (foundIndex === -1 && match.winner) {
      nextMatch.teams.forEach((team, idx) => {
        if (team && team.name === match.winner) {
          foundIndex = idx;
        }
      });
    }
    
    // METHODE 3: Für Viertelfinale das feste Mapping nutzen
    if (foundIndex === -1 && matchId.startsWith('quarterfinal-')) {
      const QF_TO_SF_MAPPING = this.getQFtoSFMapping();
      const mapping = QF_TO_SF_MAPPING[matchId];
      if (mapping && mapping.sfId === nextMatchId) {
        foundIndex = mapping.position;
      }
    }
    
    // Team zurücksetzen, wenn gefunden
    if (foundIndex !== -1) {
      nextMatch.teams[foundIndex] = {
        name: null,
        seed: null,
        score: null
      };
      
      // Wenn das nächste Match einen Sieger hatte, auch diesen zurücksetzen
      if (nextMatch.winner !== null) {
        nextMatch.winner = null;
        nextMatch.teams.forEach(team => {
          if (team) team.score = null;
        });
        
        // Rekursiv weitergehen
        this.resetDependentMatches(nextMatchId);
      }
    } else {
      console.error(`Konnte kein zu resettendes Team finden in ${nextMatchId}`);
    }
  }

  // KO-Runde zurücksetzen
  async resetKoRunde() {
    // Daten zurücksetzen
    this.koMatches = {
      playoff: [],
      quarterfinal: [],
      semifinal: [],
      final: []
    };
    
    // Speichern
    await this.saveData();
    
    return true;
  }

  // Prüfen, ob ein Turniersieger feststeht
  hasWinner() {
    return this.koMatches.final.length > 0 && this.koMatches.final[0].winner;
  }

  // Turniersieger abrufen
  getWinner() {
    if (this.hasWinner()) {
      return this.koMatches.final[0].winner;
    }
    return null;
  }

  // Prüfen, ob die KO-Runde initialisiert ist
  isInitialized() {
    return this.koMatches.playoff.length > 0 || this.koMatches.quarterfinal.length > 0;
  }
}

export default KoTournamentModel;