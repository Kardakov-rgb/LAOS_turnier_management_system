/**
 * LAOS 2.0 - Hauptapplikation für die Statistik-Seite
 * Dieses Script verarbeitet Spieldaten aus Vorrunde und KO-Runde 
 * und berechnet verschiedene Statistiken wie die Bier-Bilanz
 */

// Modul-Importe
import { loadData, saveData, loadAllData, subscribeToData } from './data-module.js';
import { calculateTeamStatistics, sortTeamStats } from './calculation-module.js';
import { tableUI, extendedStatsUI } from './ui-module.js';
// Warten bis das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', async function() {

  // Anwendungszustand
  const appState = {
    // Daten
    teams: [],
    vorrundeMatches: [],
    koMatches: {
      playoff: [],
      quarterfinal: [],
      semifinal: [],
      final: []
    },
    teamStats: [],
    
    // UI-Zustand
    currentSortCol: 'wins',
    currentSortOrder: 'desc',
    currentPhase: 'all',
    
    // Ladeindikator
    isLoading: false
  };
  
  // DOM-Elemente referenzieren
  const elements = {
    // Buttons & Controls
    exportDataBtn: document.getElementById('exportDataBtn'),
    refreshDataBtn: document.getElementById('refreshDataBtn'),
    statusContainer: document.getElementById('statusContainer'),
    phaseButtons: document.querySelectorAll('.phase-btn'),
    updateTimeElement: document.getElementById('updateTime'),
    sortableCols: document.querySelectorAll('.sort-col'),
    mainCategoryButtons: document.querySelectorAll('.main-category-btn'),
    
    // Layout-Container
    tabelleContent: document.getElementById('tabelle-content'),
    erweiterteContent: document.getElementById('erweitert-content'),
    
    // Erweiterte Statistik
    erweitertNavButtons: document.querySelectorAll('.erweitert-nav-btn'),
    toplistenSection: document.getElementById('toplisten-section'),
    teamdetailSection: document.getElementById('teamdetail-section'),
    tableStatsSection: document.getElementById('table-stats-section'),
    teamSelector: document.getElementById('team-selector'),
    
    // Team-Vergleich Elemente
    singleTeamBtn: document.getElementById('single-team-btn'),
    compareTeamsBtn: document.getElementById('compare-teams-btn'),
    singleTeamSelect: document.getElementById('single-team-select'),
    compareTeamsSelect: document.getElementById('compare-teams-select'),
    teamDetailContainer: document.getElementById('team-detail-container'),
    teamCompareContainer: document.getElementById('team-compare-container'),
    compareBtn: document.getElementById('compare-btn'),
    team1Selector: document.getElementById('team1-selector'),
    team2Selector: document.getElementById('team2-selector')
  };
  
  // Initialisiere die Anwendung
  await initializeApp();
  
  /**
   * Initialisiert die Anwendung: Lädt Daten und richtet Event-Listener ein
   */
  async function initializeApp() {
    try {
      // Lade-Indikator setzen
      setIsLoading(true);
      setStatus('Lade Daten...', 'info');
      
      // Daten aus Firebase oder localStorage laden
      const loadedData = await loadAllData();
      
      // Daten im Anwendungszustand speichern
      appState.teams = loadedData.teams;
      appState.vorrundeMatches = loadedData.vorrundeMatches;
      appState.koMatches = loadedData.koMatches;
      
      // Statistiken berechnen oder geladene Statistiken verwenden
      if (loadedData.teamStats && loadedData.teamStats.length > 0) {
        appState.teamStats = loadedData.teamStats;
      } else {
        appState.teamStats = calculateTeamStatistics(
          appState.teams, 
          appState.vorrundeMatches, 
          appState.koMatches
        );
        
        // Berechnete Statistiken speichern
        await saveData('teamStats', appState.teamStats);
      }
      
      // Event-Listener registrieren
      setupEventListeners();
      
      // Echtzeit-Updates einrichten
      setupRealtimeUpdates();
      
      // UI initialisieren
      initializeUI();
      
      // Lade-Indikator zurücksetzen
      setIsLoading(false);
      setStatus('Daten erfolgreich geladen', 'success');
      
      // Aktualisierungszeit setzen
      updateLastUpdateTime();
      setupAutoRefresh();
      console.log('Anwendung erfolgreich initialisiert');
    } catch (error) {
      console.error('Fehler bei der Initialisierung:', error);
      setStatus(`Fehler beim Laden der Daten: ${error.message}`, 'error');
      setIsLoading(false);
    }
  }
  
  /**
   * Richtet alle Event-Listener ein
   */
  function setupEventListeners() {
    // Buttons
    elements.exportDataBtn.addEventListener('click', exportData);
    elements.refreshDataBtn.addEventListener('click', refreshData);
    
    // Phase-Buttons
    elements.phaseButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Aktiven Button setzen
        elements.phaseButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        // Phase speichern und Tabelle aktualisieren
        appState.currentPhase = this.dataset.phase;
        renderTeamStats();
      });
    });
    
    // Sortierbare Spalten
    elements.sortableCols.forEach(col => {
      col.addEventListener('click', function() {
        const sortColumn = this.dataset.sort;
        
        // Wenn gleiche Spalte, dann Sortierrichtung umkehren
        if (sortColumn === appState.currentSortCol) {
          appState.currentSortOrder = appState.currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          // Neue Spalte, Standard-Sortierrichtung (absteigend für die meisten Statistiken)
          appState.currentSortCol = sortColumn;
          appState.currentSortOrder = (sortColumn === 'team') ? 'asc' : 'desc';
        }
        
        // Sortierungs-Indikatoren aktualisieren
        tableUI.updateSortIndicators(appState.currentSortCol, appState.currentSortOrder);
        
        // Tabelle neu rendern
        renderTeamStats();
      });
    });
    
    // Kategorie-Buttons (Tabelle/Erweitert)
    elements.mainCategoryButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Aktiven Button setzen
        elements.mainCategoryButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        // Entsprechenden Inhalt anzeigen
        const category = this.dataset.category;
        showCategory(category);
      });
    });
    
    // Erweiterte Statistik Navigation
    if (elements.erweitertNavButtons) {
      elements.erweitertNavButtons.forEach(button => {
        button.addEventListener('click', function() {
          // Aktiven Button setzen
          elements.erweitertNavButtons.forEach(btn => btn.classList.remove('active'));
          this.classList.add('active');
          
          // Entsprechende Sektion anzeigen
          const section = this.dataset.section;
          extendedStatsUI.showSection(section, {
            teamStats: appState.teamStats,
            vorrundeMatches: appState.vorrundeMatches,
            koMatches: appState.koMatches
          }, appState.teams);
        });
      });
    }
    
    // Team-Selektor
    if (elements.teamSelector) {
      elements.teamSelector.addEventListener('change', function() {
        const selectedTeam = this.value;
        if (selectedTeam) {
          extendedStatsUI.showTeamDetails(
            selectedTeam, 
            appState.teamStats, 
            appState.vorrundeMatches, 
            appState.koMatches
          );
        } else {
          extendedStatsUI.hideTeamDetails();
        }
      });
    }
    
    // Teamvergleich Buttons
    setupTeamCompareEventListeners();
  }
  
  /**
   * Richtet die Event-Listener für den Teamvergleich ein
   */
  function setupTeamCompareEventListeners() {
    if (elements.singleTeamBtn && elements.compareTeamsBtn) {
      // Einzelteam-Ansicht
      elements.singleTeamBtn.addEventListener('click', function() {
        // Button-Darstellung aktualisieren
        elements.singleTeamBtn.classList.add('active');
        elements.compareTeamsBtn.classList.remove('active');
        
        // Ansichten umschalten
        if (elements.singleTeamSelect) elements.singleTeamSelect.style.display = 'block';
        if (elements.compareTeamsSelect) elements.compareTeamsSelect.style.display = 'none';
        if (elements.teamDetailContainer) elements.teamDetailContainer.style.display = 'block';
        if (elements.teamCompareContainer) elements.teamCompareContainer.style.display = 'none';
      });
      
      // Teams-Vergleichs-Ansicht
      elements.compareTeamsBtn.addEventListener('click', function() {
        // Button-Darstellung aktualisieren
        elements.singleTeamBtn.classList.remove('active');
        elements.compareTeamsBtn.classList.add('active');
        
        // Ansichten umschalten
        if (elements.singleTeamSelect) elements.singleTeamSelect.style.display = 'none';
        if (elements.compareTeamsSelect) elements.compareTeamsSelect.style.display = 'flex';
        if (elements.teamDetailContainer) elements.teamDetailContainer.style.display = 'none';
        if (elements.teamCompareContainer) elements.teamCompareContainer.style.display = 'block';
        
        // Team-Selektoren füllen
        extendedStatsUI.populateTeamSelectors(appState.teams);
      });
    }
    
    // Vergleichs-Button
    if (elements.compareBtn) {
      elements.compareBtn.addEventListener('click', function() {
        const team1 = elements.team1Selector.value;
        const team2 = elements.team2Selector.value;
        
        if (team1 && team2) {
          if (team1 === team2) {
            setStatus('Bitte wähle zwei verschiedene Teams für den Vergleich.', 'warning');
            return;
          }
          
          extendedStatsUI.compareTeams(team1, team2, appState.teamStats);
        } else {
          setStatus('Bitte wähle zwei Teams für den Vergleich aus.', 'warning');
        }
      });
    }
  }
  
  /**
   * Richtet Echtzeit-Updates für die Daten ein
   */
  function setupRealtimeUpdates() {
    // Echtzeit-Updates für Vorrunden-Matches
    subscribeToData('vorrundeMatches', (updatedMatches) => {
      if (JSON.stringify(appState.vorrundeMatches) !== JSON.stringify(updatedMatches)) {
        console.log('Vorrunden-Matches wurden aktualisiert, berechne Statistiken neu');
        appState.vorrundeMatches = updatedMatches;
        updateStatistics();
      }
    });
    
    // Echtzeit-Updates für KO-Runden-Matches
    subscribeToData('koMatches', (updatedMatches) => {
      if (JSON.stringify(appState.koMatches) !== JSON.stringify(updatedMatches)) {
        console.log('KO-Matches wurden aktualisiert, berechne Statistiken neu');
        appState.koMatches = updatedMatches;
        updateStatistics();
      }
    });
    
    // Echtzeit-Updates für Teams
    subscribeToData('tournamentTeams', (updatedTeams) => {
      if (JSON.stringify(appState.teams) !== JSON.stringify(updatedTeams)) {
        console.log('Teams wurden aktualisiert, berechne Statistiken neu');
        appState.teams = updatedTeams;
        updateStatistics();
      }
    });
  }
  
  /**
   * Initialisiert die UI-Komponenten
   */
  function initializeUI() {
    // Initialen aktiven Sortierungsstatus setzen
    tableUI.updateSortIndicators(appState.currentSortCol, appState.currentSortOrder);
    
    // Tabelle rendern
    renderTeamStats();
    
    // Standardkategorie anzeigen (Tabelle)
    showCategory('tabelle');
  }
  
  /**
   * Rendert die Team-Statistiken-Tabelle
   */
  function renderTeamStats() {
    tableUI.renderTeamStats(
      appState.teamStats, 
      appState.currentSortCol, 
      appState.currentSortOrder, 
      appState.currentPhase
    );
  }
  
  /**
   * Zeigt die ausgewählte Kategorie an (Tabelle oder Erweiterte Statistik)
   * @param {string} category - Die anzuzeigende Kategorie
   */
  function showCategory(category) {
    if (category === 'tabelle') {
      elements.tabelleContent.style.display = 'block';
      elements.erweiterteContent.style.display = 'none';
      
      // Tabelle neu rendern
      renderTeamStats();
    } else if (category === 'erweitert') {
      elements.tabelleContent.style.display = 'none';
      elements.erweiterteContent.style.display = 'block';
      
      // Erweiterte Statistik initialisieren
      if (document.querySelector('.erweitert-nav-btn.active')) {
        const activeSection = document.querySelector('.erweitert-nav-btn.active').dataset.section;
        extendedStatsUI.showSection(activeSection, {
          teamStats: appState.teamStats,
          vorrundeMatches: appState.vorrundeMatches,
          koMatches: appState.koMatches
        }, appState.teams);
      } else if (document.querySelector('.erweitert-nav-btn')) {
        // Standardmäßig die erste Sektion anzeigen
        const firstSection = document.querySelector('.erweitert-nav-btn').dataset.section;
        extendedStatsUI.showSection(firstSection, {
          teamStats: appState.teamStats,
          vorrundeMatches: appState.vorrundeMatches,
          koMatches: appState.koMatches
        }, appState.teams);
      }
    }
  }
  
  /**
   * Aktualisiert die Statistiken basierend auf den aktuellen Daten
   */
  async function updateStatistics() {
    try {
      // Statistiken neu berechnen
      appState.teamStats = calculateTeamStatistics(
        appState.teams, 
        appState.vorrundeMatches, 
        appState.koMatches
      );
      
      // Berechnete Statistiken speichern
      await saveData('teamStats', appState.teamStats);
      
      // UI aktualisieren
      renderTeamStats();
      
      // Wenn erweiterte Statistik angezeigt wird, diese aktualisieren
      if (elements.erweiterteContent.style.display === 'block' && 
          document.querySelector('.erweitert-nav-btn.active')) {
        const activeSection = document.querySelector('.erweitert-nav-btn.active').dataset.section;
        extendedStatsUI.showSection(activeSection, {
          teamStats: appState.teamStats,
          vorrundeMatches: appState.vorrundeMatches,
          koMatches: appState.koMatches
        }, appState.teams);
      }
      
      // Aktualisierungszeit aktualisieren
      updateLastUpdateTime();
      
      setStatus('Statistiken erfolgreich aktualisiert', 'success');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Statistiken:', error);
      setStatus(`Fehler beim Aktualisieren der Statistiken: ${error.message}`, 'error');
    }
  }
  
  /**
   * Setzt den Lade-Zustand der Anwendung
   * @param {boolean} loading - Lade-Zustand
   */
  function setIsLoading(loading) {
    appState.isLoading = loading;
    
    // UI-Elemente entsprechend aktivieren/deaktivieren
    elements.refreshDataBtn.disabled = loading;
    elements.exportDataBtn.disabled = loading;
    
    // Lade-Indikator anzeigen
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = loading ? 'block' : 'none';
    }
  }
  
  /**
   * Aktualisiert die Anzeige der letzten Aktualisierungszeit
   */
  function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    elements.updateTimeElement.textContent = timeString;
  }
  
  /**
   * Setzt einen Status-Text
   * @param {string} message - Die Statusmeldung
   * @param {string} type - Der Statustyp (info, success, warning, error)
   */
  function setStatus(message, type = 'info') {
    elements.statusContainer.className = 'status-container visible';
    elements.statusContainer.classList.add(`status-${type}`);
    elements.statusContainer.textContent = message;
    
    // Status nach einigen Sekunden ausblenden
    setTimeout(() => {
      elements.statusContainer.classList.remove('visible');
    }, 5000);
  }
  
  /**
   * Aktualisiert die Daten aus Firebase/localStorage
   */
  async function refreshData() {
    try {
      setIsLoading(true);
      setStatus('Aktualisiere Daten...', 'info');
      
      // Daten neu laden
      const loadedData = await loadAllData();
      
      // Daten aktualisieren
      appState.teams = loadedData.teams;
      appState.vorrundeMatches = loadedData.vorrundeMatches;
      appState.koMatches = loadedData.koMatches;
      
      // Statistiken neu berechnen
      await updateStatistics();
      
      setIsLoading(false);
      setStatus('Daten erfolgreich aktualisiert', 'success');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Daten:', error);
      setStatus(`Fehler beim Aktualisieren der Daten: ${error.message}`, 'error');
      setIsLoading(false);
    }
  }
  function setupAutoRefresh() {
    console.log('Auto-Refresh aktiviert: Daten werden alle 5 Sekunden aktualisiert');
    

  }
  /**
   * Exportiert die Statistik-Daten als JSON-Datei
   */
  function exportData() {
    // Daten für Export vorbereiten
    const exportData = {
      teamStats: appState.teamStats,
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
    a.download = 'laos_statistik.json';
    
    // Link anklicken, um Download zu starten
    document.body.appendChild(a);
    a.click();
    
    // Link entfernen
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setStatus('Statistik-Daten wurden als JSON-Datei exportiert', 'success');
  }


  /**
 * Richtet einen automatischen Aktualisierungszyklus ein
 */
function setupAutoRefresh() {
    console.log('Auto-Refresh aktiviert: Daten werden alle 5 Sekunden aktualisiert');
    
    // Intervall zum Aktualisieren der Daten
    setInterval(async () => {
      console.log('Auto-Refresh: Aktualisiere Daten...');
      await refreshData();
    }, 5000); // 5000 Millisekunden = 5 Sekunden
  }
});