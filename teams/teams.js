/**
 * LAOS 2.0 - JavaScript für die Teams-Seite
 * Dieses Script implementiert die Team-Verwaltung mit localStorage
 */
// Import des DataService
import dataService from '../global/data-service.js';


// Warten bis das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', async function() {   
    // Initialize auth module first
    console.log("DOM geladen, initialisiere Auth");

    // Teams aus localStorage laden oder leeres Array initialisieren
    let teams = [];

    // Teams laden (asynchron)
    try {
        const loadedTeams = await dataService.getData('tournamentTeams');
        if (loadedTeams) {
            teams = loadedTeams;
            console.log('Teams erfolgreich geladen:', teams.length);
        } else {
            console.log('Keine gespeicherten Teams gefunden');
        }
    } catch (error) {
        console.error('Fehler beim Laden der Teams:', error);
    }  
    // Teams anzeigen
    renderTeams();
    
    // Event-Listener für Hinzufügen-Button
    addTeamBtn.addEventListener('click', addTeam);
    
    // Event-Listener für Enter-Taste im Input-Feld
    teamNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTeam();
        }
    });
    
    // Event-Listener für Export-Button
    exportTeamsBtn.addEventListener('click', exportTeams);
    
    // Event-Listener für Reset-Button
    resetTeamsBtn.addEventListener('click', function() {
        if (confirm('ACHTUNG: Möchtest du wirklich ALLE Daten komplett löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            resetAllData();
        }
    });
    
    fillTeamsBtn.addEventListener('click', fillTeamsToTwentyFour);
/**
 * Füllt die Teamliste auf 24 Teams auf
 */
function fillTeamsToTwentyFour() {
    console.log('Fülle auf 24 Teams auf');

    // Bestimmen, wie viele Teams noch hinzugefügt werden müssen
    const currentCount = teams.length;
    const neededTeams = Math.max(0, 24 - currentCount);
    
    if (neededTeams === 0) {
        alert('Es sind bereits 24 oder mehr Teams vorhanden!');
        return;
    }
    
    // Liste mit kreativen Teamnamen für Bierpong
    const bierpongTeams = [
        "Beer Pressure", "Pong Stars", "The Alcoholics", "Ball Busters", 
        "Brew Crew", "Beer Pong Ninjas", "Shots Fired", "The Drinking Team",
        "Pour Decisions", "The Sloshed Squad", "Beer Goggles", "Just the Tip",
        "Chug Life", "Cup Hunters", "The Liver Killers", "Beerpocalypse",
        "Cup Crusaders", "The Pin-Ball Wizards", "Hop Scotch", "Drunken Masters",
        "The Keg Stands", "Pint of No Return", "The Beer Bros", "Ale-iens",
        "Gin & Juice", "Frat Flash", "The Brew Crew", "Liquid Courage",
        "Tipsy Titans", "Malt Masters", "Buzzed Brigade", "Hop Till You Drop",
        "Malted Milk", "The Suds Squad", "Pitcher Perfect", "Brew Tribe"
    ];
    
    // Zufällige Auswahl der Teams ohne Duplikate
    const selectedTeams = [];
    const usedIndices = new Set();
    
    // Bereits vorhandene Teams aus der Auswahl ausschließen
    const existingTeamNames = new Set(teams.map(name => name.toLowerCase()));
    
    // Zufällige Teams auswählen
    while (selectedTeams.length < neededTeams && usedIndices.size < bierpongTeams.length) {
        const randomIndex = Math.floor(Math.random() * bierpongTeams.length);
        
        if (!usedIndices.has(randomIndex)) {
            const teamName = bierpongTeams[randomIndex];
            
            // Prüfen, ob das Team bereits existiert (case-insensitive)
            if (!existingTeamNames.has(teamName.toLowerCase())) {
                selectedTeams.push(teamName);
            }
            
            usedIndices.add(randomIndex);
        }
    }
    
    // Wenn nicht genug einzigartige Teams gefunden wurden, generiere nummerierte Teams
    if (selectedTeams.length < neededTeams) {
        const remaining = neededTeams - selectedTeams.length;
        
        for (let i = 1; i <= remaining; i++) {
            let testTeamName = `Test Team ${i}`;
            let counter = 1;
            
            // Wenn der Name bereits existiert, Zähler erhöhen
            while (existingTeamNames.has(testTeamName.toLowerCase())) {
                testTeamName = `Test Team ${i} (${counter})`;
                counter++;
            }
            
            selectedTeams.push(testTeamName);
            existingTeamNames.add(testTeamName.toLowerCase());
        }
    }
    
    // Hinzufügen der ausgewählten Teams
    selectedTeams.forEach(teamName => {
        teams.push(teamName);
    });
    
    // Teams speichern und anzeigen
    saveTeams();
    renderTeams();
    
    console.log(`${selectedTeams.length} Teams hinzugefügt, insgesamt jetzt ${teams.length} Teams`);
    alert(`${selectedTeams.length} Teams wurden hinzugefügt. Du hast jetzt insgesamt ${teams.length} Teams.`);
}

    /**
     * Fügt ein neues Team hinzu
     */
    async function addTeam() {
                const teamName = teamNameInput.value.trim();
        
        if (teamName === '') {
            // Fehlerhafte Eingabe
            teamNameInput.classList.add('error');
            setTimeout(() => {
                teamNameInput.classList.remove('error');
            }, 1000);
            console.log('Fehler: Kein Teamname eingegeben');
            return;
        }
        
        // Überprüfen, ob der Teamname bereits existiert
        if (teams.includes(teamName)) {
            console.log('Fehler: Ein Team mit diesem Namen existiert bereits');
            return;
        }
        
        // Neues Team hinzufügen (als einfacher String)
        teams.push(teamName);
        
        // Teams speichern und neu rendern
        await saveTeams();
        renderTeams();
        
        // Input-Feld zurücksetzen
        teamNameInput.value = '';
        teamNameInput.focus();
        
        // Erfolgsmeldung
        console.log(`Team "${teamName}" erfolgreich hinzugefügt`);
    }
    
    /**
     * Zeigt alle Teams an
     */
    function renderTeams() {
        // Bestehende Teams löschen
        teamsList.innerHTML = '';
        
        // Prüfen, ob Teams vorhanden sind
        if (teams.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-teams';
            emptyMessage.textContent = 'Keine Teams vorhanden. Füge Teams hinzu, um zu beginnen.';
            teamsList.appendChild(emptyMessage);
            console.log('Keine Teams vorhanden');
            return;
        }
        
        console.log(`${teams.length} Teams werden angezeigt`);
        
        // Teams anzeigen
        teams.forEach((teamName, index) => {
            const teamCard = document.createElement('div');
            teamCard.className = 'team-card';
            
            teamCard.innerHTML = `
                <h3 class="team-name">${teamName}</h3>
                <div class="team-card-actions">
                    <button class="edit-team-btn" data-index="${index}" aria-label="Team bearbeiten"></button>
                    <button class="delete-team-btn" data-index="${index}" aria-label="Team löschen"></button>
                </div>
            `;
            
            teamsList.appendChild(teamCard);
        });
        
        // Event-Listener für Bearbeiten-Buttons
        document.querySelectorAll('.edit-team-btn').forEach(button => {
            button.addEventListener('click', function() {
                editTeam(parseInt(this.dataset.index));
            });
        });
        
        // Event-Listener für Löschen-Buttons
        document.querySelectorAll('.delete-team-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                const teamName = teams[index];
                
                if (confirm(`Möchtest du das Team "${teamName}" wirklich löschen?`)) {
                    deleteTeam(index);
                }
            });
        });

        console.log('DEBUGGING teams-Variable:');
        console.log('- Type:', typeof teams);
        console.log('- Is Array:', Array.isArray(teams));
        console.log('- Content:', JSON.stringify(teams));
        console.log('- Prototype methods:', Object.getPrototypeOf(teams));
    }
    
    /**
     * Bearbeitet ein Team
     * @param {number} index - Der Index des Teams im Array
     */
    async function editTeam(index) {
        const teamName = teams[index];
        
        if (teamName === undefined) return;
        
        const newName = prompt('Neuer Teamname:', teamName);
        
        if (!newName || newName.trim() === '') return;
        
        // Überprüfen, ob der Name bereits existiert (außer bei gleichem Team)
        if (teams.some((t, i) => i !== index && t.toLowerCase() === newName.trim().toLowerCase())) {
            console.log('Fehler: Ein Team mit diesem Namen existiert bereits');
            return;
        }
        
        // Team umbenennen
        teams[index] = newName.trim();
        await saveTeams();
        renderTeams();
        
        console.log(`Team "${teamName}" wurde zu "${newName.trim()}" umbenannt`);
    }
    
    /**
     * Löscht ein Team
     * @param {number} index - Der Index des Teams im Array
     */
    async function deleteTeam(index) {
        const teamName = teams[index];
        
        // Team entfernen
        teams.splice(index, 1);

        if (!Array.isArray(teams)) {
            console.error('FEHLER: teams ist kein Array mehr nach splice!');
            teams = []; // Fallback als leeres Array
        }

        await saveTeams();
        renderTeams();
        
        console.log(`Team "${teamName}" wurde gelöscht`);
    }
    
    /**
     * Speichert Teams im localStorage
     */
