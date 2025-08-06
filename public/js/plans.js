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
                    <details class="filter-group" id="filter-uni-level"><summary>水平</summary><div class="filter-options"><p>...</p></div></details>
                    <details class="filter-group" id="filter-ownership"><summary>性质</summary><div class="filter-options"><p>加载中...</p></div></details>
                    <details class="filter-group" id="filter-edu-level"><summary>层次</summary><div class="filter-options"><p>加载中...</p></div></details>
                    <details class="filter-group" id="filter-range"><summary>范围</summary><div class="filter-options">
                        <div class="switcher">
                            <input type="radio" name="range-type" value="score" id="range-score" checked><label for="range-score">成绩</label>
                            <input type="radio" name="range-type" value="rank" id="range-rank"><label for="range-rank">位次</label>
                        </div>
                        <div style="display: flex; gap: 5px; margin-top: 8px;">
                            <input type="number" id="range-low" placeholder="低分" style="width: 100px;">
                            <input type="number" id="range-high" placeholder="高分" style="width: 100px;">
                        </div>
                    </div></details>
                </div>
                <div class="plan-interactive-controls">
                    <div class="input-column">
                        <input type="text" id="plan-uni-search" placeholder="院校名称关键字">
                        <textarea id="plan-major-search" rows="2" placeholder="专业名称关键字 (可多个, 用空格分隔)"></textarea>
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
                            <div class="output-header"><h3>意向城市</h3><div class="button-group"><button id="plan-clear-cities-button" class="output-button">清空</button></div></div>
                            <div id="intended-cities-list" style="padding: 8px; border: 1px solid var(--border-color); border-radius: 5px; overflow-y: auto; background-color: white; font-size: 13px; flex-grow: 1; line-height: 1.6;">
                            </div>
                        </div>
                        <div style="flex: 8; display: flex; flex-direction: column;">
                            <div class="output-header"><h3>意向计划</h3><div class="button-group"><button id="plan-copy-button" class="output-button">复制</button><button id="plan-clear-button" class="output-button">清空</button></div></div>
                            <textarea id="plan-output-textarea" readonly placeholder="您勾选的专业将按选择顺序在此显示..."></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // --- DOM Element selections (no changes here) ---
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
    const rangeTypeSwitcher = plansTab.querySelector('input[name="range-type"]')?.parentElement;
    const rangeLowInput = plansTab.querySelector('#range-low');
    const rangeHighInput = plansTab.querySelector('#range-high');
    const rangeFilterGroup = plansTab.querySelector('#filter-range');
    
    let allFilterOptions = {};
    let lastQueryData = [];
    let selectedPlans = new Map();

    // --- populateFilters and other functions (no changes here) ---
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
                { value: 'level:/985', text: '985工程' }, { value: 'level:/211', text: '211工程' },
                { value: 'level:/双一流大学', text: '双一流大学' }, { value: 'level:/基础学科拔尖', text: '基础学科拔尖' },
                { value: 'level:/保研资格', text: '保研资格' }, { value: 'name:(省重点建设高校)|(省市共建重点高校)', text: '浙江省重点高校' },
                { value: 'owner:中外合作办学', text: '中外合作办学' }, { value: 'special:other_undergrad', text: '非上述普通本科' },
                { value: 'level:高水平学校', text: '高水平学校(高职)' }, { value: 'level:高水平专业群', text: '高水平专业群(高职)' },
            ];
            uniLevelContainer.innerHTML = uniLevelOptions.map(o => `<label><input type="checkbox" name="uniLevel" value="${o.value}"> ${o.text}</label>`).join('');
            const ownershipContainer = plansTab.querySelector('#filter-ownership .filter-options');
            ownershipContainer.innerHTML = allFilterOptions.ownerships.map(o => `<label><input type="checkbox" name="ownership" value="${o}"> ${o}</label>`).join('');
            const eduLevelContainer = plansTab.querySelector('#filter-edu-level .filter-options');
            eduLevelContainer.innerHTML = allFilterOptions.eduLevels.map(o => `<label><input type="checkbox" name="eduLevel" value="${o}"> ${o}</label>`).join('');
            filterContainer.querySelectorAll('.filter-group').forEach(group => {
                const details = group;
                details.addEventListener('mouseenter', () => { details.open = true; });
                details.addEventListener('mouseleave', () => { details.open = false; });
            });
        } catch (error) {
            console.error("填充筛选器失败:", error);
            filterContainer.innerHTML = `<p style="color:red;">筛选器加载失败: ${error.message}</p>`;
        }
    }
    
    function populateCityFilter() {
        const container = plansTab.querySelector('#filter-city .filter-options');
        if (!allFilterOptions.provinceCityTree) { container.innerHTML = `<p style="color:red;">城市数据加载不完整。</p>`; return; }
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
        if (viewMode === 'tree') renderTreeView(lastQueryData);
        else renderListView(lastQueryData);
    }

    function renderTreeView(data) {
        if (!data || data.length === 0) { resultsContainer.innerHTML = '<p>没有找到符合条件的记录。</p>'; return; }
        const sortedData = [...data].sort((a, b) => (`${a.院校代码 || ''}-${a.专业代码 || ''}`).localeCompare(`${b.院校代码 || ''}-${b.专业代码 || ''}`));
        const hierarchy = sortedData.reduce((acc, plan) => {
            const province = plan.省份 || '其他'; const uniName = plan.院校 || '未知院校';
            if (!acc[province]) acc[province] = {};
            if (!acc[province][uniName]) acc[province][uniName] = [];
            acc[province][uniName].push(plan);
            return acc;
        }, {});
        let html = '<ul id="result-tree">';
        for (const province in hierarchy) {
            html += `<li><input type="checkbox"><span class="caret tree-label">${province}</span><ul class="nested">`;
            for (const uniName in hierarchy[province]) {
                html += `<li><input type="checkbox"><span class="caret tree-label">${uniName}</span><ul class="nested">`;
                hierarchy[province][uniName].forEach(plan => {
                    const id = `${plan.院校代码}-${plan.专业代码}`;
                    const fee = plan.学费 ? `${plan.学费}元` : 'N/A';
                    const score = plan['25年分数线'] ? `${plan['25年分数线']}分` : 'N/A';
                    const rank = plan['25年位次号'] ? `${plan['25年位次号']}位` : 'N/A';
                    const details = `【${fee}|${plan['25年选科要求'] || 'N/A'}|${score}|${rank}】`;
                    const planData = btoa(encodeURIComponent(JSON.stringify(plan)));
                    html += `<li data-plan="${planData}"><input type="checkbox" value="${id}" ${selectedPlans.has(id) ? 'checked' : ''}><span class="major-label">${plan.专业} ${details}</span></li>`;
                });
                html += `</ul></li>`;
            }
            html += `</ul></li>`;
        }
        html += '</ul>';
        resultsContainer.innerHTML = html;
    }

    function renderListView(data) {
        if (!data || data.length === 0) { resultsContainer.innerHTML = '<p>没有找到符合条件的记录。</p>'; return; }
        const sortedData = [...data].sort((a, b) => (parseInt(a['25年位次号'], 10) || 0) - (parseInt(b['25年位次号'], 10) || 0));
        let html = '<div class="plan-list-view">';
        html += `<div class="list-header"><div class="list-row">
            <div class="list-cell col-select">选择</div><div class="list-cell col-uni-major">院校专业</div>
            <div class="list-cell">省份</div><div class="list-cell">城市</div>
            <div class="list-cell">学费</div><div class="list-cell">选科要求</div>
            <div class="list-cell">分数线</div><div class="list-cell">位次号</div>
            <div class="list-cell col-notes">专业简注</div>
        </div></div>`;
        html += '<div class="list-body">';
        sortedData.forEach(plan => {
            const id = `${plan.院校代码}-${plan.专业代码}`;
            const planData = btoa(encodeURIComponent(JSON.stringify(plan)));
            html += `<div class="list-row" data-plan="${planData}">
                <div class="list-cell col-select"><input type="checkbox" value="${id}" ${selectedPlans.has(id) ? 'checked' : ''}></div>
                <div class="list-cell col-uni-major major-label">${plan.院校 || ''}#${plan.专业 || ''}</div>
                <div class="list-cell">${plan.省份 || ''}</div><div class="list-cell">${plan.城市 || ''}</div>
                <div class="list-cell">${plan.学费 || ''}</div><div class="list-cell">${plan['25年选科要求'] || ''}</div>
                <div class="list-cell">${plan['25年分数线'] || ''}</div><div class="list-cell">${plan['25年位次号'] || ''}</div>
                <div class="list-cell col-notes">${plan.专业简注 || ''}</div>
            </div>`;
        });
        html += '</div></div>';
        resultsContainer.innerHTML = html;
    }

