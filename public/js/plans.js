window.initializePlansTab = function() {
    const plansTab = document.getElementById('plans-tab');
    if (!plansTab || plansTab.dataset.initialized) return;
    plansTab.dataset.initialized = 'true';
    plansTab.innerHTML = `
        <div class="app-container" id="app-container-plans">
            <div class="left-panel">
                <div class="plan-filters">
                    <details class="filter-group" id="filter-plan-type"><summary>科类</summary><div class="filter-options"><p>加载中...</p></div></details>
                    <details class="filter-group" id="filter-city"><summary>城市</summary><div class="filter-options"><p>加载中...</p></div></details>
                    <details class="filter-group" id="filter-subject"><summary>选科</summary><div class="filter-options"><p>加载中...</p></div></details>
                    <details class="filter-group" id="filter-uni-level"><summary>院校水平</summary><div class="filter-options"><p>...</p></div></details>
                    <details class="filter-group" id="filter-ownership"><summary>办学性质</summary><div class="filter-options"><p>加载中...</p></div></details>
                    <details class="filter-group" id="filter-edu-level"><summary>本专科</summary><div class="filter-options"><p>加载中...</p></div></details>
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
                <div id="plan-details-content" class="plan-details-section"><h3>计划详情</h3><div class="content-placeholder"><p>请在左侧查询并选择一个专业...</p></div></div>
                <div id="plan-chart-area" class="plan-chart-section"><h3>图表展示</h3><div class="content-placeholder"><p>在此根据查询结果生成图表。</p></div></div>
                <div id="plan-output-container" class="output-container">
                    <div style="display: flex; gap: 15px; height: 100%;">
                        <div style="flex: 2; display: flex; flex-direction: column;">
                            <div class="output-header">
                                <h3>意向城市</h3>
                                <div class="button-group">
                                    <button id="plan-clear-cities-button" class="output-button">清空</button>
                                </div>
                            </div>
                            <div id="intended-cities-list" style="padding: 8px; border: 1px solid var(--border-color); border-radius: 5px; overflow-y: auto; background-color: white; font-size: 13px; flex-grow: 1; line-height: 1.6;">
                            </div>
                        </div>
                        <div style="flex: 8; display: flex; flex-direction: column;">
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
            </div>
        </div>
    `;

    const uniSearchInput = plansTab.querySelector('#plan-uni-search');
    const majorSearchInput = plansTab.querySelector('#plan-major-search');
    const copyMajorButton = plansTab.querySelector('#plan-copy-selected-button');
    const queryButton = plansTab.querySelector('#plan-query-button');
    const filterContainer = plansTab.querySelector('.plan-filters');
    const resultsContainer = plansTab.querySelector('#plan-tree-container');
    const planOutputTextarea = plansTab.querySelector('#plan-output-textarea');
    const planCopyButton = plansTab.querySelector('#plan-copy-button');
    const planClearButton = plansTab.querySelector('#plan-clear-button');
    const intendedCitiesList = plansTab.querySelector('#intended-cities-list');
    const clearCitiesButton = plansTab.querySelector('#plan-clear-cities-button');
    const cityFilterGroup = plansTab.querySelector('#filter-city');
    const viewModeSwitcher = plansTab.querySelector('input[name="view-mode"]')?.parentElement;
    const detailsContent = plansTab.querySelector('#plan-details-content');

    let allFilterOptions = {};
    let lastQueryData = []; // 保存上一次查询结果，用于视图切换
    let selectedPlans = new Map(); // 保存勾选的计划

    async function populateFilters() { /* ... */ } // 省略
    function populateCityFilter() { /* ... */ } // 省略

    async function executeQuery() {
        resultsContainer.innerHTML = '<p>正在查询中，请稍候...</p>';
        const params = new URLSearchParams();
        const getCheckedValues = (name) => Array.from(plansTab.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);

        if (uniSearchInput.value.trim()) params.append('uniKeyword', uniSearchInput.value.trim());
        const majorKeywords = majorSearchInput.value.trim().split(/\s+/).filter(Boolean);
        if (majorKeywords.length > 0) params.append('majorKeywords', majorKeywords.join(','));
        const planTypes = getCheckedValues('planType');
        if (planTypes.length > 0) params.append('planTypes', planTypes.join(','));
        const cities = getCheckedValues('city');
        if (cities.length > 0) params.append('cities', cities.join(','));
        const subjectReqs = getCheckedValues('subjectReq');
        if (subjectReqs.length > 0) params.append('subjectReqs', subjectReqs.join(','));
        const uniLevels = getCheckedValues('uniLevel');
        if (uniLevels.length > 0) params.append('uniLevels', uniLevels.join(','));
        const ownerships = getCheckedValues('ownership');
        if (ownerships.length > 0) params.append('ownerships', ownerships.join(','));
        const eduLevels = getCheckedValues('eduLevel');
        if (eduLevels.length > 0) params.append('eduLevels', eduLevels.join(','));

        try {
            const response = await fetch(`/api/getPlans?${params.toString()}`);
            if (!response.ok) throw new Error(`查询失败: ${response.statusText}`);
            const data = await response.json();
            lastQueryData = data; // 保存数据
            renderResults(); // 渲染结果
        } catch (error) {
            console.error("查询执行失败:", error);
            resultsContainer.innerHTML = `<p style="color:red;">查询失败: ${error.message}</p>`;
        }
    }

    function renderResults() {
        const viewMode = viewModeSwitcher.querySelector('input:checked').value;
        if (viewMode === 'tree') {
            renderTreeView(lastQueryData);
        } else {
            renderListView(lastQueryData);
        }
    }

    function renderTreeView(data) {
        if (!data || data.length === 0) {
            resultsContainer.innerHTML = '<p>没有找到符合条件的记录。</p>';
            return;
        }
        // 1. 排序
        const sortedData = [...data].sort((a, b) => {
            const codeA = `${a.院校代码 || ''}-${a.专业代码 || ''}`;
            const codeB = `${b.院校代码 || ''}-${b.专业代码 || ''}`;
            return codeA.localeCompare(codeB);
        });
        // 2. 构建层级
        const hierarchy = sortedData.reduce((acc, plan) => {
            const province = plan.省份 || '其他';
            const uniName = plan.院校名称 || '未知院校';
            if (!acc[province]) acc[province] = {};
            if (!acc[province][uniName]) acc[province][uniName] = [];
            acc[province][uniName].push(plan);
            return acc;
        }, {});
        // 3. 渲染HTML
        let html = '<ul id="result-tree">';
        for (const province in hierarchy) {
            html += `<li><input type="checkbox"><span class="caret tree-label">${province}</span><ul class="nested active">`;
            for (const uniName in hierarchy[province]) {
                html += `<li><input type="checkbox"><span class="caret tree-label">${uniName}</span><ul class="nested active">`;
                hierarchy[province][uniName].forEach(plan => {
                    const id = `${plan.院校代码}-${plan.专业代码}`;
                    const details = `【${plan.学费 || 'N/A'}|${plan['25年选科要求'] || 'N/A'}|${plan['25年分数线'] || 'N/A'}|${plan['25年位次号'] || 'N/A'}】`;
                    const planData = btoa(encodeURIComponent(JSON.stringify(plan)));
                    html += `<li data-plan="${planData}"><input type="checkbox" value="${id}" ${selectedPlans.has(id) ? 'checked' : ''}><span class="major-label">${plan.专业名称} ${details}</span></li>`;
                });
                html += `</ul></li>`;
            }
            html += `</ul></li>`;
        }
        html += '</ul>';
        resultsContainer.innerHTML = html;
    }

    function renderListView(data) {
        if (!data || data.length === 0) {
            resultsContainer.innerHTML = '<p>没有找到符合条件的记录。</p>';
            return;
        }
        // 1. 排序
        const sortedData = [...data].sort((a, b) => {
            const rankA = parseInt(a['25年位次号'], 10) || Infinity;
            const rankB = parseInt(b['25年位次号'], 10) || Infinity;
            return rankA - rankB; // 从低到高，不是从高到低，方便查看
        });
        // 2. 渲染HTML
        let html = '<div class="plan-list-view">';
        html += `<div class="list-header"><div class="list-row">
            <div class="list-cell">选择</div>
            <div class="list-cell">院校</div>
            <div class="list-cell">专业</div>
            <div class="list-cell">省份</div>
            <div class="list-cell">城市</div>
            <div class="list-cell">学费</div>
            <div class="list-cell">选科要求</div>
            <div class="list-cell">分数线(25)</div>
            <div class="list-cell">位次号(25)</div>
        </div></div>`;
        sortedData.forEach(plan => {
            const id = `${plan.院校代码}-${plan.专业代码}`;
            const planData = btoa(encodeURIComponent(JSON.stringify(plan)));
            html += `<div class="list-row" data-plan="${planData}">
                <div class="list-cell"><input type="checkbox" value="${id}" ${selectedPlans.has(id) ? 'checked' : ''}></div>
                <div class="list-cell">${plan.院校名称 || ''}</div>
                <div class="list-cell major-label">${plan.专业名称 || ''}</div>
                <div class="list-cell">${plan.省份 || ''}</div>
                <div class="list-cell">${plan.城市 || ''}</div>
                <div class="list-cell">${plan.学费 || ''}</div>
                <div class="list-cell">${plan['25年选科要求'] || ''}</div>
                <div class="list-cell">${plan['25年分数线'] || ''}</div>
                <div class="list-cell">${plan['25年位次号'] || ''}</div>
            </div>`;
        });
        html += '</div>';
        resultsContainer.innerHTML = html;
    }

    function showPlanDetails(plan) {
        if (!plan) {
            detailsContent.innerHTML = '<h3>计划详情</h3><div class="content-placeholder"><p>请在左侧查询并选择一个专业...</p></div>';
            return;
        }
        let html = `<h3>${plan.院校名称} - ${plan.专业名称}</h3>`;
        
        const renderRow = (label, value) => {
            if (!value) return '';
            if (String(value).startsWith('http')) {
                value = `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
            }
            return `<div class="detail-row"><span class="detail-label">${label}:</span><span class="detail-value">${value}</span></div>`;
        }

        const renderYearlyData = (year) => {
            const yearStr = String(year).slice(-2);
            const planCount = plan[`${yearStr}年计划数`];
            const score = plan[`${yearStr}年分数线`];
            const rank = plan[`${yearStr}年位次号`];
            const avgScore = plan[`${yearStr}年平均分`];
            if (!planCount && !score && !rank && !avgScore) return '';
            let content = `【${planCount || 'N/A'}人 | ${score || 'N/A'}分 | ${rank || 'N/A'}位次 | 平均${avgScore || 'N/A'}分】`;
            return renderRow(`${yearStr}年投档`, content);
        };
        
        html += `<div class="detail-group"><h4>基本信息</h4>
            ${renderRow('院校代码', plan.院校代码)}
            ${renderRow('专业代码', plan.专业代码)}
            ${renderRow('省份城市', `${plan.省份 || ''} ${plan.城市 || ''}`)}
            ${renderRow('科类批次', `${plan.科类 || ''} ${plan.批次 || ''}`)}
            ${renderRow('选科要求', plan['25年选科要求'])}
            ${renderRow('学制', plan.学制)}
            ${renderRow('学费', plan.学费)}
            ${renderRow('办学性质', plan.办学性质)}
        </div>`;
        
        html += `<div class="detail-group"><h4>历年情况</h4>
            ${renderYearlyData('25')}
            ${renderYearlyData('24')}
            ${renderYearlyData('23')}
            ${renderYearlyData('22')}
        </div>`;
        
        html += `<div class="detail-group"><h4>院校信息</h4>
            ${renderRow('院校水平', plan.院校水平)}
            ${renderRow('院校类型', plan.院校类型)}
            ${renderRow('软科排名', plan.软科校排名)}
            ${renderRow('主管部门', plan.主管部门)}
        </div>`;
        
        detailsContent.innerHTML = html;
    }

    function handlePlanSelectionChange(checkbox) {
        const id = checkbox.value;
        if (checkbox.checked) {
            const planData = checkbox.closest('[data-plan]').dataset.plan;
            const plan = JSON.parse(decodeURIComponent(atob(planData)));
            selectedPlans.set(id, plan);
        } else {
            selectedPlans.delete(id);
        }
        updatePlanOutputUI();
    }

    function updatePlanOutputUI() {
        const text = Array.from(selectedPlans.values()).map(p => `${p.院校名称} ${p.专业名称}`).join('\n');
        planOutputTextarea.value = text;
        const hasSelection = selectedPlans.size > 0;
        planCopyButton.classList.toggle('disabled', !hasSelection);
        planClearButton.classList.toggle('disabled', !hasSelection);
    }

    // --- Event Listeners ---
    queryButton.addEventListener('click', executeQuery);
    viewModeSwitcher.addEventListener('change', renderResults);
    
    resultsContainer.addEventListener('change', e => {
        if (e.target.type === 'checkbox') {
            handlePlanSelectionChange(e.target);
            // 同步其他视图的复选框
            const value = e.target.value;
            resultsContainer.querySelectorAll(`input[value="${value}"]`).forEach(cb => cb.checked = e.target.checked);
        }
    });

    resultsContainer.addEventListener('mouseover', e => {
        const target = e.target.closest('[data-plan]');
        if (target && target.dataset.plan) {
            const plan = JSON.parse(decodeURIComponent(atob(target.dataset.plan)));
            showPlanDetails(plan);
        }
    });

    planClearButton.addEventListener('click', () => {
        selectedPlans.clear();
        updatePlanOutputUI();
        renderResults(); // 重新渲染以更新复选框
    });

    planCopyButton.addEventListener('click', () => {
        if (!planOutputTextarea.value) return;
        navigator.clipboard.writeText(planOutputTextarea.value).then(() => {
            planCopyButton.textContent = '已复制!';
            setTimeout(() => { planCopyButton.textContent = '复制'; }, 1500);
        });
    });

    // ... (其他原有事件监听)
    
    // --- Initialization ---
    populateFilters();
    updatePlanOutputUI();
};
