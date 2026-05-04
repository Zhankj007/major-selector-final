// 全局变量定义
const supabaseClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient; // 【新增】将客户端实例挂载到全局

// 页面加载完成后执行初始化
document.addEventListener('DOMContentLoaded', function () {
    // --- 获取所有UI元素 ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const registerMessage = document.getElementById('register-message');
    const logoutButton = document.getElementById('logout-button');
    const loginRegisterButton = document.getElementById('login-register-button');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const userNicknameElement = document.getElementById('user-nickname');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const loginModal = document.getElementById('login-modal');
    const closeModal = document.querySelector('.close-modal');
    const versionElement = document.getElementById('version-info');

    // --- 初始化版本号 ---
    if (versionElement && window.APP_VERSION) {
        versionElement.textContent = 'v' + window.APP_VERSION;
    }

    // --- 初始化招生计划标签页标题 ---
    const plansTabButton = document.getElementById('plans-tab-button');
    if (plansTabButton && window.PLAN_YEAR) {
        plansTabButton.textContent = `${window.PLAN_YEAR}浙江高考招生计划`;
    }

    // --- 模态框控制逻辑 ---
    // 显示模态框
    function showModal() {
        loginModal.classList.add('active');
    }

    // 隐藏模态框
    function hideModal() {
        loginModal.classList.remove('active');
        // 重置表单状态
        loginError.textContent = '';
        registerError.textContent = '';
        registerMessage.textContent = '';
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    }

    // 点击登录/注册按钮显示模态框
    if (loginRegisterButton) {
        loginRegisterButton.addEventListener('click', showModal);
    }

    // 点击关闭按钮隐藏模态框
    if (closeModal) {
        closeModal.addEventListener('click', hideModal);
    }

    // 移除点击模态框外部隐藏模态框的功能
    // 用户只能通过点击右上角关闭按钮关闭模态框
    // 防止用户意外点击模态框外部导致登录/注册窗口关闭

    // --- 核心认证状态管理 ---
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('🔐 onAuthStateChange 触发:', event);
        // 使用 setTimeout 脱离 Supabase 内部锁
        setTimeout(async () => {
            if (session && session.user) {
                document.body.classList.remove('logged-out');
                hideModal();
                try { await updateTabVisibility(session.user.id); } catch (e) { console.error('更新标签页失败:', e); }
                try { await displayUserProfile(session.user.id); } catch (e) { console.error('显示用户信息失败:', e); }
            } else {
                document.body.classList.add('logged-out');
                if (userNicknameElement) userNicknameElement.textContent = '';
                try { await updateTabVisibility(null); } catch (e) { console.error('重置标签页失败:', e); }
            }
        }, 0);
    });

    // 【关键补充】页面加载时主动检查是否存在已保存的会话，并处理加载动画
    (async () => {
        const startTime = Date.now(); // 记录开始加载的时间
        console.log('🚀 正在尝试恢复已有会话并验证安全环境...');
        try {
            // 先尝试获取 session
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            
            if (error) {
                console.error('📋 会话获取失败:', error.message);
                await updateTabVisibility(null); // Fallback 给未登录状态
                return;
            }

            console.log('📋 页面加载会话检查:', session ? `已登录 (${session.user.email})` : '未登录');
            
            if (session && session.user) {
                document.body.classList.remove('logged-out');
                // 恢复时也执行一次 hideModal 以防万一
                hideModal();
                
                // 必须 await 等待权限和 UI 更新完毕
                await Promise.all([
                    updateTabVisibility(session.user.id).catch(e => console.error('恢复标签页失败:', e)),
                    displayUserProfile(session.user.id).catch(e => console.error('恢复用户信息失败:', e))
                ]);
            } else {
                // 如果未登录，也要执行 updateTabVisibility 来获取全局公开的标签页
                await updateTabVisibility(null).catch(e => console.error('获取全局标签页失败:', e));
            }
        } catch (e) {
            console.error('会话恢复流程异常:', e);
            await updateTabVisibility(null); // Fallback
        } finally {
            const elapsed = Date.now() - startTime;
            const minLoadingTime = 2000; // 最少展示 2 秒 (2000 毫秒)
            const remainingTime = Math.max(0, minLoadingTime - elapsed);

            setTimeout(() => {
                const loader = document.getElementById('global-loader');
                if (loader) {
                    loader.style.opacity = '0';
                    setTimeout(() => {
                        loader.style.display = 'none';
                    }, 500); // 等待淡出动画结束
                }
            }, remainingTime);
        }
    })();

    
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
        event.preventDefault(); // 阻止表单默认的刷新页面行为
        loginError.textContent = ''; // 清空之前的错误信息
    
        // 获取登录按钮元素
        const loginButton = loginForm.querySelector('button[type="submit"]');
    
        try {
            // 在请求开始前，禁用按钮并显示“登录中...”
            loginButton.disabled = true;
            loginButton.textContent = '登录中...';
            loginButton.style.backgroundColor = '#ccc'; // 设置为灰色
            loginError.textContent = '正在登录中，请稍候……';
    
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
    
            // 前端直接发起登录
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                let friendlyMessage = '登录失败，请检查您的邮箱和密码。';
                if (error.message.includes('Invalid login credentials')) {
                    friendlyMessage = '邮箱或密码错误，请重试。';
                }
                throw new Error(friendlyMessage);
            }

            // ★★★ 登录成功！立即更新 UI，不等待 onAuthStateChange ★★★
            console.log('✅ 登录成功:', data.user.email);
            loginError.textContent = ''; // 清掉 "正在登录中" 提示
            document.body.classList.remove('logged-out');
            hideModal();

            // 异步加载权限和用户信息（不阻塞）
            updateTabVisibility(data.user.id).catch(e => console.error('标签页更新失败:', e));
            displayUserProfile(data.user.id).catch(e => console.error('用户信息加载失败:', e));

            // 异步通知后台记录登录日志（完全不阻塞）
            fetch('/api/record_login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: data.user.id, email: data.user.email })
            }).catch(e => console.error('日志记录失败', e));

        } catch (error) {
            loginError.textContent = error.message;
        } finally {
            // 无论成功还是失败，最终都恢复按钮的原始状态
            loginButton.disabled = false;
            loginButton.textContent = '登 录';
            loginButton.style.backgroundColor = '#007bff'; // 恢复原始蓝色
        }
    });

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        registerError.textContent = '';
        registerMessage.textContent = '';
        
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const username = document.getElementById('register-username').value;
        const phone = document.getElementById('register-phone').value;
        const unit_name = document.getElementById('register-unitname').value;
        
        // 验证密码是否匹配
        if (password !== confirmPassword) {
            registerError.textContent = '两次输入的密码不一致，请重新输入。';
            return;
        }
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
    logoutButton.addEventListener('click', async () => {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('正常退出失败，强制清理本地会话:', error);
            // 强制清理以 "sb-" 开头的 Supabase localStorage 键
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sb-')) {
                    localStorage.removeItem(key);
                }
            }
            window.location.reload(); // 强退后刷新页面
        }
    });

    async function displayUserProfile(userId) {
        const nicknameElement = document.getElementById('user-nickname');
        const adminTabButton = document.getElementById('admin-tab-button');
    
        console.log(`👤 正在加载用户资料 (ID: ${userId})...`);
        if (!nicknameElement || !adminTabButton) {
            console.warn('⚠️ 找不到 nicknameElement 或 adminTabButton DOM 节点！');
            return;
        }
        try {
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('username, role') 
                .eq('id', userId)
                .maybeSingle(); 
            
            if (error) {
                console.warn('⚠️ 查询 profiles 表返回错误:', error.message);
                throw error;
            }
    
            if (profile) {
                console.log('✅ 成功获取用户资料:', profile);
                nicknameElement.textContent = profile.username ? `欢迎您, ${profile.username}` : '欢迎您';
                
                if (profile.role === 'admin') {
                    console.log('👑 检测到管理员身份，显示后台管理标签页');
                    adminTabButton.style.display = '';
                } else {
                    console.log('👤 普通用户，隐藏后台管理标签页');
                    adminTabButton.style.display = 'none';
                }
            } else {
                console.warn('⚠️ 找不到用户 profiles 记录');
                nicknameElement.textContent = '欢迎您';
                adminTabButton.style.display = 'none';
            }
        } catch (error) {
            console.error('❌ displayUserProfile 抛出错误:', error);
            nicknameElement.textContent = '欢迎您';
            adminTabButton.style.display = 'none';
        }
    }

    async function updateTabVisibility(userId = null) {
        let visibleTabNames = new Set();
        
        // 1. 获取全局公开权限
        const { data: globalPerms, error: globalError } = await supabaseClient
            .from('global_permissions')
            .select('tab_name, is_public');
            
        if (!globalError && globalPerms) {
            globalPerms.filter(p => p.is_public).forEach(p => visibleTabNames.add(p.tab_name));
        } else {
            // Fallback: 默认公开基本功能
            ['universities', 'majors'].forEach(t => visibleTabNames.add(t));
        }

        // 2. 如果用户已登录，叠加个人特权
        if (userId) {
            const { data: permissions } = await supabaseClient
                .from('user_permissions')
                .select('tab_name, expires_at')
                .eq('user_id', userId);
            
            if (permissions) {
                const now = new Date();
                permissions.forEach(perm => {
                    const isExpired = perm.expires_at && new Date(perm.expires_at) < now;
                    if (!isExpired) {
                        visibleTabNames.add(perm.tab_name); // 加入并集
                    }
                });
            }

            // 3. 管理员特殊处理：拥有所有标签页权限
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .maybeSingle();

            if (profile && profile.role === 'admin') {
                tabButtons.forEach(btn => visibleTabNames.add(btn.dataset.tab));
            }
        }

        // 4. 根据并集结果更新 DOM
        let firstVisibleTab = null;
        tabButtons.forEach(btn => {
            const tabName = btn.dataset.tab;
            if (visibleTabNames.has(tabName)) {
                btn.style.display = '';
                if (!firstVisibleTab) firstVisibleTab = btn;
            } else {
                btn.style.display = 'none';
            }
        });

        // 5. 确保有一个激活的标签页
        const currentlyActiveTab = document.querySelector('.tab-button.active');
        if (currentlyActiveTab && currentlyActiveTab.style.display === 'none' && firstVisibleTab) {
            firstVisibleTab.click();
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
                    } else if (targetId === 'admin' && typeof window.initializeAdminTab === 'function') {
                        // 【新增】当点击后台管理时，调用初始化函数
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
    
    // 增强标签页初始化逻辑，确保在所有浏览器中都能正确加载内容
    function ensureTabContentLoaded() {
        const activeTab = document.querySelector('.tab-button.active:not([style*="display: none"])') || document.querySelector('.tab-button:not([style*="display: none"])');
        if (activeTab) {
            const targetId = activeTab.dataset.tab;
            const tabPanel = document.getElementById(`${targetId}-tab`);
            
            // 直接调用初始化函数，不依赖点击事件
            if (!tabPanel.dataset.initialized) {
                if (targetId === 'universities' && typeof window.initializeUniversitiesTab === 'function') {
                    window.initializeUniversitiesTab();
                } else if (targetId === 'majors' && typeof window.initializeMajorsTab === 'function') {
                    window.initializeMajorsTab();
                } else if (targetId === 'plans' && typeof window.initializePlansTab === 'function') {
                    window.initializePlansTab();
                } else if (targetId === 'admin' && typeof window.initializeAdminTab === 'function') {
                    window.initializeAdminTab();
                }
                
                // 标记为已初始化
                tabPanel.dataset.initialized = 'true';
            }
        }
    }
    
    // 立即初始化
    ensureTabContentLoaded();
    
    // 添加多重保险机制，确保在各种情况下都能加载内容
    setTimeout(() => ensureTabContentLoaded(), 100);
    setTimeout(() => ensureTabContentLoaded(), 500);
    setTimeout(() => ensureTabContentLoaded(), 1000);
    
    // 立即更新访客统计
    updateVisitorCount();
});