// =================================================================
// 【核心修改】最终版的计划详情展示函数
// =================================================================
function showPlanDetails(plan) {
    if (!plan) {
        detailsContent.innerHTML = '<h3>计划详情</h3><div class="content-placeholder"><p>请在左侧查询并选择一个专业...</p></div>';
        return;
    }
    // --- 渲染助手函数 ---
    const renderItem = (label, value) => {
        if (value === null || value === undefined || String(value).trim() === '') return '';
        return `<span class="detail-item"><span class="detail-label">${label}:</span> <span class="detail-value">${value}</span></span>`;
    };
    
    const renderRow = (...items) => {
        const content = items.join('');
        if (content.trim() === '') return '';
        return `<div class="detail-row">${content}</div>`;
    };

    const renderSmartField = (label, value) => {
        if (value === null || value === undefined || String(value).trim() === '') return '';

        let contentHtml = value;
        if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
            contentHtml = `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
        }
        
        return `<div class="detail-smart-row">
                    <strong class="detail-label">${label}:</strong> 
                    <span class="detail-value">${contentHtml}</span>
                </div>`;
    };

    // --- 字段预处理 ---
    // 1. 【已修正】标题直接使用<院校>#<专业>
    const planTitle = `${plan.院校 || ''} # ${plan.专业 || ''}`;
    const categoryBatch = [plan.科类, plan.批次].filter(Boolean).join('/');
    const cityTier = plan.城市评级 ? `(${plan.城市评级})` : '';
    const location = [plan.省份, plan.城市].filter(Boolean).join('/') + cityTier;
    const studyFee = [plan.学制 ? `${plan.学制}年` : null, plan.学费 ? `${plan.学费}元` : null].filter(Boolean).join(' / ');
    const masterInfo = (plan.硕士点 || plan.硕士专业) ? `<strong>硕</strong>:${plan.硕士点 || '---'}+${plan.硕士专业 || '---'}` : '';
    const doctorInfo = (plan.博士点 || plan.博士专业) ? `<strong>博</strong>:${plan.博士点 || '---'}+${plan.博士专业 || '---'}` : '';
    const degreePointInfo = [masterInfo, doctorInfo].filter(Boolean).join(' / ');
    // 2. 【已修正】按"**年份**-X%"格式处理推免率
    const tuitionRates = [
        plan['25年推免率'] ? `<strong>25年</strong>-${plan['25年推免率']}` : null,
        plan['24年推免率'] ? `<strong>24年</strong>-${plan['24年推免率']}` : null,
        plan['23年推免率'] ? `<strong>23年</strong>-${plan['23年推免率']}` : null
    ].filter(Boolean).join(' | ');

    const promotionRate = [
        plan.国内升学比率 ? `国内${plan.国内升学比率}` : null,
        plan.国外升学比率 ? `国外${plan.国外升学比率}` : null
    ].filter(Boolean).join(' / ');

    // --- 构建HTML  (采用混合渲染) ---
    let html = `
        <style>
            /* 【最终修正】 */
            .plan-details-content .detail-row,
            .plan-details-content .detail-smart-row {
                margin-bottom: 8px;
                line-height: 1.6;
            }
            .plan-details-content .detail-item {
                margin-right: 20px;
            }
            /* 直接对最终的文本和标签元素设置字体大小，确保最高优先级 */
            .plan-details-content .detail-label,
            .plan-details-content .detail-value,
            .plan-details-content .detail-smart-row a {
                font-size: 12px; /* 您可以根据需要调整这个值 */
                font-weight: normal; /* 重置字体粗细 */
            }
            /* 重新设置标签为粗体 */
            .plan-details-content .detail-label {
                font-weight: 600;
            }
            .plan-details-content .detail-smart-row a,
            .plan-details-content .detail-smart-row .detail-value {
                word-break: break-all;
            }
        </style>
        
        <h3 style="color: #007bff;">${planTitle}</h3>

        ${renderRow(
            renderItem('科类/批次', categoryBatch),
            renderItem('省份/城市', location)
        )}
        ${renderRow(
            renderItem('学制/学费', studyFee),
            renderItem('本/专科', plan.本专科),
            renderItem('25年新招', plan['25年新招']),
            renderItem('选科要求', plan['25年选科要求'])
        )}
        ${renderRow(renderItem('院校水平', plan.院校水平或来历))}
        ${renderRow(
            renderItem('办学性质', plan.办学性质),
            renderItem('院校类型', plan.院校类型),
            renderItem('软科排名', plan.软科校排名)
        )}
        ${renderRow(renderItem('硕/博点', degreePointInfo))}
        ${renderRow(
            renderItem('第四轮评估', plan.第四轮学科评估),
            renderItem('推免率', tuitionRates)
        )}
        ${renderRow(
            renderItem('升学率', promotionRate),
            renderItem('23年专升本率', plan['23年专升本比率'])
        )}
        ${renderRow(
            renderItem('专业排名', plan['专业排名/总数']),
            renderItem('软科专业排名', plan.软科专业排名)
        )}
        ${renderSmartField('专业水平', plan.专业水平)}
        ${renderSmartField('培养目标', plan.培养目标)}
        ${renderSmartField('主要课程', plan.主要课程)}
        ${renderSmartField('就业方向', plan.就业方向)}
        ${renderSmartField('招生章程', plan.招生章程)}
        ${renderSmartField('学校招生信息', plan.学校招生信息)}
        ${renderSmartField('校园VR', plan.校园VR)}
        ${renderSmartField('院校百科', plan.院校百科)}
        ${renderSmartField('就业质量', plan.就业质量)}
    `;

    detailsContent.innerHTML = html;

    // 更新图表区
    const chartArea = plansTab.querySelector('#plan-chart-area');
    chartArea.innerHTML = '<h3>图表展示</h3><div class="content-placeholder"><p>历年投档情况将在此以图表形式展示。</p></div>';
}

    function handlePlanSelectionChange(checkbox) {
        const id = checkbox.value; const targetRow = checkbox.closest('[data-plan]');
        if (!targetRow) return;
        if (checkbox.checked) {
            const planData = targetRow.dataset.plan;
            const plan = JSON.parse(decodeURIComponent(atob(planData)));
            selectedPlans.set(id, plan);
        } else {
            selectedPlans.delete(id);
        }
        updatePlanOutputUI();
    }

    function updatePlanOutputUI() {
        const text = Array.from(selectedPlans.values()).map(plan => {
            const fee = plan.学费 ? `${plan.学费}元` : 'N/A';
            const score = plan['25年分数线'] ? `${plan['25年分数线']}分` : 'N/A';
            const rank = plan['25年位次号'] ? `${plan['25年位次号']}位` : 'N/A';
            const details = `【${fee}|${plan['25年选科要求'] || 'N/A'}|${score}|${rank}】`;
            return `${plan.院校} ${plan.专业} ${details}`;
        }).join('\n');
        planOutputTextarea.value = text;
        const hasSelection = selectedPlans.size > 0;
        planCopyButton.classList.toggle('disabled', !hasSelection);
        planClearButton.classList.toggle('disabled', !hasSelection);
    }

    function updateCopyMajorButtonState() {
        const majorOutputTextarea = document.querySelector('#major-output-textarea');
        const hasContent = majorOutputTextarea && majorOutputTextarea.value.length > 0;
        copyMajorButton.classList.toggle('disabled', !hasContent);
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

    // --- Event Listeners & Initialization (no changes here) ---
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
    resultsContainer.addEventListener('change', e => {
        if (e.target.type === 'checkbox') {
            handlePlanSelectionChange(e.target);
            const value = e.target.value;
            resultsContainer.querySelectorAll(`input[type="checkbox"][value="${CSS.escape(value)}"]`).forEach(cb => {
                if (cb !== e.target) cb.checked = e.target.checked;
            });
        }
    });
    resultsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('tree-label')) {
            e.target.closest('li').querySelector('.nested')?.classList.toggle('active');
            e.target.classList.toggle('caret-down');
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
        renderResults();
    });
    planCopyButton.addEventListener('click', () => {
        if (!planOutputTextarea.value) return;
        navigator.clipboard.writeText(planOutputTextarea.value).then(() => {
            planCopyButton.textContent = '已复制!';
            setTimeout(() => { planCopyButton.textContent = '复制'; }, 1500);
        });
    });
    copyMajorButton.addEventListener('click', () => {
        const majorOutputTextarea = document.querySelector('#major-output-textarea');
        if (majorOutputTextarea && majorOutputTextarea.value) {
            majorSearchInput.value = majorOutputTextarea.value;
            majorSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
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
            if (group.id !== 'filter-range') { // "范围"按钮由其自己的监听器处理
                const hasSelection = !!group.querySelector('input:checked');
                group.querySelector('summary').classList.toggle('filter-active', hasSelection);
            }
        });
        if (e.target.closest('#filter-city')) {
            updateIntendedCities();
        }
    });
    const updateRangeFilterColor = () => {
        const hasValue = !!(rangeLowInput.value || rangeHighInput.value);
        rangeFilterGroup.querySelector('summary').classList.toggle('filter-active', hasValue);
    };
    rangeLowInput.addEventListener('input', updateRangeFilterColor);
    rangeHighInput.addEventListener('input', updateRangeFilterColor);
    
    rangeTypeSwitcher.addEventListener('change', (e) => {
        if (e.target.value === 'score') {
            rangeLowInput.placeholder = '低分'; rangeHighInput.placeholder = '高分';
        } else {
            rangeLowInput.placeholder = '低位'; rangeHighInput.placeholder = '高位';
        }
    });
    clearCitiesButton.addEventListener('click', () => {
        if (!cityFilterGroup) return;
        cityFilterGroup.querySelectorAll('input[name="city"]:checked, input.parent-checkbox:checked').forEach(cb => {
            cb.checked = false;
        });
        cityFilterGroup.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    populateFilters();
    updatePlanOutputUI();
    updateCopyMajorButtonState();
    updateIntendedCities();
};
