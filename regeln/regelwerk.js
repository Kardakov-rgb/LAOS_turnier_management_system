/**
 * LAOS 2.0 - JavaScript für die Regelwerk-Seite
 * Dieses Script implementiert die Suchfunktion und Navigation im Regelwerk
 * mit robusterer Implementierung für die Scrolling-Funktionalität
 */
import { initAuth } from '../global/auth-module.js';
// Warten bis das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    console.log('Regelwerk JS geladen');
    
    // DOM-Elemente
    const searchInput = document.getElementById('regelwerk-search');
    const searchButton = document.getElementById('search-button');
    const statusContainer = document.getElementById('statusContainer');
    const regelSections = document.querySelectorAll('.regel-section');
    const navItems = document.querySelectorAll('.regelwerk-navigation .nav-item');
    
    console.log('Navigation Items gefunden:', navItems.length);
    
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
    
    // DIREKTE Implementierung von Anker-Klicks ohne Standard-Verhalten zu verhindern
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            console.log('Nav item geklickt:', this.getAttribute('href'));
            
            // Aktiven Status aktualisieren
            navItems.forEach(navItem => navItem.classList.remove('active'));
            this.classList.add('active');
            
            // Zielsektion-ID aus href extrahieren
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                console.log('Ziel gefunden:', targetId);
                
                // Standard-Anker-Verhalten verhindern
                e.preventDefault();
                
                // Alle Hervorhebungen entfernen
                resetHighlights();
                
                // Höhe des Headers ermitteln
                const header = document.querySelector('.main-header');
                const headerHeight = header ? header.offsetHeight : 0;
                console.log('Header-Höhe:', headerHeight);
                
                // Zum Ziel scrollen mit korrektem Offset
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = targetPosition - (headerHeight + 30);
                
                console.log('Scrolle zu Position:', offsetPosition);
                
                // Alternativ-Implementierung für robusteres Scrolling
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                
                // Kurz hervorheben
                targetElement.classList.add('highlight');
                setTimeout(() => {
                    targetElement.classList.remove('highlight');
                }, 2000);
                
                return false; // Verhindert das Standard-Verhalten zusätzlich
            } else {
                console.error('Ziel nicht gefunden:', targetId);
            }
        });
    });
    
    // Alternative Implementierung mit direktem Anker-Handling
    function setupAnchorLinks() {
        console.log('Richte zusätzliche Anker-Links ein');
        const anchorLinks = document.querySelectorAll('.regelwerk-navigation a');
        
        anchorLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            // Wenn es ein interner Link ist
            if (href && href.startsWith('#')) {
                console.log('Füge Handler hinzu für:', href);
                
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    const targetId = href.substring(1);
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        console.log('Scrolle zu:', targetId);
                        
                        // Höhe des Headers ermitteln
                        const header = document.querySelector('.main-header');
                        const headerHeight = header ? header.offsetHeight : 0;
                        
                        // Zum Ziel scrollen mit korrektem Offset
                        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
                        const offsetPosition = targetPosition - (headerHeight + 30);
                        
                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });
                        
                        // Kurz hervorheben
                        targetElement.classList.add('highlight');
                        setTimeout(() => {
                            targetElement.classList.remove('highlight');
                        }, 2000);
                    }
                    
                    return false;
                });
            }
        });
    }
    
    // Alternative Methode nach kurzer Verzögerung ausführen
    setTimeout(setupAnchorLinks, 500);
    
    /**
     * Führt die Suche nach Regeln durch
     */
    function searchRules() {
        console.log('Suche nach Regeln');
        
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
                return `<span class="highlight-text">${match}</span>`;
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
    
    // Debug-Meldungen zur Fehlerbehebung
    console.log('Gefundene Regelsektionen:', regelSections.length);
    
    // Überprüfung der Anker-Links
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        const targetId = href ? href.substring(1) : '';
        const targetElement = document.getElementById(targetId);
        console.log(`Link ${href} -> Ziel gefunden: ${targetElement ? 'Ja' : 'Nein'}`);
    });
