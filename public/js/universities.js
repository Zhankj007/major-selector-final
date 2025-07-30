window.initializeUniversitiesTab = function() {
    const container = document.getElementById('universities-tab');
    // Prevent re-initialization
    if (!container || container.dataset.initialized) return;
    container.dataset.initialized = 'true';

    // 1. Inject the full HTML structure for the Universities tool
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
                </div>
                <div class="controls-toolbar">
                    <div class="filter-controls">
                        <details class="filter-group"><summary>院校水平</summary><div id="uni-level-filter" class="filter-options"><p>加载中...</p></div></details>
                        <details class="filter-group"><summary>院校类型</summary><div id="uni-type-filter" class="filter-options"><p>加载中...</p></div></details>
                        <details class="filter-group"><summary>城市评级</summary><div id="uni-city-tier-filter" class="filter-options"><p>加载中...</p></div></details>
                        <details class="filter-group"><summary>办学性质</summary><div id="uni-ownership-filter" class="filter-options"><p>加载中...</p></div></details>
                        <details class="filter-group"><summary>办学层次</summary><div id="uni-edu-level-filter" class="filter-options"><p>加载中...</p></div></details>
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
                <div id="uni-tree-container" class="major-tree-container"><p>请点击“查询”按钮开始。</p></div>
            </div>
            <div class="right-panel">
                <h3>院校详情</h3>
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

    // 2. Get references to the newly created elements, scoped to this tab's container
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
    
    let allUniversities = [];
    let groupBy = 'region';
    let selectedUniversities = new Map();
    
    const UNI_NAME_KEY = '院校名';
    const UNI_CODE_KEY = '院校编码';

    // 3. Implement all logic functions
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
        const filters = { '院校水平': new Set(), '院校类型': new Set(), '城市评级': new Set(), '办学性质': new Set(), '办学层次': new Set() };
        allUniversities.forEach(uni => {
            if(!uni) return;
            (uni['院校水平'] || '').split('/').forEach(level => level.trim() && filters['院校水平'].add(level.trim()));
            Object.keys(filters).forEach(key => { if (key !== '院校水平' && uni[key]) filters[key].add(uni[key]); });
        });
        Object.entries(filters).forEach(([key, valueSet]) => {
            const uiContainer = filterUIs[key];
            if (!uiContainer) return;
            const sortedValues = Array.from(valueSet).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
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
            const levelA = a['办学层次'] === '本科' ? 1 : 2;
            const levelB = b['办学层次'] === '本科' ? 1 : 2;
            if (levelA !== levelB) return levelA - levelB;
            const codeA = a[UNI_CODE_KEY] || '999999';
            const codeB = b[UNI_CODE_KEY] || '999999';
            return String(codeA).localeCompare(String(codeB));
        });
        let filteredList = sortedList.filter(uni => {
            if (!uni) return false;
            if (keyword && !(uni[UNI_NAME_KEY] || '').toLowerCase().includes(keyword)) return false;
            for (const [key, valueSet] of Object.entries(activeFilters)) {
                if (key === '院校水平') {
                    const uniLevels = new Set((uni[key] || '').split('/').map(s => s.trim()));
                    if (![...valueSet].some(v => uniLevels.has(v))) return false;
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
        if (!li || !li.dataset.details) return;
        const d = JSON.parse(decodeURIComponent(atob(li.dataset.details)));
        const layout = [["办学性质", "办学层次", "院校类型"], ["省份", "城市", "城市评级"], [UNI_NAME_KEY, UNI_CODE_KEY], ["院校水平"], ["主管部门", "院校来历", "建校时间"], ["招生电话", "院校地址"], ["软科校排", "校硕点", "校博点"], ["第四轮学科评估统计"], ["第四轮学科评估结果"], ["一流学科数量", "一流学科"]];
        const handledKeys = new Set(layout.flat());
        let html = "";
        layout.forEach(row => { const rowHtml = row.map(key => { const value = d[key]; if (!value) return ""; return `<p class="compact-row"><strong>${key}:</strong> <span>${value}</span>` }).join(""); if (rowHtml) html += `<div class="compact-row-container">${rowHtml}</div>` });
        const rates = Object.keys(d).filter(k => k.includes("推免率")).sort().reverse();
        if (rates.length > 0) { const ratesHtml = rates.map(key => d[key] ? `${key.substring(0, 2)}年:${d[key]}` : "").filter(Boolean).join(" | "); if(ratesHtml) {html += `<p><strong>历年推免率:</strong> <span>${ratesHtml}</span></p>`; rates.forEach(key => handledKeys.add(key))} }
        const 升本率Key = "23年升本率"; if (d[升本率Key]) { html += `<p><strong>${升本率Key}:</strong> <span>${d[升本率Key]}</span></p>`; handledKeys.add(升本率Key); }
        const links = ["招生章程", "学校招生信息", "校园VR", "院校百科", "就业质量", "官网"];
        links.forEach(key => { let value = d[key]; if (value) { if (typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"))) { value = `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>` } html += `<p><strong>${key}:</strong> <span>${value}</span></p>`; handledKeys.add(key) } });
        detailsContent.innerHTML = html;
    }

    function toggleAllNodes(shouldExpand) {
        treeContainer.querySelectorAll(".nested").forEach(ul => ul.classList.toggle("active", shouldExpand));
        treeContainer.querySelectorAll(".caret").forEach(caret => caret.classList.toggle("caret-down", shouldExpand));
    }

    groupBySwitcher.addEventListener('change', e => { groupBy = e.target.value; runQuery(); });
    queryButton.addEventListener('click', runQuery);
    searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') runQuery(); });
    expandCollapseSwitcher.addEventListener('change', e => toggleAllNodes(e.target.value === "expand"));
    copyButton.addEventListener('click', () => { if (!outputTextarea.value) return; navigator.clipboard.writeText(outputTextarea.value).then(() => { copyButton.textContent = '已复制!'; setTimeout(() => { copyButton.textContent = '复制'; }, 1500); }); });
    clearButton.addEventListener('click', () => { if (selectedUniversities.size === 0) return; selectedUniversities.clear(); runQuery(); updateUniOutputUI(); });

    fetchData();
    updateUniOutputUI();
}
