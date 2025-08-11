/*
document.addEventListener('DOMContentLoaded', function () {
    try {
        // --- 1. 初始化 SUPABASE 客户端 ---
        const SUPABASE_URL = '__SUPABASE_URL__';
        const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
        if (SUPABASE_URL.startsWith('__')) { throw new Error("Supabase URL 占位符未被替换。"); }
        const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = supabaseClient;

        // --- 2. 获取所有UI元素 ---
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const loginError = document.getElementById('login-error');
        const registerError = document.getElementById('register-error');
        const registerMessage = document.getElementById('register-message');
        const authButton = document.getElementById('auth-button');
        const showRegisterLink = document.getElementById('show-register-link');
        const showLoginLink = document.getElementById('show-login-link');
        const userNicknameElement = document.getElementById('user-nickname');
        const visitorInfoElement = document.getElementById('visitor-info');
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');

        // --- 3. 核心认证状态管理 ---
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            document.body.classList.remove('show-login-section');
            
            if (session && session.user) {
                // --- 用户已登录 ---
                authButton.textContent = '退出登录';
                try {
                    // 因为数据库策略已修复，这个查询现在可以安全、快速地执行了
                    const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('username, role').eq('id', session.user.id).single();
                    if (profileError) throw profileError;
                    
                    const { data: permissions, error: permsError } = await supabaseClient.from('user_permissions').select('tab_name, expires_at').eq('user_id', session.user.id);
                    if (permsError) throw permsError;

                    if (userNicknameElement) {
                       userNicknameElement.textContent = profile && profile.username ? `欢迎您, ${profile.username}，` : '欢迎您，';
                    }

                    const visibleTabs = new Set(['universities', 'majors']);
                    const now = new Date();
                    if (permissions) {
                        permissions.forEach(p => {
                            if (!p.expires_at || new Date(p.expires_at) > now) { visibleTabs.add(p.tab_name); }
                        });
                    }
                    if (profile && profile.role === 'admin') { visibleTabs.add('admin'); }

                    tabButtons.forEach(btn => btn.classList.toggle('hidden', !visibleTabs.has(btn.dataset.tab)));
                    
                    const currentlyActive = document.querySelector('.tab-button.active');
                    if (!currentlyActive || currentlyActive.classList.contains('hidden')) {
                        document.querySelector('.tab-button:not(.hidden)')?.click();
                    }
                } catch (error) {
                    console.error("加载用户信息或权限时出错:", error);
                    authButton.textContent = '退出登录';
                    tabButtons.forEach(btn => btn.classList.add('hidden'));
                }
            } else {
                // --- 用户未登录 (游客) ---
                authButton.textContent = '登录/注册';
                if (userNicknameElement) userNicknameElement.textContent = '';
                tabButtons.forEach(btn => {
                    const isPublic = btn.dataset.tab === 'universities' || btn.dataset.tab === 'majors';
                    btn.classList.toggle('hidden', !isPublic);
                });
                const defaultTabButton = document.querySelector('.tab-button[data-tab="universities"]');
                const defaultTabPanel = document.getElementById('universities-tab');
                if (defaultTabButton && defaultTabPanel) {
                    if (!defaultTabButton.classList.contains('active')) { defaultTabButton.click(); }
                    else if (typeof window.initializeUniversitiesTab === 'function' && !defaultTabPanel.dataset.initialized) {
                        window.initializeUniversitiesTab();
                    }
                }
            }
        });

        // --- 4. 其他所有事件监听器和辅助函数 ---
        showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginError.textContent = ''; loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
        showLoginLink.addEventListener('click', (e) => { e.preventDefault(); registerError.textContent = ''; registerMessage.textContent = ''; registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            loginError.textContent = '';
            const loginButton = loginForm.querySelector('button[type="submit"]');
            try {
                loginButton.disabled = true;
                loginButton.textContent = '登录中...';
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                const response = await fetch('/api/login', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();
                if (!response.ok) { throw new Error(data.error); }
                const { error } = await supabaseClient.auth.setSession(data.session);
                if (error) throw error;
            } catch (error) {
                loginError.textContent = error.message;
            } finally {
                loginButton.disabled = false;
                loginButton.textContent = '登 录';
            }
        });
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            registerError.textContent = '';
            registerMessage.textContent = '';
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const username = document.getElementById('register-username').value;
            const phone = document.getElementById('register-phone').value;
            const unit_name = document.getElementById('register-unitname').value;
            try {
                const response = await fetch('/api/register', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, username, phone, unit_name }),
                });
                const data = await response.json();
                if (!response.ok) { throw new Error(data.error); }
                registerMessage.textContent = '注册成功！请检查邮箱确认或直接登录。';
                setTimeout(() => { showLoginLink.click(); }, 3000);
            } catch (error) {
                registerError.textContent = error.message;
            }
        });
        authButton.addEventListener('click', async () => {
            const { data: { session } } = await supabaseClient.auth.getSession(); 
            if (session) {
                await supabaseClient.auth.signOut();
                window.location.reload(); 
            } else {
                document.body.classList.add('show-login-section');
            }
        });
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
        async function updateVisitorCount() {
            if (!visitorInfoElement) return;
            try {
                const response = await fetch('/api/counter');
                if (!response.ok) return;
                const data = await response.json();
                visitorInfoElement.textContent = `您是第 ${data.count} 位访客！`;
            } catch (error) {
                console.error('Failed to fetch visitor count:', error);
            }
        }
        updateVisitorCount();
    } catch (error) {
        const errorMessage = `发生了一个严重的JavaScript错误...\n\n错误信息:\n${error.name}: ${error.message}\n\n堆栈信息:\n${error.stack}`;
        alert(errorMessage);
        console.error("捕获到致命错误:", error);
    }

});
*/
// main.js (调试第四步 - 已修正语法错误)
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

    // --- 3. 【已修正】恢复 if/else 结构，但只让 else 逻辑生效 ---
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state has changed! Event:", event);

        // 保持 if/else 结构完整，但 if 内部为空
        if (session && session.user) {
            // 用户已登录的逻辑，在这一步暂时不执行
            console.log("User is logged in, logic is paused for debugging.");
        } 
            else {
                // --- 用户未登录 (游客状态) ---
                console.log("Executing guest/logged-out logic...");
                document.body.classList.add('logged-out');
                authButton.textContent = '登录/注册';
                if (userNicknameElement) userNicknameElement.textContent = '';
                
                // 1. 只显示公开的标签页
                tabButtons.forEach(btn => {
                    const tabName = btn.dataset.tab;
                    const isPublic = tabName === 'universities' || tabName === 'majors';
                    btn.classList.toggle('hidden', !isPublic);
                });
                
                // 2. 【已修正】直接激活默认标签页并加载其内容
                const defaultTabButton = document.querySelector('.tab-button[data-tab="universities"]');
                const defaultTabPanel = document.getElementById('universities-tab');

                if (defaultTabButton && defaultTabPanel) {
                    // 确保其他标签页和面板都处于非激活状态
                    tabButtons.forEach(t => t.classList.remove('active'));
                    tabPanels.forEach(p => p.classList.remove('active'));

                    // 明确激活“高校库”
                    defaultTabButton.classList.add('active');
                    defaultTabPanel.classList.add('active');

                    // 直接调用初始化函数来加载内容
                    if (typeof window.initializeUniversitiesTab === 'function' && !defaultTabPanel.dataset.initialized) {
                        window.initializeUniversitiesTab();
                    }
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
