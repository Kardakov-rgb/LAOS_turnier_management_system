import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js';
import { getDatabase, ref, set, get, onValue } from 'https://www.gstatic.com/firebasejs/10.6.0/firebase-database.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js';

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export { database, auth, ref, set, get, onValue };