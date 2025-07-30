document.addEventListener('DOMContentLoaded', function () {
    // --- GLOBAL APP INITIALIZATION ---
    const versionInfo = document.getElementById('version-info');
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    versionInfo.textContent = `v${year}${month}${day}`;

    const header = document.querySelector('.toolbox-header');
    const titleVersion = header.querySelector('.title-version');
    const description = header.querySelector('.description');
    if (titleVersion && description) {
        titleVersion.appendChild(description);
    }

    const tabs = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // Function to load a script dynamically
    function loadScript(src, callback) {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => callback();
        document.body.appendChild(script);
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            tabPanels.forEach(panel => {
                const isActive = panel.id === `${targetId}-tab`;
                panel.classList.toggle('active', isActive);

                if (isActive && !panel.dataset.initialized) {
                    panel.dataset.initialized = 'true';
                    if (targetId === 'universities') {
                        loadScript('/js/universities.js', () => window.initializeUniversitiesTab());
                    } else if (targetId === 'majors') {
                        loadScript('/js/majors.js', () => window.initializeMajorsTab());
                    }
                }
            });
        });
    });

    // --- KICKSTART THE APP ---
    // Load the default active tab's script
    loadScript('/js/universities.js', () => window.initializeUniversitiesTab());
});