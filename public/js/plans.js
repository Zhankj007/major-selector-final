window.initializePlansTab = function() {
    const plansTab = document.getElementById('plans-tab');
    if (!plansTab || plansTab.dataset.initialized) return;
    plansTab.dataset.initialized = 'true';

    // 1. 注入完整的HTML结构
    plansTab.innerHTML = `
        <div class="app-container" id="app-container-plans">
            <div class="left-panel">
                <div class="plan-filters">
                    <details class="filter-group" id="filter-plan-type">
                        <summary>科类</summary>
                        <div class="filter-options"><p>加载中...</p></div>
                    </details>
                    <details class="filter-group" id="filter-city">
                        <summary>城市</summary>
                        <div class="filter-options"><p>加载中...</p></div>
                    </details>
                    <details class="filter-group" id="filter-subject">
                        <summary>选科</summary>
                        <div class="filter-options"><p>加载中...</p></div>
                    </details>
                    <details class="filter-group" id="filter-uni-level">
                        <summary>院校水平</summary>
                        <div class="filter-options"><p>...</p></div>
                    </details>
                     <details class="filter-group" id="filter-ownership">
                        <summary>办学性质</summary>
                        <div class="filter-options"><p>加载中...</p></div>
                    </details>
                     <details class="filter-group" id="filter-edu-level">
                        <summary>本专科</summary>
                        <div class="filter-options"><p>加载中...</p></div>
                    </details>
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
                             <input type="radio" name="view-mode" value="tree" id="view-tree" checked>
                             <label for="view-tree">树状</label>
                             <input type="radio" name="view-mode" value="list" id="view-list">
                             <label for="view-list">列表</label>
                        </div>
                    </div>
                </div>

                <div id="plan-tree-container" class="major-tree-container">
                    <p>请设置筛选条件后, 点击“查询”。</p>
                </div>
            </div>

            <div class="right-panel">
                <div id="plan-details-content" class="plan-details-section">
                    <h3>计划详情</h3>
                    <div class="content-placeholder"><p>在此显示选中项的具体招生计划信息。</p></div>
                </div>
                <div id="plan-chart-area" class="plan-chart-section">
                    <h3>图表展示</h3>
                    <div class="content-placeholder"><p>在此根据查询结果生成图表。</p></div>
                </div>
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
    const filterContainer = plansTab.querySelector('.plan-filters');
    const resultsContainer = plansTab.querySelector('#plan-tree-container');
    const planOutputTextarea = plansTab.querySelector('#plan-output-textarea');
    const planCopyButton = plansTab.querySelector('#plan-copy-button');
    const planClearButton = plansTab.querySelector('#plan-clear-button');

    // --- 3. 状态与数据管理 ---
    let allFilterOptions = {};

    // --- 4. 核心功能函数 ---

    async function populateFilters() {
        try {
            const response = await fetch('/api/getPlanFilterOptions');
            if (!response.ok) throw new Error(`网络错误: ${response.statusText}`);
            allFilterOptions = await response.json();

            // 1. 填充“科类”
            const planTypeContainer = plansTab.querySelector('#filter-plan-type .filter-options');
            planTypeContainer.innerHTML = allFilterOptions.planTypes.map(o => `<label><input type="checkbox" name="planType" value="${o}"> ${o}</label>`).join('');

            // 2. 填充“城市”
            populateCityFilter();

            // 3. 填充“选科”
            const subjectContainer = plansTab.querySelector('#filter-subject .filter-options');
            let subjectHtml = '';
            for (const category in allFilterOptions.subjectTree) {
                subjectHtml += `<li><label><input type="checkbox" class="parent-checkbox"> <span class="caret tree-label">${category}</span></label><ul class="nested active">`;
                subjectHtml += allFilterOptions.subjectTree[category].map(req => `<li><label><input type="checkbox" name="subjectReq" value="${req}"> ${req}</label></li>`).join('');
                subjectHtml += `</ul></li>`;
            }
            subjectContainer.innerHTML = `<ul>${subjectHtml}</ul>`;

            // 4. 填充“院校水平”（硬编码）
            const uniLevelContainer = plansTab.querySelector('#filter-uni-level .filter-options');
            uniLevelContainer.innerHTML = '此功能下一步实现';


            // 5. 填充“办学性质”
            const ownershipContainer = plansTab.querySelector('#filter-ownership .filter-options');
            ownershipContainer.innerHTML = allFilterOptions.ownerships.map(o => `<label><input type="checkbox" name="ownership" value="${o}"> ${o}</label>`).join('');

            // 6. 填充“本专科”
            const eduLevelContainer = plansTab.querySelector('#filter-edu-level .filter-options');
            eduLevelContainer.innerHTML = allFilterOptions.eduLevels.map(o => `<label><input type="checkbox" name="eduLevel" value="${o}"> ${o}</label>`).join('');

        } catch (error) {
            console.error("填充筛选器失败:", error);
            filterContainer.innerHTML = `<p style="color:red;">筛选器加载失败: ${error.message}</p>`;
        }
    }
    
    function populateCityFilter() {
        const container = plansTab.querySelector('#filter-city .filter-options');
        const cityTierOrder = allFilterOptions.cityTiers;
        
        let cityHtml = '<div><strong>城市评级:</strong><div id="city-tier-filter" class="filter-options-group">';
        cityHtml += cityTierOrder.map(tier => `<label><input type="checkbox" name="cityTier" value="${tier}" checked> ${tier}</label>`).join('');
        cityHtml += '</div></div><hr><div><strong>省份/城市:</strong><ul id="province-city-tree">';

        const sortedProvinces = Object.keys(allFilterOptions.provinceCityTree).sort((a, b) => a.localeCompare(b, 'zh-CN'));

        for (const province of sortedProvinces) {
            const provinceData = allFilterOptions.provinceCityTree[province];
            const tiers_str = Array.from(provinceData.tier).join(',');
            
            const sortedCities = provinceData.cities.sort((a, b) => {
                const tierIndexA = cityTierOrder.indexOf(a.tier);
                const tierIndexB = cityTierOrder.indexOf(b.tier);
                if (tierIndexA !== -1 && tierIndexB === -1) return -1;
                if (tierIndexA === -1 && tierIndexB !== -1) return 1;
                if (tierIndexA !== tierIndexB) return tierIndexA - tierIndexB;
                return a.name.localeCompare(b.name, 'zh-CN');
            });

            cityHtml += `<li data-province-tiers="${tiers_str}"><label><input type="checkbox" class="parent-checkbox"> <span class="caret tree-label">${province}</span></label><ul class="nested active">`;
            cityHtml += sortedCities.map(city => `<li><label><input type="checkbox" name="city" value="${city.name}"> ${city.name} <small style="color:#888;">(${city.tier || '其他'})</small></label></li>`).join('');
            cityHtml += `</ul></li>`;
        }
        cityHtml += '</ul></div>';
        container.innerHTML = cityHtml;

        container.querySelector('#city-tier-filter').addEventListener('change', () => {
            const checkedTiers = new Set(
                Array.from(container.querySelectorAll('input[name="cityTier"]:checked')).map(cb => cb.value)
            );
            container.querySelectorAll('#province-city-tree > li').forEach(li => {
                const provinceTiers = li.dataset.provinceTiers.split(',');
                const isVisible = provinceTiers.some(t => checkedTiers.has(t));
                li.style.display = isVisible ? '' : 'none';
            });
        });
    }

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
            
            console.log('查询成功，获取数据:', data);
            resultsContainer.innerHTML = `<p>查询到 ${data.length} 条结果。下一步将在此处渲染结果。</p>`;
        } catch (error) {
            console.error("查询执行失败:", error);
            resultsContainer.innerHTML = `<p style="color:red;">查询失败: ${error.message}</p>`;
        }
    }

    // --- 5. 事件绑定与初始化 ---
    function updatePlanOutputButtonsState() { /* ... */ }
    function updateCopyMajorButtonState() { /* ... */ }
    // 省略部分无变化的事件监听代码
    planOutputTextarea.addEventListener('input', updatePlanOutputButtonsState);
    setInterval(updateCopyMajorButtonState, 500);
    copyMajorButton.addEventListener('click', () => { /* ... */ });
    queryButton.addEventListener('click', executeQuery);
    
    filterContainer.addEventListener('click', e => {
        if (e.target.classList.contains('tree-label')) {
            const parentLi = e.target.closest('li');
            parentLi.querySelector('.nested')?.classList.toggle('active');
            e.target.classList.toggle('caret-down');
        } else if (e.target.classList.contains('parent-checkbox')) {
             const parentLi = e.target.closest('li');
             const isChecked = e.target.checked;
             parentLi.querySelectorAll('ul input[type="checkbox"]').forEach(child => child.checked = isChecked);
        }
    });

    filterContainer.addEventListener('change', () => {
        filterContainer.querySelectorAll('.filter-group').forEach(group => {
            const hasSelection = group.querySelector('input:checked');
            group.querySelector('summary').classList.toggle('filter-active', !!hasSelection);
        });
    });

    // 初始化
    populateFilters();
    updatePlanOutputButtonsState();
    updateCopyMajorButtonState();
};
