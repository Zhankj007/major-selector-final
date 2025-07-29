document.addEventListener('DOMContentLoaded', function () {
    // --- GLOBAL APP INITIALIZATION ---
    function initializeGlobal() {
        // (Global logic remains the same)
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

    // --- UNIVERSITY TAB (BASIC TEST VERSION) ---
    function initializeUniversitiesTab() {
        const treeContainer = document.getElementById('uni-tree-container');
        // We are keeping the right panel logic for now to see details on hover
        const detailsContent = document.getElementById('uni-details-content');

        async function fetchData() {
            try {
                treeContainer.innerHTML = `<p>正在向 /api/getUniversities 发起请求...</p>`;
                const response = await fetch('/api/getUniversities');
                treeContainer.innerHTML = `<p>已收到API响应，状态码: ${response.status}。正在处理数据...</p>`;
                if (!response.ok) throw new Error(`网络错误: ${response.statusText}`);

                const allUniversities = await response.json();
                if (!allUniversities || !allUniversities.length) {
                    throw new Error("API返回的数据为空数组或无效。请检查 /api/getUniversities.js 和您的CSV文件。");
                }
                treeContainer.innerHTML = `<p>数据解析成功，共 ${allUniversities.length} 条记录。正在构建树状图...</p>`;

                renderUniversityTree(allUniversities);
            } catch (error) {
                console.error("高校数据加载或渲染失败:", error);
                treeContainer.innerHTML = `<p style="color:red;">加载失败: ${error.message}</p>`;
            }
        }

        function buildHierarchy(list, key1, key2) {
             const hierarchy = {};
             list.forEach(item => {
                 const v1 = item[key1] || '其他';
                 const v2 = item[key2] || '其他';
                 if (!hierarchy[v1]) hierarchy[v1] = {};
                 if (!hierarchy[v1][v2]) hierarchy[v1][v2] = [];
                 hierarchy[v1][v2].push(item);
             });
             return hierarchy;
        }

        function renderUniversityTree(list) {
            const hierarchy = buildHierarchy(list.sort((a,b) => (a['院校代码'] || '').localeCompare(b['院校代码'] || '')), '省份', '城市');
            let html = '<ul id="uni-tree">';
            if (!list.length) {
                html += '<li>未能构建层级结构。</li>';
            } else {
                for(const l1Key in hierarchy) {
                    html += `<li class="level-1-li"><input type="checkbox"> <span class="caret tree-label">${l1Key}</span><ul class="nested">`;
                    for(const l2Key in hierarchy[l1Key]) {
                        html += `<li class="level-2-li"><input type="checkbox"> <span class="caret tree-label">${l2Key}</span><ul class="nested">`;
                        hierarchy[l1Key][l2Key].forEach(uni => {
                             const details = btoa(encodeURIComponent(JSON.stringify(uni)));
                             html += `<li class="level-3-li" data-details="${details}"><input type="checkbox" value="${uni['院校名称']}"><span class="uni-label">${uni['院校名称']}</span></li>`;
                        });
                        html += `</ul></li>`;
                    }
                    html += `</ul></li>`;
                }
            }
            html += '</ul>';
            treeContainer.innerHTML = html;
            attachUniEventListeners();
        }

        function attachUniEventListeners() {
            const tree = document.getElementById('uni-tree');
            if(!tree) return;
            tree.addEventListener('click', e => {
                 if (e.target.classList.contains('tree-label')) {
                    const parentLi = e.target.closest('li');
                    parentLi.querySelector('.nested')?.classList.toggle('active');
                    e.target.classList.toggle('caret-down');
                }
                if (e.target.classList.contains('uni-label')) showUniDetails(e.target.closest('li'));
            });
            // Checkbox and output logic is temporarily disabled for this test
        }

        function showUniDetails(li) {
            if(!li || !li.dataset.details) return;
            const d = JSON.parse(decodeURIComponent(atob(li.dataset.details)));
            let detailsHtml = '';
            for (const key in d) {
                if (d.hasOwnProperty(key) && d[key]) {
                    detailsHtml += `<p><strong>${key}:</strong> <span>${d[key]}</span></p>`;
                }
            }
            detailsContent.innerHTML = detailsHtml;
        }

        fetchData();
    }
    
    // --- MAJORS TAB LOGIC (self-contained and unchanged) ---
    function initializeMajorsTab() {
        // This function remains exactly the same as the last version,
        // it will be pasted in full below for your convenience.
    }
    
    // --- KICKSTART THE APP ---
    initializeGlobal();
    initializeUniversitiesTab();

    // --- PASTE FULL MAJORS TAB LOGIC HERE ---
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
                        <div class="search-container" style="flex-grow: 1;">
                            <input type="search" id="major-search-input" placeholder="输入专业名关键字...">
                            <button id="major-query-button" class="query-button">查询</button>
                        </div>
                    </div>
                    <div id="major-tree-container" class="major-tree-container"><p>正在加载...</p></div>
                </div>
                <div class="right-panel">
                    <h3>专业详情</h3>
                    <div id="major-details-content" class="details-content"><p>请选择目录后进行操作。</p></div>
                    <div id="major-output-container" class="output-container">
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
        function renderTreeHTML(hierarchy, type, autoExpand = false) { const majorNameKey = '专业名'; const majorCodeKey = '专业码'; let html = '<ul>'; if (Object.keys(hierarchy).length === 0) { html += '<li>没有找到匹配的专业。</li>'; } else { for (const level1Key in hierarchy) { html += `<li class="level-1-li"><input type="checkbox"> <span class="caret ${autoExpand ? 'caret-down' : ''} tree-label">${level1Key}</span><ul class="nested ${autoExpand ? 'active' : ''}">`; for (const level2Key in hierarchy[level1Key]) { const majors = hierarchy[level1Key][level2Key]; html += `<li class="level-2-li"><input type="checkbox"> <span class="caret ${autoExpand ? 'caret-down' : ''} tree-label">${level2Key}</span><ul class="nested ${autoExpand ? 'active' : ''}">`; majors.sort((a, b) => (a[majorCodeKey] || '').localeCompare(b[majorCodeKey] || '')); majors.forEach(major => { const detailsBase64 = btoa(encodeURIComponent(JSON.stringify(major))); const majorName = major[majorNameKey] || '未知专业'; const majorCode = major[majorCodeKey] || ''; html += `<li class="level-3-li" data-details="${detailsBase64}"><input type="checkbox" value="${majorName}"><span class="major-label">${majorName} (${majorCode})</span></li>`; }); html += '</ul></li>'; } html += '</ul></li>'; } } html += '</ul>'; return html; }
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
