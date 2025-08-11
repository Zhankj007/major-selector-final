document.addEventListener('DOMContentLoaded', function () {
    // 这个try...catch是为了捕获任何可能的初始化同步错误
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
            
            if (session && session.user) {
                // --- 用户已登录 ---
                authButton.textContent = '退出登录';
                console.log("DEBUG: 用户已登录，准备获取数据...");

                console.log("DEBUG: 当前 session 对象:", session);
                    if (session) {
                        console.log("DEBUG: access_token 是否存在?", !!session.access_token);
                    }
                
                console.log("DEBUG: 正在获取 'profiles' 数据...");
                
                // 基本环境检查
                console.log("DEBUG: supabaseClient exists?", !!supabaseClient);
                try {
                  // 注意不要把敏感 key 打印出来，这里只打印 URL（便于调试）
                  console.log("DEBUG: SUPABASE_URL (用于网络测试) =", SUPABASE_URL);
                } catch (e) {
                  console.warn("DEBUG: 无法读取 SUPABASE_URL:", e);
                }
                
                // 打印 session 简短信息（不打印敏感 token 全文）
                console.log("DEBUG: session info (short):", {
                  has_access_token: !!(session && session.access_token),
                  user_id: session?.user?.id,
                  expires_in: session?.expires_in
                });
                
                try {
                  // 再次确认 supabase-js 的 getUser 行为
                  const { data: userData, error: userError } = await supabaseClient.auth.getUser();
                  if (userError) {
                    console.error("DEBUG: supabaseClient.auth.getUser() 失败:", userError);
                  } else {
                    console.log("DEBUG: supabaseClient.auth.getUser() 返回:", userData?.user?.id ? { userId: userData.user.id } : userData);
                  }
                
                  // 调用 maybeSingle() 避免 .single() 在 0 行时直接抛异常
                  console.log("DEBUG: 准备执行 supabase.from('profiles').select(...) 请求（高日志）");
                  const t0 = Date.now();
                  const { data: profilesData, error: profilesError, status: profilesStatus } = await supabaseClient
                    .from('profiles')
                    .select('id, username, role')
                    .eq('id', session.user.id)
                    .maybeSingle();
                  const elapsed = Date.now() - t0;
                
                  console.log(`DEBUG: profiles 请求完成（耗时 ${elapsed} ms），status = ${profilesStatus}`);
                  console.log("DEBUG: profiles 返回 data:", profilesData);
                  console.log("DEBUG: profiles 返回 error:", profilesError);
                
                  if (profilesError) {
                    // 明确判断是否为 RLS/权限拒绝
                    if (profilesError.message && profilesError.message.toLowerCase().includes("permission")) {
                      console.error("❌ profiles 请求被权限（RLS）拒绝（permission denied）。请检查 RLS 策略和 profiles.id 是否与 auth.users.id 匹配。", profilesError);
                    } else {
                      console.error("❌ profiles 请求返回错误：", profilesError);
                    }
                    // 不立即 throw（为了调试，我们继续尝试后续权限请求与手工 fetch）
                  }
                
                  // 如果没有记录，警告但继续（避免直接 hide 所有 tab，便于观察日志）
                  if (!profilesData) {
                    console.warn("⚠️ profiles 查询返回空（profiles 表中可能没有该用户记录）。user id:", session.user.id);
                  } else {
                    console.log("✅ 成功获取 profiles 记录:", profilesData);
                  }
                
                  // —— 额外的低层次手工 fetch 检查（直接调用 PostgREST /rest/v1/ 接口）
                  // 目的是判断网络/CORS/Token 是否能通过浏览器直接访问 REST endpoint
                  try {
                    const restBase = SUPABASE_URL.replace(/\/+$/, ''); // 去除末尾斜杠
                    const manualUrl = `${restBase}/rest/v1/profiles?select=id,username,role&id=eq.${encodeURIComponent(session.user.id)}`;
                    console.log("DEBUG: 发起手工 fetch 到 Rest API（用于确认请求能否发出）:", manualUrl);
                
                    const manualResp = await fetch(manualUrl, {
                      method: 'GET',
                      headers: {
                        'Authorization': 'Bearer ' + (session.access_token || ''),
                        // 如果你的项目需要 apikey header，这里可以传入 anon key（谨慎不要把其打印出来）
                        'apikey': SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json'
                      }
                    });
                
                    console.log("DEBUG: manual fetch status:", manualResp.status, "ok:", manualResp.ok);
                    const manualText = await manualResp.text();
                    // 可能是 JSON，也可能是空或 HTML 错误页，一律打印文本以便分析
                    console.log("DEBUG: manual fetch body (原始文本):", manualText.slice(0, 2000)); // 截断到 2000 字，防止大量日志
                  } catch (fetchErr) {
                    console.error("DEBUG: manual fetch 到 Rest API 失败（可能是网络/CORS）：", fetchErr);
                  }
                
                } catch (err) {
                  console.error("加载 profiles 时发生不可预期的异常：", err);
                  // 不向上抛出，以便继续做后续调试（否则 UI 可能马上 hide 掉所有 tab）
                }
                
                        /*
                try {
                    // 【诊断修改】我们将 Promise.all 拆分为两个独立的、带日志的请求
                    console.log("DEBUG: 正在获取 'profiles' 数据...");
                    const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('username, role').eq('id', session.user.id).single();
                    console.log("DEBUG: 'profiles' 数据获取完成。", { profile, profileError });

                    if (profileError) throw profileError;

                    console.log("DEBUG: 正在获取 'user_permissions' 数据...");
                    const { data: permissions, error: permsError } = await supabaseClient.from('user_permissions').select('tab_name, expires_at').eq('user_id', session.user.id);
                    console.log("DEBUG: 'user_permissions' 数据获取完成。", { permissions, permsError });

                    if (permsError) throw permsError;
                    
                    // --- 后续UI渲染逻辑 (与之前版本相同) ---
                    if (userNicknameElement) {
                       userNicknameElement.textContent = profile && profile.username ? `欢迎您, ${profile.username}，` : '欢迎您，';
                    }
                    const visibleTabs = new Set(['universities', 'majors']);
                    const now = new Date();
                    if (permissions) {
                        permissions.forEach(p => {
                            if (!p.expires_at || new Date(p.expires_at) > now) { visibleTabs.add(p.tab_name); }
                        });
                    }
                    if (profile && profile.role === 'admin') { visibleTabs.add('admin'); }
                    tabButtons.forEach(btn => btn.classList.toggle('hidden', !visibleTabs.has(btn.dataset.tab)));
                    const currentlyActive = document.querySelector('.tab-button.active');
                    if (!currentlyActive || currentlyActive.classList.contains('hidden')) {
                        document.querySelector('.tab-button:not(.hidden)')?.click();
                    }

                } catch (error) {
                    console.error("加载用户信息或权限时出错:", error);
                    authButton.textContent = '退出登录';
                    tabButtons.forEach(btn => btn.classList.add('hidden'));
                } */

            } else {
                // --- 用户未登录 (游客) ---
                authButton.textContent = '登录/注册';
                if (userNicknameElement) userNicknameElement.textContent = '';
                tabButtons.forEach(btn => {
                    const isPublic = btn.dataset.tab === 'universities' || btn.dataset.tab === 'majors';
                    btn.classList.toggle('hidden', !isPublic);
});
                const defaultTabButton = document.querySelector('.tab-button[data-tab="universities"]');
                const defaultTabPanel = document.getElementById('universities-tab');
                if (defaultTabButton && defaultTabPanel) {
                    if (!defaultTabButton.classList.contains('active')) { defaultTabButton.click(); }
                    else if (typeof window.initializeUniversitiesTab === 'function' && !defaultTabPanel.dataset.initialized) { window.initializeUniversitiesTab(); }
                }
            }
        });
        console.log("DEBUG: Auth 状态监听器已挂载。");

        // --- 4. 其他所有事件监听器和辅助函数 ---
        showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginError.textContent = ''; loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
        showLoginLink.addEventListener('click', (e) => { e.preventDefault(); registerError.textContent = ''; registerMessage.textContent = ''; registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });

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
                registerMessage.textContent = '注册成功！请检查邮箱确认或直接登录。';
                setTimeout(() => { showLoginLink.click(); }, 3000);
            } catch (error) {
                registerError.textContent = error.message;
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
                const requiresAuth = tabName === 'plans' || tabName === 'admin';
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
            if (!visitorInfoElement) return;
            try {
                const response = await fetch('/api/counter');
                if (!response.ok) return;
                const data = await response.json();
                visitorInfoElement.textContent = `您是第 ${data.count} 位访客！`;
            } catch (error) {
                console.error('Failed to fetch visitor count:', error);
            }
        }
        
        updateVisitorCount();
        console.log("DEBUG: 所有事件监听器已挂载，初始函数已调用。");

    } catch (error) {
        const errorMessage = `发生了一个严重的JavaScript错误...\n\n错误信息:\n${error.name}: ${error.message}\n\n堆栈信息:\n${error.stack}`;
        alert(errorMessage);
        console.error("捕获到致命错误:", error);
    }
});



