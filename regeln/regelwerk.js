document.addEventListener('DOMContentLoaded', function() {
    const searchInput      = document.getElementById('regelwerk-search');
    const searchButton     = document.getElementById('search-button');
    const statusContainer  = document.getElementById('statusContainer');
    const regelSections    = document.querySelectorAll('.regel-section');
    const navItems         = document.querySelectorAll('.regelwerk-navigation .nav-item');

    // ---- Navigation ----

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const targetId      = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                e.preventDefault();
                resetHighlights();
                navItems.forEach(n => n.classList.remove('active'));
                this.classList.add('active');
                scrollToElement(targetElement);
                targetElement.classList.add('highlight');
                setTimeout(() => targetElement.classList.remove('highlight'), 2000);
            }
        });
    });

    window.addEventListener('hashchange', function() {
        const targetElement = document.getElementById(window.location.hash.substring(1));
        if (targetElement) scrollToElement(targetElement);
    });

    if (window.location.hash) {
        setTimeout(() => window.dispatchEvent(new Event('hashchange')), 300);
    }

    // ---- Suche ----

    if (searchButton) searchButton.addEventListener('click', searchRules);
    if (searchInput)  searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchRules(); });

    function searchRules() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        resetHighlights();

        if (!searchTerm) { hideStatus(); return; }

        let matchCount = 0;
        regelSections.forEach(section => {
            if (section.textContent.toLowerCase().includes(searchTerm)) {
                section.classList.add('highlight');
                highlightTextInSection(section, searchTerm);
                matchCount++;
            }
        });

        if (matchCount > 0) {
            setStatus(`${matchCount} Treffer für "${searchTerm}" gefunden.`, 'success');
            const firstMatch = document.querySelector('.regel-section.highlight');
            if (firstMatch) scrollToElement(firstMatch);
        } else {
            setStatus(`Keine Treffer für "${searchTerm}" gefunden.`, 'info');
        }
    }

    function highlightTextInSection(section, searchTerm) {
        const regex = new RegExp(escapeRegExp(searchTerm), 'gi');
        section.querySelectorAll('p').forEach(p => {
            const highlighted = p.innerHTML.replace(regex, m => `<span class="highlight-text">${m}</span>`);
            if (highlighted !== p.innerHTML) p.innerHTML = highlighted;
        });
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function resetHighlights() {
        regelSections.forEach(s => s.classList.remove('highlight'));
        document.querySelectorAll('.highlight-text').forEach(span => {
            span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
        });
    }

    // ---- Scroll-Spy ----

    window.addEventListener('scroll', updateNavOnScroll);
    updateNavOnScroll();

    function updateNavOnScroll() {
        const scrollPosition = window.scrollY + 120;
        let currentSection = null;

        regelSections.forEach(section => {
            if (section.offsetTop <= scrollPosition &&
                section.offsetTop + section.offsetHeight > scrollPosition) {
                currentSection = section.id;
            }
        });

        if (currentSection) {
            navItems.forEach(item => {
                item.classList.toggle('active', item.getAttribute('href') === `#${currentSection}`);
            });
        }
    }

    // ---- Status ----

    function setStatus(message, type = 'info') {
        if (!statusContainer) return;
        statusContainer.className = `status-container visible status-${type}`;
        statusContainer.textContent = message;
    }

    function hideStatus() {
        if (!statusContainer) return;
        statusContainer.className = 'status-container';
    }

    // ---- Hilfsfunktion: Scrollen mit Header-Offset ----

    function scrollToElement(element) {
        const header       = document.querySelector('.main-header');
        const headerHeight = header ? header.offsetHeight : 0;
        const top          = element.getBoundingClientRect().top + window.pageYOffset - headerHeight - 30;
        window.scrollTo({ top, behavior: 'smooth' });
    }
});
