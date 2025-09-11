// 合并两个DOMContentLoaded事件监听器
// 全局变量定义
const SUPABASE_URL = '__SUPABASE_URL__';
const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
        if (session && session.user) {
            document.body.classList.remove('logged-out');
            loadUserPermissions(session.user.id);
            displayUserProfile(session.user.id);
            hideModal(); // 登录成功后隐藏模态框
        } else {
            document.body.classList.add('logged-out');
            if (userNicknameElement) userNicknameElement.textContent = '';
            // 默认显示前两个标签页（高校库和专业目录）
            tabButtons.forEach(btn => {
                if (btn.dataset.tab === 'universities' || btn.dataset.tab === 'majors') {
                    btn.style.display = '';
                } else {
                    btn.style.display = 'none';
                }
            });
            // 确保未登录状态下第一个标签页被激活并初始化
            const firstVisibleTab = document.querySelector('.tab-button:not([style*="display: none"])');
            if (firstVisibleTab) {
                firstVisibleTab.click();
            }
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
        event.preventDefault(); // 阻止表单默认的刷新页面行为
        loginError.textContent = ''; // 清空之前的错误信息
    
        // 获取登录按钮元素
        const loginButton = loginForm.querySelector('button[type="submit"]');
    
        try {
            // 在请求开始前，禁用按钮并显示“登录中...”
            loginButton.disabled = true;
            loginButton.textContent = '登录中...';
            loginButton.style.backgroundColor = '#ccc'; // 设置为灰色
            
            // 显示登录状态提示
            loginError.textContent = '正在登录中，请稍候……';
    
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
    
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok) { throw new Error(data.error || '登录失败，请检查您的邮箱和密码。'); }
    
            const { error: sessionError } = await supabaseClient.auth.setSession(data.session);
            if (sessionError) throw sessionError;
            // 登录成功后，onAuthStateChange 会自动处理UI更新，我们无需额外操作
    
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
    logoutButton.addEventListener('click', () => supabaseClient.auth.signOut());

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
        // 默认显示前两个标签页（高校库和专业目录）
        let visibleTabs = [];
        tabButtons.forEach(btn => {
            if (btn.dataset.tab === 'universities' || btn.dataset.tab === 'majors') {
                btn.style.display = '';
                visibleTabs.push(btn); // 将默认显示的标签页添加到visibleTabs数组
            } else {
                btn.style.display = 'none';
            }
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
        permissions.forEach(perm => {
            const isExpired = perm.expires_at && new Date(perm.expires_at) < now;
            if (!isExpired) {
                const tabButton = document.querySelector(`.tab-button[data-tab="${perm.tab_name}"]`);
                if (tabButton) {
                    tabButton.style.display = ''; // 恢复显示
                    // 确保不重复添加到visibleTabs
                    if (!visibleTabs.includes(tabButton)) {
                        visibleTabs.push(tabButton);
                    }
                }
            }
        });
    
        // 显示管理员标签页（如果用户是管理员）
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();
    
        if (profileError) {
            console.error('获取用户角色失败:', profileError);
        } else if (profile && profile.role === 'admin') {
            const adminTabButton = document.getElementById('admin-tab-button');
            if (adminTabButton) {
                adminTabButton.style.display = '';
                visibleTabs.push(adminTabButton);
            }
        }
    
        // --- 【关键修正点】 ---
        // 在设置默认标签页之前，先检查当前是否已经有一个被激活的标签页
        const currentlyActiveTab = document.querySelector('.tab-button.active');
        
        // 判断当前激活的标签页是否在本次权限检查后依然可见
        const isActiveTabStillVisible = currentlyActiveTab && visibleTabs.includes(currentlyActiveTab);
    
        if (visibleTabs.length > 0 && !isActiveTabStillVisible) {
            // 只有在“没有任何标签页被激活”或“当前激活的标签页已不再可见”时，才默认点击第一个
            visibleTabs[0].click();
        }
        // 移除了visibleTabs.length === 0的检查，因为高校库和专业目录始终可见
        // 确保visibleTabs数组中至少包含默认的两个标签页
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
                    } else if (targetId === 'assessment' && typeof window.initializeAssessmentTab === 'function') {
                        // 当点击个人测评时，调用初始化函数
                        window.initializeAssessmentTab();
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
                } else if (targetId === 'assessment' && typeof window.initializeAssessmentTab === 'function') {
                    window.initializeAssessmentTab();
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
