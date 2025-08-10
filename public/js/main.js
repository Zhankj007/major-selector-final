// public/js/main.js (最终修复版 - 100%完整代码)

document.addEventListener('DOMContentLoaded', function () {
    // 1. --- 初始化和元素获取 ---
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;

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

    // 2. --- 应用状态 ---
    let currentUser = null;

    // 3. --- 核心认证逻辑 ---
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        // 初始加载时，如果URL中有#access_token，说明是刚登录跳转回来，先不急着更新UI
        // 等待 loginForm 的 setSession 完成并触发后续的 SIGNED_IN 事件
        if (event === 'INITIAL_SESSION' && window.location.hash.includes('access_token')) {
            return;
        }
        currentUser = session?.user || null;
        await updateUserInterface(currentUser);
    });
    
    /**
     * 【核心修正】: UI更新函数，采用更稳妥的串行查询
     * @param {object|null} user - Supabase的用户对象
     */
    async function updateUserInterface(user) {
        if (!user) {
            // --- 未登录状态 ---
            authButton.textContent = '登录/注册';
            userNicknameElement.textContent = '';
            document.body.classList.remove('logged-out');
            
            // 只显示公开标签页
            const publicTabs = new Set(['universities', 'majors']);
            tabButtons.forEach(btn => {
                btn.style.display = publicTabs.has(btn.dataset.tab) ? '' : 'none';
            });
            // 确保默认标签页被激活
            const activeTab = document.querySelector('.tab-button.active');
            if (!activeTab || activeTab.style.display === 'none') {
                 document.querySelector('.tab-button[data-tab="universities"]')?.click();
            }
            return;
        }

        // --- 已登录状态 ---
        authButton.textContent = '退出登录';
        document.body.classList.remove('logged-out');

        // 【关键修改】: 将并发查询 Promise.all 改为串行查询
        // 1. 先查询 profiles 表
        const profileRes = await supabaseClient.from('profiles').select('username, role').eq('id', user.id).single();
        if (profileRes.error) {
            console.error("获取用户信息失败:", profileRes.error);
            userNicknameElement.textContent = '用户状态异常';
            return;
        }
        userNicknameElement.textContent = `欢迎您, ${profileRes.data.username || ''}`;

        // 2. 再查询 user_permissions 表
        const permsRes = await supabaseClient.from('user_permissions').select('tab_name').eq('user_id', user.id);
        if (permsRes.error) {
            console.error("获取用户权限失败:", permsRes.error);
        }

        // 3. 最后根据所有查询结果，更新UI
        const permittedTabs = new Set(['universities', 'majors']);
        if (profileRes.data.role === 'admin') {
            permittedTabs.add('admin');
        }
        if (permsRes.data) {
            permsRes.data.forEach(p => permittedTabs.add(p.tab_name));
        }
        
        tabButtons.forEach(btn => {
            btn.style.display = permittedTabs.has(btn.dataset.tab) ? '' : 'none';
        });

        const activeTab = document.querySelector('.tab-button.active');
        if (!activeTab || activeTab.style.display === 'none') {
            document.querySelector('.tab-button[data-tab="universities"]')?.click();
        }
    }

    // 4. --- 事件监听器 ---
    authButton.addEventListener('click', () => {
        if (currentUser) supabaseClient.auth.signOut();
        else document.body.classList.add('logged-out');
    });

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginError.textContent = '正在登录中...';
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const response = await fetch('/api/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            const { error: sessionError } = await supabaseClient.auth.setSession(data.session);
            if (sessionError) throw sessionError;
            // 登录成功后，onAuthStateChange 会自动处理所有UI更新，无需在这里做任何事
        } catch (error) {
            loginError.textContent = error.message;
        }
    });

    // 【完整版】注册表单的事件监听器
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
                    else if (tab.dataset.tab === 'majors') window.initializeMajorsTab?.();
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