// Direkte Hash-Navigation aktivieren
window.addEventListener('hashchange', function() {
    const targetId = window.location.hash.substring(1);
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
      console.log(`Hash-Navigation zu #${targetId}`);
      
      // Header-Höhe ermitteln
      const header = document.querySelector('.main-header');
      const headerHeight = header ? header.offsetHeight : 0;
      
      // Kurze Verzögerung für zuverlässigeres Scrolling
      setTimeout(function() {
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = targetPosition - (headerHeight + 30);
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        
        // Kurz hervorheben
        targetElement.classList.add('highlight');
        setTimeout(() => {
            targetElement.classList.remove('highlight');
        }, 2000);
      }, 100);
    }
  });
  
  // Auch beim initialen Laden prüfen
  if (window.location.hash) {
    // Hash-Event manuell auslösen
    setTimeout(function() {
      const hashChangeEvent = new Event('hashchange');
      window.dispatchEvent(hashChangeEvent);
    }, 500);
  }
    // Am Ende der Datei hinzufügen
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM geladen, Elemente überprüfen:");
    
    // Alle Navigationslinks überprüfen
    const navLinks = document.querySelectorAll('.regelwerk-navigation .nav-item');
    console.log(`Navigation Links gefunden: ${navLinks.length}`);
    
    // Alle IDs überprüfen
    navLinks.forEach(link => {
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      console.log(`Link zu #${targetId}: Element gefunden? ${targetElement ? 'JA' : 'NEIN'}`);
    });
  });

  function smoothScrollToSection(targetId) {
    // MAXIMALE DEBUGGING-INFORMATION
    console.group(`Scroll zu ${targetId}`);
    console.time('ScrollPerformance');

    const targetElement = document.getElementById(targetId);
    
    if (!targetElement) {
        console.error('KRITISCHER FEHLER: Element nicht gefunden', {
            searchedId: targetId,
            existingIds: Array.from(document.querySelectorAll('[id]')).map(el => el.id)
        });
        console.groupEnd();
        return false;
    }

    // Absolute Position OHNE Transformationen
    const bodyRect = document.body.getBoundingClientRect();
    const elementRect = targetElement.getBoundingClientRect();
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const offsetTop = elementRect.top - bodyRect.top;

    console.log('Scroll-Diagnose', {
        targetId,
        scrollTop,
        offsetTop,
        elementTop: elementRect.top,
        bodyTop: bodyRect.top
    });

    // Universelle Scroll-Methoden
    try {
        // Methode 1: window.scrollTo
        window.scrollTo({
            top: offsetTop - 100,  // Zusätzlicher Offset
            behavior: 'smooth'
        });

        // Methode 2: Fallback
        targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    } catch(error) {
        console.error('Scroll-Fehler', error);
    }

    console.timeEnd('ScrollPerformance');
    console.groupEnd();

    return true;
}
// Fallback-Mechanismus
function fallbackScroll(targetId) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return false;

    // Alternative Scroll-Methode mit umfassenden Optionen
    targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
    });

    return true;
}

// Event-Listener für Navigationslinks
document.querySelectorAll('.regelwerk-navigation .nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        
        console.log('Navigationslink geklickt:', {
            href: this.getAttribute('href'),
            targetId: targetId
        });
        
        // Kombinierter Scroll-Mechanismus mit zusätzlicher Diagnose
        const scrollSuccess = smoothScrollToSection(targetId) || 
                               fallbackScroll(targetId);
        
        if (!scrollSuccess) {
            console.error('Scrollen fehlgeschlagen für:', targetId);
        }
        
        // Aktive Navigation aktualisieren
        document.querySelectorAll('.nav-item').forEach(navItem => {
            navItem.classList.remove('active');
        });
        this.classList.add('active');
    });
});

// Zusätzlicher Diagnose-Handler
function diagnoseScrollIssues() {
    const sections = document.querySelectorAll('.regel-section');
    const header = document.querySelector('.main-header');
    const footer = document.querySelector('.main-footer');
    
    console.log('Umgebungs-Diagnose:', {
        windowHeight: window.innerHeight,
        headerHeight: header ? header.offsetHeight : 'Kein Header',
        footerHeight: footer ? footer.offsetHeight : 'Kein Footer'
    });
    
    console.log('Sektion Diagnose:');
    sections.forEach(section => {
        console.log({
            id: section.id,
            offsetTop: section.offsetTop,
            offsetHeight: section.offsetHeight,
            boundingRect: section.getBoundingClientRect()
        });
    });
}

