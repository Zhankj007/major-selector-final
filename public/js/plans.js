window.initializePlansTab = function() {
    // 确保 Chart.js 已经加载
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Please include it in your HTML.');
        // 可以在这里向用户显示一个错误提示
        const chartArea = document.querySelector('#plan-chart-area');
        if(chartArea) chartArea.innerHTML = '<h3>图表库加载失败</h3><p>请检查网络连接或联系管理员。</p>';
        return;
    }
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
                        <button id="plan-copy-selected-button" class="output-button">复制意向专业</button>
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
                            <div class="output-header"><h3>意向计划</h3><div class="button-group" style="display: flex; gap: 4px;"><button id="plan-copy-button" class="output-button">复制</button><button id="plan-clear-button" class="output-button">清空</button></div></div>
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
    let activeCharts = [];


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
            .plan-details-content .detail-row, .plan-details-content .detail-smart-row { margin-bottom: 8px; line-height: 1.6; }
            .plan-details-content .detail-item { margin-right: 20px; }
            .plan-details-content .detail-label, .plan-details-content .detail-value, .plan-details-content .detail-smart-row a, .plan-details-content .detail-smart-row .detail-value { font-size: 14px; font-weight: normal; }
            .plan-details-content .detail-label { font-weight: 600; }
            .plan-details-content .detail-smart-row a, .plan-details-content .detail-smart-row .detail-value { word-break: break-all; }
        </style>
        <h3 style="color: #007bff;">${planTitle} 计划详情</h3>
        ${renderRow(renderItem('专业简注', `<span style="color: #ff4d4f; font-weight: 500;">${plan.专业简注}</span>`))}
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
            renderItem('23年专升本率', plan['23年专升本比率']),
            renderItem('专业排名', plan['专业排名/总数']),
            renderItem('软科专业排名', plan.软科专业排名)
        )}

        ${renderRow(renderItem('专业水平', plan.专业水平))}
        ${renderRow(renderItem('培养目标', plan.培养目标))}
        ${renderRow(renderItem('主要课程', plan.主要课程))}
        ${renderRow(renderItem('就业方向', plan.就业方向))}

        ${renderSmartField('招生章程', plan.招生章程)}
        ${renderSmartField('学校招生信息', plan.学校招生信息)}
        ${renderSmartField('校园VR', plan.校园VR)}
        ${renderSmartField('院校百科', plan.院校百科)}
        ${renderSmartField('就业质量', plan.就业质量)}
    `;
    detailsContent.innerHTML = html;
    }

// --- 【新增】图表功能相关代码 (V3 - 根据新需求重构) ---
    function renderMajorCharts(plan) {
        const chartArea = plansTab.querySelector('#plan-chart-area');
        activeCharts.forEach(chart => chart.destroy());
        activeCharts = [];

        const years = [25, 24, 23, 22];
        const historicalData = years.map(year => {
            const score = plan[`${year}年分数线`];
            const rank = plan[`${year}年位次号`];
            const count = plan[`${year}年计划数`];
            const avgScore = plan[`${year}年平均分`];
            if (score || rank || count || avgScore) {
                return { year: `${year}年`, score, rank, count, avgScore };
            }
            return null;
        }).filter(Boolean).reverse();

        if (historicalData.length === 0) {
            chartArea.innerHTML = '<h3>图表展示</h3><div class="content-placeholder"><p>该专业暂无历年投档数据可供展示。</p></div>';
            return;
        }

        const labels = historicalData.map(d => d.year);

        const fullMajorName = `${plan.院校 || ''} # ${plan.专业 || ''}`;
        
        // 计算图表容器的高度，基于图表展示区自身的可用空间
        const calculateChartHeight = () => {
            // 获取图表展示区的可用高度
            const chartAreaHeight = chartArea.clientHeight;
            const headerHeight = chartArea.querySelector('h3')?.offsetHeight || 40;
            const wrapperMargin = 0; // 设置为0px，直接从容器底部开始
            // 减去标题高度和边距，确保图表不会溢出
            const availableHeight = chartAreaHeight - headerHeight - wrapperMargin;
            // 设置一个合理的最大高度和最小高度
            return Math.max(200, Math.min(availableHeight, 300));
        };

        // 设置图表容器样式
        chartArea.innerHTML = `
            <h3 style="color: #28a745; margin-bottom: 12px;">${fullMajorName} 历年投档情况</h3>
            <div class="charts-wrapper" style="display: flex; gap: 20px; width: 100%; min-height: 0;">
                <div class="chart-container" style="flex: 1 1 0; min-width: 0; position: relative;"><canvas id="scoreAvgChart"></canvas></div>
                <div class="chart-container" style="flex: 1 1 0; min-width: 0; position: relative;"><canvas id="rankChart"></canvas></div>
                <div class="chart-container" style="flex: 1 1 0; min-width: 0; position: relative;"><canvas id="countChart"></canvas></div>
            </div>
        `;

        // 设置容器高度
        const chartContainers = chartArea.querySelectorAll('.chart-container');
        const containerHeight = calculateChartHeight() + 'px';
        chartContainers.forEach(container => {
            container.style.height = containerHeight;
        });

        // 根据容器宽度动态调整字体大小
        const getAdaptiveFontSize = (canvasWidth) => {
            if (canvasWidth < 300) return 9;
            if (canvasWidth < 400) return 10;
            return 11;
        };

        const dataLabelsPlugin = {
            id: 'custom_data_labels',
            afterDatasetsDraw(chart, args, options) {
                const { ctx, data, config } = chart;
                ctx.save();
                ctx.font = 'bold 11px Arial';
                ctx.fillStyle = '#333';
                ctx.textAlign = 'center';

                data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    if (meta.hidden) return;

                    meta.data.forEach((element, index) => {
                        const value = dataset.data[index];
                        if(value === null || value === undefined) return;

                        ctx.fillStyle = dataset.borderColor || '#333';
                        let x, y;
                        if (config.options.indexAxis === 'y') {
                            x = element.x + 15; y = element.y;
                            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                        } else if(config.type === 'line') {
                            x = element.x; y = element.y - 10;
                            ctx.textBaseline = 'bottom';
                        } else {
                            x = element.x; y = element.y - 5;
                            ctx.textBaseline = 'bottom';
                        }
                        ctx.fillText(value, x, y);
                    });
                });
                ctx.restore();
            }
        };

        const allScores = [...historicalData.map(d=>d.score), ...historicalData.map(d=>d.avgScore)].filter(s => s != null);
        const minScore = Math.min(...allScores);

        // 图表一: 投档线/平均分
        activeCharts.push(new Chart(document.getElementById('scoreAvgChart'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: '投档线', data: historicalData.map(d => d.score), backgroundColor: 'rgba(54, 162, 235, 0.7)', borderColor: 'rgba(54, 162, 235, 1)' },
                    { label: '平均分', data: historicalData.map(d => d.avgScore), backgroundColor: 'rgba(75, 192, 192, 0.7)', borderColor: 'rgba(75, 192, 192, 1)' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        suggestedMin: Math.floor(minScore / 10) * 10 - 10,
                        grace: '5%' 
                    }
                },
                plugins: { 
                    title: { display: true, text: '投档线/平均分', font: { size: getAdaptiveFontSize(document.getElementById('scoreAvgChart').width) } }, 
                    legend: { display: true, position: 'top' }
                }
            },
            plugins: [dataLabelsPlugin]
        }));

        // 图表二: 位次号
        activeCharts.push(new Chart(document.getElementById('rankChart'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: '最低位次号', data: historicalData.map(d => d.rank),
                    borderColor: 'rgba(255, 99, 132, 1)', backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: true, tension: 0.1
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { 
                    y: { 
                        grace: '10%',
                        // 3. Y轴逆序排列
                        reverse: true 
                    } 
                },
                plugins: { 
                    title: { display: true, text: '位次号', font: { size: getAdaptiveFontSize(document.getElementById('rankChart').width) } }, 
                    legend: { display: false }
                }
            },
            plugins: [dataLabelsPlugin]
        }));
        
        // 图表三: 计划数
        activeCharts.push(new Chart(document.getElementById('countChart'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '计划数', data: historicalData.map(d => d.count),
                    backgroundColor: 'rgba(153, 102, 255, 0.7)', borderColor: 'rgba(153, 102, 255, 1)',
                }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                scales: {
                    x: {
                        grace: 1 
                    }
                },
                plugins: { 
                    title: { display: true, text: '计划数', font: { size: getAdaptiveFontSize(document.getElementById('countChart').width) } }, 
                    legend: { display: false }
                }
            },
            plugins: [dataLabelsPlugin]
        }));
    }

    function renderUniversityChart(uniName) {
        const chartArea = plansTab.querySelector('#plan-chart-area');
        activeCharts.forEach(chart => chart.destroy());
        activeCharts = [];

        const relevantPlans = lastQueryData.filter(p => p.院校 === uniName && p['25年分数线']);

        if (relevantPlans.length === 0) {
            chartArea.innerHTML = '<h3>图表展示</h3><div class="content-placeholder"><p>该院校符合条件的专业暂无25年分数线数据可供展示。</p></div>';
            return;
        }

        const uniStats = relevantPlans[0];
        const statsHtml = `
            <div style="display: flex; justify-content: space-around; padding: 5px; margin-bottom: 8px; background-color: #f8f9fa; border-radius: 5px; font-size: 13px;">
                <div style="text-align: center;"><strong>校最低专业分数:</strong> ${uniStats['25年校最低专业分数'] || 'N/A'}</div>
                <div style="text-align: center;"><strong>校最低专业位次:</strong> ${uniStats['25年校最低专业位次'] || 'N/A'}</div>
                <div style="text-align: center;"><strong>校专业平均分:</strong> ${uniStats['25年校所有专业平均分'] || 'N/A'}</div>
                <div style="text-align: center;"><strong>校专业平均位次:</strong> ${uniStats['25年校所有专业平均位次'] || 'N/A'}</div>
            </div>
        `;

        const sortedPlans = [...relevantPlans].sort((a, b) => b['25年分数线'] - a['25年分数线']);
        const labels = sortedPlans.map(p => p.专业);
        const scores = sortedPlans.map(p => p['25年分数线']);

        // 动态计算图表高度
        const calculateChartHeight = () => {
            // 获取图表展示区的可用高度
            const chartAreaHeight = chartArea.clientHeight;
            const headerHeight = chartArea.querySelector('h3')?.offsetHeight || 40;
            const statsHeight = chartArea.querySelector('div[style*="display: flex; justify-content: space-around"]')?.offsetHeight || 30;
            const wrapperMargin = 15; // 预留一些边距
            // 减去标题高度、统计信息高度和边距
            const availableHeight = chartAreaHeight - headerHeight - statsHeight - wrapperMargin;
            // 设置一个合理的最大高度和最小高度
            return Math.max(300, Math.min(availableHeight, 450));
        };

        const chartHeight = calculateChartHeight();
        chartArea.innerHTML = `<h3 style="color: #E57373; margin-bottom: 5px;">${uniName} 2025年各专业投档线</h3>${statsHtml}<div class="chart-container" style="position: relative; height: ${chartHeight}px;"><canvas id="uniChart"></canvas></div>`;

        activeCharts.push(new Chart(document.getElementById('uniChart'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '25年分数线',
                    data: scores,
                    backgroundColor: 'rgba(239, 108, 108, 0.7)',
                    borderColor: 'rgba(239, 108, 108, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            footer: function(tooltipItems) {
                                const plan = sortedPlans[tooltipItems[0].dataIndex];
                                if (!plan) return '';
                                const rankInfo = plan['25年位次号'] ? `位次: ${plan['25年位次号']}` : '';
                                const countInfo = plan['25年计划数'] ? `计划数: ${plan['25年计划数']}` : '';
                                return [rankInfo, countInfo].filter(Boolean).join(' | ');
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        suggestedMin: Math.floor((uniStats['25年校最低专业分数'] || 500) / 10) * 10 - 20,
                        // 恢复为Chart.js默认的横向标题
                        title: {
                            display: true,
                            text: '分数线',
                            font: {
                                size: 12
                            }
                        }
                    },
                    x: {
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 45,
                            font: { 
                                size: document.getElementById('uniChart').width < 500 ? 10 : 11 
                            },
                            align: 'end',
                            padding: 0,
                            fontStyle: 'normal'
                        },
                        grid: {
                            display: true,
                            drawBorder: true
                        }
                    }
                },
            },
            // 插件数组：只保留智能分数标签插件
            plugins: [{
                id: 'intelligent_data_labels',
                afterDatasetsDraw(chart, args, options) {
                    const { ctx } = chart;
                    ctx.save();
                    ctx.font = '10px Arial';
                    ctx.fillStyle = '#444';
                    ctx.textAlign = 'center';
                    const meta = chart.getDatasetMeta(0);
                    let lastLabelXEnd = -Infinity;
                    meta.data.forEach((bar, index) => {
                        const score = chart.data.datasets[0].data[index].toString();
                        const textWidth = ctx.measureText(score).width;
                        const currentLabelXStart = bar.x - (textWidth / 2);
                        const currentLabelXEnd = bar.x + (textWidth / 2);
                        const safetyMargin = 5;
                        if (currentLabelXStart > lastLabelXEnd + safetyMargin) {
                            ctx.fillText(score, bar.x, bar.y - 5);
                            lastLabelXEnd = currentLabelXEnd;
                        }
                    });
                    ctx.restore();
                }
            }]
        }));
    }
    // 图表展示区函数结束

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

    // --- 事件监听器 (最终版) ---

    queryButton.addEventListener('click', executeQuery);
    viewModeSwitcher.addEventListener('change', renderResults);

    resultsContainer.addEventListener('change', e => {
        // 【已修正】检查复选框是否存在于任何带有 [data-plan] 属性的父元素中
        if (e.target.type === 'checkbox' && e.target.closest('[data-plan]')) {
            handlePlanSelectionChange(e.target);
        }
    });

    resultsContainer.addEventListener('mouseover', e => {
        const target = e.target.closest('[data-plan]');
        if (target && target.dataset.plan) {
            const plan = JSON.parse(decodeURIComponent(atob(target.dataset.plan)));
            showPlanDetails(plan);
        }
    });

    resultsContainer.addEventListener('click', e => {
        const target = e.target;
        if (target.type === 'checkbox') return;

        // 4. 统一处理树状和列表视图下的专业点击事件
        const majorElement = target.closest('[data-plan]');
        if (majorElement) {
            // 如果点击的是具体的专业（无论是li还是div），则显示专业图表
            renderMajorCharts(JSON.parse(decodeURIComponent(atob(majorElement.dataset.plan))));
            return; // 动作完成，退出
        }
        
        // 如果不是专业，再判断是否为树状视图的父节点（院校或省份）
        const treeLabel = target.closest('.tree-label');
        if (treeLabel) {
            const listItem = treeLabel.closest('li');
            listItem.querySelector('.nested')?.classList.toggle('active');
            treeLabel.classList.toggle('caret-down');
            
            const nestedUl = listItem.querySelector('ul');
            const isUniversity = nestedUl && nestedUl.querySelector('li[data-plan]');
            
            if(isUniversity) {
                 renderUniversityChart(treeLabel.textContent);
            }
        }
    });
    // --- 其他按钮和筛选器的事件监听 ---

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
                handlePlanSelectionChange(child); // 联动勾选时也要更新
            });
        }
        filterContainer.querySelectorAll('.filter-group').forEach(group => {
            if (group.id !== 'filter-range') {
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
            rangeLowInput.placeholder = '低分';
            rangeHighInput.placeholder = '高分';
        } else {
            rangeLowInput.placeholder = '低位';
            rangeHighInput.placeholder = '高位';
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
