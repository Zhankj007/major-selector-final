document.addEventListener('DOMContentLoaded', function () {
    // --- GLOBAL APP INITIALIZATION ---
    function initializeGlobal() {
        const versionInfo = document.getElementById('version-info');
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        versionInfo.textContent = `v${year}${month}${day}`;

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
            });
        }

        function runQuery() {
            const keyword = searchInput.value.trim().toLowerCase();
            const activeFilters = {};
            Object.keys(filterUIs).forEach(key => {
                const checked = Array.from(filterUIs[key].querySelectorAll('input:checked')).map(cb => cb.value);
                if (checked.length) activeFilters[key] = new Set(checked);
            });
            let filteredList = allUniversities.filter(uni => {
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
            // --- FIX 1: Convert code to string before sorting ---
            const sortFn = (a, b) => (String(a[UNI_CODE_KEY] || '').localeCompare(String(b[UNI_CODE_KEY] || '')));
            if (groupBy === 'region') hierarchy = buildHierarchy(list.sort(sortFn), '省份', '城市');
            else hierarchy = buildHierarchy(list.sort(sortFn), '主管部门');

            let html = '<ul id="uni-tree">';
            if (!list.length) html += '<li>没有找到匹配的院校。</li>';
            else {
                for(const l1Key in hierarchy) {
                    html += `<li class="level-1-li"><input type="checkbox"> <span class="caret tree-label">${l1Key}</span><ul class="nested active">`;
                    if(groupBy === 'region') {
                        for(const l2Key in hierarchy[l1Key]) {
                            html += `<li class="level-2-li"><input type="checkbox"> <span class="caret tree-label">${l2Key}</span><ul class="nested active">`;
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
        }

        function renderUniLi(uni, liClass = 'level-3-li') {
            if (!uni || !uni[UNI_NAME_KEY]) return '';
            const details = btoa(encodeURIComponent(JSON.stringify(uni)));
            return `<li class="${liClass}" data-details="${details}"><input type="checkbox" value="${uni[UNI_NAME_KEY]}"><span class="uni-label">${uni[UNI_NAME_KEY]}</span></li>`;
        }
        
        function attachUniEventListeners() { /* ... unchanged ... */ }
        function handleUniCheckboxChange(checkbox) { /* ... unchanged ... */ }
        function updateUniOutputUI() { /* ... unchanged ... */ }
        function syncUniCheckboxesWithState() { /* ... unchanged ... */ }
        function cascadeUniCheckboxVisuals(checkbox) { /* ... unchanged ... */ }
        function showUniDetails(li) { /* ... unchanged ... */ }
        
        groupBySwitcher.addEventListener('change', e => { groupBy = e.target.value; runQuery(); });
        queryButton.addEventListener('click', runQuery);
        searchInput.addEventListener('keyup', e => { if(e.key === 'Enter') runQuery(); });
        Object.values(filterUIs).forEach(container => container.addEventListener('click', e => { if(e.target.type === 'checkbox') container.parentElement.open = false; }));
        copyButton.addEventListener('click', () => { if(!outputTextarea.value) return; navigator.clipboard.writeText(outputTextarea.value).then(() => { copyButton.textContent = '已复制!'; setTimeout(() => { copyButton.textContent = '复制'; }, 1500); }); });
        clearButton.addEventListener('click', () => { if(selectedUniversities.size === 0) return; selectedUniversities.clear(); runQuery(); });

        fetchData();
        updateUniOutputUI();
    }
    
    // --- MAJORS TAB LOGIC (self-contained) ---
    function initializeMajorsTab() {
        const majorsTab = document.getElementById('majors-tab');
        if (majorsTab.dataset.initialized) return;
        majorsTab.dataset.initialized = 'true';
        majorsTab.innerHTML = `...`; // HTML injection
        
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
        
        function renderTreeHTML(hierarchy, type, autoExpand = false) { 
            const majorNameKey = '专业名'; 
            const majorCodeKey = '专业码'; 
            let html = '<ul>'; 
            if (Object.keys(hierarchy).length === 0) { 
                html += '<li>没有找到匹配的专业。</li>'; 
            } else { 
                for (const level1Key in hierarchy) { 
                    html += `<li class="level-1-li"><input type="checkbox"> <span class="caret ${autoExpand ? 'caret-down' : ''} tree-label">${level1Key}</span><ul class="nested ${autoExpand ? 'active' : ''}">`; 
                    for (const level2Key in hierarchy[level1Key]) { 
                        // --- FIX 2: Corrected variable name from l2Value to level2Key ---
                        const majors = hierarchy[level1Key][level2Key]; 
                        html += `<li class="level-2-li"><input type="checkbox"> <span class="caret ${autoExpand ? 'caret-down' : ''} tree-label">${level2Key}</span><ul class="nested ${autoExpand ? 'active' : ''}">`; 
                        majors.sort((a, b) => (a[majorCodeKey] || '').localeCompare(b[majorCodeKey] || '')); 
                        majors.forEach(major => { 
                            const detailsBase64 = btoa(encodeURIComponent(JSON.stringify(major))); 
                            const majorName = major[majorNameKey] || '未知专业'; 
                            const majorCode = major[majorCodeKey] || ''; 
                            html += `<li class="level-3-li" data-details="${detailsBase64}"><input type="checkbox" value="${majorName}"><span class="major-label">${majorName} (${majorCode})</span></li>`; 
                        }); 
                        html += '</ul></li>'; 
                    } 
                    html += '</ul></li>'; 
                } 
            } 
            html += '</ul>'; 
            return html; 
        }
        
        // ... (The rest of the majors functions are unchanged)
    }
    
    // --- KICKSTART THE APP ---
    initializeGlobal();
    initializeUniversitiesTab();

    // The full script is below for copy-pasting
});


// Full script for easy copy-paste
document
