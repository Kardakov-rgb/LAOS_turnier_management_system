import { auth } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this._listeners = [];

    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this._listeners.forEach(cb => cb(user));
    });
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  async login(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async logout() {
    await signOut(auth);
  }

  onStateChange(callback) {
    this._listeners.push(callback);
    // Sofort aktuellen Status mitteilen
    callback(this.currentUser);
  }
}

const authService = new AuthService();
export default authService;
