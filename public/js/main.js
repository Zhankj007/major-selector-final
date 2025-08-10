// public/js/main.js (全新诊断版 - 追踪点击事件)

document.addEventListener('DOMContentLoaded', function () {
    // 确保脚本只在页面完全加载后执行
    console.log("【诊断】: 1. 页面DOM加载完成，main.js开始执行。");

    try {
        // --- 2. 初始化 Supabase 客户端 ---
        const SUPABASE_URL = '__SUPABASE_URL__';
        const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
        const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = supabaseClient;
        console.log("【诊断】: 2. Supabase 客户端初始化成功。");

        // --- 3. 获取所有需要的 HTML 元素 ---
        const loginForm = document.getElementById('login-form');
        const authButton = document.getElementById('auth-button');
        const userNicknameElement = document.getElementById('user-nickname');
        const tabButtons = document.querySelectorAll('.tab-button');
        
        // 检查关键元素是否存在
        if (!loginForm) console.error("【诊断错误】: 找不到 ID 为 'login-form' 的登录表单！");
        if (!authButton) console.error("【诊断错误】: 找不到 ID 为 'auth-button' 的认证按钮！");
        
        console.log("【诊断】: 3. 核心HTML元素获取完毕。");

        // --- 4. 定义核心函数 ---
        let currentUser = null;

        async function updateUserInterface(user) {
            console.log(`%c【诊断】: A. updateUserInterface 函数被调用。当前用户状态: ${user ? '已登录' : '未登录'}`, 'color: green;');
            
            // 此处省略了复杂的UI更新逻辑，只保留最核心的按钮和欢迎语
            if (user) {
                authButton.textContent = '退出登录';
                const { data: profile } = await supabaseClient.from('profiles').select('username').eq('id', user.id).single();
                userNicknameElement.textContent = profile ? `欢迎您, ${profile.username}` : '欢迎您';
            } else {
                authButton.textContent = '登录/注册';
                userNicknameElement.textContent = '';
            }
        }

        // --- 5. 绑定核心事件监听器 ---
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log(`%c【诊断】: B. onAuthStateChange 事件触发! 类型: ${event}`, 'color: green; font-weight: bold;');
            currentUser = session?.user || null;
            await updateUserInterface(currentUser);
        });
        console.log("【诊断】: 4. onAuthStateChange 监听器已挂载。");

        authButton.addEventListener('click', () => {
            console.log(`%c【诊断】: C. authButton (”${authButton.textContent}“) 被点击!`, 'color: blue; font-weight: bold;');
            if (currentUser) {
                supabaseClient.auth.signOut();
            } else {
                document.body.classList.add('logged-out');
            }
        });
        console.log("【诊断】: 5. authButton 点击事件已绑定。");

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log('%c【诊断】: D. 登录表单被提交!', 'color: red; font-weight: bold;');
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const loginError = document.getElementById('login-error');
            loginError.textContent = '正在登录中...';

            try {
                console.log("【诊断】: D1. 准备调用后端 /api/login...");
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();
                console.log("【诊断】: D2. 后端 /api/login 返回结果:", data);

                if (!response.ok) throw new Error(data.error);

                console.log("【诊断】: D3. 准备在前端设置session...");
                const { error: sessionError } = await supabaseClient.auth.setSession(data.session);
                if (sessionError) throw sessionError;

                console.log("【诊断】: D4. 前端session设置成功。等待 onAuthStateChange 触发...");
                loginError.textContent = '';
                
            } catch (error) {
                console.error("【诊断】: D-ERROR. 登录过程中捕获到错误:", error);
                loginError.textContent = error.message;
            }
        });
        console.log("【诊断】: 6. loginForm 提交事件已绑定。");

        // --- 6. 脚本执行完毕 ---
        console.log("【诊断】: 7. main.js 脚本主体执行完毕。");

    } catch (error) {
        console.error("【诊断】: 脚本在初始化过程中发生致命错误!", error);
    }
});