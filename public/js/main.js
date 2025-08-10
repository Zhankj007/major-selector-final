// public/js/main.js (Final Stable & Refactored Version)

document.addEventListener('DOMContentLoaded', function () {
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;

    // --- 1. UI元素获取 ---
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

    // --- 2. 状态与配置 ---
    const publicTabs = ['universities', 'majors'];
    let isLoggedIn = false; // 核心状态标志

    // --- 3. 核心认证逻辑 ---
    // 监听认证状态的每一次变化 (登录、退出、页面加载时)
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        // 根据 session 是否存在来更新核心状态
        isLoggedIn = !!(session && session.user);

        // 获取所有需要根据权限显示的标签页
        const permittedTabs = await getPermittedTabs(session);

        // 根据最新状态，一次性更新整个UI
        updateUI(isLoggedIn, permittedTabs, session);
    });

    /**
     * 根据 session 获取用户所有有权访问的标签页
     * @param {object|null} session - Supabase 的 session 对象
     * @returns {Set<string>} - 一个包含所有可访问标签页名称的 Set
     */
    async function getPermittedTabs(session) {
        const permitted = new Set(publicTabs); // 所有人都能看公开的
        if (!session || !session.user) {
            return permitted; // 未登录，直接返回公开权限
        }
        
        // 已登录，并发获取角色和特殊权限
        const [profileRes, permsRes] = await Promise.all([
            supabaseClient.from('profiles').select('role').eq('id', session.user.id).single(),
            supabaseClient.from('user_permissions').select('tab_name, expires_at').eq('user_id', session.user.id)
        ]);

        if (profileRes.data?.role === 'admin') {
            permitted.add('admin');
        }

        if (permsRes.data) {
            const now = new Date();
            permsRes.data.forEach(p => {
                if (!p.expires_at || new Date(p.expires_at) >= now) {
                    permitted.add(p.tab_name);
                }
            });
        }
        return permitted;
    }

    /**
     * 根据当前的认证状态，集中更新所有相关的UI元素
     * @param {boolean} loggedIn - 用户是否登录
     * @param {Set<string>} permittedTabs - 用户有权访问的标签页
     * @param {object|null} session - Supabase 的 session 对象
     */
    async function updateUI(loggedIn, permittedTabs, session) {
        // 更新欢迎语和登录/注册区域的可见性
        if (loggedIn && session.user) {
            document.body.classList.remove('logged-out');
            authButton.textContent = '退出登录';
            // 异步获取并显示用户名
            const { data: profile } = await supabaseClient.from('profiles').select('username').eq('id', session.user.id).single();
            userNicknameElement.textContent = `欢迎您, ${profile?.username || ''}`;
        } else {
            document.body.classList.add('logged-out');
            authButton.textContent = '登录/注册';
            userNicknameElement.textContent = '';
        }

        // 更新标签页的可见性
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

        // 如果当前激活的标签页被隐藏了，则自动切换到第一个可见的
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab && activeTab.style.display === 'none') {
            firstVisibleTab?.click();
        }
    }

    // --- 4. 事件监听器 ---

    // 为认证按钮设置一个永久的点击事件处理器
    authButton.addEventListener('click', () => {
        if (isLoggedIn) {
            // 如果已登录，则执行退出操作
            supabaseClient.auth.signOut();
        } else {
            // 如果未登录，则显示登录框并滚动到视图
            document.body.classList.add('logged-out');
            loginSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
    
    // 登录/注册表单切换逻辑
    showRegisterLink.addEventListener('click', e => { e.preventDefault(); loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
    showLoginLink.addEventListener('click', e => { e.preventDefault(); registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });

    // 标签页点击逻辑
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.style.display === 'none') return;
            const targetId = tab.dataset.tab;
            if (isLoggedIn) document.body.classList.remove('logged-out'); // 点击标签页时隐藏登录框

            tabButtons.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanels.forEach(panel => {
                const isActive = panel.id === `${targetId}-tab`;
                panel.classList.toggle('active', isActive);
                if (isActive && !panel.dataset.initialized) {
                    // Lazy-load tab content
                    if (targetId === 'universities') window.initializeUniversitiesTab?.();
                    else if (targetId === 'majors') window.initializeMajorsTab?.();
                    else if (targetId === 'plans') window.initializePlansTab?.();
                    else if (targetId === 'admin') window.initializeAdminTab?.();
                }
            });
        });
    });

    // 登录表单提交
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginError.textContent = '';

        // 使用 ID 获取输入框，并增加健壮性检查
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');

        if (!emailInput || !passwordInput) {
            loginError.textContent = '页面结构错误：找不到登录输入框。';
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value, password: passwordInput.value }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            const { error } = await supabaseClient.auth.setSession(data.session);
            if (error) throw error;
        } catch (error) {
            loginError.textContent = error.message;
        }
    });

    // 注册表单提交
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        registerError.textContent = '';
        registerMessage.textContent = '';

        // 使用 ID 获取所有输入框
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

    // --- 5. 初始化 ---
    // 自动点击第一个标签页来加载初始内容
    document.querySelector('.tab-button[data-tab="universities"]')?.click();

    // 加载访客计数
    fetch('/api/counter').then(res => res.json()).then(data => {
        document.getElementById('visitor-info').textContent = `您是第 ${data.count} 位访客！`;
    }).catch(err => console.error('Failed to fetch visitor count:', err));
});