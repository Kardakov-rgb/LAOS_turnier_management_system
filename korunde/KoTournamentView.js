class KoTournamentView {
    constructor(model, elements) {
      this.model = model;
      this.elements = elements;
    }
  
    // Hauptrender-Methode
    renderBracket() {
      console.log('Rendere Turnierbaum');
      
      if (!this.model.isInitialized()) {
        this.showNotInitializedMessage();
        return;
      }
      
      // UI aktualisieren
      this.elements.notInitializedMessage.style.display = 'none';
      this.elements.tournamentBracket.style.display = 'flex';
      
      // Container leeren
      this.elements.playoffContainer.innerHTML = '';
      this.elements.quarterfinalContainer.innerHTML = '';
      this.elements.semifinalContainer.innerHTML = '';
      this.elements.finalContainer.innerHTML = '';
      
      // Runden rendern
      this.renderPlayoffRound();
      this.renderQuarterfinalRound();
      this.renderSemifinalRound();
      this.renderFinalRound();
      
      // Prüfen, ob ein Turniersieger feststeht
      this.checkForWinner();
  
      // Verbindungslinien zeichnen (nur in Desktop-Ansicht)
      if (window.innerWidth > 1100) {
        setTimeout(() => this.drawBracketConnections(), 100);
      }
    }
  
    // Nicht-initialisierte Nachricht anzeigen
    showNotInitializedMessage() {
      this.elements.notInitializedMessage.style.display = 'block';
      this.elements.tournamentBracket.style.display = 'none';
      this.elements.winnerContainer.style.display = 'none';
    }
  
    // Playoff-Runde rendern
    renderPlayoffRound() {
      const matches = this.model.koMatches.playoff;
      if (matches.length === 0) return;
      
      matches.forEach(match => {
        const matchCard = this.createMatchCard(match);
        this.elements.playoffContainer.appendChild(matchCard);
      });
    }
  
    // Viertelfinale-Runde rendern
    renderQuarterfinalRound() {
      const matches = this.model.koMatches.quarterfinal;
      if (matches.length === 0) return;
      
      matches.forEach(match => {
        const matchCard = this.createMatchCard(match);
        this.elements.quarterfinalContainer.appendChild(matchCard);
      });
    }
  
    // Halbfinale-Runde rendern
    renderSemifinalRound() {
      const matches = this.model.koMatches.semifinal;
      if (matches.length === 0) return;
      
      matches.forEach(match => {
        const matchCard = this.createMatchCard(match);
        this.elements.semifinalContainer.appendChild(matchCard);
      });
    }
  
    // Finale-Runde rendern
    renderFinalRound() {
      const matches = this.model.koMatches.final;
      if (matches.length === 0) return;
      
      matches.forEach(match => {
        const matchCard = this.createMatchCard(match);
        this.elements.finalContainer.appendChild(matchCard);
      });
    }
  
    // Match-Karte erstellen
    createMatchCard(match) {
      // Sicherstellen, dass match definiert ist
      if (!match) {
        console.error('Ungültiges Match-Objekt übergeben:', match);
        const errorCard = document.createElement('div');
        errorCard.className = 'match-card error-card';
        errorCard.textContent = 'Fehler: Match-Daten nicht verfügbar';
        return errorCard;
      }
      
      const matchCard = document.createElement('div');
      matchCard.className = 'match-card';
      
      // Tisch-Farben basierend auf der Tischnummer
      if (match.tableNumber) {
        matchCard.classList.add(`tisch-${match.tableNumber}`);
      }
      
      matchCard.dataset.matchId = match.id;
      
      // Abgeschlossenes Match markieren
      if (match.winner !== null && match.winner !== undefined) {
        matchCard.classList.add('completed');
      }
      
      // Match-Header mit Rundeninformation und Buttons
      let roundLabel = '';
      switch (match.round) {
        case 'playoff': roundLabel = 'Playoff'; break;
        case 'quarterfinal': roundLabel = 'Viertelfinale'; break;
        case 'semifinal': roundLabel = 'Halbfinale'; break;
        case 'final': roundLabel = 'Finale'; break;
      }
      
      // Sicherstellen, dass teams existiert
      const teamsExist = match.teams && Array.isArray(match.teams);
      
      let headerContent = `
        <div class="match-header">
          <div class="header-info">
            <span>${roundLabel} #${match.matchNumber}</span>
            <span>${match.tableNumber ? `Tisch ${match.tableNumber}` : ''}</span>
          </div>
      `;
      
      // Prüfen, ob Buttons im Header angezeigt werden sollen
      const isEditable = teamsExist && match.teams.length >= 2 && 
                       match.teams.every(team => team && team.name !== null);
      
      if (isEditable) {
        headerContent += '<div class="header-actions">';
        
        if (match.winner === null) {
          // Speichern-Button
          headerContent += '<button class="save-result-btn header-btn" title="Ergebnis speichern">💾</button>';
        } else {
          // Bearbeiten-Button
          headerContent += '<button class="edit-result-btn header-btn" title="Ergebnis bearbeiten">✏️</button>';
        }
        
        // Zurücksetzen-Button
        headerContent += '<button class="reset-result-btn header-btn" title="Ergebnis zurücksetzen">🔄</button>';
        headerContent += '</div>';
      }
      
      headerContent += '</div>';
      
      // Match-Teams
      let teamsContent = '';
      
      if (!teamsExist || match.teams.length < 2) {
        // Keine Teams oder unvollständige Teams
        teamsContent = `
          <div class="tbd-placeholder">
            Teams noch nicht bekannt oder unvollständig
          </div>
        `;
      } else if (match.teams.every(team => team === null || team.name === null) ||
                 match.teams.some(team => team === null || team.name === null)) {
        // Kein oder nur ein Team bekannt – je Slot TBA anzeigen
        teamsContent = `<div class="match-teams">`;

        match.teams.forEach((team, index) => {
          if (team && team.name) {
            teamsContent += `
              <div class="team-row">
                <div class="team-info">
                  ${team.seed ? `<span class="team-seed">${team.seed}</span>` : ''}
                  <span class="team-name">${team.name}</span>
                </div>
                <div class="team-score">
                  <span>-</span>
                </div>
              </div>
            `;
          } else {
            teamsContent += `
              <div class="team-row">
                <div class="team-info">
                  <span class="team-name tba-placeholder">TBA</span>
                </div>
                <div class="team-score">
                  <span>-</span>
                </div>
              </div>
            `;
          }
        });

        teamsContent += `</div>`;
      } else {
        // Beide Teams bekannt
        teamsContent = `
          <div class="match-teams">
        `;
        
        match.teams.forEach((team, index) => {
          const isWinner = match.winner !== null && match.winner === team.name;
          const isLoser = match.winner !== null && match.winner !== team.name;
          
          teamsContent += `
            <div class="team-row ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}">
              <div class="team-info">
                ${team.seed ? `<span class="team-seed">${team.seed}</span>` : ''}
                <span class="team-name">${team.name}</span>
              </div>
              <div class="team-score">
                ${isEditable ? 
                  `<input type="number" class="score-input" data-team-index="${index}" value="${team.score !== null ? team.score : ''}" min="0" ${match.winner !== null ? 'disabled' : ''}>` :
                  `<span>${team.score !== null ? team.score : '-'}</span>`
                }
              </div>
            </div>
          `;
        });
        
        teamsContent += `</div>`;
      }
      
      // Match-Karte zusammensetzen
      matchCard.innerHTML = `
        ${headerContent}
        ${teamsContent}
      `;
      
      return matchCard;
    }
  
    // Prüfen, ob ein Turniersieger feststeht
    checkForWinner() {
      if (this.model.hasWinner()) {
        const winner = this.model.getWinner();
        
        // Sieger anzeigen
        this.elements.winnerContainer.style.display = 'block';
        this.elements.winnerTeam.textContent = winner;
        
        // Erfolgsstatuts anzeigen
        this.setStatus(`Herzlichen Glückwunsch an das Team "${winner}" zum Turniersieg! 🎉`, 'success');
      } else {
        this.elements.winnerContainer.style.display = 'none';
      }
    }
  
    // Verbindungslinien zeichnen
    drawBracketConnections() {
      console.log('Verbindungslinien für den Turnierbaum werden in dieser Version nur über CSS dargestellt');
    }
  
  
    // Status-Message anzeigen
    setStatus(message, type = 'info') {
      if (!this.elements.statusContainer) return;
      
      this.elements.statusContainer.className = 'status-container';
      this.elements.statusContainer.classList.add(`status-${type}`);
      this.elements.statusContainer.textContent = message;
    }
  }
  
  export default KoTournamentView;