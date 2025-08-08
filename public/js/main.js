document.addEventListener('DOMContentLoaded', function () {
    // --- 1. 初始化 SUPABASE 客户端 ---
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    // 【已修正】使用全局的 supabase 对象来创建我们自己的客户端实例，并赋予新名称
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- 2. 获取所有需要操作的页面元素 ---
    const loginSection = document.getElementById('login-section');
    const appContent = document.getElementById('app-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutButton = document.getElementById('logout-button');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // --- 3. 核心逻辑：监听用户认证状态的变化 ---
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            loginSection.classList.add('hidden');
            appContent.classList.remove('hidden');
            logoutButton.classList.remove('hidden');
            loadUserPermissions(session.user.id);
        } else {
            loginSection.classList.remove('hidden');
            appContent.classList.add('hidden');
            logoutButton.classList.add('hidden');
            tabButtons.forEach(btn => btn.classList.add('hidden'));
        }
    });

    // --- 4. 登录表单提交事件 ---
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginError.textContent = '';
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok) { throw new Error(data.error || '登录失败，请检查您的邮箱和密码。'); }

            const { error: sessionError } = await supabaseClient.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
            });
            if (sessionError) throw sessionError;
        } catch (error) {
            loginError.textContent = error.message;
        }
    });

    // --- 5. 退出登录按钮点击事件 ---
    logoutButton.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
    });

    // --- 6. 获取并应用用户权限的函数 ---
    async function loadUserPermissions(userId) {
        tabButtons.forEach(btn => btn.classList.add('hidden'));
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
                    tabButton.classList.remove('hidden');
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

    // --- 7. 原有的功能 ---
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('hidden')) return;
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
    updateVisitorCount();
});
