window.initializePlansTab = function() {
    const plansTab = document.getElementById('plans-tab');
    if (!plansTab || plansTab.dataset.initialized) return;
    plansTab.dataset.initialized = 'true';

    // 1. 注入新标签页的HTML结构
    plansTab.innerHTML = `
        <div class="app-container" id="app-container-plans">
            <div class="left-panel">
                <div class="plan-filters">
                    <select name="subject-type"><option>科类</option></select>
                    <select name="city"><option>城市</option></select>
                    <select name="subject-requirements"><option>选科</option></select>
                    <select name="university-level"><option>院校水平</option></select>
                    <select name="ownership-type"><option>办学性质</option></select>
                    <select name="education-level"><option>本科</option></select>
                </div>

                <div class="plan-search-inputs">
                    <input type="text" id="plan-uni-search" placeholder="院校名称关键字......">
                    <input type="text" id="plan-major-search" placeholder="专业名称关键字 (可多个, 用空格分隔)">
                    <button id="plan-query-button" class="query-button">查 询</button>
                </div>

                <div id="plan-tree-container" class="major-tree-container">
                    <p>请设置筛选条件后, 点击“查询”。</p>
                </div>
            </div>

            <div class="right-panel">
                <div class="chart-display-area">
                    图表展示区，高度占比约 30%
                </div>
                
                <div class="output-container">
                    <div class="output-header">
                        <h3>意向计划</h3>
                        <div class="button-group">
                            <button id="plan-copy-button" class="output-button disabled">复制</button>
                            <button id="plan-clear-button" class="output-button disabled">清空</button>
                        </div>
                    </div>
                    <textarea id="plan-output-textarea" readonly placeholder="您勾选的专业将按选择顺序在此显示..."></textarea>
                </div>
            </div>
        </div>
    `;

    // 2. 获取新创建的DOM元素引用 (后续功能开发将在此处进行)
    const queryButton = plansTab.querySelector('#plan-query-button');
    // ... 其他元素

    // 3. 实现功能逻辑 (后续功能开发将在此处进行)
    // queryButton.addEventListener('click', () => { /* ... 查询逻辑 ... */ });
}
