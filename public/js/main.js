document.addEventListener('DOMContentLoaded', function () {
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const registerMessage = document.getElementById('register-message');
    const authButton = document.getElementById('auth-button'); // 【修改】获取新的合并按钮
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const userNicknameElement = document.getElementById('user-nickname');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // --- 核心认证状态管理 ---
    supabaseClient.auth.onAuthStateChange((event, session) => {
        document.body.classList.remove('show-login-section'); // 默认移除登录遮罩
        if (session && session.user) {
            // --- 用户已登录 ---
            authButton.textContent = '退出登录';
            displayUserProfile(session.user.id);
            loadUserPermissions(session.user.id);
        } else {
            // --- 用户未登录 (游客状态) ---
            authButton.textContent = '登录/注册';
            if (userNicknameElement) userNicknameElement.textContent = '';
            // 公开高校库和专业目录，隐藏其他需要权限的标签页
            tabButtons.forEach(btn => {
                const tabName = btn.dataset.tab;
                const isPublic = tabName === 'universities' || tabName === 'majors';
                btn.style.display = isPublic ? '' : 'none';
            });
            // 默认激活高校库
            document.querySelector('.tab-button[data-tab="universities"]').click();
        }
    });
    
    // --- 登录/注册表单切换 ---
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginError.textContent = '';
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerError.textContent = '';
        registerMessage.textContent = '';
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // --- 表单提交逻辑 (登录和注册部分保持不变) ---
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginError.textContent = '';
        const loginButton = loginForm.querySelector('button[type="submit"]');
        try {
            loginButton.disabled = true;
            loginButton.textContent = '登录中...';
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
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
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = '登 录';
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
    authButton.addEventListener('click', async () => { // 【修改点】将函数声明为 async
        // 【修改点】使用 await 等待获取 session 的结果
        const { data: { session } } = await supabaseClient.auth.getSession(); 
        
        if (session) {
            // 如果用户已登录，则执行退出操作
            supabaseClient.auth.signOut();
        } else {
            // 如果用户未登录，则显示登录窗口
            document.body.classList.add('show-login-section');
        }
    });

    async function displayUserProfile(userId) {
        const nicknameElement = document.getElementById('user-nickname');
        const adminTabButton = document.getElementById('admin-tab-button'); // 获取后台管理按钮
    
        if (!nicknameElement || !adminTabButton) return;
        try {
            // 【已修正】同时查询 username 和 role 字段
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('username, role') 
                .eq('id', userId)
                .single();
            
            if (error) throw error;
    
            if (profile) {
                nicknameElement.textContent = profile.username ? `欢迎您, ${profile.username}` : '欢迎您';
                
                // 检查角色，如果是 admin，就显示后台管理标签页
                if (profile.role === 'admin') {
                    adminTabButton.style.display = '';
                } else {
                    adminTabButton.style.display = 'none';
                }
            } else {
                 nicknameElement.textContent = '欢迎您';
                 adminTabButton.style.display = 'none';
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
            nicknameElement.textContent = '欢迎您';
            adminTabButton.style.display = 'none';
        }
    }

    async function loadUserPermissions(userId) {
        tabButtons.forEach(btn => {
                const tabName = btn.dataset.tab;
                const isPublic = tabName === 'universities' || tabName === 'majors';
                const hasPermission = visibleTabNames.has(tabName);
                btn.classList.toggle('hidden', !(isPublic || hasPermission));
            });
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
    
        // --- 【关键修正点】 ---
        // 在设置默认标签页之前，先检查当前是否已经有一个被激活的标签页
        const currentlyActiveTab = document.querySelector('.tab-button.active');
        
        // 判断当前激活的标签页是否在本次权限检查后依然可见
        const isActiveTabStillVisible = currentlyActiveTab && visibleTabs.includes(currentlyActiveTab);
    
        if (visibleTabs.length > 0 && !isActiveTabStillVisible) {
            // 只有在“没有任何标签页被激活”或“当前激活的标签页已不再可见”时，才默认点击第一个
            visibleTabs[0].click();
        } else if (visibleTabs.length === 0) {
            // 如果没有任何可见标签页，则清空内容区
             tabPanels.forEach(panel => {
                panel.classList.remove('active');
                panel.innerHTML = '<p style="padding: 20px; text-align: center;">您暂无任何模块的访问权限。请联系管理员。</p>';
             });
        }
    }

    // 标签页点击逻辑，增加对需要登录的检查
    tabButtons.forEach(tab => {
        // 将事件处理函数设为 async，以便在内部使用 await
        tab.addEventListener('click', async () => {
            // 异步获取当前的用户会话（session）
            const { data: { session } } = await supabaseClient.auth.getSession();
            const tabName = tab.dataset.tab;
            // 定义哪些标签页是需要登录才能访问的
            const requiresAuth = tabName === 'plans' || tabName === 'admin';

            // --- 第一部分：权限检查 ---
            // 如果点击的是需要权限的标签页，但用户当前没有登录
            if (requiresAuth && !session) {
                // 弹出提示，并显示登录界面
                alert('此功能需要登录后才能使用。');
                document.body.classList.add('show-login-section');
                return; // 阻止后续的切换操作
            }

            // --- 第二部分：界面切换 (原有的标签页切换逻辑) ---
            // 移除所有按钮的 'active' 状态
            tabButtons.forEach(t => t.classList.remove('active'));
            // 为当前点击的按钮添加 'active' 状态
            tab.classList.add('active');

            // 切换内容面板的显示
            tabPanels.forEach(panel => {
                const isActive = panel.id === `${tabName}-tab`;
                panel.classList.toggle('active', isActive);

                // --- 第三部分：按需加载 ---
                // 如果是第一次点击这个标签页，则运行其专属的初始化函数
                if (isActive && !panel.dataset.initialized) {
                    if (tabName === 'universities' && typeof window.initializeUniversitiesTab === 'function') {
                        window.initializeUniversitiesTab();
                    } else if (tabName === 'majors' && typeof window.initializeMajorsTab === 'function') {
                        window.initializeMajorsTab();
                    } else if (tabName === 'plans' && typeof window.initializePlansTab === 'function') {
                        window.initializePlansTab();
                    } else if (tabName === 'admin' && typeof window.initializeAdminTab === 'function') {
                        window.initializeAdminTab();
                    }
                }
            });
        });
    });

    async function updateVisitorCount() {
        // 【修改点】这里的元素ID从'visitor-counter'改为了'visitor-info'
        const visitorElement = document.getElementById('visitor-info'); 
        if (!visitorElement) return; // 增加一个安全检查
        try {
            const response = await fetch('/api/counter');
            if (!response.ok) return;
            const data = await response.json();
            
            // 【修改点】生成完整的句子
            visitorElement.textContent = `您是第 ${data.count} 位访客！`;
    
        } catch (error) {
            console.error('Failed to fetch visitor count:', error);
        }
    }
    
    updateVisitorCount();
});
