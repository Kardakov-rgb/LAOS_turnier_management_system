// data-service.js
import { database, ref, set, get, onValue } from './firebase-config.js';
import authService from './auth-service.js';

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
      if (!authService.isLoggedIn()) {
        this._showAuthToast();
        return false;
      }
      try {
        await set(ref(database, key), dataToSave);
        return true;
      } catch (error) {
        if (error.code === 'PERMISSION_DENIED') {
          this._showAuthToast();
        } else {
          console.error("Firebase Speicherfehler:", error);
          this.addPendingUpdate(key, dataToSave);
        }
        return false;
      }
    } else {
      this.addPendingUpdate(key, dataToSave);
      return false;
    }
  }

  _showAuthToast() {
    const existing = document.getElementById('auth-toast');
    if (existing) return;

    const toast = document.createElement('div');
    toast.id = 'auth-toast';
    toast.style.cssText = `
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
      background:rgba(213,15,13,0.9); color:white; padding:0.75rem 1.4rem;
      border-radius:8px; font-family:var(--font-primary); font-size:0.9rem;
      z-index:2000; box-shadow:0 4px 20px rgba(0,0,0,0.4);
      animation: fadeInUp 0.3s ease;
    `;
    toast.textContent = '🔒 Nicht eingeloggt – bitte zuerst als Admin anmelden.';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
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
      return Array.isArray(data.value) ? data.value : []; // Sicherstellen, dass ein Array zurückgegeben wird
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
      return Array.isArray(data.value) ? data.value : []; // Sicherstellen, dass ein Array zurückgegeben wird
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
                if (data.type === 'array' && Array.isArray(data.value)) {
                    callback(data.value); // Array zurückgeben
                } else if (data.type === 'array') {
                    // Fallback, wenn data.value fehlt oder kein Array ist
                    console.warn('Array-Daten ohne gültiges value-Array empfangen:', data);
                    callback([]); // Leeres Array als Fallback
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