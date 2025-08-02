window.initializePlansTab = function() {
    const plansTab = document.getElementById('plans-tab');
    if (!plansTab || plansTab.dataset.initialized) return;
    plansTab.dataset.initialized = 'true';

    // 1. 注入HTML结构
    plansTab.innerHTML = `...`; // HTML结构与上一版相同，此处省略

    // --- 2. 获取DOM元素引用 ---
    // ... 大部分元素引用与上一版相同，此处省略
    const filterContainer = plansTab.querySelector('.plan-filters');
    const resultsContainer = plansTab.querySelector('#plan-tree-container');

    // --- 3. 状态与数据管理 ---
    let filters = { /* ... */ }; // 筛选状态对象
    let allFilterOptions = {}; // 存放从API获取的原始选项数据

    // --- 4. 核心功能函数 ---

    /**
     * 根据从API获取的数据，动态填充所有筛选器
     */
    async function populateFilters() {
        try {
            const response = await fetch('/api/getPlanFilterOptions');
            if (!response.ok) throw new Error(`网络错误: ${response.statusText}`);
            allFilterOptions = await response.json();

            // 1. 填充“科类”
            const planTypeContainer = plansTab.querySelector('#filter-plan-type .filter-options');
            planTypeContainer.innerHTML = allFilterOptions.planTypes.map(o => `<label><input type="checkbox" name="planType" value="${o}"> ${o}</label>`).join('');

            // 2. 填充“城市”（复杂二级联动）
            populateCityFilter();

            // 3. 填充“选科”
            const subjectContainer = plansTab.querySelector('#filter-subject .filter-options');
            let subjectHtml = '';
            for (const category in allFilterOptions.subjectTree) {
                subjectHtml += `<li><span class="caret tree-label">${category}</span><ul class="nested active">`;
                subjectHtml += allFilterOptions.subjectTree[category].map(req => `<li><label><input type="checkbox" name="subjectReq" value="${req}"> ${req}</label></li>`).join('');
                subjectHtml += `</ul></li>`;
            }
            subjectContainer.innerHTML = `<ul>${subjectHtml}</ul>`;

            // 4. 填充“院校水平”（硬编码）
            const uniLevelContainer = plansTab.querySelector('#filter-uni-level .filter-options');
            const uniLevelOptions = [
                { value: '/985/', text: '985工程' },
                { value: '/211/', text: '211工程' },
                { value: '/双一流大学/', text: '双一流' },
                { value: '/基础学科拔尖/', text: '基础学科拔尖' },
                { value: '/保研资格/', text: '保研资格' },
                { value: '中外合作办学', text: '中外合作办学' },
                { value: '(省重点建设高校)', text: '省重点建设高校' },
                { value: '(省市共建重点高校)', text: '省市共建重点高校' },
            ];
            uniLevelContainer.innerHTML = uniLevelOptions.map(o => `<label><input type="checkbox" name="uniLevel" value="${o.value}"> ${o.text}</label>`).join('');

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
    
    /**
     * 单独处理复杂的“城市”筛选器
     */
    function populateCityFilter() {
        const container = plansTab.querySelector('#filter-city .filter-options');
        let cityHtml = '<div><strong>城市评级:</strong><div id="city-tier-filter">';
        cityHtml += allFilterOptions.cityTiers.map(tier => `<label><input type="checkbox" name="cityTier" value="${tier}" checked> ${tier}</label>`).join('');
        cityHtml += '</div></div><hr><div><strong>省份/城市:</strong><ul id="province-city-tree">';

        for (const province in allFilterOptions.provinceCityTree) {
            const provinceData = allFilterOptions.provinceCityTree[province];
            // 将省份的评级转为字符串，便于后续匹配
            const tiers_str = Array.from(provinceData.tier).join(',');
            cityHtml += `<li data-province-tiers="${tiers_str}"><span class="caret tree-label">${province}</span><ul class="nested active">`;
            cityHtml += provinceData.cities.map(city => `<li><label><input type="checkbox" name="city" value="${city}"> ${city}</label></li>`).join('');
            cityHtml += `</ul></li>`;
        }
        cityHtml += '</ul></div>';
        container.innerHTML = cityHtml;

        // 添加城市评级联动的逻辑
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

    /**
     * 执行查询
     */
    async function executeQuery() {
        resultsContainer.innerHTML = '<p>正在查询中，请稍候...</p>';
        
        // 1. 收集所有筛选条件
        const params = new URLSearchParams();
        const getCheckedValues = (name) => Array.from(plansTab.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);

        const uniKeyword = plansTab.querySelector('#plan-uni-search').value.trim();
        if (uniKeyword) params.append('uniKeyword', uniKeyword);

        const majorKeywords = plansTab.querySelector('#plan-major-search').value.trim().split(/\s+/).filter(Boolean);
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

        // 2. 发起API请求
        try {
            const response = await fetch(`/api/getPlans?${params.toString()}`);
            if (!response.ok) throw new Error(`查询失败: ${response.statusText}`);
            const data = await response.json();
            
            // 3. 渲染结果（下一步实现）
            console.log('查询成功，获取数据:', data);
            resultsContainer.innerHTML = `<p>查询到 ${data.length} 条结果。下一步将在此处渲染结果。</p>`;
            // renderResults(data); 

        } catch (error) {
            console.error("查询执行失败:", error);
            resultsContainer.innerHTML = `<p style="color:red;">查询失败: ${error.message}</p>`;
        }
    }

    // --- 5. 事件绑定与初始化 ---
    // ... 此处省略之前已有的按钮状态管理、复制专业等事件监听代码 ...

    // 查询按钮
    plansTab.querySelector('#plan-query-button').addEventListener('click', executeQuery);
    
    // 使筛选器内的树状结构可点击展开/折叠
    filterContainer.addEventListener('click', e => {
        if (e.target.classList.contains('tree-label')) {
            const parentLi = e.target.closest('li');
            parentLi.querySelector('.nested')?.classList.toggle('active');
            e.target.classList.toggle('caret-down');
        }
    });

    // 初始化
    populateFilters();
    // ... 其他初始化函数调用 ...
};
