window.initializePlansTab = function() {
    const plansTab = document.getElementById('plans-tab');
    if (!plansTab || plansTab.dataset.initialized) return;
    plansTab.dataset.initialized = 'true';

    // 1. 注入HTML结构
    plansTab.innerHTML = `
        <div class="app-container" id="app-container-plans">
            <div class="left-panel">
                <div class="plan-filters">
                    <details class="filter-group" id="filter-plan-type"><summary>科类</summary><div class="filter-options"><p>普通类、艺术类...</p></div></details>
                    <details class="filter-group" id="filter-city"><summary>城市</summary><div class="filter-options"><p>城市评级+省份城市树...</p></div></details>
                    <details class="filter-group" id="filter-subject"><summary>选科</summary><div class="filter-options"><p>文理归类+选科要求树...</p></div></details>
                    <details class="filter-group" id="filter-uni-level"><summary>院校水平</summary><div class="filter-options"><p>985/211/中外合作...</p></div></details>
                    <details class="filter-group" id="filter-ownership"><summary>办学性质</summary><div class="filter-options"><p>公办/民办...</p></div></details>
                    <details class="filter-group" id="filter-edu-level"><summary>本专科</summary><div class="filter-options"><p>本科/专科...</p></div></details>
                </div>
                <div class="plan-interactive-controls">
                    <div class="input-column">
                        <input type="text" id="plan-uni-search" placeholder="院校名称关键字">
                        <textarea id="plan-major-search" rows="3" placeholder="专业名称关键字 (可多个, 用空格分隔)"></textarea>
                    </div>
                    <div class="button-column">
                        <button id="plan-query-button" class="query-button">查 询</button>
                        <button id="plan-copy-selected-button" class="output-button">复制所选专业</button>
                        <div class="switcher">
                             <input type="radio" name="view-mode" value="tree" id="view-tree" checked><label for="view-tree">树状</label>
                             <input type="radio" name="view-mode" value="list" id="view-list"><label for="view-list">列表</label>
                        </div>
                    </div>
                </div>
                <div id="plan-tree-container" class="major-tree-container"><p>请设置筛选条件后, 点击“查询”。</p></div>
            </div>
            <div class="right-panel">
                <div id="plan-details-content" class="plan-details-section"><h3>计划详情</h3><div class="content-placeholder"><p>在此显示选中项的具体招生计划信息。</p></div></div>
                <div id="plan-chart-area" class="plan-chart-section"><h3>图表展示</h3><div class="content-placeholder"><p>在此根据查询结果生成图表。</p></div></div>
                <div id="plan-output-container" class="output-container">
                    <div class="output-header">
                        <h3>意向计划</h3>
                        <div class="button-group">
                            <button id="plan-copy-button" class="output-button">复制</button>
                            <button id="plan-clear-button" class="output-button">清空</button>
                        </div>
                    </div>
                    <textarea id="plan-output-textarea" readonly placeholder="您勾选的专业将按选择顺序在此显示..."></textarea>
                </div>
            </div>
        </div>
    `;

    // --- 2. 获取DOM元素引用 ---
    const uniSearchInput = plansTab.querySelector('#plan-uni-search');
    const majorSearchInput = plansTab.querySelector('#plan-major-search');
    const copyMajorButton = plansTab.querySelector('#plan-copy-selected-button');
    const queryButton = plansTab.querySelector('#plan-query-button');
    const filterGroups = plansTab.querySelectorAll('.filter-group');
    // 意向计划区域的按钮和文本框
    const planOutputTextarea = plansTab.querySelector('#plan-output-textarea');
    const planCopyButton = plansTab.querySelector('#plan-copy-button');
    const planClearButton = plansTab.querySelector('#plan-clear-button');

    // --- 3. 状态管理与事件监听 ---
    let filters = { /* ... */ };

    // 功能：更新本页“意向计划”输出区的按钮状态
    function updatePlanOutputButtonsState() {
        const hasContent = planOutputTextarea.value.length > 0;
        planCopyButton.classList.toggle('disabled', !hasContent);
        planClearButton.classList.toggle('disabled', !hasContent);
    }

    // 功能：更新“复制所选专业”按钮的状态（依赖于另一标签页）
    function updateCopyMajorButtonState() {
        const majorOutputTextarea = document.querySelector('#major-output-textarea');
        const hasContent = majorOutputTextarea && majorOutputTextarea.value.length > 0;
        copyMajorButton.classList.toggle('disabled', !hasContent);
    }

    // 监听本页输出框的内容变化
    planOutputTextarea.addEventListener('input', updatePlanOutputButtonsState);

    // 定时检查“专业目录”页的输出框内容，以更新按钮状态
    setInterval(updateCopyMajorButtonState, 500);

    copyMajorButton.addEventListener('click', () => {
        const majorOutputTextarea = document.querySelector('#major-output-textarea');
        if (majorOutputTextarea && majorOutputTextarea.value) {
            majorSearchInput.value = majorOutputTextarea.value;
            majorSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    function updateFilters() { /* ... */ }
    filterGroups.forEach(group => group.addEventListener('change', updateFilters));
    uniSearchInput.addEventListener('input', updateFilters);
    majorSearchInput.addEventListener('input', updateFilters);
    plansTab.querySelector('.switcher').addEventListener('change', (e) => {
        filters.viewMode = e.target.value;
    });

    queryButton.addEventListener('click', () => {
        updateFilters();
        alert('查询功能将在下一步实现！');
    });

    // --- 4. 初始化 ---
    // 页面加载时，立即执行一次按钮状态检查，确保初始状态正确（禁用）
    updatePlanOutputButtonsState();
    updateCopyMajorButtonState();
};
