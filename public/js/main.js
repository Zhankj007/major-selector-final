document.addEventListener('DOMContentLoaded', function () {
    try {
        const SUPABASE_URL = '__SUPABASE_URL__';
        const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
        if (SUPABASE_URL.startsWith('__')) {
            throw new Error("Supabase URL 占位符未被替换。");
        }

        const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = supabaseClient;

        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const loginError = document.getElementById('login-error');
        const registerError = document.getElementById('register-error');
        const registerMessage = document.getElementById('register-message');
        const authButton = document.getElementById('auth-button');
        const showRegisterLink = document.getElementById('show-register-link');
        const showLoginLink = document.getElementById('show-login-link');
        const userNicknameElement = document.getElementById('user-nickname');
        const visitorInfoElement = document.getElementById('visitor-info');
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');

        // --- 核心认证状态管理 ---
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            document.body.classList.remove('show-login-section');
            console.log("DEBUG: Auth 状态监听器触发, event =", event);

            if (session && session.user) {
                authButton.textContent = '退出登录';
                console.log("DEBUG: 用户已登录，准备获取数据...");
                console.log("DEBUG: 当前 session 对象:", session);
                console.log("DEBUG: access_token 是否存在?", !!session.access_token);
                console.log("DEBUG: supabaseClient exists?", !!supabaseClient);
                console.log("DEBUG: SUPABASE_URL =", SUPABASE_URL);

                // 获取当前用户 ID
                const { data: userData, error: userError } = await supabaseClient.auth.getUser();
                if (userError) {
                    console.error("获取当前用户信息失败:", userError);
                } else {
                    console.log("DEBUG: 当前用户 ID:", userData?.user?.id);
                }

                // ===== 1. 调试 profiles 查询 =====
                const profilesUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=id,username,role`;
                console.log("DEBUG: 即将请求 profiles URL:", profilesUrl);
                console.log("DEBUG: Authorization header 预期值:", `Bearer ${session.access_token}`);

                try {
                    const { data: profilesData, error: profilesError, status: profilesStatus } = await supabaseClient
                        .from('profiles')
                        .select('id, username, role')
                        .eq('id', session.user.id);

                    console.log("DEBUG: profiles 查询返回状态码:", profilesStatus);
                    console.log("DEBUG: profiles 查询结果数据:", profilesData);
                    console.log("DEBUG: profiles 查询错误信息:", profilesError);

                    if (profilesError) {
                        if (profilesError.message?.includes("permission denied")) {
                            console.error("❌ RLS 拒绝访问 profiles，请检查策略和 ID 匹配。");
                        }
                        throw profilesError;
                    }
                    if (!profilesData || profilesData.length === 0) {
                        console.warn("⚠️ profiles 结果为空，请确认数据库有该用户记录。");
                        throw new Error("profiles 表中无该用户记录");
                    }

                    const profile = profilesData[0];
                    console.log("✅ 成功获取 profiles:", profile);

                    if (userNicknameElement) {
                        userNicknameElement.textContent = profile.username
                            ? `欢迎您, ${profile.username}，`
                            : '欢迎您，';
                    }

                    // ===== 2. 调试 user_permissions 查询 =====
                    const permsUrl = `${SUPABASE_URL}/rest/v1/user_permissions?user_id=eq.${session.user.id}`;
                    console.log("DEBUG: 即将请求 user_permissions URL:", permsUrl);

                    const { data: permissions, error: permsError, status: permsStatus } = await supabaseClient
                        .from('user_permissions')
                        .select('tab_name, expires_at')
                        .eq('user_id', session.user.id);

                    console.log("DEBUG: user_permissions 状态码:", permsStatus);
                    console.log("DEBUG: user_permissions 数据:", permissions);
                    console.log("DEBUG: user_permissions 错误:", permsError);

                    if (permsError) throw permsError;

                    // ===== 3. 渲染标签页 =====
                    const visibleTabs = new Set(['universities', 'majors']);
                    const now = new Date();
                    if (permissions) {
                        permissions.forEach(p => {
                            if (!p.expires_at || new Date(p.expires_at) > now) {
                                visibleTabs.add(p.tab_name);
                            }
                        });
                    }
                    if (profile.role === 'admin') {
                        visibleTabs.add('admin');
                    }
                    tabButtons.forEach(btn => btn.classList.toggle('hidden', !visibleTabs.has(btn.dataset.tab)));

                    const activeTab = document.querySelector('.tab-button.active');
                    if (!activeTab || activeTab.classList.contains('hidden')) {
                        document.querySelector('.tab-button:not(.hidden)')?.click();
                    }

                } catch (err) {
                    console.error("🔥 获取用户信息/权限时出错:", err);
                    authButton.textContent = '退出登录';
                    tabButtons.forEach(btn => btn.classList.add('hidden'));
                }

            } else {
                // 游客模式
                authButton.textContent = '登录/注册';
                if (userNicknameElement) userNicknameElement.textContent = '';
                tabButtons.forEach(btn => {
                    const isPublic = btn.dataset.tab === 'universities' || btn.dataset.tab === 'majors';
                    btn.classList.toggle('hidden', !isPublic);
                });
                document.querySelector('.tab-button[data-tab="universities"]')?.click();
            }
        });
        console.log("DEBUG: Auth 状态监听器已挂载。");

        // --- 事件绑定 ---
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

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            loginError.textContent = '';
            const btn = loginForm.querySelector('button[type="submit"]');
            try {
                btn.disabled = true;
                btn.textContent = '登录中...';
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                const { error } = await supabaseClient.auth.setSession(data.session);
                if (error) throw error;
                console.log("DEBUG: setSession 成功, session =", data.session);
            } catch (err) {
                loginError.textContent = err.message;
            } finally {
                btn.disabled = false;
                btn.textContent = '登 录';
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
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, username, phone, unit_name }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                registerMessage.textContent = '注册成功！请检查邮箱确认或直接登录。';
                setTimeout(() => { showLoginLink.click(); }, 3000);
            } catch (err) {
                registerError.textContent = err.message;
            }
        });

        authButton.addEventListener('click', async () => {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                await supabaseClient.auth.signOut();
                window.location.reload();
            } else {
                document.body.classList.add('show-login-section');
            }
        });

        tabButtons.forEach(tab => {
            tab.addEventListener('click', async () => {
                const { data: { session } } = await supabaseClient.auth.getSession();
                const tabName = tab.dataset.tab;
                const requiresAuth = ['plans', 'admin'].includes(tabName);
                if (requiresAuth && !session) {
                    alert('此功能需要登录后才能使用。');
                    document.body.classList.add('show-login-section');
                    return;
                }
                tabButtons.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                tabPanels.forEach(panel => {
                    const isActive = panel.id === `${tabName}-tab`;
                    panel.classList.toggle('active', isActive);
                    if (isActive && !panel.dataset.initialized) {
                        const fn = window[`initialize${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`];
                        if (typeof fn === 'function') fn();
                    }
                });
            });
        });

        async function updateVisitorCount() {
            if (!visitorInfoElement) return;
            try {
                const response = await fetch('/api/counter');
                if (!response.ok) return;
                const data = await response.json();
                visitorInfoElement.textContent = `您是第 ${data.count} 位访客！`;
            } catch (err) {
                console.error('Failed to fetch visitor count:', err);
            }
        }

        updateVisitorCount();
        console.log("DEBUG: 所有事件监听器已挂载，初始函数已调用。");

    } catch (error) {
        alert(`发生了一个严重的JavaScript错误: ${error.message}`);
        console.error("捕获到致命错误:", error);
    }
});
