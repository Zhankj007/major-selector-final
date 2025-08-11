document.addEventListener('DOMContentLoaded', function () {
    // --- 1. 初始化 SUPABASE 客户端 ---
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
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
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // --- 3. 核心认证状态管理 (重写后的最终版本) ---
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        document.body.classList.remove('show-login-section');
        
        // 定义所有可能的标签页名称
        const allTabNames = ['universities', 'majors', 'plans', 'admin'];

        if (session && session.user) {
            // --- 用户已登录 ---
            authButton.textContent = '退出登录';

            try {
                // 并发获取个人信息和权限
                const [
                    { data: profile, error: profileError },
                    { data: permissions, error: permsError }
                ] = await Promise.all([
                    supabaseClient.from('profiles').select('username, role').eq('id', session.user.id).single(),
                    supabaseClient.from('user_permissions').select('tab_name, expires_at').eq('user_id', session.user.id)
                ]);

                if (profileError || permsError) throw profileError || permsError;

                // 1. 确定该用户所有可见的标签页
                const visibleTabs = new Set(['universities', 'majors']); // 公开的标签页默认可见
                const now = new Date();
                if (permissions) {
                    permissions.forEach(p => {
                        if (!p.expires_at || new Date(p.expires_at) > now) {
                            visibleTabs.add(p.tab_name);
                        }
                    });
                }
                if (profile && profile.role === 'admin') {
                    visibleTabs.add('admin');
                }

                // 2. 根据最终权限，统一设置所有按钮的可见性
                tabButtons.forEach(btn => {
                    btn.classList.toggle('hidden', !visibleTabs.has(btn.dataset.tab));
                });
                
                // 3. 显示欢迎信息
                if (userNicknameElement) {
                   userNicknameElement.textContent = profile && profile.username ? `欢迎您, ${profile.username}` : '欢迎您';
                }

                // 4. 智能激活标签页
                const currentlyActive = document.querySelector('.tab-button.active');
                if (!currentlyActive || currentlyActive.classList.contains('hidden')) {
                    document.querySelector('.tab-button:not(.hidden)')?.click();
                }

            } catch (error) {
                console.error("加载用户信息或权限时出错:", error);
                authButton.textContent = '退出登录';
                // 出错时隐藏所有标签页，避免显示错误内容
                tabButtons.forEach(btn => btn.classList.add('hidden'));
            }

        } else {
            // --- 用户未登录 (游客) ---
            authButton.textContent = '登录/注册';
            if (userNicknameElement) userNicknameElement.textContent = '';
            
            // 只显示公开的标签页
            tabButtons.forEach(btn => {
                const isPublic = btn.dataset.tab === 'universities' || btn.dataset.tab === 'majors';
                btn.classList.toggle('hidden', !isPublic);
            });
            
            // 默认激活高校库
            const uniTab = document.querySelector('.tab-button[data-tab="universities"]');
            if (uniTab) uniTab.click();
        }
    });
    
    // --- 4. 其他所有事件监听器和辅助函数 (保持我们之前的最终版本) ---
    
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginError.textContent = '';
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerError.textContent = '';
        registerMessage.textContent = '';
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

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
            registerMessage.textContent = '注册成功！现在您可以登录了。';
            setTimeout(() => { showLoginLink.click(); }, 2000);
        } catch (error) {
            registerError.textContent = error.message;
        }
    });

    authButton.addEventListener('click', async () => {
        const { data: { session } } = await supabaseClient.auth.getSession(); 
        if (session) {
            supabaseClient.auth.signOut();
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
        try {
            const response = await fetch('/api/counter');
            if (!response.ok) return;
            const data = await response.json();
            const visitorElement = document.getElementById('visitor-info');
            if (visitorElement) {
                // 接回之前显示昵称的逻辑
                const nicknameSpan = document.getElementById('user-nickname');
                const nicknameText = nicknameSpan ? nicknameSpan.textContent : '';
                visitorElement.textContent = `${nicknameText ? '您是' : '您是第'} ${data.count} ${nicknameText ? '位用户' : '位访客！'}`;
            }
        } catch (error) {
            console.error('Failed to fetch visitor count:', error);
        }
    }
    
    updateVisitorCount();
});