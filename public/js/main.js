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

            // 添加缺失的showError函数定义
            function showError(message) {
                console.error("ERROR:", message);
                // 可以根据实际UI添加错误显示逻辑
                const errorElement = document.getElementById('global-error');
                if (errorElement) {
                    errorElement.textContent = message;
                    errorElement.style.display = 'block';
                    // 3秒后隐藏错误
                    setTimeout(() => {
                        errorElement.style.display = 'none';
                    }, 3000);
                }
            }

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
            // 添加全局错误元素引用
            const globalErrorElement = document.createElement('div');
            globalErrorElement.id = 'global-error';
            globalErrorElement.style.position = 'fixed';
            globalErrorElement.style.top = '20px';
            globalErrorElement.style.left = '50%';
            globalErrorElement.style.transform = 'translateX(-50%)';
            globalErrorElement.style.backgroundColor = '#ff4444';
            globalErrorElement.style.color = 'white';
            globalErrorElement.style.padding = '10px 20px';
            globalErrorElement.style.borderRadius = '4px';
            globalErrorElement.style.zIndex = '1000';
            globalErrorElement.style.display = 'none';
            document.body.appendChild(globalErrorElement);

            // --- 核心认证状态管理 --- 
            // 添加标志防止重复调用
            let isProcessingAuthChange = false;
            supabaseClient.auth.onAuthStateChange(async (event, session) => {
                document.body.classList.remove('show-login-section');
                
                // 防止重复处理
                if (isProcessingAuthChange) {
                    console.log("DEBUG: 跳过重复的auth状态变更处理");
                    return;
                }
                
                isProcessingAuthChange = true;
                try {
                    if (session && session.user) {
                        // --- 用户已登录 ---
                        authButton.textContent = '退出登录';
                        console.log("DEBUG: 用户已登录，用户ID:", session.user.id);
                        console.log("DEBUG: 用户邮箱:", session.user.email);
                        
                        // 使用我们定义的带REST API回退的fetchProfileWithTimeout函数
                        fetchProfileWithTimeout()
                            .then(({ profile, error }) => {
                                if (error) {
                                    console.error("DEBUG: 获取用户资料失败:", error);
                                    showError("无法加载用户资料，请稍后再试。");
                                    return Promise.reject(error);
                                } else if (profile) {
                                    console.log("DEBUG: 获取到用户资料:", {
                                        id: profile.id,
                                        username: profile.username,
                                        full_name: profile.full_name,
                                        role: profile.role
                                    });
                                    // 获取权限
                                    return fetchPermissions()
                                        .then(permissions => ({ profile, permissions }));
                                }
                                return Promise.reject(new Error("未获取到用户资料"));
                            })
                            .then(({ profile, permissions }) => {
                                if (permissions) {
                                    console.log("DEBUG: 获取到用户权限:", permissions);
                                    updateUIForLoggedInUser(profile, permissions);
                                } else {
                                    console.log("DEBUG: 未获取到权限数据，使用默认权限");
                                    updateUIForLoggedInUser(profile, []);
                                }
                            })
                            .catch(error => {
                                console.error("DEBUG: 处理登录状态变更失败:", error);
                            })
                            .finally(() => {
                                isProcessingAuthChange = false;
                            });
                    } else {
                        // --- 用户未登录 ---
                        authButton.textContent = '登录/注册';
                        updateUIForLoggedOutUser();
                    }
                } catch (authError) {
                    console.error("DEBUG: 认证状态变更处理异常:", authError);
                } finally {
                    // 确保标志被重置
                    if (!isProcessingAuthChange) {
                        isProcessingAuthChange = false;
                    }
                }
            });

            // 修改fetchPermissions函数以处理多行结果
            async function fetchPermissions() {
                console.log("DEBUG: fetchPermissions函数开始执行");
                try {
                    console.log("DEBUG: 正在获取 'user_permissions' 数据...");
                    const { data, error } = await supabaseClient
                        .from('user_permissions')
                        .select('*');

                    if (error) {
                        console.error("DEBUG: 获取 'user_permissions' 数据失败:", error);
                        return null;
                    }

                    console.log("DEBUG: 'user_permissions' 数据获取完成。", { permissions: data, permsError: null });
                    return data;
                } catch (permsError) {
                    console.error("DEBUG: 获取 'user_permissions' 数据时捕获到异常:", permsError);
                    return null;
                } finally {
                    console.log("DEBUG: fetchPermissions函数执行完毕");
                }
            }

            // 修改updateUIForLoggedInUser函数接受权限参数
            function updateUIForLoggedInUser(profile, permissions) {
                console.log("DEBUG: updateUIForLoggedInUser函数开始执行");
                try {
                    // 更新用户信息显示
                    if (userNicknameElement) {
                        userNicknameElement.textContent = profile?.username || '未命名用户';
                    }
                    if (authButton) {
                        authButton.textContent = '退出登录';
                    }

                    // 从fetchProfileWithTimeout获取的profile已在之前的then链中处理
                    // 这里可以根据需要更新UI
                } catch (error) {
                    console.error("DEBUG: updateUIForLoggedInUser函数执行异常:", error);
                } finally {
                    console.log("DEBUG: updateUIForLoggedInUser函数执行完毕");
                }
            }

            function updateUIForLoggedOutUser() {
                console.log("DEBUG: updateUIForLoggedOutUser函数开始执行");
                try {
                    if (authButton) {
                        authButton.textContent = '登录/注册';
                    }
                    if (userNicknameElement) {
                        userNicknameElement.textContent = '';
                    }

                    // 游客只能看到universities和majors标签
                    if (tabButtons && tabButtons.length > 0) {
                        tabButtons.forEach(btn => {
                            if (btn) {
                                const tabName = btn.dataset.tab;
                                const isPublic = tabName === 'universities' || tabName === 'majors';
                                btn.classList.toggle('hidden', !isPublic);
                            }
                        });

                        // 激活universities标签
                        const defaultTabButton = document.querySelector('.tab-button[data-tab="universities"]');
                        if (defaultTabButton && !defaultTabButton.classList.contains('active')) {
                            defaultTabButton.click();
                        }
                    }
                } catch (error) {
                    console.error("DEBUG: updateUIForLoggedOutUser函数执行异常:", error);
                } finally {
                    console.log("DEBUG: updateUIForLoggedOutUser函数执行完毕");
                }
            }

            // 初始化函数
            async function initialize() {
                console.log("DEBUG: 初始化函数开始执行");
                try {
                    // 检查登录状态
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if (session) {
                        console.log("DEBUG: 初始化时发现用户已登录");
                        // 获取用户资料
                        const { profile, error } = await fetchProfileWithTimeout();
                        if (error) {
                            console.error("DEBUG: 获取用户资料失败:", error);
                        } else if (profile) {
                            console.log("DEBUG: 成功获取用户资料");
                            // 获取权限
                            const permissions = await fetchPermissions();
                            if (permissions) {
                                updateUIForLoggedInUser(profile, permissions);
                            }
                        }
                    }
                } catch (initError) {
                    console.error("DEBUG: 初始化过程中发生错误:", initError);
                } finally {
                    console.log("DEBUG: 初始化函数执行完毕");
                }
            }

            // 挂载事件监听器
            function mountEventListeners() {
                console.log("DEBUG: 挂载事件监听器开始");
                
                // 登录表单提交
                if (loginForm) {
                    loginForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const email = document.getElementById('login-email').value;
                        const password = document.getElementById('login-password').value;
                        
                        try {
                            console.log("DEBUG: 尝试登录用户");
                            const { data, error } = await supabaseClient.auth.signInWithPassword({
                                email,
                                password
                            });
                            
                            if (error) {
                                console.error("DEBUG: 登录失败:", error);
                                loginError.textContent = error.message;
                            } else {
                                console.log("DEBUG: 登录成功");
                                loginError.textContent = '';
                                // 登录成功后会触发auth状态变化，不需要手动刷新
                            }
                        } catch (err) {
                            console.error("DEBUG: 登录过程中发生异常:", err);
                            loginError.textContent = '登录过程中发生错误，请稍后再试。';
                        }
                    });
                }

                // 注册表单提交
                if (registerForm) {
                    registerForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const email = document.getElementById('register-email').value;
                        const password = document.getElementById('register-password').value;
                        const confirmPassword = document.getElementById('register-confirm-password').value;
                        
                        if (password !== confirmPassword) {
                            registerError.textContent = '两次输入的密码不一致';
                            return;
                        }
                        
                        try {
                            console.log("DEBUG: 尝试注册用户");
                            const { data, error } = await supabaseClient.auth.signUp({
                                email,
                                password
                            });
                            
                            if (error) {
                                console.error("DEBUG: 注册失败:", error);
                                registerError.textContent = error.message;
                                registerMessage.textContent = '';
                            } else {
                                console.log("DEBUG: 注册成功");
                                registerError.textContent = '';
                                registerMessage.textContent = '注册成功，请查收邮件确认。';
                                registerForm.reset();
                            }
                        } catch (err) {
                            console.error("DEBUG: 注册过程中发生异常:", err);
                            registerError.textContent = '注册过程中发生错误，请稍后再试。';
                            registerMessage.textContent = '';
                        }
                    });
                }

                // 切换登录/注册表单
                if (showRegisterLink) {
                    showRegisterLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        document.body.classList.add('show-login-section');
                    });
                }
                
                if (showLoginLink) {
                    showLoginLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        document.body.classList.remove('show-login-section');
                    });
                }

                // 退出登录
                if (authButton) {
                    authButton.addEventListener('click', async () => {
                        if (authButton.textContent === '退出登录') {
                            try {
                                console.log("DEBUG: 尝试退出登录");
                                await supabaseClient.auth.signOut();
                                console.log("DEBUG: 退出登录成功");
                            } catch (err) {
                                console.error("DEBUG: 退出登录失败:", err);
                            }
                        } else {
                            document.body.classList.add('show-login-section');
                        }
                    });
                }

                // 标签页切换
                if (tabButtons && tabButtons.length > 0) {
                    tabButtons.forEach(button => {
                        if (button) {
                            button.addEventListener('click', () => {
                                const tabId = button.getAttribute('data-tab');
                                
                                // 移除所有活跃状态
                                tabButtons.forEach(btn => {
                                    if (btn) btn.classList.remove('active');
                                });
                                tabPanels.forEach(panel => {
                                    if (panel) panel.classList.remove('active');
                                });
                                
                                // 添加当前活跃状态
                                button.classList.add('active');
                                const activePanel = document.getElementById(tabId);
                                if (activePanel) {
                                    activePanel.classList.add('active');
                                }
                                
                                // 如果切换到专业查询标签，可能需要加载数据
                                if (tabId === 'major-panel') {
                                    loadMajorData();
                                } else if (tabId === 'plan-panel') {
                                    loadPlanData();
                                } else if (tabId === 'university-panel') {
                                    loadUniversityData();
                                }
                            });
                        }
                    });
                }

                console.log("DEBUG: 所有事件监听器已挂载");
            }

            // 启动应用
            mountEventListeners();
            initialize();

            console.log("DEBUG: 所有事件监听器已挂载");
        } catch (error) {
            const errorMessage = `发生了一个严重的JavaScript错误...\n\n错误信息:\n${error.name}: ${error.message}\n\n堆栈信息:\n${error.stack}`;
            alert(errorMessage);
            console.error("捕获到致命错误:", error);
        }
    });
