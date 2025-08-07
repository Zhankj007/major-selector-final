document.addEventListener('DOMContentLoaded', function () {
    // --- 1. 初始化 SUPABASE 客户端 ---
    // 使用占位符，等待Vercel在构建时替换
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- 2. 获取所有需要操作的页面元素 ---
    const loginSection = document.getElementById('login-section');
    const appContent = document.getElementById('app-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutButton = document.getElementById('logout-button');
    
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // --- 3. 核心逻辑：监听用户认证状态的变化 ---
    // 这个函数会在用户登录、退出或页面初次加载时自动运行
    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            // --- 用户已登录 ---
            loginSection.classList.add('hidden'); // 隐藏登录表单
            appContent.classList.remove('hidden'); // 显示应用主内容
            logoutButton.classList.remove('hidden'); // 显示退出按钮
            loadUserPermissions(session.user.id); // 加载并应用用户权限
        } else {
            // --- 用户未登录或已退出 ---
            loginSection.classList.remove('hidden'); // 显示登录表单
            appContent.classList.add('hidden'); // 隐藏应用主内容
            logoutButton.classList.add('hidden'); // 隐藏退出按钮
            // 确保所有标签页按钮都隐藏
            tabButtons.forEach(btn => btn.classList.add('hidden'));
        }
    });

    // --- 4. 登录表单提交事件 ---
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // 阻止表单默认的刷新页面行为
        loginError.textContent = ''; // 清空之前的错误信息

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '登录失败，请检查您的邮箱和密码。');
            }

            // 登录成功后，我们需要手动设置Session，这样上面的 onAuthStateChange 才能检测到变化
            const { error: sessionError } = await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
            });

            if (sessionError) throw sessionError;
            // setSession 成功后, onAuthStateChange 会被自动触发, UI 会自动更新

        } catch (error) {
            loginError.textContent = error.message;
        }
    });

    // --- 5. 退出登录按钮点击事件 ---
    logoutButton.addEventListener('click', async () => {
        await supabase.auth.signOut();
        // signOut 成功后, onAuthStateChange 会被自动触发, UI 会自动更新
    });

    // --- 6. 获取并应用用户权限的函数 ---
    async function loadUserPermissions(userId) {
        // 先隐藏所有标签页，再根据权限逐个显示
        tabButtons.forEach(btn => btn.classList.add('hidden'));

        const { data: permissions, error } = await supabase
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
        
        // 默认激活第一个可见的标签页
        if (visibleTabs.length > 0) {
            visibleTabs[0].click(); // 触发点击事件来加载内容
        } else {
             // 如果没有任何可见标签页，则清空内容区
             tabPanels.forEach(panel => {
                panel.classList.remove('active');
                panel.innerHTML = '<p style="padding: 20px; text-align: center;">您暂无任何模块的访问权限。请联系管理员。</p>';
             });
        }
    }

    // --- 7. 保留并整合原有的功能 ---
    
    // 标签页点击切换逻辑
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            // 如果标签页因为没有权限而被隐藏，则不处理点击
            if (tab.classList.contains('hidden')) return; 

            const targetId = tab.dataset.tab;
            // 激活当前点击的标签按钮
            tabButtons.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // 显示对应的标签页内容面板
            tabPanels.forEach(panel => {
                const isActive = panel.id === `${targetId}-tab`;
                panel.classList.toggle('active', isActive);

                // 按需加载对应标签页的JS模块（保留原有逻辑）
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
    
    // 页面加载时立即执行访客计数
    updateVisitorCount();
});
