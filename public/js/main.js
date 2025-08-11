// main.js (调试第三步)
console.log("main.js 脚本已开始执行！");

document.addEventListener('DOMContentLoaded', function () {

    console.log("DOM内容已完全加载，开始执行初始化...");

    // --- 1. 已确认正常，保持开启 ---
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
    console.log("Supabase client has been initialized.");

    // --- 2. 【取消本段注释】---
    // 恢复获取所有页面元素
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const registerMessage = document.getElementById('register-message');
    const authButton = document.getElementById('auth-button');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const userNicknameElement = document.getElementById('user-nickname');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    console.log("DOM elements have been selected.");

    // --- 3. 【取消本段注释，但保留其内部逻辑为注释】---
    // 我们先恢复监听器本身，看看挂载这个监听器是否就会导致问题
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state has changed! Event:", event); // 添加日志以确认监听器被触发

        /*
        // 内部的复杂逻辑暂时保持注释
        if (session && session.user) {
            // ... 用户登录逻辑 ...
        } else {
            // ... 用户未登录逻辑 ...
        }
        */
    });
    console.log("Auth state change listener has been attached.");

    // --- 4. 其他所有事件监听器和函数 (继续保持注释) ---
    /*
    loginForm.addEventListener('submit', async (event) => { //...
    // ... 所有其他代码 ...
    */

    // --- 5. 最终测试信号 ---
    try {
        document.body.style.backgroundColor = 'lightgreen';
        console.log("脚本成功执行到底！背景已变绿。");
    } catch (e) {
        console.error("在最后一步设置背景色时发生错误:", e);
    }

});