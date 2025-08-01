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

        function loadScript(src, callback) {
            // Check if script already exists
            if (document.querySelector(`script[src="${src}"]`)) {
                if (callback) callback();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => { if (callback) callback(); };
            script.onerror = () => console.error(`Failed to load script: ${src}`);
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
                        if (targetId === 'majors' && typeof window.initializeMajorsTab === 'function') {
                            window.initializeMajorsTab();
                        }
                        // NEW: Add logic to load the plans script
                        if (targetId === 'plans' && typeof window.initializePlansTab === 'undefined') {
                            loadScript('/js/plans.js', () => window.initializePlansTab && window.initializePlansTab());
                        }
                    }
                });
            });
        });
    }

    // --- KICKSTART THE APP ---
    initializeGlobal();
    if (typeof window.initializeUniversitiesTab === 'function') {
        window.initializeUniversitiesTab();
    }
});
