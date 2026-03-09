/**
 * LAOS 2.0 - JavaScript für die Regelwerk-Seite
 * Dieses Script implementiert die Suchfunktion und Navigation im Regelwerk
 * mit robusterer Implementierung für die Scrolling-Funktionalität
 */
// Warten bis das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', function() {
    // DOM-Elemente
    const searchInput = document.getElementById('regelwerk-search');
    const searchButton = document.getElementById('search-button');
    const statusContainer = document.getElementById('statusContainer');
    const regelSections = document.querySelectorAll('.regel-section');
    const navItems = document.querySelectorAll('.regelwerk-navigation .nav-item');

    /**
     * Scrollt zu einer Sektion mit Header-Offset und kurzer Hervorhebung.
     * Einzige Scroll-Implementierung für die gesamte Seite.
     * @param {string} targetId - ID der Zielsektion
     */
    function scrollToSection(targetId) {
        const targetElement = document.getElementById(targetId);
        if (!targetElement) return;
        const header = document.querySelector('.main-header');
        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = targetPosition - (headerHeight + 30);
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        targetElement.classList.add('highlight');
        setTimeout(() => targetElement.classList.remove('highlight'), 2000);
    }
    
    // Event-Listener
    if (searchButton) {
        searchButton.addEventListener('click', searchRules);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchRules();
            }
        });
    }
    
    // Anker-Klicks für die Navigation
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navItems.forEach(navItem => navItem.classList.remove('active'));
            this.classList.add('active');
            const targetId = this.getAttribute('href').substring(1);
            resetHighlights();
            scrollToSection(targetId);
        });
    });
    
    /**
     * Führt die Suche nach Regeln durch
     */
    function searchRules() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        
        // Bei leerem Suchbegriff nichts tun
        if (searchTerm === '') {
            // Alle Hervorhebungen zurücksetzen
            resetHighlights();
            hideStatus();
            return;
        }
        
        // Alle Hervorhebungen zurücksetzen
        resetHighlights();
        
        // Zähler für gefundene Übereinstimmungen
        let matchCount = 0;
        
        // Durch alle Regelsektionen durchgehen
        regelSections.forEach(section => {
            const sectionText = section.textContent.toLowerCase();
            
            // Prüfen, ob der Suchbegriff in dieser Sektion vorkommt
            if (sectionText.includes(searchTerm)) {
                // Sektion hervorheben
                section.classList.add('highlight');
                
                // Treffer im Text hervorheben
                highlightTextInSection(section, searchTerm);
                
                matchCount++;
            }
        });
        
        // Status-Meldung anzeigen
        if (matchCount > 0) {
            setStatus(`${matchCount} Treffer für "${searchTerm}" gefunden.`, 'success');
            
            // Zum ersten Treffer scrollen
            const firstMatch = document.querySelector('.regel-section.highlight');
            if (firstMatch) {
                // Höhe des Headers ermitteln
                const header = document.querySelector('.main-header');
                const headerHeight = header ? header.offsetHeight : 0;
                
                // Robusteres Scrolling zum ersten Treffer
                const targetPosition = firstMatch.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = targetPosition - (headerHeight + 30);
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        } else {
            setStatus(`Keine Treffer für "${searchTerm}" gefunden.`, 'info');
        }
    }
    
    /**
     * Hebt Textvorkommen in einer Sektion hervor
     */
    function highlightTextInSection(section, searchTerm) {
        // Alle Textknoten in der Sektion finden
        const paragraphs = section.querySelectorAll('p');
        
        paragraphs.forEach(paragraph => {
            const originalText = paragraph.innerHTML;
            
            // Einfacher Text-Ersatz mit Hervorhebung
            // Achtung: Dies ist eine vereinfachte Version, die bei komplexem HTML problematisch sein kann
            const regex = new RegExp(escapeRegExp(searchTerm), 'gi');
            const highlightedText = originalText.replace(regex, match => {
                const safeMatch = match.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return `<span class="highlight-text">${safeMatch}</span>`;
            });
            
            // Nur aktualisieren, wenn es Änderungen gibt
            if (highlightedText !== originalText) {
                paragraph.innerHTML = highlightedText;
            }
        });
    }
    
    /**
     * Hilfsfunktion zum Escapen von Sonderzeichen in RegExp
     */
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Entfernt alle Hervorhebungen
     */
    function resetHighlights() {
        // Sektions-Hervorhebungen entfernen
        regelSections.forEach(section => {
            section.classList.remove('highlight');
        });
        
        // Text-Hervorhebungen entfernen
        const highlightedSpans = document.querySelectorAll('.highlight-text');
        highlightedSpans.forEach(span => {
            // Den Text aus dem Span extrahieren und als normalen Text wiederherstellen
            const textNode = document.createTextNode(span.textContent);
            span.parentNode.replaceChild(textNode, span);
        });
    }
    
    /**
     * Setzt einen Status-Text
     */
    function setStatus(message, type = 'info') {
        if (!statusContainer) return;
        
        statusContainer.className = 'status-container visible';
        statusContainer.classList.add(`status-${type}`);
        statusContainer.textContent = message;
    }
    
    /**
     * Blendet den Status-Container aus
     */
    function hideStatus() {
        if (!statusContainer) return;
        
        statusContainer.className = 'status-container';
    }
    
    /**
     * Markiert den entsprechenden Navigationslink beim Scrollen
     */
    function updateNavOnScroll() {
        // Aktueller Scroll-Position mit Offset
        const scrollPosition = window.scrollY + 120;
        
        // Prüfen, welche Sektion im Viewport ist
        let currentSection = null;
        
        regelSections.forEach(section => {
            if (section.offsetTop <= scrollPosition && 
                section.offsetTop + section.offsetHeight > scrollPosition) {
                currentSection = section.id;
            }
        });
        
        if (currentSection) {
            // Aktiven Zustand in der Navigation aktualisieren
            navItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('href') === `#${currentSection}`) {
                    item.classList.add('active');
                }
            });
        }
    }
    
    // Event-Listener für Scroll-Events
    window.addEventListener('scroll', updateNavOnScroll);
    
    // Initial die aktive Navigation setzen
    updateNavOnScroll();
    
    // Hash-Navigation (z.B. direkte Links mit #anker)
    window.addEventListener('hashchange', function() {
        const targetId = window.location.hash.substring(1);
        if (targetId) scrollToSection(targetId);
    });

    // Beim initialen Laden prüfen ob ein Hash vorhanden ist
    if (window.location.hash) {
        setTimeout(() => {
            const targetId = window.location.hash.substring(1);
            scrollToSection(targetId);
        }, 300);
    }
});