// zu dieser asynchronen Funktion
async function saveTeams() {
    try {
        const success = await dataService.saveData('tournamentTeams', teams);
        if (success) {
            console.log('Teams erfolgreich gespeichert');
        } else {
            console.log('Teams lokal gespeichert. Wird synchronisiert, sobald wieder online.');
        }
    } catch (error) {
        console.error('Fehler beim Speichern der Teams:', error);
    }
}
    
    /**
     * Löscht alle Daten im localStorage
     */
    async function resetAllData() {
        if (!confirm('ACHTUNG: Möchtest du wirklich ALLE Daten komplett löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            return;
        }
        
        try {
            // Teams in Firebase löschen (auf null setzen)
            await dataService.saveData('tournamentTeams', []);
            
            // Teams-Array zurücksetzen
            teams = [];
            
            // Teams-Anzeige aktualisieren
            renderTeams();
            
            console.log('Alle Team-Daten wurden vollständig gelöscht');
        } catch (error) {
            console.error('Fehler beim Zurücksetzen der Daten:', error);
        }
    }
    
    /**
     * Exportiert Teams als JSON-Datei
     */
    function exportTeams() {
        if (teams.length === 0) {
            console.log('Keine Teams zum Exportieren vorhanden');
            return;
        }
        
        // JSON erstellen
        const teamsJSON = JSON.stringify(teams, null, 2);
        
        // Blob erstellen
        const blob = new Blob([teamsJSON], { type: 'application/json' });
        
        // Download-Link erstellen
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'laos_teams.json';
        
        // Link anklicken, um Download zu starten
        document.body.appendChild(a);
        a.click();
        
        // Link entfernen
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Teams wurden als JSON-Datei exportiert');
    }


    // Nach dem initialen Laden der Teams und Anzeigen
// Setup für Echtzeit-Updates
dataService.subscribeToData('tournamentTeams', updatedTeams => {
    console.log('SUBSCRIPTION CALLBACK:');
    console.log('- updatedTeams type:', typeof updatedTeams);
    console.log('- Is Array:', Array.isArray(updatedTeams));
    console.log('- Content:', JSON.stringify(updatedTeams));
    
    // Sicherheitscheck: Nur ein Array akzeptieren
    if (!Array.isArray(updatedTeams)) {
        console.error('Fehler: Erwartete ein Array von Teams, erhielt aber:', updatedTeams);
        return; // Nicht fortfahren mit ungültigen Daten
    }
    
    // Prüfen, ob es wirklich Änderungen gibt
    if (JSON.stringify(teams) !== JSON.stringify(updatedTeams)) {
        console.log('Teams wurden aktualisiert, rendere UI neu');
        teams = updatedTeams;
        renderTeams();
    }
});



});