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
                <div id="query-results-message"></div>
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
    const resultsMessage = plansTab.querySelector('#query-results-message');

    let allFilterOptions = {};
    let lastQueryData = [];
    let selectedPlans = new Map();

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
            
            const uniLevelContainer = plansTab.querySelector('#filter-uni-level .filter-options');
            const uniLevelOptions = [
                { value: 'level:/985/', text: '985工程' },
                { value: 'level:/211/', text: '211工程' },
                { value: 'level:/双一流大学/', text: '双一流大学' },
                { value: 'level:/基础学科拔尖/', text: '基础学科拔尖' },
                { value: 'level:/保研资格/', text: '保研资格' },
                { value: 'name:(省重点建设高校)|(省市共建重点高校)', text: '浙江省重点高校' },
                { value: 'owner:中外合作办学', text: '中外合作办学' },
                { value: 'special:other_undergrad', text: '非上述普通本科' },
                { value: 'level:高水平学校', text: '高水平学校(高职)' },
                { value: 'level:高水平专业群', text: '高水平专业群(高职)' },
            ];
            uniLevelContainer.innerHTML = uniLevelOptions.map(o => `<label><input type="checkbox" name="uniLevel" value="${o.value}"> ${o.text}</label>`).join('');
            
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
            container.innerHTML = `<p style="color:red;">城市数据加载不完整。</p>`; return;
        }
        let cityHtml = '<ul id="province-city-tree">';
        const sortedProvinces = Object.keys(allFilterOptions.provinceCityTree).sort((a, b) => {
            const provinceA = allFilterOptions.provinceCityTree[a]; const provinceB = allFilterOptions.provinceCityTree[b];
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
        resultsContainer.innerHTML = '<p>正在查询中，请稍候...</p>';
        resultsMessage.textContent = '';
        const params = new URLSearchParams();
        const getCheckedValues = (name) => Array.from(plansTab.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
        if (uniSearchInput.value.trim()) params.append('uniKeyword', uniSearchInput.value.trim());
        const majorKeywords = majorSearchInput.value.trim().split(/\s+/).filter(Boolean);
        if (majorKeywords.length > 0) params.append('majorKeywords', majorKeywords.join(','));
        const planTypes = getCheckedValues('planType'); if (planTypes.length > 0) params.append('planTypes', planTypes.join(','));
        const cities = getCheckedValues('city'); if (cities.length > 0) params.append('cities', cities.join(','));
        const subjectReqs = getCheckedValues('subjectReq'); if (subjectReqs.length > 0) params.append('subjectReqs', subjectReqs.join(','));
        const uniLevels = getCheckedValues('uniLevel'); if (uniLevels.length > 0) params.append('uniLevels', uniLevels.join(','));
        const ownerships = getCheckedValues('ownership'); if (ownerships.length > 0) params.append('ownerships', ownerships.join(','));
        const eduLevels = getCheckedValues('eduLevel'); if (eduLevels.length > 0) params.append('eduLevels', eduLevels.join(','));
        const rangeType = rangeTypeSwitcher.querySelector('input:checked').value;
        const lowVal = rangeLowInput.value; const highVal = rangeHighInput.value;
        if (rangeType === 'score') {
            if (lowVal) params.append('scoreLow', lowVal);
            if (highVal) params.append('scoreHigh', highVal);
        } else {
            if (lowVal) params.append('rankLow', lowVal);
            if (highVal) params.append('rankHigh', highVal);
        }
        try {
            const response = await fetch(`/api/getPlans?${params.toString()}`);
            if (!response.ok) throw new Error(`查询失败: ${response.statusText}`);
            const { data, count } = await response.json();
            if (count > 1000) { resultsMessage.textContent = `符合检索条件记录${count}条，系统只展示前1000条，请适当增加条件或缩小范围。`; }
            else { resultsMessage.textContent = `符合检索条件记录${count}条`; }
            lastQueryData = data || [];
            renderResults();
        } catch (error) {
            console.error("查询执行失败:", error);
            resultsContainer.innerHTML = `<p style="color:red;">查询失败: ${error.message}</p>`;
        }
    }

    function renderResults() {
        const viewMode = viewModeSwitcher.querySelector('input:checked').value;
        if (viewMode === 'tree') renderTreeView(lastQueryData); else renderListView(lastQueryData);
    }
    function renderTreeView(data) { /* ... unchanged ... */ }
    function renderListView(data) { /* ... unchanged ... */ }
    function showPlanDetails(plan) { /* ... unchanged ... */ }
    function handlePlanSelectionChange(checkbox) { /* ... unchanged ... */ }
    function updatePlanOutputUI() { /* ... unchanged ... */ }

    function updateCopyMajorButtonState() {
        const majorOutputTextarea = document.querySelector('#major-output-textarea');
        const hasContent = majorOutputTextarea && majorOutputTextarea.value.length > 0;
        if (copyMajorButton) {
            copyMajorButton.classList.toggle('disabled', !hasContent);
        }
    }

    function updateIntendedCities() {
        if (!cityFilterGroup) return;
        const placeholderText = '<p style="color: #888; padding: 5px; margin:0;">您勾选的城市将按顺序在此显示。</p>';
        const checkedCityCheckboxes = Array.from(cityFilterGroup.querySelectorAll('input[name="city"]:checked'));
        const cityNames = checkedCityCheckboxes.map(cb => cb.value);
        if (cityNames.length > 0) {
            intendedCitiesList.innerHTML = cityNames.join(' ');
            clearCitiesButton.classList.remove('disabled');
        } else {
            intendedCitiesList.innerHTML = placeholderText;
            clearCitiesButton.classList.add('disabled');
        }
    }

    function updatePlanOutputButtonsState() {
        const hasContent = planOutputTextarea.value.length > 0;
        planCopyButton.classList.toggle('disabled', !hasContent);
        planClearButton.classList.toggle('disabled', !hasContent);
    }

    // --- Event Listeners & Initialization ---
    planOutputTextarea.addEventListener('input', updatePlanOutputButtonsState);
    copyMajorButton.addEventListener('click', () => {
        const majorOutputTextarea = document.querySelector('#major-output-textarea');
        if (majorOutputTextarea && majorOutputTextarea.value) {
            majorSearchInput.value = majorOutputTextarea.value;
            majorSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
    // Use a timeout to ensure the other tabs might have initialized, then start checking
    setTimeout(() => {
        updateCopyMajorButtonState();
        setInterval(updateCopyMajorButtonState, 500);
    }, 200);

    rangeTypeSwitcher.addEventListener('change', (e) => {
        if (e.target.value === 'score') {
            rangeLowInput.placeholder = '低分'; rangeHighInput.placeholder = '高分';
        } else {
            rangeLowInput.placeholder = '低位'; rangeHighInput.placeholder = '高位';
        }
    });

    queryButton.addEventListener('click', executeQuery);
    viewModeSwitcher.addEventListener('change', renderResults);
    resultsContainer.addEventListener('change', e => { /* ... unchanged ... */ });
    resultsContainer.addEventListener('click', e => { /* ... unchanged ... */ });
    resultsContainer.addEventListener('mouseover', e => { /* ... unchanged ... */ });
    planClearButton.addEventListener('click', () => { /* ... unchanged ... */ });
    planCopyButton.addEventListener('click', () => { /* ... unchanged ... */ });
    filterContainer.addEventListener('click', e => { /* ... unchanged ... */ });
    filterContainer.addEventListener('change', e => { /* ... unchanged ... */ });
    clearCitiesButton.addEventListener('click', () => { /* ... unchanged ... */ });
    
    populateFilters();
    updatePlanOutputUI();
    updateIntendedCities();
};
