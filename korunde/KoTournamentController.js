import dataService from '../global/data-service.js';

class KoTournamentController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  // Event-Listener einrichten
  init() {
    // Init-Button
    this.view.elements.initKoRundeBtn.addEventListener('click', () => this.initializeKoRunde());
    // Export-Button
    this.view.elements.exportDataBtn.addEventListener('click', () => this.exportData());
    // Reset-Button
    this.view.elements.resetKoRundeBtn.addEventListener('click', () => this.confirmReset());
    // Echtzeit-Updates einrichten
    this.setupRealtimeUpdates();
    
    // Delegierte Event-Listener für Match-Karten
    document.addEventListener('click', (event) => {
      const target = event.target;
      
      // Save-Button geklickt
      if (target.classList.contains('save-result-btn')) {
        const matchCard = this.findParentMatchCard(target);
        if (matchCard) {
          const matchId = matchCard.dataset.matchId;
          this.saveMatchResult(matchId);
        }
      }
      
      // Edit-Button geklickt
      if (target.classList.contains('edit-result-btn')) {
        const matchCard = this.findParentMatchCard(target);
        if (matchCard) {
          const matchId = matchCard.dataset.matchId;
          this.editMatchResult(matchId);
        }
      }
      
      // Reset-Button geklickt
      if (target.classList.contains('reset-result-btn')) {
        const matchCard = this.findParentMatchCard(target);
        if (matchCard) {
          const matchId = matchCard.dataset.matchId;
          this.resetMatchResult(matchId);
        }
      }
    });
  }

  // Elternelement vom Typ match-card finden
  findParentMatchCard(element) {
    let current = element;
    while (current && !current.classList.contains('match-card')) {
      current = current.parentElement;
    }
    return current;
  }

  // KO-Runde initialisieren
  async initializeKoRunde() {
    this.view.setStatus('Initialisiere KO-Runde...', 'info');
    
    if (this.model.isInitialized()) {
      if (!confirm('Es existieren bereits KO-Runden-Daten. Möchtest du die KO-Runde neu initialisieren? Alle bisherigen Ergebnisse gehen verloren.')) {
        return;
      }
    }
    
    const success = await this.model.initializeFromStandings();
    
    if (success) {
      this.view.setStatus('KO-Runde erfolgreich initialisiert!', 'success');
      this.view.renderBracket();
    } else {
      this.view.setStatus('Fehler beim Initialisieren der KO-Runde. Stelle sicher, dass Vorrunden-Daten vorhanden sind.', 'error');
    }
  }

  // Match-Ergebnis speichern
  async saveMatchResult(matchId) {
    console.log(`Speichere Ergebnis für Match ${matchId}`);
    
    // Matchkarte finden
    const matchCard = document.querySelector(`.match-card[data-match-id="${matchId}"]`);
    if (!matchCard) {
      console.error(`Match-Karte mit ID ${matchId} nicht gefunden`);
      return;
    }
    
    // Ergebnisse aus Eingabefeldern holen
    const scoreInputs = matchCard.querySelectorAll('.score-input');
    
    const team1Score = parseInt(scoreInputs[0].value);
    const team2Score = parseInt(scoreInputs[1].value);
    
    // Validierung
    if (isNaN(team1Score) || isNaN(team2Score) || team1Score < 0 || team2Score < 0) {
      alert('Bitte gib gültige Ergebnisse ein (positive Zahlen).');
      return;
    }
    
    // Unentschieden nicht erlaubt
    if (team1Score === team2Score) {
      alert('Unentschieden ist nicht erlaubt. Bitte gib einen eindeutigen Sieger an.');
      return;
    }
    
    const success = await this.model.saveMatchResult(matchId, team1Score, team2Score);
    
    if (success) {
      this.view.renderBracket();
    } else {
      this.view.setStatus('Fehler beim Speichern des Ergebnisses.', 'error');
    }
  }

  // Match-Ergebnis bearbeiten
  editMatchResult(matchId) {
    console.log(`Bearbeite Ergebnis für Match ${matchId}`);
    
    const matchCard = document.querySelector(`.match-card[data-match-id="${matchId}"]`);
    if (!matchCard) return;
    
    const scoreInputs = matchCard.querySelectorAll('.score-input');
    
    // Eingabefelder aktivieren
    scoreInputs.forEach(input => {
      input.disabled = false;
    });
    
    // Bearbeiten-Button im Header durch Speichern-Button ersetzen
    const headerActions = matchCard.querySelector('.header-actions');
    if (headerActions) {
      headerActions.innerHTML = `
        <button class="save-result-btn header-btn" title="Ergebnis speichern">💾</button>
        <button class="reset-result-btn header-btn" title="Ergebnis zurücksetzen">🔄</button>
      `;
    }
  }

  // Match-Ergebnis zurücksetzen
  async resetMatchResult(matchId) {
    console.log(`Setze Ergebnis für Match ${matchId} zurück`);
    
    // Match finden
    const matchInfo = this.model.findMatchById(matchId);
    if (!matchInfo) {
      console.error(`Match mit ID ${matchId} nicht gefunden`);
      return;
    }
    
    const { match } = matchInfo;
    
    // Bei bereits gespeichertem Ergebnis Bestätigung fordern
    if (match.winner !== null && !confirm('Möchtest du dieses Ergebnis wirklich zurücksetzen? Dies wirkt sich auch auf alle nachfolgenden Runden aus!')) {
      return;
    }
    
    const success = await this.model.resetMatchResult(matchId);
    
    if (success) {
      this.view.renderBracket();
    } else {
      this.view.setStatus('Fehler beim Zurücksetzen des Ergebnisses.', 'error');
    }
  }

  // Daten exportieren
  exportData() {
    if (!this.model.isInitialized()) {
      alert('Es gibt keine Daten zum Exportieren.');
      return;
    }
    
    // Daten für Export vorbereiten
    const exportData = {
      koMatches: this.model.koMatches,
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
    a.download = 'laos_ko_runde.json';
    
    // Link anklicken, um Download zu starten
    document.body.appendChild(a);
    a.click();
    
    // Link entfernen
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('KO-Runden-Daten wurden als JSON-Datei exportiert');
  }

  // Reset bestätigen und durchführen
  confirmReset() {
    if (confirm('ACHTUNG: Möchtest du wirklich ALLE KO-Runden-Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      this.resetKoRunde();
    }
  }

  // KO-Runde zurücksetzen
  async resetKoRunde() {
    const success = await this.model.resetKoRunde();
    
    if (success) {
      this.view.showNotInitializedMessage();
      this.view.setStatus('Die KO-Runde wurde zurückgesetzt.', 'info');
      console.log('KO-Runde wurde zurückgesetzt');
    } else {
      this.view.setStatus('Fehler beim Zurücksetzen der KO-Runde.', 'error');
    }
  }



  // Echtzeit-Updates einrichten
  setupRealtimeUpdates() {
    dataService.subscribeToData('koMatches', async updatedMatches => {
      if (updatedMatches) {
        let newMatches;
        
        // Normalisiere die Datenstruktur, falls sie von Firebase kommt
        if (updatedMatches.type === 'array' && updatedMatches.value) {
          newMatches = updatedMatches.value;
        } else if (updatedMatches.playoff || updatedMatches.quarterfinal || 
                  updatedMatches.semifinal || updatedMatches.final) {
          newMatches = updatedMatches;
        } else {
          console.error('Ungültiges Format für koMatches:', updatedMatches);
          return;
        }
        
        // Stelle sicher, dass jede Runde einen Array hat
        if (!Array.isArray(newMatches.playoff)) newMatches.playoff = [];
        if (!Array.isArray(newMatches.quarterfinal)) newMatches.quarterfinal = [];
        if (!Array.isArray(newMatches.semifinal)) newMatches.semifinal = [];
        if (!Array.isArray(newMatches.final)) newMatches.final = [];
        
        // Prüfe, ob sich die Daten wirklich geändert haben
        if (JSON.stringify(this.model.koMatches) !== JSON.stringify(newMatches)) {
          console.log('KO-Matches wurden aktualisiert, rendere UI neu');
          this.model.koMatches = newMatches;
          this.model.ensureValidMatches();
          this.view.renderBracket();
        }
      }
    });
    

    
  }
}

export default KoTournamentController;