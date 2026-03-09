/**
 * status.js — Gemeinsames Utility für Status-Nachrichten
 *
 * Erstellt eine seitenspezifische setStatus-Funktion, die an einen
 * DOM-Container gebunden ist. Verhindert Code-Duplizierung.
 *
 * Verwendung:
 *   import { createStatusHelper } from '../global/status.js';
 *   const setStatus = createStatusHelper(document.getElementById('statusContainer'));
 *   setStatus('Gespeichert!', 'success');
 *
 * @param {HTMLElement} container - Der Status-Container
 * @returns {Function} setStatus(message, type)
 */
export function createStatusHelper(container) {
    return function setStatus(message, type = 'info') {
        if (!container) return;
        container.className = `status-container status-${type}`;
        container.textContent = message;

        // Status nach 5 Sekunden automatisch ausblenden
        setTimeout(() => {
            container.classList.remove(`status-${type}`);
            container.className = 'status-container';
        }, 5000);
    };
}
