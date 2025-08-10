// public/js/main.js (最终修复版 - 解决ReferenceError)

document.addEventListener('DOMContentLoaded', function () {
    // 1. --- 初始化和元素获取 ---
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;

    // 一次性获取所有需要的元素，确保没有遗漏
    const loginSection = document.getElementById('login-section');
    const loginForm = document.getElementById('login-form');
    // 【关键修复】: 确保 registerForm 在脚本最开始就被正确定义
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

    // 2. --- 应用状态和配置 ---
    const publicTabs = new Set(['universities', 'majors']);
    let currentUser = null;

    // 3. --- 核心认证逻辑 ---
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        currentUser = session?.user || null;
        await updateUserInterface(currentUser);
    });

    /**
     * 统一的UI更新函数，是所有界面变化的总指挥
     */
    async function updateUserInterface(user) {
        // 等待所有必需的数据（权限和用户信息）都获取完毕
        const [permittedTabs, profile] = await Promise.all([
            getPermittedTabs(user),
            user ? supabaseClient.from('profiles').select('username').eq('id', user.id).single() : Promise.resolve({ data: null })
        ]);

        // 根据获取到的数据，一次性、同步地更新所有UI元素
        if (user && profile) {
            authButton.textContent = '退出登录';
            document.body.classList.remove('logged-out');
            userNicknameElement.textContent = profile.data ? `欢迎您, ${profile.data.username}` : '欢迎您';
        } else {
            authButton.textContent = '登录/注册';
            userNicknameElement.textContent = '';
            document.body.classList.remove('logged-out');
        }

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
        if (!activeTab || activeTab.style.display === 'none') {
            firstVisibleTab?.click();
        }
    }

    /**
     * 获取用户所有有权访问的标签页
     */
    async function getPermittedTabs(user) {
        const permitted = new Set(publicTabs);
        if (!user) return permitted;

        const [profileRes, permsRes] = await Promise.all([
            supabaseClient.from('profiles').select('role').eq('id', user.id).single(),
            supabaseClient.from('user_permissions').select('tab_name, expires_at').eq('user_id', user.id)
        ]);

        if (profileRes.data?.role === 'admin') permitted.add('admin');
        if (permsRes.data) {
            const now = new Date();
            permsRes.data.forEach(p => {
                if (!p.expires_at || new Date(p.expires_at) >= now) permitted.add(p.tab_name);
            });
        }
        return permitted;
    }

    // 4. --- 事件监听器 ---

    // 认证按钮的唯一点击事件
    authButton.addEventListener('click', () => {
        if (currentUser) {
            supabaseClient.auth.signOut();
        } else {
            document.body.classList.add('logged-out');
            loginSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    // 登录表单的提交事件
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginError.textContent = '';
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value, password: passwordInput.value }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            const { error: sessionError } = await supabaseClient.auth.setSession(data.session);
            if (sessionError) throw sessionError;
        } catch (error) {
            loginError.textContent = error.message;
        }
    });

    // 注册表单的提交事件 (使用在顶部已定义的 registerForm 变量)
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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username, phone, unit_name }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            registerMessage.textContent = '注册成功！现在您可以登录了。';
            setTimeout(() => showLoginLink.click(), 2000);
        } catch (error) {
            registerError.textContent = error.message;
        }
    });

    // 标签页点击逻辑
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.style.display === 'none') return;
            if (currentUser) document.body.classList.remove('logged-out');
            tabButtons.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanels.forEach(panel => {
                const isActive = panel.id === `${tab.dataset.tab}-tab`;
                panel.classList.toggle('active', isActive);
                if (isActive && !panel.dataset.initialized) {
                    if (tab.dataset.tab === 'universities') window.initializeUniversitiesTab?.();
                    else if (tab.dataset.tab === 'majors') window.initializeUniversitiesTab?.();
                    else if (tab.dataset.tab === 'plans') window.initializePlansTab?.();
                    else if (tab.dataset.tab === 'admin') window.initializeAdminTab?.();
                }
            });
        });
    });

    // “立即注册”和“立即登录”链接的点击逻辑
    showRegisterLink.addEventListener('click', e => { e.preventDefault(); loginError.textContent = ''; registerError.textContent = ''; registerMessage.textContent = ''; loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
    showLoginLink.addEventListener('click', e => { e.preventDefault(); registerError.textContent = ''; registerMessage.textContent = ''; registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });

    // 5. --- 页面初始化 ---
    document.querySelector('.tab-button[data-tab="universities"]')?.click();
    fetch('/api/counter').then(res => res.json()).then(data => {
        document.getElementById('visitor-info').textContent = `您是第 ${data.count} 位访客！`;
    }).catch(err => console.error('获取访客数失败:', err));
});