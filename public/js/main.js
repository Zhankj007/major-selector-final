// public/js/main.js (最终诊断版 - 追踪点击事件)

document.addEventListener('DOMContentLoaded', function () {
    console.log("【1】 main.js 开始执行");

    // --- 获取核心HTML元素 ---
    const supabaseClient = supabase.createClient('__SUPABASE_URL__', '__SUPABASE_ANON_KEY__');
    const loginForm = document.getElementById('login-form');
    const authButton = document.getElementById('auth-button');
    const userNicknameElement = document.getElementById('user-nickname');
    const tabButtons = document.querySelectorAll('.tab-button');

    let currentUser = null;

    // --- 核心认证状态监听器 ---
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log(`%c【A】 认证状态发生变化: ${event}`, 'color: green; font-weight: bold;');
        currentUser = session?.user || null;
        await updateUserInterface(currentUser);
    });

    /**
     * 唯一的UI更新函数
     */
    async function updateUserInterface(user) {
        console.log("【B】 updateUserInterface 函数开始执行", user ? `用户ID: ${user.id}`: "用户: null");

        if (user) {
            // 已登录状态的UI更新
            authButton.textContent = '退出登录';
            document.body.classList.remove('logged-out');
            
            console.log("【C】 准备查询用户信息和权限...");
            const [profileRes, permsRes] = await Promise.all([
                supabaseClient.from('profiles').select('username, role').eq('id', user.id).single(),
                supabaseClient.from('user_permissions').select('tab_name').eq('user_id', user.id)
            ]);
            console.log("【D】 用户信息和权限查询完成");

            // 更新欢迎语
            if (profileRes.data) {
                userNicknameElement.textContent = `欢迎您, ${profileRes.data.username || ''}`;
            } else {
                userNicknameElement.textContent = '欢迎您';
                console.error("【错误】未能获取到用户 profile:", profileRes.error);
            }

            // 更新标签页
            const permittedTabs = new Set(['universities', 'majors']);
            if (profileRes.data?.role === 'admin') permittedTabs.add('admin');
            if (permsRes.data) permsRes.data.forEach(p => permittedTabs.add(p.tab_name));
            
            console.log("【E】 最终计算出的权限为:", permittedTabs);
            tabButtons.forEach(btn => {
                btn.style.display = permittedTabs.has(btn.dataset.tab) ? '' : 'none';
            });

        } else {
            // 未登录状态的UI更新
            authButton.textContent = '登录/注册';
            userNicknameElement.textContent = '';
            document.body.classList.remove('logged-out');
            tabButtons.forEach(btn => {
                 btn.style.display = new Set(['universities', 'majors']).has(btn.dataset.tab) ? '' : 'none';
            });
        }
    }


    // --- 事件监听器绑定 ---
    
    // “登录/注册” 或 “退出登录” 按钮
    if (authButton) {
        console.log("【2】 找到 authButton，绑定点击事件");
        authButton.addEventListener('click', () => {
            console.log(`%c【CLICK】 authButton 被点击! 当前状态: ${currentUser ? '已登录' : '未登录'}`, 'color: blue');
            if (currentUser) {
                supabaseClient.auth.signOut();
            } else {
                document.body.classList.add('logged-out');
            }
        });
    } else {
        console.error("【错误】 找不到 authButton 元素!");
    }

    // 登录表单的提交按钮
    if (loginForm) {
        console.log("【3】 找到 loginForm，绑定提交事件");
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log('%c【SUBMIT】 登录表单被提交!', 'color: red; font-weight: bold;');
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const loginError = document.getElementById('login-error');
            loginError.textContent = '正在登录中...';

            try {
                console.log("【SUBMIT】 准备调用后端 /api/login...");
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();
                console.log("【SUBMIT】 后端 /api/login 返回结果:", data);

                if (!response.ok) throw new Error(data.error);

                console.log("【SUBMIT】 准备在前端设置session...");
                const { error: sessionError } = await supabaseClient.auth.setSession(data.session);
                if (sessionError) throw sessionError;

                console.log("【SUBMIT】 前端session设置成功。等待 onAuthStateChange 触发...");
                loginError.textContent = '';
                
            } catch (error) {
                console.error("【SUBMIT-ERROR】 登录过程中捕获到错误:", error);
                loginError.textContent = error.message;
            }
        });
    } else {
        console.error("【错误】 找不到 loginForm 元素!");
    }
    
    // 省略其他非核心事件监听器，保持不变
    const registerMessage = document.getElementById('register-message');
    document.getElementById('show-register-link').addEventListener('click', e => { e.preventDefault(); loginError.textContent = ''; document.getElementById('register-error').textContent = ''; registerMessage.textContent = ''; loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
    document.getElementById('show-login-link').addEventListener('click', e => { e.preventDefault(); loginError.textContent = ''; document.getElementById('register-error').textContent = ''; registerMessage.textContent = ''; registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });
    registerForm.addEventListener('submit', async (event) => { /* 保持您原有的注册逻辑 */ });
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.style.display === 'none') return;
            if (currentUser) document.body.classList.remove('logged-out');
            tabButtons.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanels.forEach(panel => {
                const isActive = panel.id === `${tab.dataset.tab}-tab`;
                panel.classList.toggle('active', isActive);
                if (isActive && !panel.dataset.initialized) {
                    if (tab.dataset.tab === 'universities') window.initializeUniversitiesTab?.();
                    else if (tab.dataset.tab === 'majors') window.initializeMajorsTab?.();
                    else if (tab.dataset.tab === 'plans') window.initializePlansTab?.();
                    else if (tab.dataset.tab === 'admin') window.initializeAdminTab?.();
                }
            });
        });
    });

    // 5. --- 页面初始化 ---
    document.querySelector('.tab-button[data-tab="universities"]')?.click();
    fetch('/api/counter').then(res => res.json()).then(data => {
        document.getElementById('visitor-info').textContent = `您是第 ${data.count} 位访客！`;
    }).catch(err => console.error('获取访客数失败:', err));
});