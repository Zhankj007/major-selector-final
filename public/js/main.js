// main.js (调试第四步)
console.log("main.js 脚本已开始执行！");

document.addEventListener('DOMContentLoaded', function () {

    console.log("DOM内容已完全加载，开始执行初始化...");

    // --- 1. 已确认正常，保持开启 ---
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
    console.log("Supabase client has been initialized.");

    // --- 2. 已确认正常，保持开启 ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const registerMessage = document.getElementById('register-message');
    const authButton = document.getElementById('auth-button');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const userNicknameElement = document.getElementById('user-nickname');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    console.log("DOM elements have been selected.");

    // --- 3. 【恢复 else 部分的逻辑】---
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state has changed! Event:", event);

        // if 块依然保持注释
        /* if (session && session.user) {
            // ... 用户登录逻辑 ...
        } 
        */

        // 【取消本段注释】
        else {
            // --- 用户未登录 (游客状态) ---
            console.log("Executing guest/logged-out logic...");
            document.body.classList.add('logged-out'); // 确保 body class 正确
            authButton.textContent = '登录/注册';
            if (userNicknameElement) userNicknameElement.textContent = '';

            // 只显示公开的标签页
            tabButtons.forEach(btn => {
                const tabName = btn.dataset.tab;
                const isPublic = tabName === 'universities' || tabName === 'majors';
                btn.classList.toggle('hidden', !isPublic);
            });

            // 默认激活高校库
            const uniTab = document.querySelector('.tab-button[data-tab="universities"]');
            if (uniTab && !uniTab.classList.contains('active')) {
                 uniTab.click();
            }
            console.log("Guest/logged-out logic finished.");
        }
    });
    console.log("Auth state change listener has been attached.");

    // --- 4. 恢复标签页点击切换逻辑，因为游客状态需要它 ---
    tabButtons.forEach(tab => {
        tab.addEventListener('click', async () => {
            const { data: { session } } = await supabaseClient.auth.getSession();
            const tabName = tab.dataset.tab;
            const requiresAuth = tabName === 'plans' || tabName === 'admin';
            if (requiresAuth && !session) {
                alert('此功能需要登录后才能使用。');
                document.body.classList.add('show-login-section');
                return;
            }
            tabButtons.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanels.forEach(panel => {
                const isActive = panel.id === `${tabName}-tab`;
                panel.classList.toggle('active', isActive);
                if (isActive && !panel.dataset.initialized) {
                    if (tabName === 'universities' && typeof window.initializeUniversitiesTab === 'function') {
                        window.initializeUniversitiesTab();
                    } else if (tabName === 'majors' && typeof window.initializeMajorsTab === 'function') {
                        window.initializeMajorsTab();
                    } else if (tabName === 'plans' && typeof window.initializePlansTab === 'function') {
                        window.initializePlansTab();
                    } else if (tabName === 'admin' && typeof window.initializeAdminTab === 'function') {
                        window.initializeAdminTab();
                    }
                }
            });
        });
    });

    // --- 5. 其他函数暂时不恢复 ---
});