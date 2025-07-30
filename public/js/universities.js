window.initializeUniversitiesTab = function() {
    const container = document.getElementById('universities-tab');
    if (!container || container.dataset.initialized) return;
    container.dataset.initialized = 'true';

    container.innerHTML = `
        <div style="padding: 20px;">
            <h2>高校库</h2>
            <p>此功能正在恢复中，请先测试“专业目录”标签页是否工作正常。</p>
        </div>
    `;
}
