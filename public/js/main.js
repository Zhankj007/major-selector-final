// public/js/main.js (Final, Complete, and Corrected Version)

document.addEventListener('DOMContentLoaded', function () {
    // 1. --- SETUP ---
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;

    // 2. --- ELEMENT SELECTORS ---
    const loginSection = document.getElementById('login-section');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const registerMessage = document.getElementById('register-message');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const userNicknameElement = document.getElementById('user-nickname');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const authButton = document.getElementById('auth-button');

    // 3. --- STATE AND CONFIG ---
    const publicTabs = ['universities', 'majors'];
    let isLoggedIn = false;

    // 4. --- CORE AUTH LOGIC ---
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        isLoggedIn = !!(session && session.user);
        
        if (isLoggedIn) {
            document.body.classList.remove('logged-out');
            authButton.textContent = '退出登录';
            const { data: profile } = await supabaseClient.from('profiles').select('username').eq('id', session.user.id).single();
            userNicknameElement.textContent = profile ? `欢迎您, ${profile.username}`: '欢迎您';
        } else {
            document.body.classList.remove('logged-out');
            authButton.textContent = '登录/注册';
            userNicknameElement.textContent = '';
        }

        const permittedTabs = await getPermittedTabs(session);
        updateTabVisibility(permittedTabs);
    });

    async function getPermittedTabs(session) {
        const permitted = new Set(publicTabs);
        if (!isLoggedIn || !session || !session.user) return permitted;
        
        const [profileRes, permsRes] = await Promise.all([
            supabaseClient.from('profiles').select('role').eq('id', session.user.id).single(),
            supabaseClient.from('user_permissions').select('tab_name, expires_at').eq('user_id', session.user.id)
        ]);

        if (profileRes.data?.role === 'admin') permitted.add('admin');
        if (permsRes.data) {
            const now = new Date();
            permsRes.data.forEach(p => {
                if (!p.expires_at || new Date(p.expires_at) >= now) permitted.add(p.tab_name);
            });
        }
        return permitted;
    }

    function updateTabVisibility(permittedTabs) {
        let firstVisibleTab = null;
        tabButtons.forEach(btn => {
            const tabName = btn.dataset.tab;
            if (permittedTabs.has(tabName)) {
                btn.style.display = '';
                if (!firstVisibleTab) firstVisibleTab = btn;
            } else {
                btn.style.display = 'none';
            }
        });
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab && activeTab.style.display === 'none') {
            firstVisibleTab?.click();
        } else if (!activeTab) {
            firstVisibleTab?.click();
        }
    }

    // 5. --- EVENT LISTENERS ---
    authButton.addEventListener('click', () => {
        if (isLoggedIn) {
            supabaseClient.auth.signOut();
        } else {
            document.body.classList.add('logged-out');
            loginSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
    
    showRegisterLink.addEventListener('click', e => { e.preventDefault(); loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
    showLoginLink.addEventListener('click', e => { e.preventDefault(); registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); loginError.textContent = ''; registerError.textContent = ''; registerMessage.textContent = ''; });

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginError.textContent = '';
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        if (!emailInput || !passwordInput) {
            loginError.textContent = '页面结构错误：找不到登录输入框。';
            return;
        }
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value, password: passwordInput.value }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            const { error } = await supabaseClient.auth.setSession(data.session);
            if (error) throw error;
        } catch (error) {
            loginError.textContent = error.message;
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
            registerMessage.textContent = '注册成功！现在您可以登录了。';
            setTimeout(() => showLoginLink.click(), 2000);
        } catch (error) {
            registerError.textContent = error.message;
        }
    });

    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.style.display === 'none') return;
            if (isLoggedIn) document.body.classList.remove('logged-out');
            
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

    // 6. --- INITIALIZATION ---
    const firstTab = document.querySelector('.tab-button[data-tab="universities"]');
    if (firstTab && !document.querySelector('.tab-button.active')) {
        firstTab.click();
    }
    
    fetch('/api/counter').then(res => res.json()).then(data => {
        document.getElementById('visitor-info').textContent = `您是第 ${data.count} 位访客！`;
    }).catch(err => console.error('Failed to fetch visitor count:', err));

});