document.addEventListener('DOMContentLoaded', function () {
    // --- GLOBAL APP INITIALIZATION ---
    function initializeGlobal() {
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

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                tabPanels.forEach(panel => {
                    const isActive = panel.id === `${targetId}-tab`;
                    panel.classList.toggle('active', isActive);

                    // Initialize the Majors tab on the first click
                    if (isActive && targetId === 'majors' && !panel.dataset.initialized) {
                         if (window.initializeMajorsTab) {
                            window.initializeMajorsTab();
                        }
                    }
                });
            });
        });
    }

    // --- KICKSTART THE APP ---
    initializeGlobal();
    // Initialize the default active tab directly
    if (window.initializeUniversitiesTab) {
        window.initializeUniversitiesTab();
    }
});
