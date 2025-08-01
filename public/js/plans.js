window.initializePlansTab = function() {
    const container = document.getElementById('plans-tab');
    if (!container || container.dataset.initialized) return;
    container.dataset.initialized = 'true';

    container.innerHTML = `
        <div class="app-container">
            <div class="left-panel">
                <div class="filter-controls" id="plans-filters-container"></div>
                <div class="plans-search-area">
                    <div class="plans-search-row">
                        <input type="search" id="plans-uni-search" style="width: 70%;" placeholder="院校名称关键字...">
                        <div class="switcher">
                            <input type="radio" name="plans-view" value="tree" id="view-tree" checked><label for="view-tree">树状图</label>
                            <input type="radio" name="plans-view" value="list" id="view-list"><label for="view-list">列表</label>
                        </div>
                    </div>
                    <div class="plans-search-row">
                        <textarea id="plans-major-search" placeholder="专业名称关键字（可输入多个，用空格分隔）" rows="3"></textarea>
                        <div class="button-stack">
                            <button id="plans-paste-button" class="output-button">复制意向</button>
                            <button id="plans-query-button" class="query-button">查询</button>
                        </div>
                    </div>
                </div>
                <div id="plans-tree-container" class="major-tree-container"></div>
            </div>
            <div class="right-panel">
                <div id="plans-details-content" class="details-content"></div>
                <div class="bottom-panel">
                    <div class="chart-area">
                        <canvas id="plans-chart"></canvas>
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
            </div>
        </div>`;

    const filterContainer = container.querySelector('#plans-filters-container');
    const uniSearchInput = container.querySelector('#plans-uni-search');
    const majorSearchTextarea = container.querySelector('#plans-major-search');
    const pasteButton = container.querySelector('#plans-paste-button');
    const queryButton = container.querySelector('#plans-query-button');
    const treeContainer = container.querySelector('#plans-tree-container');
    const detailsContent = container.querySelector('#plans-details-content');
    const chartCanvas = container.querySelector('#plans-chart');
    const outputTextarea = container.querySelector('#plans-output-textarea');
    const copyButton = container.querySelector('#plans-copy-button');
    const clearButton = container.querySelector('#plans-clear-button');
    const selectionCounter = container.querySelector('#plans-selection-counter');
    const viewSwitcher = container.querySelector('.plans-search-row .switcher');

    let allPlansData = [];
    let allUniversitiesData = [];
    let selectedPlans = new Map();
    let chartInstance = null;
    const PLAN_ID_KEY = 'plan_id'; // Assuming a unique ID column

    // --- Main Logic ---
    async function initialize() {
        treeContainer.innerHTML = '<p>正在加载初始化数据...</p>';
        try {
            const [plansRes, unisRes] = await Promise.all([ fetch('/api/getPlans'), fetch('/api/getUniversities') ]);
            if (!plansRes.ok) throw new Error('无法获取招生计划数据');
            if (!unisRes.ok) throw new Error('无法获取高校库数据');
            allPlansData = await plansRes.json();
            allUniversitiesData = await unisRes.json();
            if(!allPlansData.length) throw new Error('招生计划数据为空');
            // Create a unique ID for each plan for the selection Map
            allPlansData.forEach((plan, index) => { plan[PLAN_ID_KEY] = `${plan['院校代码']}-${plan['专业代码']}-${index}`; });
            buildFilterUI();
            updatePasteButtonState();
            treeContainer.innerHTML = '<p>请设置筛选条件后，点击“查询”。</p>';
        } catch (error) {
            treeContainer.innerHTML = `<p style="color:red">初始化失败: ${error.message}</p>`;
        }
    }

    function buildFilterUI() { /* ... implementation from previous thought block ... */ }
    function runQuery() { /* ... implementation from previous thought block ... */ }
    
    // ... all other functions ...
    
    pasteButton.addEventListener('click', () => { /* ... implementation ... */ });
    queryButton.addEventListener('click', runQuery);
    
    initialize();
    updateOutputUI();
};