// Aufruf nach dem Laden der Seite
window.addEventListener('load', diagnoseScrollIssues);

// Fallback-Mechanismus
function fallbackScroll(targetId) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return false;

    // Alternative Scroll-Methode
    targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
    });

    return true;
}

// Event-Listener für Navigationslinks
document.querySelectorAll('.regelwerk-navigation .nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        
        console.log('Navigationslink geklickt:', {
            href: this.getAttribute('href'),
            targetId: targetId
        });
        
        // Kombinierter Scroll-Mechanismus
        const scrollSuccess = smoothScrollToSection(targetId) || 
                               fallbackScroll(targetId);
        
        if (!scrollSuccess) {
            console.error('Scrollen fehlgeschlagen für:', targetId);
        }
        
        // Aktive Navigation aktualisieren
        document.querySelectorAll('.nav-item').forEach(navItem => {
            navItem.classList.remove('active');
        });
        this.classList.add('active');
    });
});

// Zusätzlicher Hash-Change Handler
window.addEventListener('hashchange', function() {
    const targetId = window.location.hash.substring(1);
    smoothScrollToSection(targetId) || fallbackScroll(targetId);
});

// Anpassen der Event-Listener
document.querySelectorAll('.regelwerk-navigation .nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        smoothScrollToSection(targetId);
        
        // Aktive Navigation aktualisieren
        document.querySelectorAll('.nav-item').forEach(navItem => {
            navItem.classList.remove('active');
        });
        this.classList.add('active');
    });
});

// Zusätzlicher Handler für Hash-Änderungen
window.addEventListener('hashchange', function() {
    const targetId = window.location.hash.substring(1);
    smoothScrollToSection(targetId);
});

// Vorhandener DOMContentLoaded Block bleibt am Ende
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM geladen, Elemente überprüfen:");
    
    // Alle Navigationslinks überprüfen
    const navLinks = document.querySelectorAll('.regelwerk-navigation .nav-item');
    console.log(`Navigation Links gefunden: ${navLinks.length}`);
    
    // Alle IDs überprüfen
    navLinks.forEach(link => {
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      console.log(`Link zu #${targetId}: Element gefunden? ${targetElement ? 'JA' : 'NEIN'}`);
    });
});

function diagnoseScrollIssues() {
    const sections = document.querySelectorAll('.regel-section');
    
    console.log('Sektion Diagnose:');
    sections.forEach(section => {
        console.log({
            id: section.id,
            offsetTop: section.offsetTop,
            offsetHeight: section.offsetHeight,
            boundingRect: section.getBoundingClientRect()
        });
    });
}

// Aufruf nach dem Laden der Seite
window.addEventListener('load', diagnoseScrollIssues);

window.addEventListener('load', () => {
    const sections = document.querySelectorAll('.regel-section');
    sections.forEach(section => {
        console.log(section.id, 'absolute position:', section.offsetTop);
    });
});
document.querySelectorAll('.regelwerk-navigation .nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation(); // Verhindert Event-Bubbling

        const targetId = this.getAttribute('href').substring(1);
        
        console.warn('Navigation geklickt', {
            href: this.getAttribute('href'),
            targetId,
            eventTarget: e.target
        });

        // Verschiedene Scroll-Strategien
        smoothScrollToSection(targetId) || 
        document.getElementById(targetId)?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    });
});

function documentStructureDiagnosis() {
    console.group('Dokumentstruktur-Diagnose');
    
    const sections = document.querySelectorAll('.regel-section');
    const navigationLinks = document.querySelectorAll('.regelwerk-navigation .nav-item');
    
    console.log('Sektionen:', sections.length);
    console.log('Navigation Links:', navigationLinks.length);
    
    sections.forEach(section => {
        const correspondingLink = Array.from(navigationLinks)
            .find(link => link.getAttribute('href') === `#${section.id}`);
        
        console.log('Sektion Check', {
            id: section.id,
            hasCorrespondingLink: !!correspondingLink,
            offsetTop: section.offsetTop,
            offsetParent: section.offsetParent,
            rect: section.getBoundingClientRect()
        });
    });
    
    console.groupEnd();
}

// Nach Seitenload aufrufen
window.addEventListener('load', documentStructureDiagnosis);
});