// public/js/main.js (增强调试版 - 追踪点击事件)

document.addEventListener('DOMContentLoaded', function () {
    console.log("【调试】: 页面DOM加载完成，开始执行main.js。");

    // 1. --- 初始化和元素获取 ---
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;

    const loginSection = document.getElementById('login-section');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const userNicknameElement = document.getElementById('user-nickname');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const authButton = document.getElementById('auth-button');

    // 2. --- 应用状态和配置 ---
    const publicTabs = new Set(['universities', 'majors']);
    let currentUser = null;

    // 3. --- 核心认证逻辑 ---
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log(`%c【调试】: onAuthStateChange 事件触发! 事件类型: ${event}`, 'color: green; font-weight: bold;');
        currentUser = session?.user || null;
        await updateUserInterface(currentUser);
    });

    /**
     * 统一的UI更新函数
     * @param {object|null} user - Supabase的用户对象
     */
    async function updateUserInterface(user) {
        console.log("【调试】: 进入 updateUserInterface 函数。");
        const [permittedTabs, profile] = await Promise.all([
            getPermittedTabs(user),
            user ? supabaseClient.from('profiles').select('username').eq('id', user.id).single() : Promise.resolve({ data: null })
        ]);
        console.log("【调试】: 已获取权限和用户信息。");

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

    async function getPermittedTabs(user) {
        const permitted = new Set(publicTabs);
        if (!user) return permitted;
        const [profileRes, permsRes] = await Promise.all([
            supabaseClient.from('profiles').select('role').eq('id', user.id).single(),
            supabaseClient.from('user_permissions').select('tab_name').eq('user_id', user.id)
        ]);
        if (profileRes.data?.role === 'admin') permitted.add('admin');
        if (permsRes.data) permsRes.data.forEach(p => permitted.add(p.tab_name));
        return permitted;
    }

    // 4. --- 事件监听器 ---

    // 【调试增强】: 检查认证按钮是否存在
    if (authButton) {
        console.log("【调试】: 成功找到认证按钮(authButton)，准备绑定点击事件。");
        authButton.addEventListener('click', () => {
            console.log(`%c【调试】: “${authButton.textContent}” 按钮被点击!`, 'color: blue; font-weight: bold;');
            if (currentUser) {
                supabaseClient.auth.signOut();
            } else {
                document.body.classList.add('logged-out');
                loginSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    } else {
        console.error("【调试】: 致命错误 - 找不到ID为 'auth-button' 的按钮！");
    }

    // 【调试增强】: 检查登录表单是否存在
    if (loginForm) {
        console.log("【调试】: 成功找到登录表单(loginForm)，准备绑定提交事件。");
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log("%c【调试】: 登录表单被提交！", 'color: red; font-weight: bold;');
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
                location.reload();
            } catch (error) {
                loginError.textContent = error.message;
            }
        });
    } else {
        console.error("【调试】: 致命错误 - 找不到ID为 'login-form' 的表单！");
    }
    
    // 省略其他非核心事件监听器，保持不变
    const registerMessage = document.getElementById('register-message');
    document.getElementById('show-register-link').addEventListener('click', e => { e.preventDefault(); loginError.textContent = ''; document.getElementById('register-error').textContent = ''; registerMessage.textContent = ''; loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
    document.getElementById('show-login-link').addEventListener('click', e => { e.preventDefault(); loginError.textContent = ''; document.getElementById('register-error').textContent = ''; registerMessage.textContent = ''; registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });
    registerForm.addEventListener('submit', async (event) => { /* 保持您原有的注册逻辑 */ });
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
                    else if (tab.dataset.tab === 'majors') window.initializeMajorsTab?.();
                    else if (tab.dataset.tab === 'plans') window.initializePlansTab?.();
                    else if (tab.dataset.tab === 'admin') window.initializeAdminTab?.();
                }
            });
        });
    });

    // 5. --- 页面初始化 ---
    document.querySelector('.tab-button[data-tab="universities"]')?.click();
    fetch('/api/counter').then(res => res.json()).then(data => {
        document.getElementById('visitor-info').textContent = `您是第 ${data.count} 位访客！`;
    }).catch(err => console.error('获取访客数失败:', err));
});