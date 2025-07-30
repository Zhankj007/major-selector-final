document.addEventListener('DOMContentLoaded', function () {
    // --- GLOBAL APP INITIALIZATION ---
    function initializeGlobal() {
        const versionInfo = document.getElementById('version-info');
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        versionInfo.textContent = `v${year}${month}${day}`;

        const header = document.querySelector('.toolbox-header');
        const titleVersion = header.querySelector('.title-version');
        const description = header.querySelector('.description');
        if (titleVersion && description) {
            titleVersion.appendChild(description);
        }

        const tabs = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                tabPanels.forEach(panel => {
                    panel.classList.toggle('active', panel.id === `${target}-tab`);
                    if (panel.id === 'majors-tab' && !panel.dataset.initialized && panel.classList.contains('active')) {
                        initializeMajorsTab();
                    }
                });
            });
        });
    }

    // --- UNIVERSITY TAB LOGIC ---
    function initializeUniversitiesTab() {
        const groupBySwitcher = document.querySelector('input[name="uni-group-by"]')?.parentElement;
        const expandCollapseSwitcher = document.querySelector('input[name="expand-collapse"]')?.parentElement;
        const searchInput = document.getElementById('uni-search-input');
        const queryButton = document.getElementById('uni-query-button');
        const treeContainer = document.getElementById('uni-tree-container');
        const detailsContent = document.getElementById('uni-details-content');
        const outputTextarea = document.getElementById('uni-output-textarea');
        const copyButton = document.getElementById('uni-copy-button');
        const clearButton = document.getElementById('uni-clear-button');
        const selectionCounter = document.getElementById('uni-selection-counter');
        const filterUIs = { '院校水平': document.getElementById('uni-level-filter'), '院校类型': document.getElementById('uni-type-filter'), '城市评级': document.getElementById('uni-city-tier-filter'), '办学性质': document.getElementById('uni-ownership-filter'), '办学层次': document.getElementById('uni-edu-level-filter') };
        
        let allUniversities = [];
        let groupBy = 'region';
        let selectedUniversities = new Map();
        
        const UNI_NAME_KEY = '院校名';
        const UNI_CODE_KEY = '院校编码';

        async function fetchData() {
            try {
                const response = await fetch('/api/getUniversities');
                if (!response.ok) throw new Error(`网络错误: ${response.statusText}`);
                allUniversities = await response.json();
                if (!allUniversities.length) throw new Error("获取的高校数据为空。");
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
                const container = filterUIs[key];
                if (!container) return;
                const sortedValues = Array.from(valueSet).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
                container.innerHTML = sortedValues.map(value => `<label><input type="checkbox" value="${value}"> ${value}</label>`).join('');
                
                const filterGroup = container.closest('.filter-group');
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
                    } else {
                        if (!valueSet.has(uni[key])) return false;
                    }
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
                 if (key2) {
                     if (!hierarchy[v1][v2]) hierarchy[v1][v2] = [];
                     hierarchy[v1][v2].push(item);
                 } else {
                     hierarchy[v1].push(item);
                 }
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
                    } else {
                        hierarchy[l1Key].forEach(uni => html += renderUniLi(uni, 'level-2-li'));
                    }
                    html += `</ul></li>`;
                }
            }
            html += '</ul>';
            treeContainer.innerHTML = html;
            syncUniCheckboxesWithState();
            attachUniEventListeners();
            
            const expandValue = expandCollapseSwitcher.querySelector('input:checked').value;
            toggleAllNodes(expandValue === 'expand');
        }

        function renderUniLi(uni, liClass = 'level-3-li') {
            if (!uni || !uni[UNI_NAME_KEY]) return '';
            const details = btoa(encodeURIComponent(JSON.stringify(uni)));
            return `<li class="${liClass}" data-details="${details}"><input type="checkbox" value="${uni[UNI_NAME_KEY]}"><span class="uni-label">${uni[UNI_NAME_KEY]}</span></li>`;
        }
        
        function attachUniEventListeners() {
            const tree = document.getElementById('uni-tree');
            if(!tree) return;
            tree.addEventListener('click', e => {
                 if (e.target.classList.contains('tree-label')) { e.target.closest('li').querySelector('.nested')?.classList.toggle('active'); e.target.classList.toggle('caret-down'); }
                 if (e.target.classList.contains('uni-label')) showUniDetails(e.target.closest('li'));
            });
            tree.addEventListener('change', e => { if (e.target.type === 'checkbox') handleUniCheckboxChange(e.target); });
            tree.addEventListener('mouseover', e => { if (e.target.classList.contains('uni-label')) showUniDetails(e.target.closest('li')); });
        }

        function handleUniCheckboxChange(checkbox) {
            const currentLi = checkbox.closest('li');
            const isChecked = checkbox.checked;
            const affectedLis = currentLi.matches('.level-3-li, .level-2-li[data-details]') ? [currentLi] : Array.from(currentLi.querySelectorAll('.level-3-li, .level-2-li[data-details]'));
            affectedLis.forEach(li => {
                const uniData = JSON.parse(decodeURIComponent(atob(li.dataset.details)));
                const code = uniData[UNI_CODE_KEY];
                if (isChecked && !selectedUniversities.has(code)) selectedUniversities.set(code, uniData);
                else if (!isChecked) selectedUniversities.delete(code);
            });
            cascadeUniCheckboxVisuals(checkbox);
            updateUniOutputUI();
        }

        function updateUniOutputUI() {
            const names = Array.from(selectedUniversities.values()).map(uni => uni[UNI_NAME_KEY]);
            outputTextarea.value = names.join(' ');
            const count = selectedUniversities.size;
            selectionCounter.textContent = count > 0 ? `${count}个` : '';
            copyButton.classList.toggle('disabled', count === 0);
            clearButton.classList.toggle('disabled', count === 0);
        }

        function syncUniCheckboxesWithState() {
             document.querySelectorAll('#uni-tree li[data-details]').forEach(li => {
                const uniData = JSON.parse(decodeURIComponent(atob(li.dataset.details)));
                li.querySelector('input').checked = selectedUniversities.has(uniData[UNI_CODE_KEY]);
             });
             document.querySelectorAll('#uni-tree .level-1-li, #uni-tree .level-2-li:not([data-details])').forEach(parentLi => {
                cascadeUniCheckboxVisuals(parentLi.querySelector(':scope > input[type="checkbox"]'));
             });
        }
        
        function cascadeUniCheckboxVisuals(checkbox) {
            const currentLi = checkbox.closest('li');
            const isChecked = checkbox.checked;
            currentLi.querySelectorAll(':scope > ul input[type="checkbox"]').forEach(childCb => childCb.checked = isChecked);
            let parentLi = currentLi.parentElement.closest('li');
            while (parentLi) {
                const parentCheckbox = parentLi.querySelector(':scope > input[type="checkbox"]');
                const childCheckboxes = Array.from(parentLi.querySelectorAll(':scope > ul > li > input[type="checkbox"]'));
                if(!childCheckboxes.length) break;
                const allChecked = childCheckboxes.every(cb => cb.checked);
                const someChecked = childCheckboxes.some(cb => cb.checked || cb.indeterminate);
                if(allChecked) { parentCheckbox.checked = true; parentCheckbox.indeterminate = false; }
                else if(someChecked) { parentCheckbox.checked = false; parentCheckbox.indeterminate = true; }
                else { parentCheckbox.checked = false; parentCheckbox.indeterminate = false; }
                parentLi = parentLi.parentElement.closest('li');
            }
        }
        
        function showUniDetails(li) {
            if (!li || !li.dataset.details) return;
            const d = JSON.parse(decodeURIComponent(atob(li.dataset.details)));
            
            const layout = [
                ['办学性质', '办学层次', '院校类型'],
                ['省份', '城市', '城市评级'],
                [UNI_NAME_KEY, UNI_CODE_KEY],
                ['院校水平'],
                ['主管部门', '院校来历', '建校时间'],
                ['招生电话', '院校地址'],
                ['软科校排', '校硕点', '校博点'],
                ['第四轮学科评估统计'],
                ['第四轮学科评估结果'],
                ['一流学科数量', '一流学科'],
            ];
            const handledKeys = new Set(layout.flat());
            let html = '';

            layout.forEach(row => {
                const rowHtml = row.map(key => {
                    const value = d[key];
                    if (!value) return '';
                    return `<p class="compact-row"><strong>${key}:</strong> <span>${value}</span></p>`;
                }).join('');
                if (rowHtml) html += `<div class="compact-row-container">${rowHtml}</div>`;
            });

            const rates = Object.keys(d).filter(k => k.includes('推免率')).sort().reverse();
            if (rates.length > 0) {
                const ratesHtml = rates.map(key => d[key] ? `${key.substring(0, 2)}年:${d[key]}` : '').filter(Boolean).join(' | ');
                html += `<p><strong>历年推免率:</strong> <span>${ratesHtml}</span></p>`;
                rates.forEach(key => handledKeys.add(key));
            }

            const升本率Key = '23年升本率';
            if (d[升本率Key]) {
                html += `<p><strong>${升本率Key}:</strong> <span>${d[升本率Key]}</span></p>`;
                handledKeys.add(升本率Key);
            }
            
            const links = ['招生章程', '学校招生信息', '校园VR', '院校百科', '就业质量', '官网'];
            links.forEach(key => {
                let value = d[key];
                if (value) {
                    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
                         value = `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
                    }
                    html += `<p><strong>${key}:</strong> <span>${value}</span></p>`;
                    handledKeys.add(key);
                }
            });
            detailsContent.innerHTML = html;
        }

        function toggleAllNodes(shouldExpand) {
             treeContainer.querySelectorAll('.nested').forEach(ul => ul.classList.toggle('active', shouldExpand));
             treeContainer.querySelectorAll('.caret').forEach(caret => caret.classList.toggle('caret-down', shouldExpand));
        }
        
        groupBySwitcher.addEventListener('change', e => { groupBy = e.target.value; runQuery(); });
        queryButton.addEventListener('click', runQuery);
        searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') runQuery(); });
        expandCollapseSwitcher.addEventListener('change', e => toggleAllNodes(e.target.value === 'expand'));
        copyButton.addEventListener('click', () => { if (!outputTextarea.value) return; navigator.clipboard.writeText(outputTextarea.value).then(() => { copyButton.textContent = '已复制!'; setTimeout(() => { copyButton.textContent = '复制'; }, 1500); }); });
        clearButton.addEventListener('click', () => { if (selectedUniversities.size === 0) return; selectedUniversities.clear(); runQuery(); updateUniOutputUI(); });

        fetchData();
        updateUniOutputUI();
    }
    
    // --- MAJORS TAB LOGIC (self-contained and unchanged) ---
    function initializeMajorsTab() {
        const majorsTab = document.getElementById('majors-tab');
        if (majorsTab.dataset.initialized) return;
        majorsTab.dataset.initialized = 'true';
        
        majorsTab.innerHTML = `
            <div class="app-container" id="app-container-majors">
                <div class="left-panel">
                    <div class="header-controls">
                         <h2>专业目录</h2>
                        <div class="switcher">
                            <input type="radio" name="major-catalog-type" value="bachelor" id="bachelor-major" checked>
                            <label for="bachelor-major">本科</label>
                            <input type="radio" name="major-catalog-type" value="associate" id="associate-major">
                            <label for="associate-major">专科</label>
                        </div>
                        <div class="search-container">
                            <input type="search" id="major-search-input" placeholder="输入专业名关键字...">
                            <button id="major-query-button" class="query-button">查询</button>
                        </div>
                    </div>
                    <div id="major-tree-container" class="major-tree-container"><p>正在加载...</p></div>
                </div>
                <div class="right-panel">
                    <h3>专业详情</h3>
                    <div id="major-details-content" class="details-content"><p>请选择目录后进行操作。</p></div>
                    <div class="output-container">
                        <div class="output-header">
                            <h3>所选专业<span id="major-selection-counter"></span></h3>
                            <div class="button-group">
                                <button id="major-copy-button" class="output-button">复制</button>
                                <button id="major-clear-button" class="output-button">清空</button>
                            </div>
                        </div>
                        <textarea id="major-output-textarea" readonly placeholder="您勾选的专业将按选择顺序列在这里..."></textarea>
                    </div>
                </div>
            </div>`;
        
        const container = majorsTab;
        const catalogSwitcher = container.querySelector('input[name="major-catalog-type"]')?.parentElement;
        const searchInput = container.querySelector('#major-search-input');
        const queryButton = container.querySelector('#major-query-button');
        const treeContainer = container.querySelector('#major-tree-container');
        const outputTextarea = container.querySelector('#major-output-textarea');
        const detailsContent = container.querySelector('#major-details-content');
        const copyButton = container.querySelector('#major-copy-button');
        const clearButton = container.querySelector('#major-clear-button');
        const selectionCounter = container.querySelector('#major-selection-counter');

        let fullMajorData = null;
        let currentCatalogType = 'bachelor';
        let selectedMajors = new Map();
        
        async function fetchData(type) { currentCatalogType = type; treeContainer.innerHTML = '<p>正在加载...</p>'; fullMajorData = null; try { const response = await fetch(`/api/getMajors?type=${type}`); if (!response.ok) throw new Error(`Network error: ${response.statusText}`); fullMajorData = await response.json(); if (!fullMajorData || Object.keys(fullMajorData).length === 0) throw new Error("获取的专业数据为空。"); renderTree(fullMajorData, type); } catch (error) { console.error("Failed to fetch major data:", error); treeContainer.innerHTML = `<p style="color:red;">${error.message}</p>`; } }
        function renderTree(hierarchy, type, autoExpand = false) { treeContainer.innerHTML = renderTreeHTML(hierarchy, type, autoExpand); syncCheckboxesWithState(); attachEventListeners(); }
        function generateFilteredData(sourceData, keyword) { const filteredHierarchy = {}; const majorNameKey = '专业名'; for (const l1Value in sourceData) { for (const l2Value in sourceData[l1Value]) { const majors = sourceData[l1Value][l2Value]; const matchingMajors = majors.filter(major => (major[majorNameKey] || '').toLowerCase().includes(keyword)); if (matchingMajors.length > 0) { if (!filteredHierarchy[l1Value]) filteredHierarchy[l1Value] = {}; filteredHierarchy[l1Value][l2Value] = matchingMajors; } } } return filteredHierarchy; }
        function renderTreeHTML(hierarchy, type, autoExpand = false) { const majorNameKey = '专业名'; const majorCodeKey = '专业码'; let html = '<ul>'; if (Object.keys(hierarchy).length === 0) { html += '<li>没有找到匹配的专业。</li>'; } else { for (const level1Key in hierarchy) { html += `<li class="level-1-li"><input type="checkbox"> <span class="caret ${autoExpand ? 'caret-down' : ''} tree-label">${level1Key}</span><ul class="nested ${autoExpand ? 'active' : ''}">`; for (const level2Key in hierarchy[level1Key]) { const majors = hierarchy[level1Key][level2Key]; html += `<li class="level-2-li"><input type="checkbox"> <span class="caret ${autoExpand ? 'caret-down' : ''} tree-label">${level2Key}</span><ul class="nested ${autoExpand ? 'active' : ''}">`; majors.sort((a, b) => (String(a[majorCodeKey] || '').localeCompare(String(b[majorCodeKey] || '')))); majors.forEach(major => { const detailsBase64 = btoa(encodeURIComponent(JSON.stringify(major))); const majorName = major[majorNameKey] || '未知专业'; const majorCode = major[majorCodeKey] || ''; html += `<li class="level-3-li" data-details="${detailsBase64}"><input type="checkbox" value="${majorName}"><span class="major-label">${majorName} (${majorCode})</span></li>`; }); html += '</ul></li>'; } html += '</ul></li>'; } } html += '</ul>'; return html; }
        function attachEventListeners() { const tree = majorsTab.querySelector('#major-tree-container > ul'); if (!tree) return; tree.addEventListener('click', e => { if (e.target.classList.contains('tree-label')) { const parentLi = e.target.closest('li'); parentLi.querySelector('.nested')?.classList.toggle('active'); e.target.classList.toggle('caret-down'); } if (e.target.classList.contains('major-label')) showDetails(e.target.closest('li')); }); tree.addEventListener('change', e => { if (e.target.type === 'checkbox') handleCheckboxChange(e.target); }); tree.addEventListener('mouseover', e => { if (e.target.classList.contains('major-label')) showDetails(e.target.closest('li')); }); }
        function handleCheckboxChange(checkbox) { const codeKey = '专业码'; const currentLi = checkbox.closest('li'); const isChecked = checkbox.checked; const affectedLis = currentLi.matches('.level-3-li') ? [currentLi] : Array.from(currentLi.querySelectorAll('.level-3-li')); affectedLis.forEach(li => { const majorData = JSON.parse(decodeURIComponent(atob(li.dataset.details))); const code = majorData[codeKey]; if (isChecked && !selectedMajors.has(code)) selectedMajors.set(code, majorData); else if (!isChecked) selectedMajors.delete(code); }); cascadeCheckboxVisuals(checkbox); updateOutputUI(); }
        function updateOutputUI() { const nameKey = '专业名'; const names = Array.from(selectedMajors.values()).map(major => major[nameKey]); outputTextarea.value = names.join(' '); const count = selectedMajors.size; selectionCounter.textContent = count > 0 ? `${count}个` : ''; updateButtonsState(); }
        function updateButtonsState() { const hasContent = selectedMajors.size > 0; copyButton.classList.toggle('disabled', !hasContent); clearButton.classList.toggle('disabled', !hasContent); }
        function syncCheckboxesWithState() { const codeKey = '专业码'; majorsTab.querySelectorAll('.level-3-li').forEach(li => { const majorData = JSON.parse(decodeURIComponent(atob(li.dataset.details))); li.querySelector('input').checked = selectedMajors.has(majorData[codeKey]); }); majorsTab.querySelectorAll('.level-1-li, .level-2-li').forEach(parentLi => cascadeCheckboxVisuals(parentLi.querySelector(':scope > input[type="checkbox"]'))); }
        function cascadeCheckboxVisuals(checkbox) { const currentLi = checkbox.closest('li'); const isChecked = checkbox.checked; currentLi.querySelectorAll(':scope > ul input[type="checkbox"]').forEach(childCb => childCb.checked = isChecked); let parentLi = currentLi.parentElement.closest('li'); while (parentLi) { const parentCheckbox = parentLi.querySelector(':scope > input[type="checkbox"]'); const childCheckboxes = Array.from(parentLi.querySelectorAll(':scope > ul > li > input[type="checkbox"]')); if(!childCheckboxes.length) break; const allChecked = childCheckboxes.every(cb => cb.checked); const someChecked = childCheckboxes.some(cb => cb.checked || cb.indeterminate); if (allChecked) { parentCheckbox.checked = true; parentCheckbox.indeterminate = false; } else if (someChecked) { parentCheckbox.checked = false; parentCheckbox.indeterminate = true; } else { parentCheckbox.checked = false; parentCheckbox.indeterminate = false; } parentLi = parentLi.parentElement.closest('li'); } }
        function showDetails(targetLi) { if (!targetLi || !targetLi.dataset.details) return; const d = JSON.parse(decodeURIComponent(atob(targetLi.dataset.details))); let detailsHtml = ''; for (const key in d) { if (d.hasOwnProperty(key) && d[key]) { let value = d[key]; if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) { value = `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`; } detailsHtml += `<p><strong>${key}:</strong> <span>${value}</span></p>`; } } detailsContent.innerHTML = detailsHtml; }
        
        catalogSwitcher.addEventListener('change', (e) => { searchInput.value = ''; fetchData(e.target.value); });
        queryButton.addEventListener('click', () => { if(!fullMajorData) return; const keyword = searchInput.value.trim().toLowerCase(); const dataToRender = keyword ? generateFilteredData(fullMajorData, keyword) : fullMajorData; renderTree(dataToRender, currentCatalogType, !!keyword); });
        searchInput.addEventListener('keyup', e => { if(e.key === 'Enter') queryButton.click(); });
        copyButton.addEventListener('click', () => { if(!outputTextarea.value) return; navigator.clipboard.writeText(outputTextarea.value).then(() => { copyButton.textContent = '已复制!'; setTimeout(() => { copyButton.textContent = '复制'; }, 1500); }); });
        clearButton.addEventListener('click', () => { if(selectedMajors.size === 0) return; selectedMajors.clear(); renderTree(fullMajorData, currentCatalogType); updateOutputUI(); });

        fetchData('bachelor');
        updateOutputUI();
    }
    
    // --- KICKSTART THE APP ---
    initializeGlobal();
    initializeUniversitiesTab();
});
