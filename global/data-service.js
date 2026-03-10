// data-service.js
import { database, ref, set, get, onValue } from './firebase-config.js';

class DataService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingUpdates = [];
    this.statusListeners = []; // Neue Zeile: Array für Status-Listener hinzufügen
    
    // Online-Status überwachen
    window.addEventListener('online', this.handleOnlineStatus.bind(this));
    window.addEventListener('offline', this.handleOnlineStatus.bind(this));
  }
  
  // Neue Methode: Status-Listener hinzufügen
  addStatusListener(callback) {
    this.statusListeners.push(callback);
    // Sofort den aktuellen Status mitteilen
    callback(this.isOnline);
  }
  
  // Online-Status aktualisieren - mit Benachrichtigung an Listener
  handleOnlineStatus() {
    this.isOnline = navigator.onLine;
    console.log(`Verbindungsstatus: ${this.isOnline ? 'Online' : 'Offline'}`);
    
    // Wenn wieder online, versuche, ausstehende Updates zu synchronisieren
    if (this.isOnline) {
      this.syncPendingUpdates();
    }
    
    // Status-Listener benachrichtigen - neue Zeile
    this.statusListeners.forEach(listener => listener(this.isOnline));
  }
  
  // KORRIGIERTE VERSION: Daten speichern
  async saveData(key, data) {
    let dataToSave;
    
    // Prüfe, ob es sich um ein Array handelt und behandle es entsprechend
    if (Array.isArray(data)) {
        // Für Arrays: Das Array selbst als Wert im Objekt speichern
        dataToSave = {
            type: 'array',
            value: data, // Stelle sicher, dass value vorhanden ist
            lastUpdated: new Date().toISOString()
        };
    } else {
        // Für andere Objekte: Wie bisher
        dataToSave = {
            ...data,
            lastUpdated: new Date().toISOString()
        };
    }
    
    // Immer in localStorage speichern
    localStorage.setItem(key, JSON.stringify(dataToSave));
    
    // Wenn online, in Firebase speichern
    if (this.isOnline) {
      try {
        await set(ref(database, key), dataToSave);
        return true;
      } catch (error) {
        console.error("Firebase Speicherfehler:", error);
        // Füge Update zur Warteschlange hinzu
        this.addPendingUpdate(key, dataToSave);
        return false;
      }
    } else {
      // Füge Update zur Warteschlange hinzu
      this.addPendingUpdate(key, dataToSave);
      return false;
    }
  }
  
  // KORRIGIERTE VERSION: Daten laden
// Änderung in der getData-Methode der DataService-Klasse
async getData(key) {
  try {
    let data = null;
    
    if (this.isOnline) {
      // Von Firebase laden
      const snapshot = await get(ref(database, key));
      data = snapshot.val();
      
      if (data) {
        // In localStorage aktualisieren
        localStorage.setItem(key, JSON.stringify(data));
      }
    }
    
    // Falls kein Online-Daten, aus localStorage laden
    if (!data) {
      const localData = localStorage.getItem(key);
      data = localData ? JSON.parse(localData) : null;
    }
    
    // Datenstruktur prüfen und ggf. Array zurückgeben
    if (data && data.type === 'array') {
      if (Array.isArray(data.value)) return data.value;
      // Firebase konvertiert Arrays zu Objekten -> zurück konvertieren
      if (data.value && typeof data.value === 'object') return Object.values(data.value);
      return [];
    }

    // Wenn data null ist oder kein Array, gib ein leeres Array zurück für Array-Keys
    if (key === 'tournamentTeams' && (!data || !data.value)) {
      return [];
    }

    return data;

  } catch (error) {
    console.error("Fehler beim Laden der Daten:", error);
    // Aus localStorage laden als Fallback
    const localData = localStorage.getItem(key);
    const data = localData ? JSON.parse(localData) : null;

    // Datenstruktur prüfen und ggf. Array zurückgeben
    if (data && data.type === 'array') {
      if (Array.isArray(data.value)) return data.value;
      if (data.value && typeof data.value === 'object') return Object.values(data.value);
      return [];
    }
    
    // Wenn data null ist oder kein Array, gib ein leeres Array zurück für Array-Keys
    if (key === 'tournamentTeams' && (!data || !data.value)) {
      return [];
    }
    
    return data;
  }
}
  
  // KORRIGIERTE VERSION: Echtzeitaktualisierungen überwachen
  subscribeToData(key, callback) {
    if (this.isOnline) {
        // Firebase-Listener einrichten
        const dataRef = ref(database, key);
        onValue(dataRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // In localStorage aktualisieren
                localStorage.setItem(key, JSON.stringify(data));
                
                // Datenstruktur prüfen und ggf. Array zurückgeben
                // Wichtig: Firebase konvertiert Arrays zu Objekten {0: ..., 1: ...}
                if (data.type === 'array') {
                    if (Array.isArray(data.value)) {
                        callback(data.value);
                    } else if (data.value && typeof data.value === 'object') {
                        // Firebase hat Array zu Objekt konvertiert -> zurück konvertieren
                        callback(Object.values(data.value));
                    } else {
                        callback([]);
                    }
                } else {
                    callback(data);
                }
            }
        });
    }
}
  
  // Ausstehende Updates zur Warteschlange hinzufügen
  addPendingUpdate(key, data) {
    this.pendingUpdates.push({ key, data });
    localStorage.setItem('pendingUpdates', JSON.stringify(this.pendingUpdates));
  }
  
  // Versuche, ausstehende Updates zu synchronisieren
  async syncPendingUpdates() {
    // Lade ausstehende Updates
    const pendingUpdatesStr = localStorage.getItem('pendingUpdates');
    this.pendingUpdates = pendingUpdatesStr ? JSON.parse(pendingUpdatesStr) : [];
    
    if (this.pendingUpdates.length === 0) return;
    
    console.log(`Synchronisiere ${this.pendingUpdates.length} ausstehende Updates...`);
    
    // Kopiere die Liste, damit wir sie während der Verarbeitung ändern können
    const updates = [...this.pendingUpdates];
    this.pendingUpdates = [];
    
    for (const update of updates) {
      try {
        await set(ref(database, update.key), update.data);
        console.log(`Update für ${update.key} erfolgreich synchronisiert`);
      } catch (error) {
        console.error(`Fehler beim Synchronisieren von ${update.key}:`, error);
        // Füge fehlgeschlagene Updates wieder zur Warteschlange hinzu
        this.pendingUpdates.push(update);
      }
    }
    
    // Speichere die aktualisierte Warteschlange
    localStorage.setItem('pendingUpdates', JSON.stringify(this.pendingUpdates));
    
    if (this.pendingUpdates.length === 0) {
      console.log("Alle Updates erfolgreich synchronisiert!");
    } else {
      console.log(`${this.pendingUpdates.length} Updates konnten nicht synchronisiert werden.`);
    }
  }
  
  // Online-Status abfragen
  isConnected() {
    return this.isOnline;
  }

  // Neue Methode zum Abfragen der ausstehenden Updates
  getPendingUpdatesCount() {
    return this.pendingUpdates.length;
  }
}

// Erstelle eine einzelne Instanz, die in der gesamten App verwendet wird
const dataService = new DataService();
export default dataService;