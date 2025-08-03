window.initializePlansTab = function() {
    const plansTab = document.getElementById('plans-tab');
    if (!plansTab || plansTab.dataset.initialized) return;
    plansTab.dataset.initialized = 'true';

    // 1. 注入HTML结构
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
                <div id="plan-details-content" class="plan-details-section"><h3>计划详情</h3><div class="content-placeholder"><p>在此显示选中项的具体招生计划信息。</p></div></div>
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
                            <div id="intended-cities-list" style="padding: 8px; border: 1px solid var(--border-color); border-radius: 5px; overflow-y: auto; background-color: white; font-size: 13px; flex-grow: 1;">
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

    // --- 2. 获取DOM元素引用 ---
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
    
    // --- 3. 状态与数据管理 ---
    let allFilterOptions = {};

    // --- 4. 核心功能函数 ---

    async function populateFilters() {
        try {
            const response = await fetch('/api/getPlanFilterOptions');
            if (!response.ok) { throw new Error(`网络错误: ${response.status} ${response.statusText}`); }
            allFilterOptions = await response.json();
            if (allFilterOptions.error) { throw new Error(allFilterOptions.error); }

            const planTypeContainer = plansTab.querySelector('#filter-plan-type .filter-options');
            planTypeContainer.innerHTML = allFilterOptions.planTypes.map(o => `<label><input type="checkbox" name="planType" value="${o}"> ${o}</label>`).join('');
            
            populateCityFilter();
            
            const subjectContainer = plansTab.querySelector('#filter-subject .filter-options');
            let subjectHtml = '';
            for (const category in allFilterOptions.subjectTree) {
                subjectHtml += `<li><label><input type="checkbox" class="parent-checkbox"> <span class="caret tree-label">${category}</span></label><ul class="nested">`;
                subjectHtml += allFilterOptions.subjectTree[category].map(req => `<li><label><input type="checkbox" name="subjectReq" value="${req}"> ${req}</label></li>`).join('');
                subjectHtml += `</ul></li>`;
            }
            subjectContainer.innerHTML = `<ul>${subjectHtml}</ul>`;
            
            plansTab.querySelector('#filter-uni-level .filter-options').innerHTML = '此功能下一步实现';
            
            const ownershipContainer = plansTab.querySelector('#filter-ownership .filter-options');
            ownershipContainer.innerHTML = allFilterOptions.ownerships.map(o => `<label><input type="checkbox" name="ownership" value="${o}"> ${o}</label>`).join('');
            
            const eduLevelContainer = plansTab.querySelector('#filter-edu-level .filter-options');
            eduLevelContainer.innerHTML = allFilterOptions.eduLevels.map(o => `<label><input type="checkbox" name="eduLevel" value="${o}"> ${o}</label>`).join('');
        } catch (error) {
            console.error("填充筛选器失败:", error);
            filterContainer.innerHTML = `<p style="color:red;">筛选器加载失败: ${error.message}</p>`;
        }
    }
    
    function populateCityFilter() {
        const container = plansTab.querySelector('#filter-city .filter-options');
        if (!allFilterOptions.provinceCityTree) {
            container.innerHTML = `<p style="color:red;">城市数据加载不完整。</p>`;
            return;
        }
        
        let cityHtml = '<ul id="province-city-tree">';
        const sortedProvinces = Object.keys(allFilterOptions.provinceCityTree).sort((a, b) => {
            const provinceA = allFilterOptions.provinceCityTree[a];
            const provinceB = allFilterOptions.provinceCityTree[b];
            if (!provinceA.code && !provinceB.code) return a.localeCompare(b, 'zh-CN');
            return (provinceA.code || Infinity) - (provinceB.code || Infinity);
        });

        for (const province of sortedProvinces) {
            const provinceData = allFilterOptions.provinceCityTree[province];
            const sortedCities = provinceData.cities.sort((a, b) => {
                if (!a.code && !b.code) return a.name.localeCompare(b.name, 'zh-CN');
                return (a.code || Infinity) - (b.code || Infinity);
            });
            cityHtml += `<li><label><input type="checkbox" class="parent-checkbox"> <span class="caret tree-label">${province}</span></label><ul class="nested">`;
            cityHtml += sortedCities.map(city => `<li><label><input type="checkbox" name="city" value="${city.name}"> ${city.name} <small style="color:#888;">(${city.tier})</small></label></li>`).join('');
            cityHtml += `</ul></li>`;
        }
        cityHtml += '</ul>';
        container.innerHTML = cityHtml;
    }

    async function executeQuery() {
        console.log("查询功能待实现...");
    }

    function updatePlanOutputButtonsState() {
        const hasContent = planOutputTextarea.value.length > 0;
        planCopyButton.classList.toggle('disabled', !hasContent);
        planClearButton.classList.toggle('disabled', !hasContent);
    }
    
    function updateCopyMajorButtonState() {
        const majorOutputTextarea = document.querySelector('#major-output-textarea');
        const hasContent = majorOutputTextarea && majorOutputTextarea.value.length > 0;
        copyMajorButton.classList.toggle('disabled', !hasContent);
    }

    function updateIntendedCities() {
        if (!cityFilterGroup) return;
        const checkedCityCheckboxes = Array.from(cityFilterGroup.querySelectorAll('input[name="city"]:checked'));
        const cityNames = checkedCityCheckboxes.map(cb => cb.value);

        if (cityNames.length > 0) {
            intendedCitiesList.innerHTML = `<ul style="padding-left: 15px; margin: 0;">${cityNames.map(name => `<li style="padding: 2px 0;">${name}</li>`).join('')}</ul>`;
            clearCitiesButton.classList.remove('disabled');
        } else {
            intendedCitiesList.innerHTML = '';
            clearCitiesButton.classList.add('disabled');
        }
    }

    // --- 5. 事件绑定与初始化 ---

    // **已修复拼写错误**
    planOutputTextarea.addEventListener('input', updatePlanOutputButtonsState);
    setInterval(updateCopyMajorButtonState, 500);

    copyMajorButton.addEventListener('click', () => {
        const majorOutputTextarea = document.querySelector('#major-output-textarea');
        if (majorOutputTextarea && majorOutputTextarea.value) {
            majorSearchInput.value = majorOutputTextarea.value;
            majorSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
    
    queryButton.addEventListener('click', executeQuery);
    
    filterContainer.addEventListener('click', e => {
        if (e.target.classList.contains('tree-label')) {
            e.preventDefault();
            e.target.closest('li').querySelector('.nested')?.classList.toggle('active');
            e.target.classList.toggle('caret-down');
        }
    });

    filterContainer.addEventListener('change', e => {
        if (e.target.classList.contains('parent-checkbox')) {
            const isChecked = e.target.checked;
            e.target.closest('li').querySelectorAll('ul input[type="checkbox"]').forEach(child => {
                child.checked = isChecked;
            });
        }
        filterContainer.querySelectorAll('.filter-group').forEach(group => {
            const hasSelection = group.querySelector('input:checked');
            group.querySelector('summary').classList.toggle('filter-active', !!hasSelection);
        });
        if (e.target.closest('#filter-city')) {
            updateIntendedCities();
        }
    });

    clearCitiesButton.addEventListener('click', () => {
        if (!cityFilterGroup) return;
        cityFilterGroup.querySelectorAll('input[name="city"]:checked, input.parent-checkbox:checked').forEach(cb => {
            cb.checked = false;
        });
        cityFilterGroup.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // 初始化
    populateFilters();
    updatePlanOutputButtonsState();
    updateCopyMajorButtonState();
    updateIntendedCities();
};
