// public/js/main.js (Final Version)

document.addEventListener('DOMContentLoaded', function () {
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;

    // --- 获取所有UI元素 (新增 authButton) ---
    const loginSection = document.getElementById('login-section');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const registerMessage = document.getElementById('register-message');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const userNicknameElement = document.getElementById('user-nickname');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const authButton = document.getElementById('auth-button'); // 获取新的认证按钮

    // --- 新的权限控制核心逻辑 ---
    const publicTabs = ['universities', 'majors'];

    function updateTabVisibility(permittedTabs) {
        let firstVisibleTab = null;
        tabButtons.forEach(btn => {
            const tabName = btn.dataset.tab;
            if (permittedTabs.has(tabName)) {
                btn.style.display = '';
                if (!firstVisibleTab) firstVisibleTab = btn;
            } else {
                btn.style.display = 'none';
            }
        });

        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab && activeTab.style.display === 'none') {
            if (firstVisibleTab) firstVisibleTab.click();
        } else if (!activeTab && firstVisibleTab) {
            firstVisibleTab.click();
        }
    }
    
    // --- 【核心修改】为认证按钮添加事件处理器 ---
    let authButtonHandler = null; // 用于存储当前的点击事件处理函数

    function setAuthButtonAction(action) {
        // 先移除旧的事件监听器，防止重复绑定
        if (authButtonHandler) {
            authButton.removeEventListener('click', authButtonHandler);
        }

        if (action === 'logout') {
            authButton.textContent = '退出登录';
            authButtonHandler = () => supabaseClient.auth.signOut();
        } else { // 'login'
            authButton.textContent = '登录/注册';
            authButtonHandler = () => {
                 document.body.classList.add('logged-out'); // 强制显示登录/注册界面
            };
        }
        authButton.addEventListener('click', authButtonHandler);
    }


    async function handleAuthStateChange(event, session) {
        const permittedTabs = new Set(publicTabs);

        if (session && session.user) {
            // --- 用户已登录 ---
            document.body.classList.remove('logged-out');
            setAuthButtonAction('logout'); // 设置按钮为“退出登录”

            const [profileResponse, permissionsResponse] = await Promise.all([
                supabaseClient.from('profiles').select('username, role').eq('id', session.user.id).single(),
                supabaseClient.from('user_permissions').select('tab_name, expires_at').eq('user_id', session.user.id)
            ]);

            if (profileResponse.data) {
                userNicknameElement.textContent = `欢迎您, ${profileResponse.data.username || ''}`;
                if (profileResponse.data.role === 'admin') permittedTabs.add('admin');
            } else {
                 userNicknameElement.textContent = '欢迎您';
            }
            if(profileResponse.error) console.error("获取用户信息失败:", profileResponse.error);

            if (permissionsResponse.data) {
                 const now = new Date();
                 permissionsResponse.data.forEach(perm => {
                    if (!perm.expires_at || new Date(perm.expires_at) >= now) {
                        permittedTabs.add(perm.tab_name);
                    }
                });
            }
            if(permissionsResponse.error) console.error("获取用户权限失败:", permissionsResponse.error);

        } else {
            // --- 用户已退出 ---
            document.body.classList.add('logged-out');
            userNicknameElement.textContent = '';
            setAuthButtonAction('login'); // 设置按钮为“登录/注册”
        }
        
        updateTabVisibility(permittedTabs);
    }

    supabaseClient.auth.onAuthStateChange(handleAuthStateChange);


    // --- 登录/注册表单切换 ---
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

    // --- 表单提交逻辑 ---
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginError.textContent = '';
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
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
            setTimeout(() => {
                 showLoginLink.click();
            }, 2000);
        } catch (error) {
            registerError.textContent = error.message;
        }
    });

    // --- 标签页点击切换逻辑 ---
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.style.display === 'none') return;
            const targetId = tab.dataset.tab;
            // 当点击任意标签页时，如果登录/注册框是显示的，就隐藏它
            if (!document.body.classList.contains('logged-out')) {
                // 只有在登录状态下才执行此操作
            }

            tabButtons.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanels.forEach(panel => {
                const isActive = panel.id === `${targetId}-tab`;
                panel.classList.toggle('active', isActive);
                if (isActive && !panel.dataset.initialized) {
                    // Initialize tab content...
                    if (targetId === 'universities' && typeof window.initializeUniversitiesTab === 'function') window.initializeUniversitiesTab();
                    else if (targetId === 'majors' && typeof window.initializeMajorsTab === 'function') window.initializeMajorsTab();
                    else if (targetId === 'plans' && typeof window.initializePlansTab === 'function') window.initializePlansTab();
                    else if (targetId === 'admin' && typeof window.initializeAdminTab === 'function') window.initializeAdminTab();
                }
            });
        });
    });

    // --- 访客计数器 ---
    async function updateVisitorCount() {
        const visitorElement = document.getElementById('visitor-info');
        if (!visitorElement) return;
        try {
            const response = await fetch('/api/counter');
            if (!response.ok) return;
            const data = await response.json();
            visitorElement.textContent = `您是第 ${data.count} 位访客！`;
        } catch (error) {
            console.error('Failed to fetch visitor count:', error);
        }
    }
    
    // --- 初始化 ---
    const firstTab = document.querySelector('.tab-button[data-tab="universities"]');
    if(firstTab) firstTab.click();

    updateVisitorCount();
});