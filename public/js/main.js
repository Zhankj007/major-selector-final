document.addEventListener('DOMContentLoaded', function () {
    // 这个try...catch是为了捕获任何可能的初始化同步错误
    try {
        const SUPABASE_URL = '__SUPABASE_URL__';
        const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
        console.log("DEBUG: Supabase URL:", SUPABASE_URL);
        console.log("DEBUG: Supabase Anon Key:", SUPABASE_ANON_KEY ? "已设置" : "未设置");
        if (SUPABASE_URL.startsWith('__')) {
            throw new Error("Supabase URL 占位符未被替换。");
        }
        const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("DEBUG: Supabase客户端已创建");
        window.supabaseClient = supabaseClient;

        // 测试Supabase连接
        async function testSupabaseConnection() {
            console.log("DEBUG: testSupabaseConnection函数开始执行");
            try {
                console.log("DEBUG: 测试Supabase连接...");
                // 1. 网络诊断 - 测试DNS解析
                console.log("DEBUG: 开始网络诊断 - DNS解析测试...");
                const dnsStartTime = performance.now();
                // 使用简单的图片请求来测试DNS解析
                const img = new Image();
                img.src = `https://${new URL(SUPABASE_URL).hostname}/favicon.ico?${Date.now()}`;
                await new Promise((resolve) => {
                    img.onload = () => { console.log("DEBUG: 图片请求加载成功"); resolve(); };
                    img.onerror = () => { console.log("DEBUG: 图片请求加载失败"); resolve(); };
                    setTimeout(() => { console.log("DEBUG: 图片请求超时"); resolve(); }, 3000); // 3秒超时
                });
                const dnsEndTime = performance.now();
                console.log(`DEBUG: DNS解析测试完成，耗时: ${(dnsEndTime - dnsStartTime).toFixed(2)}ms`);

                // 2. 检查Supabase认证状态
                console.log("DEBUG: 开始检查Supabase认证状态...");
                const { data: { session } } = await supabaseClient.auth.getSession();
                console.log(`DEBUG: 认证状态: ${session ? '已登录' : '未登录'}`);
                if (session) {
                    console.log(`DEBUG: 当前用户ID: ${session.user.id}`);
                } else {
                    console.log("DEBUG: 未登录，跳过用户特定查询测试");
                }

                // 3. 使用客户端库测试 - 先测试简单查询
                console.log("DEBUG: 开始客户端库测试 - 简单查询...");
                const simpleQueryStart = performance.now();
                try {
                    // 查询一个可能存在的小表或系统表
                    const { data: simpleData, error: simpleError } = await supabaseClient
                        .from('profiles')
                        .select('id')
                        .limit(1)
                        .abortSignal(AbortSignal.timeout(5000));
                    const simpleQueryEnd = performance.now();
                    console.log(`DEBUG: 简单查询完成，耗时: ${(simpleQueryEnd - simpleQueryStart).toFixed(2)}ms`);
                    console.log("DEBUG: 简单查询结果:", { simpleData, simpleError });
                    if (simpleError) {
                        console.error("DEBUG: 简单查询错误名称:", simpleError.name);
                        console.error("DEBUG: 简单查询错误消息:", simpleError.message);
                    } else {
                        console.log("DEBUG: 简单查询返回数据长度:", simpleData ? simpleData.length : 0);
                    }

                    // 4. 使用客户端库测试 - 针对特定用户ID的查询
                    if (session) {
                        console.log("DEBUG: 开始客户端库测试 - 用户特定查询...");
                        const userQueryStart = performance.now();
                        try {
                            const { data: userData, error: userError } = await supabaseClient
                                .from('profiles')
                                .select('id')
                                .eq('id', session.user.id)
                                .limit(1)
                                .abortSignal(AbortSignal.timeout(10000));
                            const userQueryEnd = performance.now();
                            console.log(`DEBUG: 用户特定查询完成，耗时: ${(userQueryEnd - userQueryStart).toFixed(2)}ms`);
                            console.log("DEBUG: 用户特定查询结果:", { userData, userError });
                            if (userError) {
                                console.error("DEBUG: 用户特定查询错误名称:", userError.name);
                                console.error("DEBUG: 用户特定查询错误消息:", userError.message);
                            } else {
                                console.log("DEBUG: 用户特定查询返回数据长度:", userData ? userData.length : 0);
                                if (userData && userData.length > 0) {
                                    console.log("DEBUG: 找到用户数据，ID匹配成功");
                                } else {
                                    console.log("DEBUG: 未找到用户数据，可能ID不存在于profiles表中");
                                }
                            }
                        } catch (userQueryError) {
                            console.error("DEBUG: 用户特定查询捕获到异常:", userQueryError);
                        }
                    }

                    // 5. 直接调用REST API测试
                    console.log("DEBUG: 开始直接调用Supabase REST API测试...");
                    const tableId = 'profiles';
                    let restUrl = `${SUPABASE_URL}/rest/v1/${tableId}?select=id&limit=1`;
                    if (session) {
                        restUrl = `${SUPABASE_URL}/rest/v1/${tableId}?select=id&id=eq.${session.user.id}&limit=1`;
                        console.log("DEBUG: REST API URL (用户特定):", restUrl);
                    } else {
                        console.log("DEBUG: REST API URL (通用):", restUrl);
                    }

                    const restStartTime = performance.now();
                    try {
                        const response = await fetch(restUrl, {
                            method: 'GET',
                            headers: {
                                'apikey': SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=representation'
                            },
                            signal: AbortSignal.timeout(10000) // 10秒超时
                        });
                        const restEndTime = performance.now();
                        console.log(`DEBUG: REST API请求完成，耗时: ${(restEndTime - restStartTime).toFixed(2)}ms`);

                        if (!response.ok) {
                            throw new Error(`HTTP错误! 状态码: ${response.status}`);
                        }

                        const restData = await response.json();
                        console.log("DEBUG: Supabase REST API测试结果: 成功获取数据");
                        console.log("DEBUG: REST API返回数据:", restData);
                    } catch (restError) {
                        const restEndTime = performance.now();
                        console.log(`DEBUG: REST API请求失败，耗时: ${(restEndTime - restStartTime).toFixed(2)}ms`);
                        console.error("DEBUG: REST API测试错误:", restError);
                        console.error("DEBUG: REST API测试错误名称:", restError.name);
                        console.error("DEBUG: REST API测试错误消息:", restError.message);
                    }
                } catch (connError) {
                    console.error("DEBUG: 客户端库测试失败:", connError);
                    console.error("错误名称:", connError.name);
                    console.error("错误消息:", connError.message);
                }
            } catch (connError) {
                console.error("DEBUG: Supabase连接测试失败:", connError);
                console.error("错误名称:", connError.name);
                console.error("错误消息:", connError.message);
                console.error("错误堆栈:", connError.stack);
            }
            console.log("DEBUG: testSupabaseConnection函数执行完毕");
        }
            // 获取用户资料，带超时处理
            async function fetchProfileWithTimeout() {
                console.log("DEBUG: fetchProfileWithTimeout函数开始执行");
                try {
                    console.log("DEBUG: 正在获取 'profiles' 数据...");
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if (!session) {
                        console.log("DEBUG: 未登录，无法获取用户资料");
                        return { profile: null, error: null };
                    }

                    console.log(`DEBUG: 当前用户ID: ${session.user.id}`);
                    const startTime = performance.now();
                    console.log("DEBUG: 开始执行 profiles 查询...");

                    // 尝试使用客户端库查询
                    try {
                        console.log("DEBUG: 尝试替代查询方式: 使用limit(1)而非single()...");
                        console.log(`DEBUG: 查询条件: id = ${session.user.id}`);
                        console.log("DEBUG: 开始发送网络请求...");

                        const { data: profile, error: profileError } = await supabaseClient
                            .from('profiles')
                            .select('*')
                            .eq('id', session.user.id)
                            .limit(1)
                            .abortSignal(AbortSignal.timeout(10000));

                        const endTime = performance.now();
                        console.log(`DEBUG: 客户端库查询完成，耗时: ${(endTime - startTime).toFixed(2)}ms`);
                        console.log("DEBUG: 客户端库查询结果:", { profile, profileError });

                        if (profileError) {
                            console.error("DEBUG: 客户端库查询错误名称:", profileError.name);
                            console.error("DEBUG: 客户端库查询错误消息:", profileError.message);

                            // 客户端库查询失败，尝试使用REST API
                            console.log("DEBUG: 客户端库查询失败，尝试使用REST API直接查询...");
                            return await fetchProfileWithRestApi(session.user.id);
                        } else if (profile && profile.length > 0) {
                            console.log("DEBUG: 客户端库查询成功，找到用户资料");
                            return { profile: profile[0], error: null };
                        } else {
                            console.log("DEBUG: 客户端库查询返回空数据");
                            // 尝试使用REST API
                            console.log("DEBUG: 尝试使用REST API直接查询...");
                            return await fetchProfileWithRestApi(session.user.id);
                        }
                    } catch (queryError) {
                        const endTime = performance.now();
                        console.log(`DEBUG: 客户端库查询异常，耗时: ${(endTime - startTime).toFixed(2)}ms`);
                        console.error("DEBUG: 客户端库查询捕获到异常:", queryError);
                        console.error("DEBUG: 异常名称:", queryError.name);
                        console.error("DEBUG: 异常消息:", queryError.message);

                        // 查询异常，尝试使用REST API
                        console.log("DEBUG: 尝试使用REST API直接查询...");
                        return await fetchProfileWithRestApi(session.user.id);
                    }
                } catch (error) {
                    console.error("DEBUG: fetchProfileWithTimeout函数执行异常:", error);
                    return { profile: null, error };
                } finally {
                    console.log("DEBUG: fetchProfileWithTimeout函数执行完毕");
                }
            }

            // 使用REST API直接获取用户资料
            async function fetchProfileWithRestApi(userId) {
                console.log("DEBUG: fetchProfileWithRestApi函数开始执行");
                try {
                    const restStartTime = performance.now();
                    const restUrl = `${SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${userId}&limit=1`;
                    console.log("DEBUG: REST API URL:", restUrl);
                    console.log("DEBUG: 开始发送REST API请求...");

                    const response = await fetch(restUrl, {
                        method: 'GET',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        signal: AbortSignal.timeout(10000) // 10秒超时
                    });

                    const restEndTime = performance.now();
                    console.log(`DEBUG: REST API请求完成，耗时: ${(restEndTime - restStartTime).toFixed(2)}ms`);

                    if (!response.ok) {
                        throw new Error(`HTTP错误! 状态码: ${response.status}`);
                    }

                    const restData = await response.json();
                    console.log("DEBUG: REST API返回数据:", restData);

                    if (restData && restData.length > 0) {
                        console.log("DEBUG: REST API查询成功，找到用户资料");
                        return { profile: restData[0], error: null };
                    } else {
                        console.log("DEBUG: REST API查询返回空数据");
                        return { profile: null, error: new Error("未找到用户资料") };
                    }
                } catch (restError) {
                    console.error("DEBUG: REST API查询失败:", restError);
                    console.error("DEBUG: 错误名称:", restError.name);
                    console.error("DEBUG: 错误消息:", restError.message);
                    return { profile: null, error: restError };
                } finally {
                    console.log("DEBUG: fetchProfileWithRestApi函数执行完毕");
                }
            }

            // 确保在应用启动时立即执行连接测试
            console.log("DEBUG: 应用启动，准备执行Supabase连接测试...");
            testSupabaseConnection();

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
                    // 监听认证状态变化
                    supabaseClient.auth.onAuthStateChange((event, session) => {
                        console.log("DEBUG: Auth 状态监听器已触发，事件:", event);
                        if (session) {
                            // 用户已登录
                            console.log("DEBUG: 用户已登录，准备获取数据...");
                            // 输出用户基本信息
                            console.log("DEBUG: 用户ID:", session.user.id);
                            console.log("DEBUG: 用户邮箱:", session.user.email);
                            // 获取用户资料和权限
                            fetchProfileWithTimeout()
                                .then(profile => {
                                    if (profile) {
                                        console.log("DEBUG: 获取到用户资料:", {
                                            id: profile.id,
                                            username: profile.username,
                                            full_name: profile.full_name,
                                            role: profile.role
                                        });
                                        return fetchPermissions();
                                    }
                                })
                                .then(permissions => {
                                    if (permissions) {
                                        console.log("DEBUG: 获取到用户权限:", permissions);
                                        updateUIForLoggedInUser();
                                    }
                                })
                                .catch(error => {
                                    console.error("DEBUG: 获取用户数据时发生错误:", error);
                                    showError("无法加载用户数据，请稍后再试。");
                                });
                        } else {
                            // 用户已登出
                            console.log("DEBUG: 用户已登出");
                            updateUIForLoggedOutUser();
                        }
                    });
                    try {
                        // 【诊断修改】我们将 Promise.all 拆分为两个独立的、带日志的请求
                        console.log("DEBUG: 正在获取 'profiles' 数据...");
                        // 添加超时处理
                        const fetchProfileWithTimeout = async () => {
                          console.log("DEBUG: fetchProfileWithTimeout 函数已调用");
                          const controller = new AbortController();
                          // 增加超时时间到10秒
                          const timeoutId = setTimeout(() => {
                            console.log("DEBUG: 配置文件获取超时，正在中止请求...");
                            controller.abort();
                          }, 10000); // 10秒超时
                          
                          try {
                            console.log("DEBUG: 开始执行 profiles 查询...");
                            // 尝试不使用single()，改用limit(1)，看看是否是single()导致的问题
                            console.log("DEBUG: 尝试替代查询方式: 使用limit(1)而非single()...");
                            console.log("DEBUG: 查询条件: id =", session.user.id);
                            console.log("DEBUG: 开始发送网络请求...");
                            const startTime = performance.now();
                            const { data: profile, error: profileError } = await supabaseClient
                              .from('profiles')
                              .select('id')
                              .eq('id', session.user.id)
                              .limit(1)
                              .abortSignal(controller.signal);
                            const endTime = performance.now();
                            console.log(`DEBUG: 网络请求完成，耗时: ${(endTime - startTime).toFixed(2)}ms`);

                            // --- 添加REST API直接查询 --- 
                            if (profileError || !profile || profile.length === 0) {
                              console.log("DEBUG: 客户端库查询失败或无数据，尝试直接调用REST API...");
                              const restUrl = `${SUPABASE_URL}/rest/v1/profiles?select=id&id=eq.${session.user.id}&limit=1`;
                              console.log("DEBUG: 直接REST API URL:", restUrl);
                              const restStartTime = performance.now();
                              const restResponse = await fetch(restUrl, {
                                method: 'GET',
                                headers: {
                                  'apikey': SUPABASE_ANON_KEY,
                                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                                  'Content-Type': 'application/json'
                                },
                                signal: AbortSignal.timeout(10000)
                              });
                              const restEndTime = performance.now();
                              console.log(`DEBUG: REST API请求完成，耗时: ${(restEndTime - restStartTime).toFixed(2)}ms`);
                              
                              if (restResponse.ok) {
                                const restData = await restResponse.json();
                                console.log("DEBUG: REST API返回数据:", restData);
                                if (restData && restData.length > 0) {
                                  console.log("DEBUG: REST API查询成功，客户端库可能存在问题");
                                  return { profile: restData[0], profileError: null };
                                } else {
                                  console.log("DEBUG: REST API查询返回空数据，可能用户ID不存在");
                                }
                              } else {
                                console.error(`DEBUG: REST API请求失败，状态码: ${restResponse.status}`);
                              }
                            }
                            // --- REST API查询结束 --- 

                            clearTimeout(timeoutId);
                            console.log("DEBUG: profiles 查询执行完成");
                            // 检查返回的数据
                            console.log("DEBUG: 查询返回数据长度:", profile ? profile.length : 0);
                            return { profile: profile && profile.length > 0 ? profile[0] : null, profileError };
                          } catch (error) {
                            clearTimeout(timeoutId);
                            console.log("DEBUG: profiles 查询捕获到异常");
                            console.error("异常名称:", error.name);
                            console.error("异常消息:", error.message);
                            console.error("异常堆栈:", error.stack);
                            if (error.name === 'AbortError') {
                              console.log("DEBUG: 超时可能原因: 网络缓慢、数据库负载高、RLS策略配置问题或表中不存在该用户ID");
                              // 建议用户检查Supabase控制台中的表结构和RLS策略
                              console.log("DEBUG: 建议: 检查Supabase控制台中profiles表是否存在该用户ID，以及RLS策略是否允许读取");
                              return { profile: null, profileError: new Error('获取 profiles 数据超时') };
                            }
                            return { profile: null, profileError: error };
                          }
                        };
                         
                        const { profile, profileError } = await fetchProfileWithTimeout();
                        console.log("DEBUG: 'profiles' 数据获取完成。", { profile, profileError });

                        if (profileError) {
                          console.error("获取 'profiles' 数据时出错:", profileError);
                          // 输出详细错误信息
                          console.error("错误名称:", profileError.name);
                          console.error("错误消息:", profileError.message);
                          console.error("错误堆栈:", profileError.stack);
                          throw profileError;
                        }

                        console.log("DEBUG: 正在获取 'user_permissions' 数据...");
                        const { data: permissions, error: permsError } = await supabaseClient.from('user_permissions').select('tab_name, expires_at').eq('user_id', session.user.id);
                        console.log("DEBUG: 'user_permissions' 数据获取完成。", { permissions, permsError });

                        if (permsError) {
                          console.error("获取 'user_permissions' 数据时出错:", permsError);
                          throw permsError;
                        }
                        
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
                    }

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

    async function fetchPermissions() {
        console.log("DEBUG: 正在获取 'user_permissions' 数据...");
        try {
            const { data, error } = await supabaseClient
                .from('user_permissions')
                .select('*')
                .single();

            if (error) throw error;
            console.log("DEBUG: 成功获取 'user_permissions' 数据");
            return data;
        } catch (permsError) {
            console.error("DEBUG: 获取 'user_permissions' 数据失败:", permsError.message);
            throw permsError;
        }
    }
