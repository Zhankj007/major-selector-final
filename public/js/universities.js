window.initializeUniversitiesTab = function() {
    const container = document.getElementById('universities-tab');
    if (!container || container.dataset.initialized) return;
    container.dataset.initialized = 'true';
    container.innerHTML = `
        <div class="app-container">
            <div class="left-panel">
                <div class="header-controls">
                    <div class="switcher">
                        <input type="radio" name="uni-group-by" value="region" id="group-by-region" checked>
                        <label for="group-by-region">按地域</label>
                        <input type="radio" name="uni-group-by" value="department" id="group-by-department">
                        <label for="group-by-department">按主管部门</label>
                    </div>
                    <div class="search-container">
                        <input type="search" id="uni-search-input" placeholder="输入院校名关键字...">
                        <button id="uni-query-button" class="query-button">查询</button>
                    </div>
                    <div class="switcher-group">
                         <div class="switcher">
                            <input type="radio" name="expand-collapse" value="collapse" id="collapse-all" checked>
                            <label for="collapse-all">折叠</label>
                            <input type="radio" name="expand-collapse" value="expand" id="expand-all">
                            <label for="expand-all">展开</label>
                        </div>
                    </div>
                </div>
                <div class="controls-toolbar">
                    <div class="filter-controls">
                        <details class="filter-group"><summary>院校水平</summary><div id="uni-level-filter" class="filter-options"><p>加载中...</p></div></details>
                        <details class="filter-group"><summary>院校类型</summary><div id="uni-type-filter" class="filter-options"><p>加载中...</p></div></details>
                        <details class="filter-group"><summary>城市评级</summary><div id="uni-city-tier-filter" class="filter-options"><p>加载中...</p></div></details>
                        <details class="filter-group"><summary>办学性质</summary><div id="uni-ownership-filter" class="filter-options"><p>加载中...</p></div></details>
                        <details class="filter-group"><summary>办学层次</summary><div id="uni-edu-level-filter" class="filter-options"><p>加载中...</p></div></details>
                    </div>
                </div>
                <div id="uni-tree-container" class="major-tree-container"><p>请点击“查询”按钮开始。</p></div>
            </div>
            <div class="right-panel">
                <h3>院校详情</h3>
                <div id="uni-details-content" class="details-content"><p>请在左侧选择或查询院校...</p></div>
                <div class="output-container">
                    <div class="output-header">
                        <h3>意向院校<span id="uni-selection-counter"></span></h3>
                        <div class="button-group">
                            <button id="uni-copy-button" class="output-button">复制</button>
                            <button id="uni-clear-button" class="output-button">清空</button>
                        </div>
                    </div>
                    <textarea id="uni-output-textarea" readonly placeholder="您勾选的院校将按选择顺序列在这里..."></textarea>
                </div>
            </div>
        </div>`;

    const groupBySwitcher = container.querySelector('input[name="uni-group-by"]')?.parentElement;
    const expandCollapseSwitcher = container.querySelector('input[name="expand-collapse"]')?.parentElement;
    const searchInput = container.querySelector('#uni-search-input');
    const queryButton = container.querySelector('#uni-query-button');
    const treeContainer = container.querySelector('#uni-tree-container');
    const detailsContent = container.querySelector('#uni-details-content');
    const outputTextarea = container.querySelector('#uni-output-textarea');
    const copyButton = container.querySelector('#uni-copy-button');
    const clearButton = container.querySelector('#uni-clear-button');
    const selectionCounter = container.querySelector('#uni-selection-counter');
    const filterUIs = { '院校水平': container.querySelector('#uni-level-filter'), '院校类型': container.querySelector('#uni-type-filter'), '城市评级': container.querySelector('#uni-city-tier-filter'), '办学性质': container.querySelector('#uni-ownership-filter'), '办学层次': container.querySelector('#uni-edu-level-filter') };
    const filterGroups = container.querySelectorAll('.filter-group');
    let allUniversities = [];
    let groupBy = 'region';
    let selectedUniversities = new Map();
    const UNI_NAME_KEY = '院校名';
    const UNI_CODE_KEY = '院校编码';

    async function fetchData() { /* ... unchanged ... */ }
    function generateFilterOptions() { /* ... unchanged ... */ }
    function runQuery() { /* ... unchanged ... */ }
    function buildHierarchy(list, key1, key2) { /* ... unchanged ... */ }
    function renderUniversityTree(list) { /* ... unchanged ... */ }
    function renderUniLi(uni, liClass = 'level-3-li') { /* ... unchanged ... */ }
    function attachUniEventListeners() { /* ... unchanged ... */ }
    function handleUniCheckboxChange(checkbox) { /* ... unchanged ... */ }
    function updateUniOutputUI() { /* ... unchanged ... */ }
    function syncUniCheckboxesWithState() { /* ... unchanged ... */ }
    function cascadeUniCheckboxVisuals(checkbox) { /* ... unchanged ... */ }
    function showUniDetails(li) { /* ... unchanged ... */ }
    function toggleAllNodes(shouldExpand) { /* ... unchanged ... */ }
    
    filterGroups.forEach(group => {
        const details = group;
        details.addEventListener('mouseenter', () => { details.open = true; });
        details.addEventListener('mouseleave', () => { details.open = false; });
    });
    
    groupBySwitcher.addEventListener('change', e => { groupBy = e.target.value; runQuery(); });
    queryButton.addEventListener('click', runQuery);
    searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') runQuery(); });
    expandCollapseSwitcher.addEventListener('change', e => toggleAllNodes(e.target.value === "expand"));
    copyButton.addEventListener('click', () => { /* ... unchanged ... */ });
    clearButton.addEventListener('click', () => { if (selectedUniversities.size === 0) return; selectedUniversities.clear(); runQuery(); updateUniOutputUI(); });

    fetchData();
    updateUniOutputUI();
};
