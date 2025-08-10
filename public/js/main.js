// public/js/main.js (最终稳定版, 完整代码, 中文注释)

document.addEventListener('DOMContentLoaded', function () {
    // 1. --- 初始化和元素获取 ---
    // 从环境变量占位符初始化Supabase客户端
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient; // 将客户端挂载到全局，方便其他脚本使用

    // 缓存所有需要操作的DOM元素，提高性能
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

    // 2. --- 应用状态和配置 ---
    const publicTabs = new Set(['universities', 'majors']); // 始终对所有用户可见的标签页
    let currentUser = null; // 用于存储当前登录的用户信息

    // 3. --- 核心认证逻辑 ---
    // 监听认证状态的任何变化（包括页面首次加载、登录、退出）
    // 这是驱动所有UI变化的核心函数
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        currentUser = session?.user || null; // 更新当前用户状态
        await updateUserInterface(currentUser); // 根据新的用户状态，更新整个界面
    });

    /**
     * 统一的UI更新函数，所有与认证状态相关的界面变化都在这里处理
     * @param {object|null} user - Supabase的用户对象，如果未登录则为null
     */
    async function updateUserInterface(user) {
        // 第一部分：处理登录/退出按钮、欢迎语和登录框的显示状态
        if (user) {
            // --- 用户已登录 ---
            authButton.textContent = '退出登录';
            document.body.classList.remove('logged-out'); // 移除logged-out类，隐藏登录框

            // 从数据库异步获取用户名并显示
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .single();
            userNicknameElement.textContent = `欢迎您, ${profile?.username || ''}`;
        } else {
            // --- 用户未登录 ---
            authButton.textContent = '登录/注册';
            userNicknameElement.textContent = ''; // 清空欢迎语
            // 默认显示公共页面，不显示登录框
            document.body.classList.remove('logged-out');
        }

        // 第二部分：处理所有标签页的可见性
        const permittedTabs = await getPermittedTabs(user);
        let firstVisibleTab = null;

        tabButtons.forEach(btn => {
            const tabName = btn.dataset.tab;
            if (permittedTabs.has(tabName)) {
                btn.style.display = ''; // 如果有权限，则显示
                if (!firstVisibleTab) firstVisibleTab = btn; // 记录第一个可见的标签页
            } else {
                btn.style.display = 'none'; // 没有权限则隐藏
            }
        });

        // 第三部分：确保页面上总有一个激活的标签页
        const activeTab = document.querySelector('.tab-button.active');
        // 如果当前激活的标签页被隐藏了，或者没有任何标签页被激活，则自动点击第一个可见的标签页
        if (!activeTab || activeTab.style.display === 'none') {
            firstVisibleTab?.click();
        }
    }

    /**
     * 根据用户身份，获取所有其有权访问的标签页集合
     * @param {object|null} user - Supabase的用户对象
     * @returns {Promise<Set<string>>} - 返回一个包含所有可访问标签页名称的集合
     */
    async function getPermittedTabs(user) {
        const permitted = new Set(publicTabs); // 基础权限：公开的标签页
        if (!user) return permitted; // 如果未登录，直接返回基础权限

        // 用户已登录，并发查询其角色和特殊权限
        const [profileRes, permsRes] = await Promise.all([
            supabaseClient.from('profiles').select('role').eq('id', user.id).single(),
            supabaseClient.from('user_permissions').select('tab_name, expires_at').eq('user_id', user.id)
        ]);

        if (profileRes.data?.role === 'admin') {
            permitted.add('admin'); // 如果是管理员，添加后台管理权限
        }

        if (permsRes.data) {
            const now = new Date();
            permsRes.data.forEach(p => {
                // 如果权限未设置到期日，或未到期，则添加该权限
                if (!p.expires_at || new Date(p.expires_at) >= now) {
                    permitted.add(p.tab_name);
                }
            });
        }
        return permitted;
    }


    // 4. --- 事件监听器 ---

    // 为认证按钮设置一个唯一的、永久的点击事件
    authButton.addEventListener('click', () => {
        if (currentUser) {
            // 如果当前是登录状态，则执行退出操作
            supabaseClient.auth.signOut();
        } else {
            // 如果当前是未登录状态，则显示登录框，并滚动到视图中央
            document.body.classList.add('logged-out');
            loginSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    // 为登录表单设置提交事件
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (error) {
            // 根据Supabase返回的错误信息，显示更友好的提示
            loginError.textContent = error.message.includes("Invalid login credentials") 
                ? "邮箱或密码错误，请重试。" 
                : error.message;
        }
    });

    // 为注册表单设置提交事件（完整版）
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

    // 标签页的点击切换逻辑
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.style.display === 'none') return;
            // 当点击任意标签页时，如果用户是登录状态，则确保登录框是隐藏的
            if (currentUser) {
                document.body.classList.remove('logged-out');
            }
            tabButtons.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanels.forEach(panel => {
                const isActive = panel.id === `${tab.dataset.tab}-tab`;
                panel.classList.toggle('active', isActive);
                // "懒加载" - 仅在标签页第一次被点击时初始化其内容
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
    showLoginLink.addEventListener('click', e => { e.preventDefault(); loginError.textContent = ''; registerError.textContent = ''; registerMessage.textContent = ''; registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });


    // 5. --- 页面初始化 ---
    
    // 解决“首页标签内容空白”的问题：在脚本加载最后，显式点击默认标签页来触发内容加载
    document.querySelector('.tab-button[data-tab="universities"]')?.click();
    
    // 异步获取访客计数器
    fetch('/api/counter').then(res => {
        if (res.ok) return res.json();
        return { count: 'N/A' };
    }).then(data => {
        document.getElementById('visitor-info').textContent = `您是第 ${data.count} 位访客！`;
    }).catch(err => {
        console.error('获取访客数失败:', err);
        document.getElementById('visitor-info').textContent = '访客计数加载失败';
    });
});