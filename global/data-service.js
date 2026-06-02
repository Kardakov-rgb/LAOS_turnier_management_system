// data-service.js
import { database, ref, set, get, onValue } from './firebase-config.js';
import authService from './auth-service.js';

class DataService {
  constructor() {
    this.isOnline = navigator.onLine;
    this._bootedOffline = !navigator.onLine;
    this.pendingUpdates = [];
    this.statusListeners = [];

    // Online-Status überwachen
    window.addEventListener('online', this.handleOnlineStatus.bind(this));
    window.addEventListener('offline', this.handleOnlineStatus.bind(this));

    // Offline-Banner initialisieren sobald DOM bereit ist
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._initOfflineBanner());
    } else {
      this._initOfflineBanner();
    }
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

    this.statusListeners.forEach(listener => listener(this.isOnline));
    this._updateBanner();
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
  
  // Echtzeitaktualisierungen überwachen — gibt Unsubscribe-Funktion zurück
  subscribeToData(key, callback) {
    if (!this.isOnline) {
      // Offline: Callback einmalig mit gecachten localStorage-Daten aufrufen
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw);
          if (data && data.type === 'array') {
            callback(Array.isArray(data.value) ? data.value : []);
          } else if (data) {
            callback(data);
          }
        }
      } catch (e) {
        console.warn(`Offline: Fehler beim Lesen von ${key} aus localStorage`, e);
      }
      return () => {};
    }

    const dataRef = ref(database, key);
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        localStorage.setItem(key, JSON.stringify(data));
        if (data.type === 'array' && Array.isArray(data.value)) {
          callback(data.value);
        } else if (data.type === 'array') {
          console.warn('Array-Daten ohne gültiges value-Array empfangen:', data);
          callback([]);
        } else {
          callback(data);
        }
      }
    });
    return unsubscribe;
  }
  
  _initOfflineBanner() {
    if (document.getElementById('offline-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.style.cssText = `
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0;
      background: rgba(180, 100, 0, 0.95);
      color: #fff;
      font-family: var(--font-primary, monospace);
      font-size: 0.85rem;
      padding: 0.55rem 1rem;
      text-align: center;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    `;
    document.body.prepend(banner);
    this._updateBanner();
  }

  _updateBanner() {
    const banner = document.getElementById('offline-banner');
    if (!banner) return;

    if (this.isOnline) {
      if (this._bootedOffline) {
        banner.style.display = 'block';
        banner.style.background = 'rgba(0, 120, 60, 0.95)';
        banner.innerHTML = `✅ Verbindung wiederhergestellt – <button onclick="location.reload()" style="margin-left:0.5rem;background:white;color:#006030;border:none;border-radius:4px;padding:0.2rem 0.6rem;font-family:inherit;font-size:0.85rem;cursor:pointer;">Seite neu laden</button>`;
      } else {
        banner.style.display = 'none';
      }
    } else {
      banner.style.display = 'block';
      banner.style.background = 'rgba(180, 100, 0, 0.95)';
      banner.textContent = '⚠️ Offline-Modus – Daten werden aus dem lokalen Speicher geladen';
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
    
    if (!authService.isLoggedIn()) {
      console.warn('Sync übersprungen: kein Admin-Login.');
      this.pendingUpdates = updates;
      localStorage.setItem('pendingUpdates', JSON.stringify(this.pendingUpdates));
      return;
    }

    for (const update of updates) {
      try {
        await set(ref(database, update.key), update.data);
      } catch (error) {
        console.error(`Fehler beim Synchronisieren von ${update.key}:`, error);
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