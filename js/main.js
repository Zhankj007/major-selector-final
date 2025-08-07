document.addEventListener('DOMContentLoaded', function () {
    function initializeGlobal() {
        // 【已删除】原先动态生成版本号的代码已被移除。
        // 版本号现在将由 GitHub Action 在部署时直接写入 index.html。

        // 【保留】这部分代码负责页面布局，需要保留
        const header = document.querySelector('.toolbox-header');
        const titleVersion = header.querySelector('.title-version');
        const description = header.querySelector('.description');
        if (titleVersion && description) {
            titleVersion.appendChild(description);
        }

        // 【保留】这部分代码是整个应用的核心，负责标签页切换，必须保留
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

                    if (isActive && !panel.dataset.initialized) {
                        if (targetId === 'majors' && typeof window.initializeMajorsTab === 'function') {
                            window.initializeMajorsTab();
                        }
                        else if (targetId === 'plans' && typeof window.initializePlansTab === 'function') {
                            window.initializePlansTab();
                        }
                    }
                });
            });
        });
    }

    // 【保留】调用初始化函数
    initializeGlobal();
    
    // 【保留】初始化默认的“高校库”标签页
    if (typeof window.initializeUniversitiesTab === 'function') {
        window.initializeUniversitiesTab();
    } else {
        console.error("Fatal Error: initializeUniversitiesTab not found.");
        document.getElementById('universities-tab').innerHTML = `<p style="color:red;">高校库模块加载失败。</p>`;
    }
});
