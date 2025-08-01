window.initializePlansTab = function() {
    const container = document.getElementById('plans-tab');
    if (!container || container.dataset.initialized) return;
    
    container.innerHTML = `<p style="padding: 20px;">正在连接到招生计划数据库...</p>`;

    fetch('/api/getPlans')
        .then(response => {
            if (!response.ok) {
                throw new Error(`API 请求失败，状态码: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("成功从Supabase获取到数据:", data);
            container.innerHTML = `
                <div style="padding: 20px;">
                    <h2 style="color: green;">✔ 招生计划数据库连接成功！</h2>
                    <p>已成功获取到 ${data.length} 条测试数据。</p>
                    <p>我们可以开始进行第二阶段的开发了。</p>
                    <pre style="background: #eee; padding: 10px; border-radius: 5px; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(data, null, 2)}</pre>
                </div>`;
        })
        .catch(error => {
            console.error("加载招生计划失败:", error);
            container.innerHTML = `<p style="color: red;">❌ 招生计划数据库连接失败: ${error.message}</p>`;
        });
}
