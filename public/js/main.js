// --- File: /public/js/main.js ---

document.addEventListener('DOMContentLoaded', function () {
    const debugConsole = document.getElementById('debug-console');
    
    function logToScreen(message, color = '#fff') {
        if (debugConsole) {
            debugConsole.innerHTML += `<p style="margin: 2px 0; color: ${color};">${new Date().toLocaleTimeString()} - ${message}</p>`;
            debugConsole.scrollTop = debugConsole.scrollHeight;
        }
        console.log(message);
    }

    logToScreen("main.js: DOMContentLoaded 事件已触发。脚本开始执行...");

    try {
        // --- GLOBAL APP INITIALIZATION ---
        const versionInfo = document.getElementById('version-info');
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        versionInfo.textContent = `v${year}${month}${day}`;
        logToScreen("全局: 版本号已设置。");

        const header = document.querySelector('.toolbox-header');
        const titleVersion = header.querySelector('.title-version');
        const description = header.querySelector('.description');
        if (titleVersion && description) {
            titleVersion.appendChild(description);
        }
        logToScreen("全局: 页面头部已调整。");

        const tabs = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.tab;
                logToScreen(`事件: 点击了 '${targetId}' 标签页。`);
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                tabPanels.forEach(panel => {
                    const isActive = panel.id === `${targetId}-tab`;
                    panel.classList.toggle('active', isActive);

                    if (isActive && !panel.dataset.initialized) {
                        logToScreen(`初始化 '${targetId}' 标签页...`);
                        if (targetId === 'majors') {
                            if (typeof window.initializeMajorsTab === 'function') {
                                window.initializeMajorsTab();
                            } else {
                                logToScreen("错误: window.initializeMajorsTab 函数未找到!", "red");
                            }
                        }
                    }
                });
            });
        });
        logToScreen("全局: 标签页点击事件已绑定。");

        // --- KICKSTART THE APP ---
        logToScreen("启动: 准备初始化默认标签页 (高校库)...");
        if (typeof window.initializeUniversitiesTab === 'function') {
            window.initializeUniversitiesTab();
        } else {
            logToScreen("致命错误: window.initializeUniversitiesTab 函数未找到! 页面无法启动。", "red");
        }
    } catch (error) {
        logToScreen(`main.js 中发生致命错误: ${error.message}`, 'red');
    }
});
