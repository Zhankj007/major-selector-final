window.initializeUniversitiesTab = function() {
    const container = document.getElementById('universities-tab');
    if (!container || container.dataset.initialized) return;
    container.dataset.initialized = 'true';
    container.innerHTML = `
        <div class="app-container">
            <div class="left-panel">
                <div class="header-controls">
                    <div class="switcher">
                        <input type="radio" name="uni-group-by" value="region" id="group-by-region" checked>
                        <label for="group-by-region">按地域</label>
                        <input type="radio" name="uni-group-by" value="department" id="group-by-department">
                        <label for="group-by-department">按主管部门</label>
                    </div>
                    <div class="search-container">
                        <input type="search" id="uni-search-input" placeholder="输入院校名关键字...">
                        <button id="uni-query-button" class="query-button">查询</button>
                    </div>
                    <div class="switcher-group">
                         <div class="switcher">
                            <input type="radio" name="expand-collapse" value="collapse" id="collapse-all" checked>
                            <label for="collapse-all">折叠</label>
                            <input type="radio" name="expand-collapse" value="expand" id="expand-all">
                            <label for="expand-all">展开</label>
                        </div>
                    </div>
                </div>
                <div class="controls-toolbar">
                    <div class="filter-controls">
                        <details class="filter-group"><summary>院校水平</summary><div id="uni-level-filter" class="filter-options"><p>加载中...</p></div></details>
                        <details class="filter-group"><summary>院校类型</summary><div id="uni-type-filter" class="filter-options"><p>加载中...</p></div></details>
                        <details class="filter-group"><summary>城市评级</summary><div id="uni-city-tier-filter" class="filter-options"><p>加载中...</p></div></details>
                        <details class="filter-group"><summary>办学性质</summary><div id="uni-ownership-filter" class="filter-options"><p>加载中...</p></div></details>
                        <details class="filter-group"><summary>办学层次</summary><div id="uni-edu-level-filter" class="filter-options"><p>加载中...</p></div></details>
                    </div>
                </div>
                <div id="uni-tree-container" class="major-tree-container"><p>请点击“查询”按钮开始。</p></div>
            </div>
            <div class="right-panel">
                <div id="uni-details-content" class="details-content"><p>请在左侧选择或查询院校...</p></div>
                <div class="output-container">
                    <div class="output-header">
                        <h3>意向院校<span id="uni-selection-counter"></span></h3>
                        <div class="button-group">
                            <button id="uni-copy-button" class="output-button">复制</button>
                            <button id="uni-clear-button" class="output-button">清空</button>
                        </div>
                    </div>
                    <textarea id="uni-output-textarea" readonly placeholder="您勾选的院校将按选择顺序列在这里..."></textarea>
                </div>
            </div>
        </div>`;
    
    const groupBySwitcher = container.querySelector('input[name="uni-group-by"]')?.parentElement;
    const expandCollapseSwitcher = container.querySelector('input[name="expand-collapse"]')?.parentElement;
    const searchInput = container.querySelector('#uni-search-input');
    const queryButton = container.querySelector('#uni-query-button');
    const treeContainer = container.querySelector('#uni-tree-container');
    const detailsContent = container.querySelector('#uni-details-content');
    const outputTextarea = container.querySelector('#uni-output-textarea');
    const copyButton = container.querySelector('#uni-copy-button');
    const clearButton = container.querySelector('#uni-clear-button');
    const selectionCounter = container.querySelector('#uni-selection-counter');
    const filterUIs = { '院校水平': container.querySelector('#uni-level-filter'), '院校类型': container.querySelector('#uni-type-filter'), '城市评级': container.querySelector('#uni-city-tier-filter'), '办学性质': container.querySelector('#uni-ownership-filter'), '办学层次': container.querySelector('#uni-edu-level-filter') };
    const filterGroups = container.querySelectorAll('.filter-group');
    let allUniversities = [];
    let groupBy = 'region';
    let selectedUniversities = new Map();
    const UNI_NAME_KEY = '院校名';
    const UNI_CODE_KEY = '院校编码';

    async function fetchData() {
        try {
            treeContainer.innerHTML="<p>正在加载高校数据...</p>";
            const response = await fetch('/api/getUniversities');
            if (!response.ok) throw new Error(`网络错误: ${response.statusText}`);
            allUniversities = await response.json();
            if (!allUniversities || !allUniversities.length) throw new Error("获取的高校数据为空或格式错误。");
            generateFilterOptions();
            runQuery();
        } catch (error) {
            console.error("高校数据加载失败:", error);
            treeContainer.innerHTML = `<p style="color:red;">数据加载失败: ${error.message}<br>请检查 /_data/universities.csv 文件是否存在且格式正确。</p>`;
        }
    }

    function generateFilterOptions() {
        const cityTierOrder = ['一线', '新一线', '二线', '三线', '四线', '五线', '其他'];
        const ownershipOrder = ['公办', '独立学院', '民办', '中外合作办学', '内地与港澳台地区合作办学', '境外高校海南办学'];
        const eduLevelOrder = ['本科', '专科', '成人'];
        const orderMap = { '城市评级': cityTierOrder, '办学性质': ownershipOrder, '办学层次': eduLevelOrder };
        const filters = { '院校水平': new Set(), '院校类型': new Set(), '城市评级': new Set(), '办学性质': new Set(), '办学层次': new Set() };
        allUniversities.forEach(uni => {
            if (!uni) return;
            (uni['院校水平'] || '').split('/').forEach(level => level.trim() && filters['院校水平'].add(level.trim()));
            ['院校类型', '办学性质', '办学层次'].forEach(key => {
                if (uni[key]) filters[key].add(uni[key].trim());
            });
            const cityTier = uni['城市评级']?.trim();
            filters['城市评级'].add(cityTier && cityTier !== '其他' ? cityTier : '其他');
        });
        Object.entries(filters).forEach(([key, valueSet]) => {
            const uiContainer = filterUIs[key];
            if (!uiContainer) return;
            let sortedValues;
            if (orderMap[key]) {
                const order = orderMap[key];
                sortedValues = Array.from(valueSet).sort((a, b) => {
                    const indexA = order.indexOf(a); const indexB = order.indexOf(b);
                    if (indexA === -1 && indexB === -1) return a.localeCompare(b, 'zh-Hans-CN');
                    if (indexA === -1) return 1; if (indexB === -1) return -1;
                    return indexA - indexB;
                });
            } else {
                sortedValues = Array.from(valueSet).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
            }
            uiContainer.innerHTML = sortedValues.map(value => `<label><input type="checkbox" value="${value}"> ${value}</label>`).join('');
            const filterGroup = uiContainer.closest('.filter-group');
            filterGroup.addEventListener('change', () => {
                const hasSelection = filterGroup.querySelector('input:checked');
                filterGroup.querySelector('summary').classList.toggle('filter-active', !!hasSelection);
                runQuery();
            });
        });
    }
    
    function runQuery() {
        const keyword = searchInput.value.trim().toLowerCase();
        const activeFilters = {};
        Object.keys(filterUIs).forEach(key => {
            const checked = Array.from(filterUIs[key].querySelectorAll('input:checked')).map(cb => cb.value);
            if (checked.length) activeFilters[key] = new Set(checked);
        });
        const sortedList = [...allUniversities].sort((a, b) => {
            const levelA = a['办学层次'] === '本科' ? 1 : 2; const levelB = b['办学层次'] === '本科' ? 1 : 2;
            if (levelA !== levelB) return levelA - levelB;
            return String(a[UNI_CODE_KEY] || '999999').localeCompare(String(b[UNI_CODE_KEY] || '999999'));
        });
        let filteredList = sortedList.filter(uni => {
            if (!uni) return false;
            if (keyword && !(uni[UNI_NAME_KEY] || '').toLowerCase().includes(keyword)) return false;
            for (const [key, valueSet] of Object.entries(activeFilters)) {
                if (key === '院校水平') {
                    const uniLevels = new Set((uni[key] || '').split('/').map(s => s.trim()));
                    if (![...valueSet].some(v => uniLevels.has(v))) return false;
                } else if (key === '城市评级') {
                    const uniTier = uni[key]?.trim() || '其他';
                    if (!valueSet.has(uniTier)) return false;
                } else { if (!valueSet.has(uni[key])) return false; }
            }
            return true;
        });
        renderUniversityTree(filteredList);
    }

    function buildHierarchy(list, key1, key2) {
        const hierarchy = {};
        list.forEach(item => {
            if(!item) return;
            const v1 = item[key1] || '其他';
            const v2 = key2 ? (item[key2] || '其他') : null;
            if (!hierarchy[v1]) hierarchy[v1] = key2 ? {} : [];
            if (key2) { if (!hierarchy[v1][v2]) hierarchy[v1][v2] = []; hierarchy[v1][v2].push(item); }
            else { hierarchy[v1].push(item); }
        });
        return hierarchy;
    }

    function renderUniversityTree(list) {
        let hierarchy;
        if (groupBy === 'region') hierarchy = buildHierarchy(list, '省份', '城市');
        else hierarchy = buildHierarchy(list, '主管部门');
        let html = '<ul id="uni-tree">';
        if (!list.length) html += '<li>没有找到匹配的院校。</li>';
        else {
            for(const l1Key in hierarchy) {
                html += `<li class="level-1-li"><input type="checkbox"> <span class="caret tree-label">${l1Key}</span><ul class="nested">`;
                if(groupBy === 'region') {
                    for(const l2Key in hierarchy[l1Key]) {
                        html += `<li class="level-2-li"><input type="checkbox"> <span class="caret tree-label">${l2Key}</span><ul class="nested">`;
                        hierarchy[l1Key][l2Key].forEach(uni => html += renderUniLi(uni));
                        html += `</ul></li>`;
                    }
                } else { hierarchy[l1Key].forEach(uni => html += renderUniLi(uni, 'level-2-li')); }
                html += `</ul></li>`;
            }
        }
        html += '</ul>';
        treeContainer.innerHTML = html;
        syncUniCheckboxesWithState();
        attachUniEventListeners();
        const expandValue = expandCollapseSwitcher.querySelector("input:checked").value;
        toggleAllNodes(expandValue === 'expand');
    }

    function renderUniLi(uni, liClass = 'level-3-li') {
        if (!uni || !uni[UNI_NAME_KEY]) return "";
        const details = btoa(encodeURIComponent(JSON.stringify(uni)));
        return `<li class="${liClass}" data-details="${details}"><input type="checkbox" value="${uni[UNI_NAME_KEY]}"><span class="uni-label">${uni[UNI_NAME_KEY]}</span></li>`;
    }

    function attachUniEventListeners() {
        const tree = treeContainer.querySelector("#uni-tree");
        if (!tree) return;
        tree.addEventListener("click", e => {
            if (e.target.classList.contains("tree-label")) { e.target.closest("li").querySelector(".nested")?.classList.toggle("active"); e.target.classList.toggle("caret-down"); }
            if (e.target.classList.contains("uni-label")) showUniDetails(e.target.closest("li"));
        });
        tree.addEventListener("change", e => { if (e.target.type === "checkbox") handleUniCheckboxChange(e.target); });
        tree.addEventListener("mouseover", e => { if (e.target.classList.contains("uni-label")) showUniDetails(e.target.closest("li")); });
    }

    function handleUniCheckboxChange(checkbox) {
        const currentLi = checkbox.closest("li");
        const isChecked = checkbox.checked;
        const affectedLis = currentLi.matches(".level-3-li, .level-2-li[data-details]") ? [currentLi] : Array.from(currentLi.querySelectorAll(".level-3-li, .level-2-li[data-details]"));
        affectedLis.forEach(li => { const uniData = JSON.parse(decodeURIComponent(atob(li.dataset.details))); const code = uniData[UNI_CODE_KEY]; if (isChecked && !selectedUniversities.has(code)) selectedUniversities.set(code, uniData); else if (!isChecked) selectedUniversities.delete(code); });
        cascadeUniCheckboxVisuals(checkbox);
        updateUniOutputUI();
    }

    function updateUniOutputUI() {
        const names = Array.from(selectedUniversities.values()).map(uni => uni[UNI_NAME_KEY]);
        outputTextarea.value = names.join(" ");
        const count = selectedUniversities.size;
        selectionCounter.textContent = count > 0 ? `${count}个` : "";
        copyButton.classList.toggle("disabled", count === 0);
        clearButton.classList.toggle("disabled", count === 0);
    }

    function syncUniCheckboxesWithState() {
        treeContainer.querySelectorAll("li[data-details]").forEach(li => { const uniData = JSON.parse(decodeURIComponent(atob(li.dataset.details))); li.querySelector("input").checked = selectedUniversities.has(uniData[UNI_CODE_KEY]) });
        treeContainer.querySelectorAll(".level-1-li, .level-2-li:not([data-details])").forEach(parentLi => { cascadeUniCheckboxVisuals(parentLi.querySelector(":scope > input[type=\"checkbox\"]")) });
    }

    function cascadeUniCheckboxVisuals(checkbox) {
        const currentLi = checkbox.closest("li"); const isChecked = checkbox.checked;
        currentLi.querySelectorAll(":scope > ul input[type=\"checkbox\"]").forEach(childCb => childCb.checked = isChecked);
        let parentLi = currentLi.parentElement.closest("li");
        while (parentLi) {
            const parentCheckbox = parentLi.querySelector(":scope > input[type=\"checkbox\"]");
            const childCheckboxes = Array.from(parentLi.querySelectorAll(":scope > ul > li > input[type=\"checkbox\"]"));
            if (!childCheckboxes.length) break;
            const allChecked = childCheckboxes.every(cb => cb.checked);
            const someChecked = childCheckboxes.some(cb => cb.checked || cb.indeterminate);
            if (allChecked) { parentCheckbox.checked = true; parentCheckbox.indeterminate = false; }
            else if (someChecked) { parentCheckbox.checked = false; parentCheckbox.indeterminate = true; }
            else { parentCheckbox.checked = false; parentCheckbox.indeterminate = false; }
            parentLi = parentLi.parentElement.closest("li");
        }
    }

    function showUniDetails(li) {
        if (!li || !li.dataset.details) { 
            detailsContent.innerHTML = '<h3>院校详情</h3><p>请在左侧选择或查询院校...</p>';
            return;
        };
        const d = JSON.parse(decodeURIComponent(atob(li.dataset.details)));
        const p = (v) => v || '---';
        const renderLink = (label, url) => url ? `<p><strong>${label}:</strong> <span><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></span></p>` : '';

        // 按您的要求构建合并字段
        const办学信息 = `${p(d['办学性质'])} - ${p(d['办学层次'])} - ${p(d['院校类型'])}`;
        const所在地区 = `${p(d['省份'])} - ${p(d['城市'])}` + (d['城市评级'] ? ` (${d['城市评级']})` : '');
        const主管建校 = `${p(d['主管部门'])} - ${p(d['建校时间'])}`;
        const硕博点 = `有硕士点: ${d['校硕点'] ? '有' : '无'}； 有博士点: ${d['校博点'] ? '有' : '无'}`;
        
        const rates = ['25年', '24年', '23年', '22年', '21年', '20年'].map(year => {
            const rate = d[`${year}推免率`];
            return rate ? `${year} ${rate}` : null;
        }).filter(Boolean).join(' | ');

        const升学比例 = `国内 ${p(d['国内升学比率'])} | 国外 ${p(d['国外升学比率'])}`;

        let html = `<h3>${p(d[UNI_NAME_KEY])} - ${p(d[UNI_CODE_KEY])}</h3>`;
        html += `<p><strong>办学信息:</strong> <span>${办学信息}</span></p>`;
        html += `<p><strong>所在地区:</strong> <span>${所在地区}</span></p>`;
        html += `<p><strong>主管/建校:</strong> <span>${主管建校}</span></p>`;
        html += `<p><strong>院校水平:</strong> <span>${p(d['院校水平'])}</span></p>`;
        html += `<p><strong>院校来历:</strong> <span>${p(d['院校来历'])}</span></p>`;
        html += `<p><strong>招生电话:</strong> <span>${p(d['招生电话'])}</span></p>`;
        html += `<p><strong>院校地址:</strong> <span>${p(d['院校地址'])}</span></p>`;
        html += `<p><strong>软科校排:</strong> <span>${p(d['软科校排'])}</span></p>`;
        html += `<p><strong>硕博点:</strong> <span>${硕博点}</span></p>`;
        html += `<p><strong>第四轮学科评估统计:</strong> <span>${p(d['第四轮学科评估统计'])}</span></p>`;
        html += `<p><strong>第四轮学科评估结果:</strong> <span>${p(d['第四轮学科评估结果'])}</span></p>`;
        html += `<p><strong>一流学科数量:</strong> <span>${p(d['一流学科数量'])}</span></p>`;
        html += `<p><strong>一流学科:</strong> <span>${p(d['一流学科'])}</span></p>`;
        html += rates ? `<p><strong>历年推免率:</strong> <span>${rates}</span></p>` : '';
        html += `<p><strong>升学比例:</strong> <span>${升学比例}</span></p>`;
        if (d['23年升本率']) {
             html += `<p><strong>23年升本率:</strong> <span>${d['23年升本率']}</span></p>`;
        }
        html += renderLink('招生章程', d['招生章程']);
        html += renderLink('学校招生信息', d['学校招生信息']);
        html += renderLink('校园VR', d['校园VR']);
        html += renderLink('院校百科', d['院校百科']);
        html += renderLink('就业质量', d['就业质量']);
        
        detailsContent.innerHTML = html;
    }

        
        mergedFields.forEach(mf => {
            handledKeys.add('城市评级'); // Always handle this key
            let content;
            if (mf.custom) {
                content = mf.custom(d);
            } else {
                content = mf.keys.map(k => {
                    handledKeys.add(k);
                    return p(d[k]);
                }).join(mf.separator);
                if (mf.extra) {
                    content += mf.extra(d);
                }
            }
            html += `<p><strong>${mf.label}:</strong> <span>${content}</span></p>`;
        });

        // 单独处理和剩余字段
        Object.entries(d).forEach(([key, value]) => {
            if (!handledKeys.has(key) && value) {
                let displayValue = value;
                if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
                    displayValue = `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
                }
                html += `<p><strong>${key}:</strong> <span>${displayValue}</span></p>`;
            }
        });

        detailsContent.innerHTML = html;
    }

    function toggleAllNodes(shouldExpand) {
        treeContainer.querySelectorAll(".nested").forEach(ul => ul.classList.toggle("active", shouldExpand));
        treeContainer.querySelectorAll(".caret").forEach(caret => caret.classList.toggle("caret-down", shouldExpand));
    }
    
    filterGroups.forEach(group => {
        const details = group;
        details.addEventListener('mouseenter', () => { details.open = true; });
        details.addEventListener('mouseleave', () => { details.open = false; });
    });
    
    groupBySwitcher.addEventListener('change', e => { groupBy = e.target.value; runQuery(); });
    queryButton.addEventListener('click', runQuery);
    searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') runQuery(); });
    expandCollapseSwitcher.addEventListener('change', e => toggleAllNodes(e.target.value === "expand"));
    copyButton.addEventListener('click', () => { if (!outputTextarea.value) return; navigator.clipboard.writeText(outputTextarea.value).then(() => { copyButton.textContent = '已复制!'; setTimeout(() => { copyButton.textContent = '复制'; }, 1500); }); });
    clearButton.addEventListener('click', () => { if (selectedUniversities.size === 0) return; selectedUniversities.clear(); runQuery(); updateUniOutputUI(); });

    fetchData();
    updateUniOutputUI();
}

