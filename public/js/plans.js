window.initializePlansTab = function() {
    const container = document.getElementById('plans-tab');
    if (!container || container.dataset.initialized) return;
    container.dataset.initialized = 'true';

    container.innerHTML = `
        <div class="app-container">
            <div class="left-panel">
                <div class="filter-controls" id="plans-filters-container">
                    <details class="filter-group"><summary>科类</summary><div id="plans-type-filter" class="filter-options"><p>加载中...</p></div></details>
                    <details class="filter-group"><summary>城市</summary><div id="plans-city-filter" class="filter-options"><p>加载中...</p></div></details>
                    <details class="filter-group"><summary>选科</summary><div id="plans-subject-filter" class="filter-options"><p>加载中...</p></div></details>
                    <details class="filter-group"><summary>院校水平</summary><div id="plans-level-filter" class="filter-options"><p>加载中...</p></div></details>
                    <details class="filter-group"><summary>办学性质</summary><div id="plans-ownership-filter" class="filter-options"><p>加载中...</p></div></details>
                    <details class="filter-group"><summary>本专科</summary><div id="plans-edu-level-filter" class="filter-options"><p>加载中...</p></div></details>
                </div>
                <div class="search-container" style="margin-top: 10px;">
                    <input type="search" id="plans-uni-search" placeholder="院校名称关键字...">
                </div>
                <div class="search-container" style="margin-top: 10px;">
                    <input type="search" id="plans-major-search" placeholder="专业名称关键字...">
                    <button id="plans-paste-button" class="query-button" style="flex-shrink: 0;">复制意向</button>
                </div>
                <div style="display: flex; gap: 15px; margin: 10px 0;">
                    <button id="plans-query-button" class="query-button" style="flex-grow: 1;">查询</button>
                    <div class="switcher">
                        <input type="radio" name="plans-view" value="tree" id="view-tree" checked><label for="view-tree">树状图</label>
                        <input type="radio" name="plans-view" value="list" id="view-list"><label for="view-list">列表</label>
                    </div>
                </div>
                <div id="plans-tree-container" class="major-tree-container"><p>请设置筛选条件后，点击“查询”。</p></div>
            </div>
            <div class="right-panel">
                <div id="plans-details-content" class="details-content"><p>悬停查看详情</p></div>
                <div class="charts-area" style="display: flex; gap: 10px; flex-shrink: 0;">
                     <div class="chart-container" style="width: 50%;" id="chart-container-left"><canvas id="plans-chart-left"></canvas></div>
                     <div class="chart-container" style="width: 50%;" id="chart-container-right"><canvas id="plans-chart-right"></canvas></div>
                </div>
                <div class="output-container">
                    <div class="output-header">
                        <h3>意向计划<span id="plans-selection-counter"></span></h3>
                        <div class="button-group">
                            <button id="plans-copy-button" class="output-button">复制</button>
                            <button id="plans-clear-button" class="output-button">清空</button>
                        </div>
                    </div>
                    <textarea id="plans-output-textarea" readonly></textarea>
                </div>
            </div>
        </div>`;

    let allPlansData = [];
    const treeContainer = container.querySelector('#plans-tree-container');
    const queryButton = container.querySelector('#plans-query-button');

    async function fetchDataAndBuildFilters() {
        try {
            const response = await fetch('/api/getPlans'); // Fetch all data initially to build filters
            if (!response.ok) throw new Error('无法获取初始化数据');
            allPlansData = await response.json();
            if(!allPlansData.length) throw new Error('初始化数据为空');
            
            // For now, we just confirm data is loaded. Filter UI build is complex and will be next.
            treeContainer.innerHTML = `<p style="color:green;">✔ 成功从Supabase获取 ${allPlansData.length} 条计划数据！<br>下一步我们将构建筛选器和显示功能。</p>`;
        } catch (error) {
            console.error(error);
            treeContainer.innerHTML = `<p style="color:red">筛选器加载失败: ${error.message}</p>`;
        }
    }
    
    queryButton.addEventListener('click', fetchDataAndBuildFilters);

    // Initial message
    updateUniOutputUI();
    function updateUniOutputUI() {
        container.querySelector('#plans-copy-button').classList.add('disabled');
        container.querySelector('#plans-clear-button').classList.add('disabled');
    }
}
