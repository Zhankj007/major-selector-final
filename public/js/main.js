// public/js/main.js (Final Stable Version)

document.addEventListener('DOMContentLoaded', function () {
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;

    // --- 获取所有UI元素 ---
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
    const authButton = document.getElementById('auth-button');

    const publicTabs = ['universities', 'majors'];

    // --- 定义清晰的事件处理函数 ---
    const handleLogout = () => {
        supabaseClient.auth.signOut();
    };

    const handleShowLogin = () => {
        document.body.classList.add('logged-out');
        if (loginSection) {
            loginSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    
    // --- 更健壮的按钮行为设置函数 ---
    function setAuthButtonAction(action) {
        authButton.removeEventListener('click', handleLogout);
        authButton.removeEventListener('click', handleShowLogin);

        if (action === 'logout') {
            authButton.textContent = '退出登录';
            authButton.addEventListener('click', handleLogout);
        } else { // 'login'
            authButton.textContent = '登录/注册';
            authButton.addEventListener('click', handleShowLogin);
        }
    }

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

    async function handleAuthStateChange(event, session) {
        const permittedTabs = new Set(publicTabs);

        if (session && session.user) {
            // --- 用户已登录 ---
            document.body.classList.remove('logged-out');
            setAuthButtonAction('logout');

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
            userNicknameElement.textContent = '';
            setAuthButtonAction('login');
        }
        
        updateTabVisibility(permittedTabs);
    }

    // --- 挂载核心的认证状态监听器 ---
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
            
            if (supabaseClient.auth.getSession()) {
                document.body.classList.remove('logged-out');
            }

            tabButtons.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanels.forEach(panel => {
                const isActive = panel.id === `${targetId}-tab`;
                panel.classList.toggle('active', isActive);
                if (isActive && !panel.dataset.initialized) {
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
    
    // 自动点击第一个标签页来加载初始内容
    const firstTab = document.querySelector('.tab-button[data-tab="universities"]');
    if(firstTab) firstTab.click();

    updateVisitorCount();
});