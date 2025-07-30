// --- File: /public/js/universities.js ---

// This function writes a log message directly to the on-screen console
function logToScreen(message, color = '#0f0') {
    const consoleDiv = document.getElementById('debug-console');
    if (consoleDiv) {
        consoleDiv.innerHTML += `<p style="margin: 2px 0; color: ${color};">${new Date().toLocaleTimeString()} - ${message}</p>`;
        consoleDiv.scrollTop = consoleDiv.scrollHeight;
    }
    console.log(message); // Also log to the real browser console
}

logToScreen("universities.js: 脚本文件已加载并解析。", "cyan");

window.initializeUniversitiesTab = function() {
    logToScreen("initializeUniversitiesTab() 函数被成功调用。", "lime");
    try {
        const container = document.getElementById('universities-tab');
        if (!container) {
            throw new Error("找不到 #universities-tab 容器!");
        }
        container.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h1 style="color: green;">高校库模块初始化成功！</h1>
                <p>框架正常，现在我们可以安全地恢复此模块的完整功能了。</p>
            </div>
        `;
        logToScreen("高校库模块的DOM已成功更新。", "lime");
    } catch (error) {
        logToScreen(`在 initializeUniversitiesTab() 中发生错误: ${error.message}`, "red");
    }
}
