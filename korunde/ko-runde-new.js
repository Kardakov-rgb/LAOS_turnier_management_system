import KoTournamentModel from './KoTournamentModel.js';
import KoTournamentView from './KoTournamentView.js';
import KoTournamentController from './KoTournamentController.js';


// Warten bis das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', async function() {
  // Auth initialisieren
  
  // DOM-Elemente sammeln
  const elements = {
    initKoRundeBtn: document.getElementById('initKoRundeBtn'),
    exportDataBtn: document.getElementById('exportDataBtn'),
    resetKoRundeBtn: document.getElementById('resetKoRundeBtn'),
    statusContainer: document.getElementById('statusContainer'),
    notInitializedMessage: document.getElementById('notInitializedMessage'),
    tournamentBracket: document.getElementById('tournamentBracket'),
    playoffContainer: document.getElementById('playoffContainer'),
    quarterfinalContainer: document.getElementById('quarterfinalContainer'),
    semifinalContainer: document.getElementById('semifinalContainer'),
    finalContainer: document.getElementById('finalContainer'),
    winnerContainer: document.getElementById('winnerContainer'),
    winnerTeam: document.getElementById('winnerTeam')
  };
  
  // MVC-Komponenten initialisieren
  const model = new KoTournamentModel();
  const view = new KoTournamentView(model, elements);
  const controller = new KoTournamentController(model, view);
  
  // Anwendung starten
  await model.loadData();
  controller.init();
  view.renderBracket();
  
  // Auf Authentifizierungsänderungen reagieren
  auth.onAuthStateChanged(function(user) {
    updateAuthStatus();
  });
  
  // Debug-Zugriff auf globale Objekte (optional)
  window.koTournament = {
    model,
    view,
    controller
  };
});