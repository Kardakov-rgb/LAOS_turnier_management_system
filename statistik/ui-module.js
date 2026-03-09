/**
 * ui-module.js
 * Modul für alle UI-bezogenen Funktionen, getrennt nach den verschiedenen Ansichten
 */

import { sortTeamStats, findBestGoalDifferenceForTeam, getAllMatchesForTeam, findTies } from './calculation-module.js';

/**
 * Hauptmodul für die Tabelle
 */
export const tableUI = {
  /**
   * Aktualisiert die Sortierungs-Indikatoren in den Tabellenspalten
   * @param {string} sortCol - Spalte, nach der sortiert wird
   * @param {string} sortOrder - Sortierreihenfolge ('asc' oder 'desc')
   */
  updateSortIndicators(sortCol, sortOrder) {
    console.log('Aktualisiere Sortierungs-Indikatoren:', {
      column: sortCol,
      order: sortOrder
    });
    
    // Alle sortierbaren Spalten auswählen
    const sortableCols = document.querySelectorAll('.sort-col');
    
    // Alle Sortierungsklassen entfernen
    sortableCols.forEach(col => {
      col.classList.remove('asc', 'desc', 'active');
    });
    
    // Aktuelle Sortierungsspalte finden und Klasse hinzufügen
    const currentSortHeader = document.querySelector(`.sort-col[data-sort="${sortCol}"]`);
    if (currentSortHeader) {
      currentSortHeader.classList.add(sortOrder);
      currentSortHeader.classList.add('active'); // Markiert die Spalte als aktiv
    }
  },
  
  /**
   * Rendert die Team-Statistiken in die Tabelle
   * @param {Array} teamStats - Team-Statistiken
   * @param {string} sortCol - Spalte, nach der sortiert wird
   * @param {string} sortOrder - Sortierreihenfolge ('asc' oder 'desc')
   * @param {string} phase - Die Phase (all, vorrunde, ko)
   */
  renderTeamStats(teamStats, sortCol, sortOrder, phase) {
    // Team-Statistiken sortieren
    const sortedStats = sortTeamStats(teamStats, sortCol, sortOrder, phase);
    
    // Tabellenkörper referenzieren
    const teamStatsBody = document.getElementById('team-stats-body');
    
    // Prüfen, ob teamStatsBody existiert, falls nicht, Tabelle neu erstellen
    if (!teamStatsBody) {
      console.error('teamStatsBody nicht gefunden!');
      return;
    }
    
    // Tabelle leeren
    teamStatsBody.innerHTML = '';
    
    // Tabelle mit Daten füllen
    sortedStats.forEach((stat, index) => {
      const row = document.createElement('tr');
      
      // Medaillen-Klassen für die ersten drei Plätze
      if (index === 0) {
        row.classList.add('medal-gold');
      } else if (index === 1) {
        row.classList.add('medal-silver');
      } else if (index === 2) {
        row.classList.add('medal-bronze');
      }
      
      // Bier-Bilanz
      const beerBalance = stat.beerBalance[phase];
      const balanceClass = beerBalance > 0 ? 'positive' : (beerBalance < 0 ? 'negative' : 'neutral');
      
      // Tore kombiniert darstellen als "ErzielteTore:Gegentore"
      const goalsDisplay = `${stat.goalsScored[phase]}:${stat.goalsConceded[phase]}`;
      
      row.innerHTML = `
        <td class="pos-col">${index + 1}</td>
        <td class="team-name">${stat.team}</td>
        <td>${stat.matches[phase]}</td>
        <td>${stat.wins[phase]}</td>
        <td>${stat.draws[phase]}</td>
        <td>${stat.losses[phase]}</td>
        <td>${goalsDisplay}</td>
        <td>${stat.goalDifference[phase] > 0 ? '+' : ''}${stat.goalDifference[phase]}</td>
        <td>${(stat.beerGiven[phase] / 1000).toFixed(1)} L</td>
        <td>${(stat.beerDrunk[phase] / 1000).toFixed(1)} L</td>
        <td class="beer-balance ${balanceClass}">${beerBalance > 0 ? '+' : ''}${(beerBalance / 1000).toFixed(1)} L</td>
      `;
      
      teamStatsBody.appendChild(row);
    });
  },
  
  /**
   * Erstellt die Statistik-Tabelle dynamisch mit verbesserter Sortierung
   * @returns {HTMLElement} - Tabellenkörper-Element
   */
  createStatsTable() {
    // Container leeren
    const statsTableContainer = document.querySelector('.stats-table-container');
    if (!statsTableContainer) {
      console.error('Tabellen-Container nicht gefunden');
      return null;
    }
    
    statsTableContainer.innerHTML = '';
    
    // Neue Tabelle erstellen
    const table = document.createElement('table');
    table.id = 'team-stats-table';
    table.className = 'stats-table sortable';
    
    // Tabellenkopf erstellen
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th class="pos-col">Platz</th>
        <th class="team-col">Team</th>
        <th class="sort-col" data-sort="matches">Sp</th>
        <th class="sort-col" data-sort="wins">S</th>
        <th class="sort-col" data-sort="draws">U</th>
        <th class="sort-col" data-sort="losses">N</th>
        <th class="sort-col" data-sort="goals">Tore</th>
        <th class="sort-col" data-sort="goalDifference">Diff</th>
        <th class="sort-col" data-sort="beerGiven">Verteilt</th>
        <th class="sort-col" data-sort="beerDrunk">Getrunken</th>
        <th class="sort-col" data-sort="beerBalance">Bier-Bilanz</th>
      </tr>
    `;
    table.appendChild(thead);
    
    // Tabellenkörper erstellen
    const tbody = document.createElement('tbody');
    tbody.id = 'team-stats-body';
    table.appendChild(tbody);
    
    // Tabelle zum Container hinzufügen
    statsTableContainer.appendChild(table);
    
    return tbody;
  }
};

/**
 * Modul für die erweiterte Statistik-Ansicht
 */
export const extendedStatsUI = {
  /**
   * Zeigt die ausgewählte Sektion der erweiterten Statistik an
   * @param {string} section - Anzuzeigende Sektion
   * @param {Object} data - Daten für die Anzeige
   * @param {Array} teams - Liste aller Teams
   */
  showSection(section, data, teams) {
    const toplistenSection = document.getElementById('toplisten-section');
    const teamdetailSection = document.getElementById('teamdetail-section');
    const tableStatsSection = document.getElementById('table-stats-section');
    
    // Nur fortfahren, wenn die grundlegenden Sektionen existieren
    if (!toplistenSection || !teamdetailSection) {
      console.error("Grundlegende Sektionen für erweiterte Statistik nicht gefunden");
      return;
    }
    
    // Alle Sektionen ausblenden
    toplistenSection.style.display = 'none';
    teamdetailSection.style.display = 'none';
    if (tableStatsSection) tableStatsSection.style.display = 'none';
    
    // Gewählte Sektion einblenden
    if (section === 'toplisten') {
      toplistenSection.style.display = 'block';
      this.renderTopLists(data.teamStats, data.vorrundeMatches, data.koMatches);
    } else if (section === 'teamdetail') {
      teamdetailSection.style.display = 'block';
      
      // Füllt das Team-Auswahlmenü mit allen Teams
      this.populateTeamSelector(teams);
      
      // Wenn bereits ein Team ausgewählt ist, Details aktualisieren
      const teamSelector = document.getElementById('team-selector');
      if (teamSelector && teamSelector.value) {
        this.showTeamDetails(teamSelector.value, data.teamStats, data.vorrundeMatches, data.koMatches);
      }
    } else if (section === 'tischstatistik' && tableStatsSection) {
      tableStatsSection.style.display = 'block';
      this.renderTableStatistics('all', data.vorrundeMatches, data.koMatches);
    }
  },
  
  /**
   * Rendert alle Top-Listen
   * @param {Array} teamStats - Team-Statistiken
   * @param {Array} vorrundeMatches - Vorrunden-Matches
   * @param {Object} koMatches - KO-Runden-Matches
   */
  renderTopLists(teamStats, vorrundeMatches, koMatches) {
    this.renderOffensiveList(teamStats);
    this.renderDefensiveList(teamStats);
    this.renderBiggestVictories(vorrundeMatches, koMatches);
    this.renderBeerKings(teamStats);
    this.renderMostBeerDrunk(teamStats);
    this.renderMostBeerGiven(teamStats);
  },
  
  /**
   * Rendert die Liste der Teams mit den meisten erzielten Toren
   * @param {Array} teamStats - Team-Statistiken
   */
  renderOffensiveList(teamStats) {
    const table = document.getElementById('offensive-table');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    // Teams nach erzielten Toren sortieren
    const sortedTeams = [...teamStats].sort((a, b) => b.goalsScored.all - a.goalsScored.all);
    
    // Top 5 anzeigen
    sortedTeams.slice(0, 5).forEach((team, index) => {
      const row = document.createElement('tr');
      
      // Top 3 markieren
      if (index < 3) {
        row.classList.add(`top-${index + 1}`);
      }
      
      row.innerHTML = `
        <td class="pos-col">${index + 1}</td>
        <td>${team.team}</td>
        <td>${team.goalsScored.all}</td>
      `;
      
      tbody.appendChild(row);
    });
  },
  
  /**
   * Rendert die Liste der Teams mit den wenigsten kassierten Toren
   * @param {Array} teamStats - Team-Statistiken
   */
  renderDefensiveList(teamStats) {
    const table = document.getElementById('defensive-table');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    // Nur Teams mit mindestens einem Spiel berücksichtigen
    const teamsWithMatches = teamStats.filter(team => team.matches.all > 0);
    
    // Teams nach kassierten Toren sortieren (aufsteigend)
    const sortedTeams = [...teamsWithMatches].sort((a, b) => a.goalsConceded.all - b.goalsConceded.all);
    
    // Top 5 anzeigen
    sortedTeams.slice(0, 5).forEach((team, index) => {
      const row = document.createElement('tr');
      
      // Top 3 markieren
      if (index < 3) {
        row.classList.add(`top-${index + 1}`);
      }
      
      row.innerHTML = `
        <td class="pos-col">${index + 1}</td>
        <td>${team.team}</td>
        <td>${team.goalsConceded.all}</td>
      `;
      
      tbody.appendChild(row);
    });
  },
  
  /**
   * Rendert die Liste der höchsten Siege
   * @param {Array} vorrundeMatches - Vorrunden-Matches
   * @param {Object} koMatches - KO-Runden-Matches
   */
  renderBiggestVictories(vorrundeMatches, koMatches) {
    const table = document.getElementById('victories-table');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    // Alle Spiele sammeln und nach Tordifferenz sortieren
    const allMatches = [];
    
    // Vorrunden-Matches
    vorrundeMatches.forEach(match => {
      if (!match.played) return;
      
      const diff = Math.abs(match.score1 - match.score2);
      const winner = match.score1 > match.score2 ? match.team1 : 
                   (match.score2 > match.score1 ? match.team2 : null);
      
      if (winner) {
        allMatches.push({
          team1: match.team1,
          team2: match.team2,
          score1: match.score1,
          score2: match.score2,
          diff,
          winner
        });
      }
    });
    
    // KO-Runden-Matches
    ['playoff', 'quarterfinal', 'semifinal', 'final'].forEach(round => {
      if (!koMatches[round]) return;
      
      koMatches[round].forEach(match => {
        if (!match.winner || match.teams.some(team => !team.name || team.score === null)) {
          return;
        }
        
        const team1 = match.teams[0].name;
        const team2 = match.teams[1].name;
        const score1 = match.teams[0].score;
        const score2 = match.teams[1].score;
        const diff = Math.abs(score1 - score2);
        
        allMatches.push({
          team1,
          team2,
          score1,
          score2,
          diff,
          winner: match.winner
        });
      });
    });
    
    // Nach Tordifferenz sortieren (absteigend)
    allMatches.sort((a, b) => b.diff - a.diff);
    
    // Top 5 höchste Siege anzeigen
    allMatches.slice(0, 5).forEach((match, index) => {
      const row = document.createElement('tr');
      
      // Top 3 markieren
      if (index < 3) {
        row.classList.add(`top-${index + 1}`);
      }
      
      row.innerHTML = `
        <td class="pos-col">${index + 1}</td>
        <td>${match.team1} vs ${match.team2}</td>
        <td>${match.score1}:${match.score2}</td>
        <td>+${match.diff}</td>
      `;
      
      tbody.appendChild(row);
    });
  },
  
  /**
   * Rendert die Liste der Teams mit der besten Bier-Bilanz
   * @param {Array} teamStats - Team-Statistiken
   */
  renderBeerKings(teamStats) {
    const table = document.getElementById('beer-kings-table');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    // Teams nach Bier-Bilanz sortieren (absteigend)
    const sortedTeams = [...teamStats].sort((a, b) => {
      return b.beerBalance.all - a.beerBalance.all;
    });
    
    // Top 5 anzeigen
    sortedTeams.slice(0, 5).forEach((team, index) => {
      const row = document.createElement('tr');
      
      // Top 3 markieren
      if (index < 3) {
        row.classList.add(`top-${index + 1}`);
      }
      
      row.innerHTML = `
        <td class="pos-col">${index + 1}</td>
        <td>${team.team}</td>
        <td>${team.beerBalance.all > 0 ? '+' : ''}${(team.beerBalance.all / 1000).toFixed(1)} L</td>
      `;
      
      tbody.appendChild(row);
    });
  },
  
  /**
   * Rendert die Liste der Teams mit dem meisten getrunkenen Bier
   * @param {Array} teamStats - Team-Statistiken
   */
  renderMostBeerDrunk(teamStats) {
    const table = document.getElementById('beer-drunk-table');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    // Teams nach getrunkenem Bier sortieren (absteigend)
    const sortedTeams = [...teamStats].sort((a, b) => {
      return b.beerDrunk.all - a.beerDrunk.all;
    });
    
    // Top 5 anzeigen
    sortedTeams.slice(0, 5).forEach((team, index) => {
      const row = document.createElement('tr');
      
      // Top 3 markieren
      if (index < 3) {
        row.classList.add(`top-${index + 1}`);
      }
      
      row.innerHTML = `
        <td class="pos-col">${index + 1}</td>
        <td>${team.team}</td>
        <td>${(team.beerDrunk.all / 1000).toFixed(1)} L</td>
      `;
      
      tbody.appendChild(row);
    });
  },
  
  /**
   * Rendert die Liste der Teams mit dem meisten verteilten Bier
   * @param {Array} teamStats - Team-Statistiken
   */
  renderMostBeerGiven(teamStats) {
    const table = document.getElementById('beer-given-table');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    // Teams nach verteiltem Bier sortieren (absteigend)
    const sortedTeams = [...teamStats].sort((a, b) => {
      return b.beerGiven.all - a.beerGiven.all;
    });
    
    // Top 5 anzeigen
    sortedTeams.slice(0, 5).forEach((team, index) => {
      const row = document.createElement('tr');
      
      // Top 3 markieren
      if (index < 3) {
        row.classList.add(`top-${index + 1}`);
      }
      
      row.innerHTML = `
        <td class="pos-col">${index + 1}</td>
        <td>${team.team}</td>
        <td>${(team.beerGiven.all / 1000).toFixed(1)} L</td>
      `;
      
      tbody.appendChild(row);
    });
  },
  
  /**
   * Füllt das Team-Auswahlmenü mit allen Teams
   * @param {Array} teams - Liste aller Teams
   */
  populateTeamSelector(teams) {
    const teamSelector = document.getElementById('team-selector');
    if (!teamSelector) return;
    
    // Alle bisherigen Optionen entfernen (außer der ersten)
    while (teamSelector.options.length > 1) {
      teamSelector.remove(1);
    }
    
    // Teams alphabetisch sortieren
    const sortedTeams = [...teams].sort();
    
    // Für jedes Team eine Option hinzufügen
    sortedTeams.forEach(team => {
      const option = document.createElement('option');
      option.value = team;
      option.textContent = team;
      teamSelector.appendChild(option);
    });
  },
  
  /**
   * Füllt beide Team-Selektoren für den Vergleich
   * @param {Array} teams - Liste aller Teams
   */
  populateTeamSelectors(teams) {
    const team1Selector = document.getElementById('team1-selector');
    const team2Selector = document.getElementById('team2-selector');
    
    if (!team1Selector || !team2Selector) return;
    
    // Bestehende Optionen entfernen (außer der ersten)
    while (team1Selector.options.length > 1) {
      team1Selector.remove(1);
    }
    
    while (team2Selector.options.length > 1) {
      team2Selector.remove(1);
    }
    
    // Teams alphabetisch sortieren
    const sortedTeams = [...teams].sort();
    
    // Für jedes Team eine Option hinzufügen
    sortedTeams.forEach(team => {
      // Option für Selektor 1
      const option1 = document.createElement('option');
      option1.value = team;
      option1.textContent = team;
      team1Selector.appendChild(option1);
      
      // Option für Selektor 2
      const option2 = document.createElement('option');
      option2.value = team;
      option2.textContent = team;
      team2Selector.appendChild(option2);
    });
  },
  
  /**
   * Zeigt die Details des ausgewählten Teams an
   * @param {string} teamName - Name des Teams
   * @param {Array} teamStats - Team-Statistiken
   * @param {Array} vorrundeMatches - Vorrunden-Matches
   * @param {Object} koMatches - KO-Runden-Matches
   */
  showTeamDetails(teamName, teamStats, vorrundeMatches, koMatches) {
    // Team-Statistiken finden
    const teamStat = teamStats.find(stat => stat.team === teamName);
    if (!teamStat) {
      console.error(`Keine Statistiken für Team ${teamName} gefunden`);
      return;
    }
    
    const teamDetailName = document.getElementById('team-detail-name');
    const teamStatsSummary = document.getElementById('team-stats-summary');
    const teamMatchesCard = document.getElementById('team-matches-card');
    
    // Team-Name anzeigen
    teamDetailName.textContent = teamName;
    
    // Statistik-Zusammenfassung anzeigen
    teamStatsSummary.style.display = 'block';
    
    // Allgemeine Statistiken füllen
    document.getElementById('detail-matches').textContent = teamStat.matches.all;
    document.getElementById('detail-wins').textContent = teamStat.wins.all;
    document.getElementById('detail-draws').textContent = teamStat.draws.all;
    document.getElementById('detail-losses').textContent = teamStat.losses.all;
    
    // Tor-Statistiken
    document.getElementById('detail-goals').textContent = `${teamStat.goalsScored.all}:${teamStat.goalsConceded.all}`;
    
    // Durchschnittliche Tore pro Spiel
    const avgGoals = teamStat.matches.all > 0 ? 
      (teamStat.goalsScored.all / teamStat.matches.all).toFixed(1) : 0;
    document.getElementById('detail-avg-goals').textContent = avgGoals;
    
    // Beste Tordifferenz in einem Spiel
    const bestDiff = findBestGoalDifferenceForTeam(teamName, vorrundeMatches, koMatches);
    document.getElementById('detail-best-diff').textContent = bestDiff > 0 ? `+${bestDiff}` : bestDiff;
    
    // Bier-Statistiken
    document.getElementById('detail-beer-given').textContent = `${(teamStat.beerGiven.all / 1000).toFixed(1)} L`;
    document.getElementById('detail-beer-drunk').textContent = `${(teamStat.beerDrunk.all / 1000).toFixed(1)} L`;
    
    // Bier-Bilanz mit Farbcodierung
    const beerBalance = teamStat.beerBalance.all;
    const beerBalanceElement = document.getElementById('detail-beer-balance');
    beerBalanceElement.textContent = `${beerBalance > 0 ? '+' : ''}${(beerBalance / 1000).toFixed(1)} L`;
    beerBalanceElement.className = 'stat-value';
    beerBalanceElement.classList.add(beerBalance > 0 ? 'positive' : (beerBalance < 0 ? 'negative' : 'neutral'));
    
    // Formkurve (letzte Spiele) anzeigen
    this.renderFormChart(teamName, vorrundeMatches, koMatches);
    
    // Match-Tabelle anzeigen
    this.renderTeamMatches(teamName, vorrundeMatches, koMatches);
    teamMatchesCard.style.display = 'block';
  },
  
  /**
   * Verbirgt die Team-Details (wenn kein Team ausgewählt ist)
   */
  hideTeamDetails() {
    document.getElementById('team-detail-name').textContent = 'Team auswählen';
    document.getElementById('team-stats-summary').style.display = 'none';
    document.getElementById('team-matches-card').style.display = 'none';
  },
  
  /**
   * Rendert die Formkurve des Teams (W/D/L der letzten Spiele)
   * @param {string} teamName - Name des Teams
   * @param {Array} vorrundeMatches - Vorrunden-Matches
   * @param {Object} koMatches - KO-Runden-Matches
   */
  renderFormChart(teamName, vorrundeMatches, koMatches) {
    const formIndicatorsContainer = document.getElementById('form-indicators');
    formIndicatorsContainer.innerHTML = '';
    
    // Alle Spiele des Teams in chronologischer Reihenfolge sammeln
    const teamMatches = getAllMatchesForTeam(teamName, vorrundeMatches, koMatches);
    
    // Maximal die letzten 5 Spiele anzeigen
    const recentMatches = teamMatches.slice(-5);
    
    if (recentMatches.length === 0) {
      formIndicatorsContainer.innerHTML = '<p>Keine Spiele vorhanden</p>';
      return;
    }
    
    // Für jedes Spiel einen Indikator erstellen
    recentMatches.forEach(match => {
      const indicator = document.createElement('div');
      indicator.className = 'form-indicator';
      
      // Bestimmen, ob Sieg, Unentschieden oder Niederlage
      if (match.isWin) {
        indicator.classList.add('form-win');
        indicator.textContent = 'W';
      } else if (match.isDraw) {
        indicator.classList.add('form-draw');
        indicator.textContent = 'D';
      } else {
        indicator.classList.add('form-loss');
        indicator.textContent = 'L';
      }
      
      formIndicatorsContainer.appendChild(indicator);
    });
  },
  
  /**
   * Rendert die Tabelle mit allen Spielen des Teams
   * @param {string} teamName - Name des Teams
   * @param {Array} vorrundeMatches - Vorrunden-Matches
   * @param {Object} koMatches - KO-Runden-Matches
   */
  renderTeamMatches(teamName, vorrundeMatches, koMatches) {
    const teamMatchesBody = document.getElementById('team-matches-body');
    
    // Tabelle leeren
    teamMatchesBody.innerHTML = '';
    
    // Alle Spiele des Teams holen
    const teamMatches = getAllMatchesForTeam(teamName, vorrundeMatches, koMatches);
    
    // Keine Spiele vorhanden
    if (teamMatches.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="5">Keine Spiele vorhanden</td>';
      teamMatchesBody.appendChild(row);
      return;
    }
    
    // Für jedes Spiel eine Zeile erstellen
    teamMatches.forEach(match => {
      const row = document.createElement('tr');
      
      // Klasse basierend auf Ergebnis
      if (match.isWin) {
        row.classList.add('result-win');
      } else if (match.isDraw) {
        row.classList.add('result-draw');
      } else {
        row.classList.add('result-loss');
      }
      
      // Runde (Vorrunde oder KO-Runde)
      let roundText = '';
      if (match.type === 'vorrunde') {
        roundText = `Vorrunde ${match.round}`;
      } else {
        // KO-Runde spezifizieren (Playoff, Viertelfinale, etc.)
        switch (match.round) {
          case 'playoff': roundText = 'Playoff'; break;
          case 'quarterfinal': roundText = 'Viertelfinale'; break;
          case 'semifinal': roundText = 'Halbfinale'; break;
          case 'final': roundText = 'Finale'; break;
          default: roundText = match.round;
        }
      }
      
      // Resultat mit Klasse basierend auf Ergebnis
      let resultClass = '';
      if (match.isWin) {
        resultClass = 'result-win';
      } else if (match.isDraw) {
        resultClass = 'result-draw';
      } else {
        resultClass = 'result-loss';
      }
      
      // Zeile füllen
      row.innerHTML = `
        <td>${roundText}</td>
        <td>${match.opponent}</td>
        <td class="${resultClass}">${match.ownScore}:${match.opponentScore}</td>
        <td>${match.goalDiff > 0 ? '+' : ''}${match.goalDiff}</td>
        <td>${match.beerBalance > 0 ? '+' : ''}${(match.beerBalance / 1000).toFixed(1)} L</td>
      `;
      
      teamMatchesBody.appendChild(row);
    });
  },
  
  /**
   * Vergleicht zwei Teams und zeigt die Ergebnisse an
   * @param {string} team1Name - Name des ersten Teams
   * @param {string} team2Name - Name des zweiten Teams
   * @param {Array} teamStats - Team-Statistiken
   */
  compareTeams(team1Name, team2Name, teamStats) {
    console.log(`Vergleiche Teams: ${team1Name} vs ${team2Name}`);
    
    // Team-Statistiken finden
    const team1 = teamStats.find(stat => stat.team === team1Name);
    const team2 = teamStats.find(stat => stat.team === team2Name);
    
    if (!team1 || !team2) {
      console.error('Ein oder beide Teams wurden nicht gefunden');
      return;
    }
    
    // Teamnamen anzeigen
    document.getElementById('team1-name').textContent = team1Name;
    document.getElementById('team2-name').textContent = team2Name;
    
    // Allgemeine Statistiken vergleichen
    this.compareGeneralStats(team1, team2);
    
    // Tor-Statistiken vergleichen
    this.compareGoalStats(team1, team2);
    
    // Bier-Statistiken vergleichen
    this.compareBeerStats(team1, team2);
  },
  
  /**
   * Vergleicht allgemeine Statistiken zweier Teams
   * @param {Object} team1 - Statistiken von Team 1
   * @param {Object} team2 - Statistiken von Team 2
   */
  compareGeneralStats(team1, team2) {
    // Spiele
    this.updateCompareValue('compare-matches-1', team1.matches.all);
    this.updateCompareValue('compare-matches-2', team2.matches.all);
    
    // Siege
    this.updateCompareValue('compare-wins-1', team1.wins.all);
    this.updateCompareValue('compare-wins-2', team2.wins.all);
    this.compareAndHighlight('compare-wins-1', 'compare-wins-2', team1.wins.all, team2.wins.all, true);
    
    // Unentschieden
    this.updateCompareValue('compare-draws-1', team1.draws.all);
    this.updateCompareValue('compare-draws-2', team2.draws.all);
    // Bei Unentschieden keine Hervorhebung, da nicht eindeutig besser/schlechter
    
    // Niederlagen
    this.updateCompareValue('compare-losses-1', team1.losses.all);
    this.updateCompareValue('compare-losses-2', team2.losses.all);
    this.compareAndHighlight('compare-losses-1', 'compare-losses-2', team1.losses.all, team2.losses.all, false);
    
    // Siegquote (relativ)
    const winRate1 = team1.matches.all > 0 ? (team1.wins.all / team1.matches.all * 100).toFixed(1) : 0;
    const winRate2 = team2.matches.all > 0 ? (team2.wins.all / team2.matches.all * 100).toFixed(1) : 0;
    
    this.updateCompareValue('compare-winrate-1', `${winRate1}%`);
    this.updateCompareValue('compare-winrate-2', `${winRate2}%`);
    this.compareAndHighlight('compare-winrate-1', 'compare-winrate-2', parseFloat(winRate1), parseFloat(winRate2), true);
  },
  
  /**
   * Vergleicht Tor-Statistiken zweier Teams
   * @param {Object} team1 - Statistiken von Team 1
   * @param {Object} team2 - Statistiken von Team 2
   */
  compareGoalStats(team1, team2) {
    // Tore
    const goals1 = `${team1.goalsScored.all}:${team1.goalsConceded.all}`;
    const goals2 = `${team2.goalsScored.all}:${team2.goalsConceded.all}`;
    
    this.updateCompareValue('compare-goals-1', goals1);
    this.updateCompareValue('compare-goals-2', goals2);
    
    // Ø Tore pro Spiel
    const avgGoals1 = team1.matches.all > 0 ? (team1.goalsScored.all / team1.matches.all).toFixed(1) : '0.0';
    const avgGoals2 = team2.matches.all > 0 ? (team2.goalsScored.all / team2.matches.all).toFixed(1) : '0.0';
    
    this.updateCompareValue('compare-avg-goals-1', avgGoals1);
    this.updateCompareValue('compare-avg-goals-2', avgGoals2);
    this.compareAndHighlight('compare-avg-goals-1', 'compare-avg-goals-2', parseFloat(avgGoals1), parseFloat(avgGoals2), true);
    
    // Gegentore
    this.updateCompareValue('compare-goals-against-1', team1.goalsConceded.all);
    this.updateCompareValue('compare-goals-against-2', team2.goalsConceded.all);
    this.compareAndHighlight('compare-goals-against-1', 'compare-goals-against-2', team1.goalsConceded.all, team2.goalsConceded.all, false);
    
    // Ø Gegentore pro Spiel
    const avgGoalsAgainst1 = team1.matches.all > 0 ? (team1.goalsConceded.all / team1.matches.all).toFixed(1) : '0.0';
    const avgGoalsAgainst2 = team2.matches.all > 0 ? (team2.goalsConceded.all / team2.matches.all).toFixed(1) : '0.0';
    
    this.updateCompareValue('compare-avg-goals-against-1', avgGoalsAgainst1);
    this.updateCompareValue('compare-avg-goals-against-2', avgGoalsAgainst2);
    this.compareAndHighlight('compare-avg-goals-against-1', 'compare-avg-goals-against-2', parseFloat(avgGoalsAgainst1), parseFloat(avgGoalsAgainst2), false);
    
    // Tordifferenz
    const goalDiff1 = team1.goalDifference.all;
    const goalDiff2 = team2.goalDifference.all;
    
    this.updateCompareValue('compare-goal-diff-1', this.getFormattedDifference(goalDiff1), goalDiff1);
    this.updateCompareValue('compare-goal-diff-2', this.getFormattedDifference(goalDiff2), goalDiff2);
    this.compareAndHighlight('compare-goal-diff-1', 'compare-goal-diff-2', goalDiff1, goalDiff2, true);
  },
  
  /**
   * Vergleicht Bier-Statistiken zweier Teams
   * @param {Object} team1 - Statistiken von Team 1
   * @param {Object} team2 - Statistiken von Team 2
   */
  compareBeerStats(team1, team2) {
    // Bier verteilt
    const beerGiven1 = team1.beerGiven.all;
    const beerGiven2 = team2.beerGiven.all;
    
    this.updateCompareValue('compare-beer-given-1', `${(beerGiven1 / 1000).toFixed(1)} L`);
    this.updateCompareValue('compare-beer-given-2', `${(beerGiven2 / 1000).toFixed(1)} L`);
    this.compareAndHighlight('compare-beer-given-1', 'compare-beer-given-2', beerGiven1, beerGiven2, true);
    
    // Bier pro Spiel verteilt
    const beerGivenPerGame1 = team1.matches.all > 0 ? (beerGiven1 / team1.matches.all / 1000).toFixed(2) : '0.00';
    const beerGivenPerGame2 = team2.matches.all > 0 ? (beerGiven2 / team2.matches.all / 1000).toFixed(2) : '0.00';
    
    this.updateCompareValue('compare-beer-given-per-game-1', `${beerGivenPerGame1} L`);
    this.updateCompareValue('compare-beer-given-per-game-2', `${beerGivenPerGame2} L`);
    this.compareAndHighlight('compare-beer-given-per-game-1', 'compare-beer-given-per-game-2', parseFloat(beerGivenPerGame1), parseFloat(beerGivenPerGame2), true);
    
    // Bier getrunken
    const beerDrunk1 = team1.beerDrunk.all;
    const beerDrunk2 = team2.beerDrunk.all;
    
    this.updateCompareValue('compare-beer-drunk-1', `${(beerDrunk1 / 1000).toFixed(1)} L`);
    this.updateCompareValue('compare-beer-drunk-2', `${(beerDrunk2 / 1000).toFixed(1)} L`);
    this.compareAndHighlight('compare-beer-drunk-1', 'compare-beer-drunk-2', beerDrunk1, beerDrunk2, false);
    
    // Bier pro Spiel getrunken
    const beerDrunkPerGame1 = team1.matches.all > 0 ? (beerDrunk1 / team1.matches.all / 1000).toFixed(2) : '0.00';
    const beerDrunkPerGame2 = team2.matches.all > 0 ? (beerDrunk2 / team2.matches.all / 1000).toFixed(2) : '0.00';
    
    this.updateCompareValue('compare-beer-drunk-per-game-1', `${beerDrunkPerGame1} L`);
    this.updateCompareValue('compare-beer-drunk-per-game-2', `${beerDrunkPerGame2} L`);
    this.compareAndHighlight('compare-beer-drunk-per-game-1', 'compare-beer-drunk-per-game-2', parseFloat(beerDrunkPerGame1), parseFloat(beerDrunkPerGame2), false);
    
    // Bier-Bilanz
    const beerBalance1 = team1.beerBalance.all;
    const beerBalance2 = team2.beerBalance.all;
    
    this.updateCompareValue('compare-beer-balance-1', this.getFormattedBeerBalance(beerBalance1), beerBalance1);
    this.updateCompareValue('compare-beer-balance-2', this.getFormattedBeerBalance(beerBalance2), beerBalance2);
    this.compareAndHighlight('compare-beer-balance-1', 'compare-beer-balance-2', beerBalance1, beerBalance2, true);
  },
  
  /**
   * Aktualisiert einen Vergleichswert im DOM
   * @param {string} elementId - ID des Elements
   * @param {string|number} value - Anzuzeigender Wert
   * @param {number} rawValue - Optionaler Rohwert für zusätzliche Formatierung
   */
  updateCompareValue(elementId, value, rawValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Grundlegende Aktualisierung
    element.textContent = value;
    
    // Zusätzliche Formatierung für positive/negative Werte
    if (rawValue !== undefined) {
      element.classList.remove('positive-value', 'negative-value', 'neutral-value');
      
      if (rawValue > 0) {
        element.classList.add('positive-value');
      } else if (rawValue < 0) {
        element.classList.add('negative-value');
      } else {
        element.classList.add('neutral-value');
      }
    }
  },
  
  /**
   * Vergleicht zwei Werte und hebt den besseren (oder schlechteren) hervor
   * @param {string} element1Id - ID des ersten Elements
   * @param {string} element2Id - ID des zweiten Elements
   * @param {number} value1 - Wert des ersten Elements
   * @param {number} value2 - Wert des zweiten Elements
   * @param {boolean} higherIsBetter - Gibt an, ob ein höherer Wert besser ist
   */
  compareAndHighlight(element1Id, element2Id, value1, value2, higherIsBetter) {
    const element1 = document.getElementById(element1Id);
    const element2 = document.getElementById(element2Id);
    
    if (!element1 || !element2) return;
    
    // Klassen entfernen
    element1.classList.remove('highlight-better', 'highlight-worse');
    element2.classList.remove('highlight-better', 'highlight-worse');
    
    // Gleiche Werte nicht hervorheben
    if (value1 === value2) return;
    
    if (higherIsBetter) {
      // Höherer Wert ist besser
      if (value1 > value2) {
        element1.classList.add('highlight-better');
        element2.classList.add('highlight-worse');
      } else {
        element1.classList.add('highlight-worse');
        element2.classList.add('highlight-better');
      }
    } else {
      // Niedrigerer Wert ist besser
      if (value1 < value2) {
        element1.classList.add('highlight-better');
        element2.classList.add('highlight-worse');
      } else {
        element1.classList.add('highlight-worse');
        element2.classList.add('highlight-better');
      }
    }
  },
  
  /**
   * Formatiert einen Differenzwert mit Vorzeichen
   * @param {number} diff - Differenzwert
   * @returns {string} - Formatierter Wert mit Vorzeichen
   */
  getFormattedDifference(diff) {
    if (diff > 0) {
      return `+${diff}`;
    } else {
      return diff.toString();
    }
  },
  
  /**
   * Formatiert eine Bier-Bilanz
   * @param {number} balance - Bierbilanz in ml
   * @returns {string} - Formatierte Bierbilanz in Litern mit Vorzeichen
   */
  getFormattedBeerBalance(balance) {
    const balanceInLiters = balance / 1000;
    
    if (balanceInLiters > 0) {
      return `+${balanceInLiters.toFixed(1)} L`;
    } else {
      return `${balanceInLiters.toFixed(1)} L`;
    }
  },
  
  /**
   * Rendert die Tischstatistiken für eine bestimmte Phase
   * @param {string} phase - Die Phase (all, vorrunde, ko)
   * @param {Array} vorrundeMatches - Vorrunden-Matches
   * @param {Object} koMatches - KO-Runden-Matches
   */
  renderTableStatistics(phase, vorrundeMatches, koMatches) {
    console.log(`Rendere Tischstatistiken für Phase: ${phase}`);
    
    // Container für die Tischkarten
    const tableCardsContainer = document.getElementById('table-cards-container');
    if (!tableCardsContainer) return;
    
    // Container leeren
    tableCardsContainer.innerHTML = '';
    
    // Tischstatistiken sammeln
    const tableStats = this.calculateTableStatistics(phase, vorrundeMatches, koMatches);
    
    // Keine Daten gefunden
    if (Object.keys(tableStats).length === 0) {
      tableCardsContainer.innerHTML = '<div class="no-data-message">Keine Tischdaten für diese Phase gefunden.</div>';
      return;
    }
    
    // Für jeden Tisch eine Karte erstellen
    for (let tableNumber = 1; tableNumber <= 6; tableNumber++) {
      // Prüfen, ob Daten für diesen Tisch existieren
      if (!tableStats[tableNumber]) {
        // Leere Karte für nicht vorhandene Tische
        const emptyCard = this.createEmptyTableCard(tableNumber);
        tableCardsContainer.appendChild(emptyCard);
        continue;
      }
      
      // Tischstatistik-Karte erstellen
      const tableCard = this.createTableStatisticsCard(tableNumber, tableStats[tableNumber]);
      tableCardsContainer.appendChild(tableCard);
    }
  },
  
  /**
   * Berechnet Statistiken für jeden Tisch
   * @param {string} phase - Die Phase (all, vorrunde, ko)
   * @param {Array} vorrundeMatches - Vorrunden-Matches
   * @param {Object} koMatches - KO-Runden-Matches
   * @returns {Object} - Statistiken für jeden Tisch
   */
  calculateTableStatistics(phase, vorrundeMatches, koMatches) {
    // Initialisierung der Tischstatistiken
    const tableStats = {};
    
    // Vorrunden-Matches laden und verarbeiten
    if (phase === 'all' || phase === 'vorrunde') {
      this.processMatchesForTableStats(vorrundeMatches, tableStats, 'vorrunde');
    }
    
    // KO-Runden-Matches laden und verarbeiten
    if (phase === 'all' || phase === 'ko') {
      // Durch alle KO-Runden iterieren
      ['playoff', 'quarterfinal', 'semifinal', 'final'].forEach(round => {
        if (koMatches[round]) {
          this.processMatchesForTableStats(koMatches[round], tableStats, 'ko');
        }
      });
    }
    
    // Durchschnitte berechnen
    for (const tableNumber in tableStats) {
      const stats = tableStats[tableNumber];
      if (stats.totalGames > 0) {
        stats.avgGoalsPerGame = stats.totalGoals / stats.totalGames;
        stats.avgGoalsScoredPerGame = stats.goalsByWinners / stats.totalGames;
        stats.avgGoalsConcededPerGame = stats.goalsByLosers / stats.totalGames;
      }
      
      // Höchstsieg berechnen
      if (stats.largestVictory.diff === 0) {
        stats.largestVictory = null;
      }
    }
    
    return tableStats;
  },
  
  /**
   * Verarbeitet Matches für die Tischstatistiken
   * @param {Array} matches - Die zu verarbeitenden Matches
   * @param {Object} tableStats - Das Objekt, in dem die Statistiken gespeichert werden
   * @param {string} phase - Die Phase (vorrunde, ko)
   */
  processMatchesForTableStats(matches, tableStats, phase) {
    matches.forEach(match => {
      // Prüfen, ob das Match eine Tischnummer hat und gespielt wurde
      if (!match.tableNumber || 
          (phase === 'vorrunde' && !match.played) || 
          (phase === 'ko' && (!match.winner || !match.teams || !match.teams[0].score))) {
        return;
      }
      
      const tableNumber = match.tableNumber;
      
      // Tisch-Statistik initialisieren, falls noch nicht vorhanden
      if (!tableStats[tableNumber]) {
        tableStats[tableNumber] = {
          totalGames: 0,
          winsHomeTeam: 0,
          winsAwayTeam: 0,
          draws: 0,
          totalGoals: 0,
          goalsByWinners: 0,
          goalsByLosers: 0,
          avgGoalsPerGame: 0,
          avgGoalsScoredPerGame: 0,
          avgGoalsConcededPerGame: 0,
          largestVictory: {
            team1: '',
            team2: '',
            score1: 0,
            score2: 0,
            diff: 0
          }
        };
      }
      
      // Spielstatistiken hinzufügen
      tableStats[tableNumber].totalGames++;
      
      // Tore und Ergebnisse verarbeiten - je nach Phasentyp
      if (phase === 'vorrunde') {
        this.processVorrundeMatch(match, tableStats[tableNumber]);
      } else {
        this.processKoMatch(match, tableStats[tableNumber]);
      }
    });
  },
  
  /**
   * Verarbeitet ein Vorrunden-Match für die Tischstatistiken
   * @param {Object} match - Das zu verarbeitende Match
   * @param {Object} tableStat - Die Statistik für diesen Tisch
   */
  processVorrundeMatch(match, tableStat) {
    const score1 = match.score1;
    const score2 = match.score2;
    const totalGoals = score1 + score2;
    
    // Tore zählen
    tableStat.totalGoals += totalGoals;
    
    // Gewinner/Verlierer bestimmen
    if (score1 > score2) {
      // Team 1 gewinnt
      tableStat.winsHomeTeam++;
      tableStat.goalsByWinners += score1;
      tableStat.goalsByLosers += score2;
      
      // Prüfen, ob größter Sieg
      const diff = score1 - score2;
      if (diff > tableStat.largestVictory.diff) {
        tableStat.largestVictory = {
          team1: match.team1,
          team2: match.team2,
          score1: score1,
          score2: score2,
          diff: diff
        };
      }
    } else if (score1 < score2) {
      // Team 2 gewinnt
      tableStat.winsAwayTeam++;
      tableStat.goalsByWinners += score2;
      tableStat.goalsByLosers += score1;
      
      // Prüfen, ob größter Sieg
      const diff = score2 - score1;
      if (diff > tableStat.largestVictory.diff) {
        tableStat.largestVictory = {
          team1: match.team1,
          team2: match.team2,
          score1: score1,
          score2: score2,
          diff: diff
        };
      }
    } else {
      // Unentschieden
      tableStat.draws++;
      tableStat.goalsByWinners += score1; // Bei Unentschieden gleiche Verteilung
      tableStat.goalsByLosers += score2;
    }
  },
  
  /**
   * Verarbeitet ein KO-Runden-Match für die Tischstatistiken
   * @param {Object} match - Das zu verarbeitende Match
   * @param {Object} tableStat - Die Statistik für diesen Tisch
   */
  processKoMatch(match, tableStat) {
    // Teams und Scores extrahieren
    const team1 = match.teams[0];
    const team2 = match.teams[1];
    
    // Prüfen, ob Daten vollständig sind
    if (!team1 || !team2 || team1.score === null || team2.score === null) return;
    
    const score1 = team1.score;
    const score2 = team2.score;
    const totalGoals = score1 + score2;
    
    // Tore zählen
    tableStat.totalGoals += totalGoals;
    
    // Gewinner/Verlierer bestimmen
    if (match.winner === team1.name) {
      // Team 1 gewinnt
      tableStat.winsHomeTeam++;
      tableStat.goalsByWinners += score1;
      tableStat.goalsByLosers += score2;
      
      // Prüfen, ob größter Sieg
      const diff = score1 - score2;
      if (diff > tableStat.largestVictory.diff) {
        tableStat.largestVictory = {
          team1: team1.name,
          team2: team2.name,
          score1: score1,
          score2: score2,
          diff: diff
        };
      }
    } else if (match.winner === team2.name) {
      // Team 2 gewinnt
      tableStat.winsAwayTeam++;
      tableStat.goalsByWinners += score2;
      tableStat.goalsByLosers += score1;
      
      // Prüfen, ob größter Sieg
      const diff = score2 - score1;
      if (diff > tableStat.largestVictory.diff) {
        tableStat.largestVictory = {
          team1: team1.name,
          team2: team2.name,
          score1: score1,
          score2: score2,
          diff: diff
        };
      }
    }
    // In KO-Runde sollte es keine Unentschieden geben
  },
  
  /**
   * Erstellt eine Karte mit Tischstatistiken
   * @param {number} tableNumber - Die Tischnummer
   * @param {Object} stats - Die Statistiken für diesen Tisch
   * @returns {HTMLElement} - Die erstellte Karte
   */
  createTableStatisticsCard(tableNumber, stats) {
    const card = document.createElement('div');
    card.className = `table-stat-card tisch-${tableNumber}`;
    
    // Header mit Tischnummer
    const header = document.createElement('div');
    header.className = 'table-stat-header';
    header.innerHTML = `<h3>Tisch ${tableNumber}</h3>`;
    card.appendChild(header);
    
    // Allgemeine Statistiken
    const generalStats = document.createElement('div');
    generalStats.className = 'table-stat-section';
    generalStats.innerHTML = `
      <h4>Allgemeine Statistiken</h4>
      <div class="stat-row">
        <span class="stat-label">Gespielte Spiele:</span>
        <span class="stat-value">${stats.totalGames}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Siege Team 1:</span>
        <span class="stat-value">${stats.winsHomeTeam}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Siege Team 2:</span>
        <span class="stat-value">${stats.winsAwayTeam}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Unentschieden:</span>
        <span class="stat-value">${stats.draws}</span>
      </div>
    `;
    card.appendChild(generalStats);
    
    // Tor-Statistiken
    const goalStats = document.createElement('div');
    goalStats.className = 'table-stat-section';
    goalStats.innerHTML = `
      <h4>Tor-Statistiken</h4>
      <div class="stat-row">
        <span class="stat-label">Tore gesamt:</span>
        <span class="stat-value">${stats.totalGoals}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Tore pro Spiel:</span>
        <span class="stat-value">${stats.avgGoalsPerGame.toFixed(1)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Tore durch Sieger:</span>
        <span class="stat-value">${stats.goalsByWinners}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Tore durch Verlierer:</span>
        <span class="stat-value">${stats.goalsByLosers}</span>
      </div>
    `;
    card.appendChild(goalStats);
    
    // Höchster Sieg
    if (stats.largestVictory) {
      const biggestWin = document.createElement('div');
      biggestWin.className = 'table-stat-section highlight-section';
      biggestWin.innerHTML = `
        <h4>Höchster Sieg</h4>
        <div class="match-result">
          <div class="team-names">
            <span>${stats.largestVictory.team1}</span>
            <span>vs</span>
            <span>${stats.largestVictory.team2}</span>
          </div>
          <div class="score">
            ${stats.largestVictory.score1}:${stats.largestVictory.score2}
          </div>
          <div class="diff">
            Differenz: ${stats.largestVictory.diff}
          </div>
        </div>
      `;
      card.appendChild(biggestWin);
    }
    
    return card;
  },
  
  /**
   * Erstellt eine leere Tischkarte für Tische ohne Daten
   * @param {number} tableNumber - Die Tischnummer
   * @returns {HTMLElement} - Die erstellte Karte
   */
  createEmptyTableCard(tableNumber) {
    const card = document.createElement('div');
    card.className = `table-stat-card tisch-${tableNumber} empty-card`;
    
    // Header mit Tischnummer
    const header = document.createElement('div');
    header.className = 'table-stat-header';
    header.innerHTML = `<h3>Tisch ${tableNumber}</h3>`;
    card.appendChild(header);
    
    // Leere Nachricht
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-table-message';
    emptyMessage.textContent = 'Keine Daten für diesen Tisch verfügbar.';
    card.appendChild(emptyMessage);
    
    return card;
  }
};