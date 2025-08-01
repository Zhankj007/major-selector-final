window.initializePlansTab = function() {
    const container = document.getElementById('plans-tab');
    if (!container || container.dataset.initialized) return;
    container.dataset.initialized = 'true';

    container.innerHTML = `
        <div class="app-container">
            <div class="left-panel">
                <div class="filter-controls" id="plans-filters-container">
                    </div>
                <div class="plans-search-area">
                    <div class="plans-search-row">
                        <input type="search" id="plans-uni-search" placeholder="院校名称关键字...">
                        <div class="switcher">
                            <input type="radio" name="plans-view" value="tree" id="view-tree" checked><label for="view-tree">树状图</label>
                            <input type="radio" name="plans-view" value="list" id="view-list"><label for="view-list">列表</label>
                        </div>
                    </div>
                    <div class="plans-search-row">
                        <textarea id="plans-major-search" placeholder="专业名称关键字..." rows="3"></textarea>
                        <div class="button-stack">
                            <button id="plans-paste-button" class="query-button">一键复制</button>
                            <button id="plans-query-button" class="query-button">查询</button>
                        </div>
                    </div>
                </div>
                <div id="plans-tree-container" class="major-tree-container">
                    <p>请设置筛选条件后，点击“查询”。</p>
                </div>
            </div>
            <div class="right-panel">
                <div id="plans-details-content" class="details-content"><p>悬停查看详情</p></div>
                <div class="charts-area">
                     <div class="chart-container" id="chart-container-left">
                        <canvas id="plans-chart-left"></canvas>
                     </div>
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
    `;

    const filterContainer = container.querySelector('#plans-filters-container');
    const uniSearchInput = container.querySelector('#plans-uni-search');
    const majorSearchTextarea = container.querySelector('#plans-major-search');
    const pasteButton = container.querySelector('#plans-paste-button');
    const queryButton = container.querySelector('#plans-query-button');
    const treeContainer = container.querySelector('#plans-tree-container');

    let allPlansData = [];

    async function fetchDataAndBuildFilters() {
        try {
            const response = await fetch('/api/getPlans'); // Fetch all data initially to build filters
            if (!response.ok) throw new Error('无法获取初始化数据');
            allPlansData = await response.json();
            if(!allPlansData.length) throw new Error('初始化数据为空');
            buildFilterUI();
        } catch (error) {
            console.error(error);
            filterContainer.innerHTML = `<p style="color:red">筛选器加载失败: ${error.message}</p>`;
        }
    }

    function buildFilterUI() {
        const filters = {
            '科类': { data: new Set() }, '城市': { type: 'complex_city' }, '选科': { type: 'complex_subject' },
            '院校水平': { type: 'custom_level' }, '办学性质': { data: new Set() }, '本专科': { data: new Set() },
        };
        // ... (The rest of the complex filter generation will be added in the next phase)
        filterContainer.innerHTML = Object.keys(filters).map(key => 
            `<details class="filter-group"><summary>${key}</summary><div class="filter-options" id="filter-opts-${key.replace(/\s+/g, '-')}"><p>...</p></div></details>`
        ).join('');
    }
    
    function updatePasteButtonState() {
        if (typeof window.getSharedSelectedMajors === 'function') {
            const selectedMajors = window.getSharedSelectedMajors();
            pasteButton.classList.toggle('disabled', selectedMajors.size === 0);
        } else {
            pasteButton.classList.add('disabled');
        }
    }

    pasteButton.addEventListener('click', () => {
        if (typeof window.getSharedSelectedMajors === 'function') {
            const selectedMajors = window.getSharedSelectedMajors();
            const names = Array.from(selectedMajors.values()).map(major => major['专业名']);
            majorSearchTextarea.value = names.join(' ');
        }
    });

    queryButton.addEventListener('click', () => {
        const uniKeyword = uniSearchInput.value.trim();
        const majorKeywords = majorSearchTextarea.value.trim().split(/\s+/).filter(Boolean);
        
        const params = new URLSearchParams();
        if (uniKeyword) params.append('uniKeyword', uniKeyword);
        if (majorKeywords.length) params.append('majorKeywords', majorKeywords.join(','));

        treeContainer.innerHTML = `<p>正在根据您的条件查询，请稍候...</p>`;
        fetch(`/api/getPlans?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                if(data.error) throw new Error(data.error);
                treeContainer.innerHTML = `查询到 ${data.length} 条结果。 (下一步将实现树状图渲染)`;
                // In the next phase, we will call a renderTree function here.
            })
            .catch(err => {
                treeContainer.innerHTML = `<p style="color:red;">查询失败: ${err.message}</p>`;
            });
    });

    fetchDataAndBuildFilters();
    // Check paste button state when this tab becomes active
    new MutationObserver(() => {
        if(container.classList.contains('active')) updatePasteButtonState();
    }).observe(container, { attributes: true, attributeFilter: ['class']});
    updatePasteButtonState();
}
