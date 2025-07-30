document.addEventListener('DOMContentLoaded', function () {
    console.log("Main.js: DOMContentLoaded event fired.");

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
            console.log(`Main.js: Attempting to load script: ${src}`);
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log(`Main.js: Successfully loaded ${src}.`);
                if (callback) callback();
            };
            script.onerror = () => {
                console.error(`Main.js: FAILED to load script: ${src}`);
            }
            document.body.appendChild(script);
        }

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.tab;
                console.log(`Main.js: Tab clicked: ${targetId}`);
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                tabPanels.forEach(panel => {
                    const isActive = panel.id === `${targetId}-tab`;
                    panel.classList.toggle('active', isActive);

                    if (isActive && !panel.dataset.initialized) {
                        panel.dataset.initialized = 'true';
                        console.log(`Main.js: Initializing tab for the first time: ${targetId}`);
                        if (targetId === 'universities') {
                            loadScript('/js/universities.js', () => window.initializeUniversitiesTab && window.initializeUniversitiesTab());
                        } else if (targetId === 'majors') {
                            loadScript('/js/majors.js', () => window.initializeMajorsTab && window.initializeMajorsTab());
                        }
                    }
                });
            });
        });
    }

    // --- KICKSTART THE APP ---
    console.log("Main.js: Initializing global components...");
    initializeGlobal();
    
    // Defer the initial click slightly to ensure all is ready
    setTimeout(() => {
        console.log("Main.js: Triggering initial click on default tab.");
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab) {
            activeTab.click();
        } else {
            console.error("Main.js: No active tab found to initialize.");
        }
    }, 100);
});
