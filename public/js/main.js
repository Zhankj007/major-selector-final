document.addEventListener('DOMContentLoaded', function () {
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutButton = document.getElementById('logout-button');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // --- 核心逻辑：通过控制 body 的 class 来切换UI状态 ---
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            // 用户已登录: 移除 .logged-out 类
            document.body.classList.remove('logged-out');
            loadUserPermissions(session.user.id);
        } else {
            // 用户未登录: 添加 .logged-out 类
            document.body.classList.add('logged-out');
            tabButtons.forEach(btn => btn.style.display = 'none'); // 隐藏所有标签页按钮
        }
    });

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

    logoutButton.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
    });

    async function loadUserPermissions(userId) {
        tabButtons.forEach(btn => btn.style.display = 'none'); // 先隐藏所有
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
                    tabButton.style.display = ''; // 恢复显示
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
