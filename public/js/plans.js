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
                        <textarea id="plans-major-search" placeholder="专业名称关键字（可多个，用空格分隔）" rows="3"></textarea>
                        <div class="button-stack">
                            <button id="plans-paste-button" class="output-button">复制意向</button>
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
    // ... (rest of the script)
    
    let allPlansData = [];

    async function fetchDataAndBuildFilters() {
        try {
            const response = await fetch('/api/getPlans'); 
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
            '科类': { data: new Set() },
            '城市': { type: 'complex_city' },
            '选科': { type: 'complex_subject' },
            '院校水平': { type: 'custom_level' },
            '办学性质': { data: new Set() },
            '本专科': { data: new Set() },
        };
        
        allPlansData.forEach(p => {
            if(p['科类']) filters['科类'].data.add(p['科类']);
            if(p['办学性质']) filters['办学性质'].data.add(p['办学性质']);
            if(p['本专科']) filters['本专科'].data.add(p['本专科']);
        });

        let filterHtml = '';
        Object.keys(filters).forEach(key => {
            filterHtml += `<details class="filter-group"><summary>${key}</summary><div class="filter-options" id="filter-opts-${key}"></div></details>`;
        });
        filterContainer.innerHTML = filterHtml;

        ['科类', '办学性质', '本专科'].forEach(key => {
            const optsContainer = container.querySelector(`#filter-opts-${key}`);
            const dataSet = filters[key].data;
            optsContainer.innerHTML = Array.from(dataSet).sort().map(val => `<label><input type="checkbox" value="${val}">${val}</label>`).join('');
        });
        
        // Populate complex filters (placeholders for now, logic to be built)
        container.querySelector('#filter-opts-城市').innerHTML = `<p>城市筛选待开发</p>`;
        container.querySelector('#filter-opts-选科').innerHTML = `<p>选科筛选待开发</p>`;
        container.querySelector('#filter-opts-院校水平').innerHTML = `<p>院校水平筛选待开发</p>`;
    }
    
    function updatePasteButtonState() {
        let hasMajors = false;
        if (typeof window.getSharedSelectedMajors === 'function') {
            const selectedMajors = window.getSharedSelectedMajors();
            hasMajors = selectedMajors && selectedMajors.size > 0;
        }
        pasteButton.classList.toggle('disabled', !hasMajors);
    }

    pasteButton.addEventListener('click', () => {
        if (typeof window.getSharedSelectedMajors === 'function') {
            const selectedMajors = window.getSharedSelectedMajors();
            if (selectedMajors && selectedMajors.size > 0) {
                const names = Array.from(selectedMajors.values()).map(major => major['专业名']);
                majorSearchTextarea.value = names.join(' ');
            } else {
                alert('“专业目录”标签页中没有已选的专业。');
            }
        } else {
            alert('无法从“专业目录”获取数据，请先访问该标签页。');
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
            .then(res => {
                if (!res.ok) throw new Error(`查询API返回错误: ${res.status}`);
                return res.json();
            })
            .then(data => {
                if(data.error) throw new Error(data.error);
                treeContainer.innerHTML = `查询到 ${data.length} 条结果。 (下一步将实现树状图渲染)`;
            })
            .catch(err => {
                treeContainer.innerHTML = `<p style="color:red;">查询失败: ${err.message}</p>`;
            });
    });

    // --- Initial Setup ---
    fetchDataAndBuildFilters();
    
    // Check paste button state whenever this tab becomes active
    const observer = new MutationObserver(() => {
        if(container.classList.contains('active')) updatePasteButtonState();
    });
    observer.observe(container, { attributes: true, attributeFilter: ['class']});
    
    updatePasteButtonState();
}
