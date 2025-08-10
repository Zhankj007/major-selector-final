// public/js/main.js (带调试信息的最终诊断版 - 100%完整代码)

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
    const registerError = document.getElementById('register-error');
    const registerMessage = document.getElementById('register-message');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const userNicknameElement = document.getElementById('user-nickname');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const authButton = document.getElementById('auth-button');

    const publicTabs = new Set(['universities', 'majors']);
    let currentUser = null;

    // 2. --- 核心认证逻辑 ---
    console.log("【调试】: 即将挂载 onAuthStateChange 监听器。");
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log(`%c【调试】: onAuthStateChange 事件触发! 事件类型: ${event}`, 'color: green; font-weight: bold;');
        
        currentUser = session?.user || null;
        if (currentUser) {
            console.log("【调试】: 判断为已登录状态。用户对象:", currentUser);
        } else {
            console.log("【调试】: 判断为未登录状态。");
        }
        
        await updateUserInterface(currentUser);
    });

    /**
     * 统一的UI更新函数
     */
    async function updateUserInterface(user) {
        console.log("【调试】: 进入 updateUserInterface 函数。");
        
        if (user) {
            authButton.textContent = '退出登录';
            document.body.classList.remove('logged-out');
            
            console.log(`【调试】: 准备从 'profiles' 表查询 id 为 ${user.id} 的用户信息...`);
            const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('username').eq('id', user.id).single();
            
            if (profileError) {
                console.error("【调试】: 查询 'profiles' 表出错!", profileError);
            }
            if (profile) {
                console.log("【调试】: 成功获取到 profile 数据:", profile);
                userNicknameElement.textContent = `欢迎您, ${profile.username || ''}`;
            } else {
                console.log("【调试】: 未能获取到 profile 数据。");
                userNicknameElement.textContent = '欢迎您';
            }
        } else {
            authButton.textContent = '登录/注册';
            userNicknameElement.textContent = '';
            document.body.classList.remove('logged-out');
        }

        const permittedTabs = await getPermittedTabs(user);
        console.log("【调试】: 获取到的最终权限列表:", permittedTabs);
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
            console.log("【调试】: 当前无激活标签页或激活页被隐藏，准备点击第一个可见标签页。");
            firstVisibleTab?.click();
        }
    }

    /**
     * 获取用户权限
     */
    async function getPermittedTabs(user) {
        const permitted = new Set(publicTabs);
        if (!user) return permitted;

        console.log("【调试】: 准备并发查询 role 和 permissions...");
        const [profileRes, permsRes] = await Promise.all([
            supabaseClient.from('profiles').select('role').eq('id', user.id).single(),
            supabaseClient.from('user_permissions').select('tab_name, expires_at').eq('user_id', user.id)
        ]);

        console.log("【调试】: Role 查询结果:", profileRes.data);
        console.log("【调试】: Permissions 查询结果:", permsRes.data);

        if (profileRes.data?.role === 'admin') permitted.add('admin');
        if (permsRes.data) {
            const now = new Date();
            permsRes.data.forEach(p => {
                if (!p.expires_at || new Date(p.expires_at) >= now) permitted.add(p.tab_name);
            });
        }
        return permitted;
    }

    // 3. --- 事件监听器 (完整版) ---

    authButton.addEventListener('click', () => {
        console.log(`%c【调试】: 认证按钮被点击! 当前登录状态 (currentUser): ${!!currentUser}`, 'color: blue; font-weight: bold;');
        if (currentUser) {
            console.log("【调试】: 执行退出登录操作...");
            supabaseClient.auth.signOut();
        } else {
            console.log("【调试】: 执行显示登录框操作...");
            document.body.classList.add('logged-out');
            loginSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        console.log(`【调试】: 准备使用邮箱 ${email} 尝试登录...`);
        try {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            console.log("【调试】: signInWithPassword 调用成功，等待 onAuthStateChange 更新UI。");
        } catch (error) {
            console.error("【调试】: 登录时捕获到错误!", error);
            loginError.textContent = error.message.includes("Invalid login credentials") ? "邮箱或密码错误，请重试。" : error.message;
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
        console.log(`【调试】: 准备注册新用户，邮箱: ${email}`);
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
            console.error("【调试】: 注册时捕获到错误!", error);
            registerError.textContent = error.message;
        }
    });

    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            console.log(`【调试】: 标签页 "${tab.dataset.tab}" 被点击。`);
            if (tab.style.display === 'none') return;
            if (currentUser) document.body.classList.remove('logged-out');
            tabButtons.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanels.forEach(panel => {
                const isActive = panel.id === `${tab.dataset.tab}-tab`;
                panel.classList.toggle('active', isActive);
                if (isActive && !panel.dataset.initialized) {
                    console.log(`【调试】: 首次加载标签页 "${tab.dataset.tab}" 的内容...`);
                    if (tab.dataset.tab === 'universities') window.initializeUniversitiesTab?.();
                    else if (tab.dataset.tab === 'majors') window.initializeMajorsTab?.();
                    else if (tab.dataset.tab === 'plans') window.initializePlansTab?.();
                    else if (tab.dataset.tab === 'admin') window.initializeAdminTab?.();
                }
            });
        });
    });
    
    showRegisterLink.addEventListener('click', e => { e.preventDefault(); loginError.textContent=''; registerError.textContent=''; registerMessage.textContent = ''; loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
    showLoginLink.addEventListener('click', e => { e.preventDefault(); registerError.textContent=''; registerMessage.textContent=''; registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });

    // 4. --- 页面初始化 ---
    console.log("【调试】: 准备自动点击第一个标签页以加载内容...");
    document.querySelector('.tab-button[data-tab="universities"]')?.click();
    
    fetch('/api/counter').then(res => res.json()).then(data => {
        document.getElementById('visitor-info').textContent = `您是第 ${data.count} 位访客！`;
    }).catch(err => console.error('获取访客数失败:', err));

    console.log("【调试】: main.js 脚本执行完毕。");
});