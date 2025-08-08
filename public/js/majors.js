window.initializeMajorsTab = function() {
    const majorsTab = document.getElementById('majors-tab');
    if (!majorsTab || majorsTab.dataset.initialized) return;
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
    const MAJOR_NAME_KEY = '专业名';
    const MAJOR_CODE_KEY = '专业码';

    async function fetchData(type) {
        currentCatalogType = type;
        treeContainer.innerHTML = "<p>正在加载...</p>";
        fullMajorData = null;
        try {
            const response = await fetch(`/api/getMajors?type=${type}`);
            if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
            fullMajorData = await response.json();
            if (!fullMajorData || Object.keys(fullMajorData).length === 0) throw new Error("获取的专业数据为空。");
            renderTree(fullMajorData, type);
        } catch (error) {
            console.error("Failed to fetch major data:", error);
            treeContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
        }
    }

    function renderTree(hierarchy, type, autoExpand = false) {
        treeContainer.innerHTML = renderTreeHTML(hierarchy, type, autoExpand);
        syncCheckboxesWithState();
        attachEventListeners();
    }

    function generateFilteredData(sourceData, keyword) {
        const filteredHierarchy = {};
        for (const l1Value in sourceData) {
            for (const l2Value in sourceData[l1Value]) {
                const majors = sourceData[l1Value][l2Value];
                const matchingMajors = majors.filter(major => (major[MAJOR_NAME_KEY] || '').toLowerCase().includes(keyword));
                if (matchingMajors.length > 0) {
                    if (!filteredHierarchy[l1Value]) filteredHierarchy[l1Value] = {};
                    filteredHierarchy[l1Value][l2Value] = matchingMajors;
                }
            }
        }
        return filteredHierarchy;
    }

    function renderTreeHTML(hierarchy, type, autoExpand = false) {
        let html = '<ul id="major-tree">';
        if (Object.keys(hierarchy).length === 0) {
            html += '<li>没有找到匹配的专业。</li>';
        } else {
            for (const level1Key in hierarchy) {
                html += `<li class="level-1-li"><input type="checkbox"> <span class="caret ${autoExpand ? 'caret-down' : ''} tree-label">${level1Key}</span><ul class="nested ${autoExpand ? 'active' : ''}">`;
                for (const level2Key in hierarchy[level1Key]) {
                    const majors = hierarchy[level1Key][level2Key];
                    html += `<li class="level-2-li"><input type="checkbox"> <span class="caret ${autoExpand ? 'caret-down' : ''} tree-label">${level2Key}</span><ul class="nested ${autoExpand ? 'active' : ''}">`;
                    majors.sort((a, b) => (String(a[MAJOR_CODE_KEY] || '').localeCompare(String(b[MAJOR_CODE_KEY] || ''))));
                    majors.forEach(major => {
                        const detailsBase64 = btoa(encodeURIComponent(JSON.stringify(major)));
                        const majorName = major[MAJOR_NAME_KEY] || '未知专业';
                        const majorCode = major[MAJOR_CODE_KEY] || '';
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

    function attachEventListeners() {
        const tree = treeContainer.querySelector("#major-tree");
        if (!tree) return;
        tree.addEventListener('click', e => {
            if (e.target.classList.contains('tree-label')) {
                const parentLi = e.target.closest('li');
                parentLi.querySelector('.nested')?.classList.toggle('active');
                e.target.classList.toggle('caret-down');
            }
            if (e.target.classList.contains('major-label')) showDetails(e.target.closest('li'));
        });
        tree.addEventListener('change', e => { if (e.target.type === 'checkbox') handleCheckboxChange(e.target); });
        tree.addEventListener('mouseover', e => { if (e.target.classList.contains('major-label')) showDetails(e.target.closest('li')); });
    }

    function handleCheckboxChange(checkbox) {
        const currentLi = checkbox.closest('li');
        const isChecked = checkbox.checked;
        const affectedLis = currentLi.matches('.level-3-li') ? [currentLi] : Array.from(currentLi.querySelectorAll('.level-3-li'));
        affectedLis.forEach(li => {
            const majorData = JSON.parse(decodeURIComponent(atob(li.dataset.details)));
            const code = majorData[MAJOR_CODE_KEY];
            if (isChecked && !selectedMajors.has(code)) selectedMajors.set(code, majorData);
            else if (!isChecked) selectedMajors.delete(code);
        });
        cascadeCheckboxVisuals(checkbox);
        updateOutputUI();
    }

    function updateOutputUI() {
        const names = Array.from(selectedMajors.values()).map(major => major[MAJOR_NAME_KEY]);
        outputTextarea.value = names.join(' ');
        const count = selectedMajors.size;
        selectionCounter.textContent = count > 0 ? `${count}个` : '';
        updateButtonsState();
    }

    function updateButtonsState() {
        const hasContent = selectedMajors.size > 0;
        copyButton.classList.toggle('disabled', !hasContent);
        clearButton.classList.toggle('disabled', !hasContent);
    }

    function syncCheckboxesWithState() {
        treeContainer.querySelectorAll('.level-3-li').forEach(li => {
            const majorData = JSON.parse(decodeURIComponent(atob(li.dataset.details)));
            li.querySelector('input').checked = selectedMajors.has(majorData[MAJOR_CODE_KEY]);
        });
        treeContainer.querySelectorAll('.level-1-li, .level-2-li').forEach(parentLi => {
            cascadeCheckboxVisuals(parentLi.querySelector(':scope > input[type="checkbox"]'));
        });
    }

    function cascadeCheckboxVisuals(checkbox) {
        const currentLi = checkbox.closest('li');
        const isChecked = checkbox.checked;
        currentLi.querySelectorAll(':scope > ul input[type="checkbox"]').forEach(childCb => childCb.checked = isChecked);
        let parentLi = currentLi.parentElement.closest('li');
        while (parentLi) {
            const parentCheckbox = parentLi.querySelector(':scope > input[type="checkbox"]');
            const childCheckboxes = Array.from(parentLi.querySelectorAll(':scope > ul > li > input[type="checkbox"]'));
            if (!childCheckboxes.length) break;
            const allChecked = childCheckboxes.every(cb => cb.checked);
            const someChecked = childCheckboxes.some(cb => cb.checked || cb.indeterminate);
            if (allChecked) {
                parentCheckbox.checked = true;
                parentCheckbox.indeterminate = false;
            } else if (someChecked) {
                parentCheckbox.checked = false;
                parentCheckbox.indeterminate = true;
            } else {
                parentCheckbox.checked = false;
                parentCheckbox.indeterminate = false;
            }
            parentLi = parentLi.parentElement.closest('li');
        }
    }

    function showDetails(targetLi) {
        if (!targetLi || !targetLi.dataset.details) {
             detailsContent.innerHTML = '<h3>专业详情</h3><p>请在左侧选择专业...</p>';
            return;
        }
        const d = JSON.parse(decodeURIComponent(atob(targetLi.dataset.details)));
        const p = (v) => v || '---';
        const handledKeys = new Set();
        
        let detailsHtml = `<h3>${p(d[MAJOR_NAME_KEY])} - ${p(d[MAJOR_CODE_KEY])}</h3>`;
        handledKeys.add(MAJOR_NAME_KEY).add(MAJOR_CODE_KEY);

        const renderField = (key) => {
            if (d[key]) {
                let value = d[key];
                if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
                    value = `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
                }
                detailsHtml += `<p><strong>${key}:</strong> <span>${value}</span></p>`;
                handledKeys.add(key);
            }
        };

        const bachelorFieldsOrder = ['门类', '专业类', '学位', '学制', '设立年份', '指引必选科目', '体检限制', '培养目标', '主要课程', '就业方向或职业面向', '专业知识库链接', '开设院校链接'];
        const associateFieldsOrder = ['专业大类', '专业类', '接续高职本科', '接续普通本科', '职业证书', '职业面向', '培养目标', '专业能力', '基础课程', '核心课程', '实习实训'];
        
        const displayOrder = (currentCatalogType === 'bachelor') ? bachelorFieldsOrder : associateFieldsOrder;
        
        displayOrder.forEach(key => renderField(key));

        Object.keys(d).forEach(key => {
            if (!handledKeys.has(key)) {
                renderField(key);
            }
        });

        detailsContent.innerHTML = detailsHtml;
    }
    
    catalogSwitcher.addEventListener('change', (e) => {
        searchInput.value = '';
        fetchData(e.target.value);
    });
    queryButton.addEventListener('click', () => {
        if (!fullMajorData) return;
        const keyword = searchInput.value.trim().toLowerCase();
        const dataToRender = keyword ? generateFilteredData(fullMajorData, keyword) : fullMajorData;
        renderTree(dataToRender, currentCatalogType, !!keyword);
    });
    searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') queryButton.click(); });
    copyButton.addEventListener('click', () => { if (!outputTextarea.value) return; navigator.clipboard.writeText(outputTextarea.value).then(() => { copyButton.textContent = '已复制!'; setTimeout(() => { copyButton.textContent = '复制'; }, 1500); }); });
    clearButton.addEventListener('click', () => { if (selectedMajors.size === 0) return; selectedMajors.clear(); renderTree(fullMajorData, currentCatalogType); updateOutputUI(); });

    fetchData('bachelor');
    updateOutputUI();
}



