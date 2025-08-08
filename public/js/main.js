document.addEventListener('DOMContentLoaded', function () {
    // --- 1. 初始化 SUPABASE 客户端 ---
    // 这些占位符会在 Vercel 构建时被自动替换
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- 2. 获取所有需要操作的页面元素 ---
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const registerForm = document.getElementById('register-form');
    const registerError = document.getElementById('register-error');
    const registerMessage = document.getElementById('register-message');
    const logoutButton = document.getElementById('logout-button');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const userNicknameElement = document.getElementById('user-nickname');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // --- 3. 核心逻辑：监听用户认证状态的变化 ---
    // 这个函数会在用户登录、退出或页面初次加载时自动运行
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            // --- 用户已登录 ---
            document.body.classList.remove('logged-out'); // 移除 .logged-out 类以显示主应用
            loadUserPermissions(session.user.id); // 加载用户权限
            displayUserProfile(session.user.id); // 加载并显示用户昵称
        } else {
            // --- 用户未登录或已退出 ---
            document.body.classList.add('logged-out'); // 添加 .logged-out 类以显示登录/注册界面
            if (userNicknameElement) userNicknameElement.textContent = ''; // 退出时清空昵称显示
            tabButtons.forEach(btn => btn.style.display = 'none'); // 隐藏所有标签页
        }
    });

    // --- 4. 登录/注册表单切换逻辑 ---
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginError.textContent = ''; // 清空错误提示
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerError.textContent = ''; // 清空错误提示
        registerMessage.textContent = ''; // 清空成功提示
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // --- 5. 表单提交逻辑 ---

    // 登录表单提交
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginError.textContent = '';
        // 【修正】使用新的ID 'login-email' 来获取邮箱输入框的值
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok) { throw new Error(data.error); }

            const { error: sessionError } = await supabaseClient.auth.setSession(data.session);
            if (sessionError) throw sessionError;
            // setSession 成功后, onAuthStateChange 会被自动触发, UI 会自动更新
        } catch (error) {
            loginError.textContent = error.message;
        }
    });

    // 【新增】注册表单提交
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        registerError.textContent = '';
        registerMessage.textContent = '';
        
        // 从注册表单获取所有必填信息
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
            if (!response.ok) { throw new Error(data.error); }

            // 显示成功信息，并在2秒后自动切换回登录表单
            registerMessage.textContent = '注册成功！现在您可以登录了。';
            setTimeout(() => {
                 showLoginLink.click(); // 模拟点击“立即登录”链接
            }, 2000);

        } catch (error) {
            registerError.textContent = error.message;
        }
    });

    // --- 6. 辅助功能函数 ---

    // 退出登录按钮
    logoutButton.addEventListener('click', () => supabaseClient.auth.signOut());

    // 【新增】获取并显示用户昵称
    async function displayUserProfile(userId) {
        if (!userNicknameElement) return;
        try {
            const { data: profile, error } = await supabaseClient.from('profiles').select('username').eq('id', userId).single();
            if (error) throw error;
            userNicknameElement.textContent = profile ? `欢迎您, ${profile.username}` : '欢迎您';
        } catch (error) {
            console.error('获取用户信息失败:', error);
            userNicknameElement.textContent = '欢迎您'; // 出错时也显示欢迎语
        }
    }

    // 获取并应用用户权限
    async function loadUserPermissions(userId) {
        tabButtons.forEach(btn => btn.style.display = 'none');
        const { data: permissions, error } = await supabaseClient
            .from('user_permissions')
            .select('tab_name, expires_at')
            .eq('user_id', userId);

        if (error) {
            console.error('获取用户权限失败:', error);
            return;
        }
        const now = new Date();
        let visibleTabs = [];
        permissions.forEach(perm => {
            const isExpired = perm.expires_at && new Date(perm.expires_at) < now;
            if (!isExpired) {
                const tabButton = document.querySelector(`.tab-button[data-tab="${perm.tab_name}"]`);
                if (tabButton) {
                    tabButton.style.display = '';
                    visibleTabs.push(tabButton);
                }
            }
        });
        if (visibleTabs.length > 0) {
            visibleTabs[0].click();
        } else {
             tabPanels.forEach(panel => {
                panel.classList.remove('active');
                panel.innerHTML = '<p style="padding: 20px; text-align: center;">您暂无任何模块的访问权限。请联系管理员。</p>';
             });
        }
    }

    // 标签页点击切换逻辑
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.style.display === 'none') return;
            const targetId = tab.dataset.tab;
            tabButtons.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanels.forEach(panel => {
                const isActive = panel.id === `${targetId}-tab`;
                panel.classList.toggle('active', isActive);
                if (isActive && !panel.dataset.initialized) {
                    if (targetId === 'universities' && typeof window.initializeUniversitiesTab === 'function') {
                        window.initializeUniversitiesTab();
                    } else if (targetId === 'majors' && typeof window.initializeMajorsTab === 'function') {
                        window.initializeMajorsTab();
                    } else if (targetId === 'plans' && typeof window.initializePlansTab === 'function') {
                        window.initializePlansTab();
                    }
                }
            });
        });
    });

    // 访客计数器功能
    async function updateVisitorCount() {
        try {
            const response = await fetch('/api/counter');
            if (!response.ok) return;
            const data = await response.json();
            const visitorElement = document.getElementById('visitor-counter');
            if (visitorElement) {
                visitorElement.textContent = data.count;
            }
        } catch (error) {
            console.error('Failed to fetch visitor count:', error);
        }
    }
    
    // --- 7. 初始调用 ---
    updateVisitorCount();
});
