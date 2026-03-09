// firebase-config.js - OHNE Auth-Management
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js';
import { getDatabase, ref, set, get, onValue } from 'https://www.gstatic.com/firebasejs/10.6.0/firebase-database.js';

// Firebase-Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyCErBTiPU7xnW1K-GdYaUxm2nc_-G5bycE",
  authDomain: "laos-turniermanager.firebaseapp.com",
  databaseURL: "https://laos-turniermanager-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "laos-turniermanager",
  storageBucket: "laos-turniermanager.firebasestorage.app",
  messagingSenderId: "237233942330",
  appId: "1:237233942330:web:b71614e498175b8266aa03",
  measurementId: "G-2QRQBNG5NV"
};

// Firebase-App initialisieren
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

console.log("Firebase initialisiert");

// Exportiere nur die benötigten Funktionen und Objekte
export { 
  database, 
  ref, 
  set, 
  get, 
  onValue
};