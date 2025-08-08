document.addEventListener('DOMContentLoaded', function () {
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- 获取所有UI元素 ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const registerMessage = document.getElementById('register-message');
    const logoutButton = document.getElementById('logout-button');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const userNicknameElement = document.getElementById('user-nickname');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // --- 核心认证状态管理 ---
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            document.body.classList.remove('logged-out');
            loadUserPermissions(session.user.id);
            displayUserProfile(session.user.id);
        } else {
            document.body.classList.add('logged-out');
            if (userNicknameElement) userNicknameElement.textContent = '';
            tabButtons.forEach(btn => btn.style.display = 'none');
        }
    });
    
    // --- 登录/注册表单切换 ---
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

    // --- 其他功能函数 ---
    logoutButton.addEventListener('click', () => supabaseClient.auth.signOut());

    async function displayUserProfile(userId) {
        if (!userNicknameElement) return;
        try {
            const { data: profile, error } = await supabaseClient.from('profiles').select('username').eq('id', userId).single();
            if (error) throw error;
            userNicknameElement.textContent = profile ? `欢迎您, ${profile.username}` : '欢迎您';
        } catch (error) {
            console.error('获取用户信息失败:', error);
            userNicknameElement.textContent = '欢迎您';
        }
    }

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
