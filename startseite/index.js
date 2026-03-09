// Warten bis das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM geladen, initialisiere System-Status");
    
    // Alle Elemente mit der Klasse welcome-text auswählen
    const welcomeTexts = document.querySelectorAll('.welcome-text');
    
    // Für jedes welcome-text Element die Animation anwenden
    welcomeTexts.forEach(welcomeText => {
        // Text in einzelne Buchstaben aufteilen für Hover-Effekte
        const text = welcomeText.textContent;
        welcomeText.textContent = '';
        
        // Für jeden Buchstaben einen span erstellen
        for (let i = 0; i < text.length; i++) {
            const letter = document.createElement('span');
            
            // Leerzeichen speziell behandeln mit einem sichtbaren Leerzeichen
            if (text[i] === ' ') {
                letter.className = 'letter space';
                letter.innerHTML = '&nbsp;';
            } else {
                letter.className = 'letter';
                letter.textContent = text[i];
            }
            
            // Verzögerung für die Animation basierend auf der Position
            letter.style.animationDelay = `${i * 0.05}s`;
            
            // Zufällige Farben bei Hover (nur für Nicht-Leerzeichen)
            if (text[i] !== ' ') {
                letter.addEventListener('mouseover', function() {
                    const colors = [
                        'var(--color-red)',
                        'var(--color-orange)',
                        'var(--color-blue)',
                        'var(--color-green-dark)',
                        'var(--color-brown)'
                    ];
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    this.style.color = randomColor;
                });
                
                letter.addEventListener('mouseout', function() {
                    this.style.color = '';
                });
            }
            
            welcomeText.appendChild(letter);
        }
    });
    
    // Bewegungseffekt für die Willkommensbox
    const welcomeContainer = document.querySelector('.welcome-container');
    
    if (welcomeContainer) {
        document.addEventListener('mousemove', function(e) {
            // Position des Mauszeigers relativ zum Viewport
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            // Viewport-Dimensionen
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            // Berechnung des Rotationswinkels basierend auf der Mausposition
            const rotateY = ((mouseX / windowWidth) - 0.5) * 5; // -2.5 bis 2.5 Grad
            const rotateX = ((mouseY / windowHeight) - 0.5) * -5; // -2.5 bis 2.5 Grad
            
            // Transformation anwenden
            welcomeContainer.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(${Math.sin(Date.now() / 1000) * 10}px)`;
        });
        
        // Zurücksetzen der Transformation, wenn die Maus den Bereich verlässt
        document.addEventListener('mouseleave', function() {
            welcomeContainer.style.transform = 'rotateX(0deg) rotateY(0deg)';
        });
    }
    
    // Aktuelle Seite in der Navigation hervorheben
    highlightCurrentPage();
});

/**
 * Hebt den aktuellen Navigationspunkt hervor
 */
function highlightCurrentPage() {
    // Aktuelle Seite ermitteln
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Alle Navigationslinks durchgehen
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        // Pfad aus dem href-Attribut extrahieren
        const linkPage = link.getAttribute('href').split('/').pop();
        
        // Wenn der Link auf die aktuelle Seite zeigt, active-Klasse hinzufügen
        if (linkPage === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}