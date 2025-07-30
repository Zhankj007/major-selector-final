window.initializeUniversitiesTab = function() {
    console.log("Universities.js: initializeUniversitiesTab() has been called.");
    const container = document.getElementById('universities-tab');
    
    if (!container) {
        console.error('Universities.js: CRITICAL - Could not find the #universities-tab container!');
        return;
    }
    
    container.innerHTML = `
        <div style="padding: 20px; text-align: center;">
            <h1 style="color: green;">高校库测试成功！</h1>
            <p>如果您能看到此消息，说明模块加载框架正常。</p>
            <p>请将此结果反馈给我，我们再恢复完整功能。</p>
        </div>
    `;
    console.log("Universities.js: Successfully updated the DOM.");
}
