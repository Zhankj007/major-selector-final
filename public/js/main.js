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

                    // Initialize a tab's script only on the first time it's clicked
                    if (isActive && !panel.dataset.initialized) {
                        if (targetId === 'majors' && typeof window.initializeMajorsTab === 'function') {
                            window.initializeMajorsTab();
                        }
                        // Note: The universities tab is initialized on page load below
                    }
                });
            });
        });
    }

    // --- KICKSTART THE APP ---
    initializeGlobal();
    
    // Initialize the default active tab directly and safely
    if (typeof window.initializeUniversitiesTab === 'function') {
        window.initializeUniversitiesTab();
    } else {
        console.error("Fatal Error: initializeUniversitiesTab function not found. universities.js might have failed to load or parse.");
        document.getElementById('universities-tab').innerHTML = `<p style="color:red;">高校库模块加载失败，请检查脚本文件。</p>`;
    }
});
