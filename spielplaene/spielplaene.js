import dataService from '../global/data-service.js';
import authService from '../global/auth-service.js';

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('dashboardGrid');
    const emptyState = document.getElementById('emptyState');
    const authHint = document.getElementById('authHint');
    const activeHint = document.getElementById('activeHint');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('scheduleUploadInput');

    let schedules = {};
    let currentTeamCount = 0;

    // Upload-Button öffnet Dateiauswahl
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleUpload(e.target.files[0]);
        e.target.value = '';
    });

    // Auth-Status beobachten → UI dynamisch aktualisieren
    authService.onStateChange((user) => {
        authHint.style.display = user ? 'none' : 'block';
    });

    // Aktuelle Teamanzahl laden (für Aktiv-Badge und Hinweis)
    try {
        const teams = await dataService.getData('tournamentTeams') || [];
        currentTeamCount = teams.length;
    } catch (_) {
        currentTeamCount = 0;
    }

    // Spielpläne initial laden + Echtzeit-Sync
    dataService.subscribeToData('tournamentSchedules', (updated) => {
        schedules = (updated && typeof updated === 'object' && !Array.isArray(updated)) ? updated : {};
        // lastUpdated-Key aus dataService entfernen
        delete schedules.lastUpdated;
        renderDashboard();
    });

    // Initialer Load (subscribeToData ruft Callback sofort auf, aber sicherheitshalber auch direkt laden)
    try {
        const loaded = await dataService.getData('tournamentSchedules') || {};
        if (typeof loaded === 'object' && !Array.isArray(loaded)) {
            schedules = { ...loaded };
            delete schedules.lastUpdated;
        }
        renderDashboard();
    } catch (_) {
        renderDashboard();
    }

    function renderDashboard() {
        const keys = Object.keys(schedules).filter(k => k !== 'lastUpdated');

        // Aktiv-Hinweis
        if (currentTeamCount > 0) {
            const hasActive = keys.includes(String(currentTeamCount));
            activeHint.style.display = 'block';
            if (hasActive) {
                activeHint.textContent = `✅ Aktuell sind ${currentTeamCount} Teams eingetragen – der Plan für ${currentTeamCount} Teams wird automatisch verwendet.`;
            } else {
                activeHint.textContent = `⚠️ Aktuell sind ${currentTeamCount} Teams eingetragen, aber kein Spielplan für ${currentTeamCount} Teams hinterlegt. Die Vorrunde verwendet den automatischen Algorithmus.`;
                activeHint.style.background = 'rgba(255, 160, 0, 0.12)';
                activeHint.style.borderColor = 'rgba(255, 160, 0, 0.4)';
                activeHint.style.color = '#ffd080';
            }
        } else {
            activeHint.style.display = 'none';
        }

        if (keys.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        const sorted = keys.slice().sort((a, b) => parseInt(a) - parseInt(b));

        grid.innerHTML = sorted.map(key => {
            const plan = schedules[key];
            const isActive = parseInt(key) === currentTeamCount;
            const date = plan.uploadedAt ? new Date(plan.uploadedAt).toLocaleDateString('de-DE') : '–';

            return `
            <div class="sp-card ${isActive ? 'is-active' : ''}">
                <div class="sp-card-header">
                    <div class="sp-card-teams">${key} Teams</div>
                    ${isActive ? '<span class="sp-card-badge active">Aktiv</span>' : ''}
                </div>
                <div class="sp-card-filename">📄 ${plan.fileName || 'unbekannt'}</div>
                <div class="sp-card-meta">
                    <span>🔄 ${plan.roundCount ?? plan.rounds?.length ?? '?'} Runden</span>
                    <span>⚽ ${plan.matchCount ?? '?'} Spiele</span>
                    <span>📅 ${date}</span>
                </div>
                <div class="sp-card-footer">
                    <button class="sp-delete-btn" data-key="${key}">🗑️ Löschen</button>
                </div>
            </div>`;
        }).join('');

        // Delete-Listener
        grid.querySelectorAll('.sp-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteSchedule(btn.dataset.key));
        });
    }

    async function handleUpload(file) {
        try {
            const text = await file.text();
            const schedule = JSON.parse(text);

            if (typeof schedule.teamCount !== 'number' || !Array.isArray(schedule.rounds)) {
                showToast('Ungültige Datei: "teamCount" oder "rounds" fehlt.', 'error');
                return;
            }

            const key = String(schedule.teamCount);
            if (schedules[key]) {
                if (!confirm(`Es existiert bereits ein Plan für ${schedule.teamCount} Teams. Überschreiben?`)) return;
            }

            const roundCount = schedule.rounds.length;
            const matchCount = schedule.rounds.reduce((sum, r) => sum + r.matches.length, 0);

            const entry = {
                teamCount: schedule.teamCount,
                rounds: schedule.rounds,
                fileName: file.name,
                uploadedAt: new Date().toISOString(),
                roundCount,
                matchCount
            };

            schedules[key] = entry;
            await dataService.saveData('tournamentSchedules', schedules);
            showToast(`Plan für ${schedule.teamCount} Teams gespeichert (${roundCount} Runden, ${matchCount} Spiele).`, 'success');
            renderDashboard();
        } catch (err) {
            console.error('Upload-Fehler:', err);
            showToast(`Fehler beim Importieren: ${err.message}`, 'error');
        }
    }

    async function deleteSchedule(key) {
        if (!confirm(`Spielplan für ${key} Teams wirklich löschen?`)) return;
        delete schedules[key];
        await dataService.saveData('tournamentSchedules', schedules);
        showToast(`Plan für ${key} Teams gelöscht.`, 'success');
        renderDashboard();
    }

    function showToast(message, type = 'error') {
        const existing = document.querySelector('.app-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'toast app-toast';
        toast.style.cssText = `background:${type === 'error' ? 'rgba(213,15,13,0.92)' : 'rgba(0,130,70,0.92)'};color:white;`;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 4500);
    }
});
