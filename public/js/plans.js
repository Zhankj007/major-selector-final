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
    const detailsContent = container.querySelector('#plans-details-content');
    const chartCanvas = container.querySelector('#plans-chart');
    const outputTextarea = container.querySelector('#plans-output-textarea');
    const copyButton = container.querySelector('#plans-copy-button');
    const clearButton = container.querySelector('#plans-clear-button');
    const selectionCounter = container.querySelector('#plans-selection-counter');
    
    let allPlansData = []; // This will hold the full dataset for building filters
    let lastQueryResults = []; // This holds the currently displayed data
    let selectedPlans = new Map();
    let chartInstance = null;
    const PLAN_ID_KEY = 'plan_id_key'; // A generated unique key for selection

    async function initialize() {
        treeContainer.innerHTML = '<p>正在加载初始化数据...</p>';
        try {
            // Fetch ALL data once to build the filters. API should not limit this initial call.
            const response = await fetch('/api/getPlans'); 
            if (!response.ok) throw new Error('无法获取初始化数据');
            allPlansData = await response.json();
            if(!allPlansData.length) throw new Error('初始化数据为空');
            
            // Create a unique ID for each plan for the selection Map
            allPlansData.forEach((plan, index) => {
                plan[PLAN_ID_KEY] = `${plan['院校代码']}-${plan['专业代码']}-${plan['科类']}-${plan['批次']}-${index}`;
            });
            
            buildFilterUI();
            updatePasteButtonState();
            treeContainer.innerHTML = '<p>请设置筛选条件后，点击“查询”。</p>';
        } catch (error) {
            console.error(error);
            treeContainer.innerHTML = `<p style="color:red">初始化失败: ${error.message}</p>`;
        }
    }

    function buildFilterUI() {
        const filters = {
            '科类': { data: new Set() }, '城市': { type: 'complex_city' }, '选科': { type: 'complex_subject' },
            '院校水平': { type: 'custom_level' }, '办学性质': { data: new Set() }, '本专科': { data: new Set() },
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
            optsContainer.innerHTML = Array.from(dataSet).sort().map(val => `<label><input type="checkbox" value="${val}" data-filter-key="${key}">${val}</label>`).join('');
        });
        
        // Populate complex/custom filters...
        const cityTiers = new Set(allPlansData.map(p=>p['城市评级']).filter(Boolean));
        let cityHtml = '<div><strong>城市评级:</strong><div class="filter-options-subgroup">' + Array.from(cityTiers).sort().map(val => `<label><input type="checkbox" value="${val}" data-filter-key="城市评级">${val}</label>`).join('') + '</div></div>';
        container.querySelector('#filter-opts-城市').innerHTML = cityHtml;

        container.querySelector('#filter-opts-选科').innerHTML = `<p>选科筛选待开发</p>`;

        const levelOptions = ['985','211','双一流大学','基础学科拔尖','保研资格','(省重点建设高校)','(省市共建重点高校)','中外合作办学'];
        container.querySelector('#filter-opts-院校水平').innerHTML = levelOptions.map(val => `<label><input type="checkbox" value="${val}" data-filter-key="院校水平">${val}</label>`).join('');
    }
    
    function runQuery() {
        const uniKeyword = uniSearchInput.value.trim();
        const majorKeywords = majorSearchTextarea.value.trim().split(/\s+/).filter(Boolean);
        
        const params = new URLSearchParams();
        if (uniKeyword) params.append('uniKeyword', uniKeyword);
        if (majorKeywords.length) params.append('majorKeywords', majorKeywords.join(','));

        // Gather filter values
        container.querySelectorAll('#plans-filters-container input:checked').forEach(cb => {
            const key = cb.dataset.filterKey;
            if (key) {
                // For keys that can have multiple values, append them
                if (params.has(key)) {
                    params.set(key, params.get(key) + ',' + cb.value);
                } else {
                    params.append(key, cb.value);
                }
            }
        });

        treeContainer.innerHTML = `<p>正在根据您的条件查询，请稍候...</p>`;
        fetch(`/api/getPlans?${params.toString()}`)
            .then(res => {
                if (!res.ok) return res.json().then(err => { throw new Error(err.error || `查询API返回错误: ${res.status}`) });
                return res.json();
            })
            .then(data => {
                lastQueryResults = data;
                treeContainer.innerHTML = `查询到 ${data.length} 条结果。下一步将实现渲染。`;
                // In next phase, we call render functions here
            })
            .catch(err => {
                treeContainer.innerHTML = `<p style="color:red;">查询失败: ${err.message}</p>`;
            });
    }
    
    function updatePasteButtonState() {
        let hasMajors = false;
        if (typeof window.getSharedSelectedMajors === 'function') {
            const majors = window.getSharedSelectedMajors();
            hasMajors = majors && majors.size > 0;
        }
        pasteButton.classList.toggle('disabled', !hasMajors);
    }

    pasteButton.addEventListener('click', () => {
        if (typeof window.getSharedSelectedMajors === 'function') {
            const majors = window.getSharedSelectedMajors();
            if (majors && majors.size > 0) {
                const names = Array.from(majors.values()).map(major => major['专业名']);
                majorSearchTextarea.value = names.join(' ');
            } else { alert('“专业目录”标签页中没有已选的专业。'); }
        } else { alert('无法从“专业目录”获取数据，请先访问该标签页。'); }
    });

    queryButton.addEventListener('click', runQuery);
    
    // Initial Setup
    initialize();
    updateOutputUI(); // To set initial button states

    function updateOutputUI(){
        // Dummy function for now
        copyButton.classList.add('disabled');
        clearButton.classList.add('disabled');
    }
}
