/**
 * data-module.js
 * Zentrales Modul für das Laden und Verwalten von Daten aus Firebase und localStorage
 */

import dataService from '../global/data-service.js';

// Standardwerte für leere Datenstrukturen
const EMPTY_DEFAULTS = {
  'tournamentTeams': [],
  'vorrundeMatches': [],
  'koMatches': {
    playoff: [],
    quarterfinal: [],
    semifinal: [],
    final: []
  },
  'teamStats': []
};

/**
 * Lädt Daten mit Priorität aus Firebase, Fallback auf localStorage
 * @param {string} key - Der Schlüssel für die zu ladenden Daten
 * @returns {Promise<any>} - Die geladenen Daten
 */
export async function loadData(key) {
  try {
    // Status im UI anzeigen
    updateLoadingStatus(`Lade ${key} aus Firebase...`, 'info');
    
    // Versuch, Daten von Firebase zu laden
    const data = await dataService.getData(key);
    if (data) {
      console.log(`${key} erfolgreich aus Firebase geladen`);
      
      // Daten im localStorage aktualisieren für Offline-Nutzung
      localStorage.setItem(key, JSON.stringify(data));
      
      return data;
    }
    
    // Fallback auf localStorage, wenn keine Daten von Firebase
    console.log(`Keine ${key}-Daten in Firebase gefunden, verwende localStorage`);
    const localData = JSON.parse(localStorage.getItem(key));
    return localData || getEmptyDefault(key);
  } catch (error) {
    console.error(`Fehler beim Laden von ${key}:`, error);
    updateLoadingStatus(`Offline-Modus: Verwende lokale ${key}-Daten`, 'warning');
    
    // Fallback auf localStorage bei Fehlern
    const localData = JSON.parse(localStorage.getItem(key));
    return localData || getEmptyDefault(key);
  }
}

/**
 * Speichert Daten sowohl in Firebase als auch im localStorage
 * @param {string} key - Der Schlüssel für die zu speichernden Daten
 * @param {any} data - Die zu speichernden Daten
 * @returns {Promise<boolean>} - true bei Erfolg, false bei Fehler
 */
export async function saveData(key, data) {
  try {
    // Daten immer im localStorage speichern
    localStorage.setItem(key, JSON.stringify(data));
    
    // Versuche, Daten in Firebase zu speichern
    const success = await dataService.saveData(key, data);
    
    if (success) {
      console.log(`${key} erfolgreich in Firebase gespeichert`);
      updateLoadingStatus(`${key} erfolgreich gespeichert`, 'success');
    } else {
      console.log(`${key} lokal gespeichert. Wird synchronisiert, sobald wieder online.`);
      updateLoadingStatus(`${key} lokal gespeichert. Wird synchronisiert, sobald wieder online.`, 'info');
    }
    
    return true;
  } catch (error) {
    console.error(`Fehler beim Speichern von ${key}:`, error);
    updateLoadingStatus(`Fehler beim Speichern von ${key}. Daten wurden nur lokal gespeichert.`, 'error');
    return false;
  }
}

/**
 * Abonniert Änderungen an Daten in Echtzeit
 * @param {string} key - Der Schlüssel für die zu beobachtenden Daten
 * @param {Function} callback - Die Callback-Funktion für Datenänderungen
 */
export function subscribeToData(key, callback) {
  dataService.subscribeToData(key, (data) => {
    // Daten im localStorage aktualisieren
    localStorage.setItem(key, JSON.stringify(data));
    
    // Callback mit den aktualisierten Daten aufrufen
    callback(data);
    
    console.log(`${key} durch Firebase-Update aktualisiert`);
  });
  
  console.log(`Echtzeit-Aktualisierungen für ${key} aktiviert`);
}

/**
 * Liefert den leeren Standardwert für einen Schlüssel
 * @param {string} key - Der Schlüssel
 * @returns {any} - Der leere Standardwert
 */
function getEmptyDefault(key) {
  return EMPTY_DEFAULTS[key] || null;
}

/**
 * Aktualisiert den Ladestatus in der UI
 * @param {string} message - Die Statusmeldung
 * @param {string} type - Der Statustyp (info, success, warning, error)
 */
function updateLoadingStatus(message, type) {
  const statusContainer = document.getElementById('statusContainer');
  if (!statusContainer) return;
  
  statusContainer.className = 'status-container visible';
  statusContainer.classList.add(`status-${type}`);
  statusContainer.textContent = message;
  
  // Status nach 5 Sekunden ausblenden
  setTimeout(() => {
    statusContainer.classList.remove('visible');
  }, 5000);
}

/**
 * Lädt alle benötigten Daten aus Firebase/localStorage
 * @returns {Promise<Object>} - Objekt mit allen geladenen Daten
 */
export async function loadAllData() {
  try {
    const loadedData = {
      teams: await loadData('tournamentTeams'),
      vorrundeMatches: await loadData('vorrundeMatches'),
      koMatches: await loadData('koMatches'),
      teamStats: await loadData('teamStats')
    };
    
    updateLoadingStatus('Alle Daten erfolgreich geladen', 'success');
    return loadedData;
  } catch (error) {
    console.error('Fehler beim Laden aller Daten:', error);
    updateLoadingStatus('Fehler beim Laden der Daten. Verwende lokale Daten.', 'error');
    
    // Fallback: Alle Daten aus dem localStorage laden
    return {
      teams: JSON.parse(localStorage.getItem('tournamentTeams')) || [],
      vorrundeMatches: JSON.parse(localStorage.getItem('vorrundeMatches')) || [],
      koMatches: JSON.parse(localStorage.getItem('koMatches')) || EMPTY_DEFAULTS.koMatches,
      teamStats: JSON.parse(localStorage.getItem('teamStats')) || []
    };
  }
}