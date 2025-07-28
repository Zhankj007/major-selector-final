document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Element References ---
    const catalogSwitcher = document.querySelector('input[name="catalog-type"]')?.parentElement;
    const searchInput = document.getElementById('search-input');
    const queryButton = document.getElementById('query-button');
    const treeContainer = document.getElementById('major-tree-container');
    const outputTextarea = document.getElementById('output-textarea');
    const detailsContent = document.getElementById('details-content');
    const copyButton = document.getElementById('copy-button');
    const clearButton = document.getElementById('clear-button');
    
    // --- Application State ---
    let fullMajorData = null;
    let currentCatalogType = 'bachelor';
    // NEW: Use a Map to store selections. It preserves insertion order and handles uniqueness.
    // Key: major code (string), Value: major object
    let selectedMajors = new Map();

    // --- 1. CORE LOGIC ---
    async function fetchData(type = 'bachelor') {
        currentCatalogType = type;
        treeContainer.innerHTML = '<p>正在从云端加载专业数据，请稍候...</p>';
        fullMajorData = null;
        try {
            const response = await fetch(`/api/getMajors?type=${type}`);
            if (!response.ok) throw new Error(`网络请求失败 (状态码: ${response.status})`);
            fullMajorData = await response.json();
            if (!fullMajorData || Object.keys(fullMajorData).length === 0) {
                throw new Error("获取到的数据为空，请检查后端或CSV文件。");
            }
            renderTree(fullMajorData, type);
        } catch (error) {
            console.error(error);
            treeContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    }

    function renderTree(hierarchy, type, autoExpand = false) {
        treeContainer.innerHTML = renderTreeHTML(hierarchy, type, autoExpand);
        syncCheckboxesWithState(); // Sync UI with our stored selections
        attachEventListeners();
    }

    // --- 2. EVENT LISTENERS ---
    catalogSwitcher.addEventListener('change', (e) => {
        searchInput.value = '';
        fetchData(e.target.value);
    });

    queryButton.addEventListener('click', () => {
        if (!fullMajorData) return alert("数据尚未加载完成，请稍候。");
        const keyword = searchInput.value.trim().toLowerCase();
        const dataToRender = keyword ? generateFilteredData(fullMajorData, keyword) : fullMajorData;
        renderTree(dataToRender, currentCatalogType, !!keyword);
    });
    
    searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') queryButton.click(); });

    copyButton.addEventListener('click', () => {
        if (!outputTextarea.value) return;
        navigator.clipboard.writeText(outputTextarea.value).then(() => {
            copyButton.textContent = '已复制!';
            setTimeout(() => { copyButton.textContent = '复制'; }, 1500);
        });
    });

    clearButton.addEventListener('click', () => {
        if (selectedMajors.size === 0) return;
        selectedMajors.clear();
        document.querySelectorAll('#major-tree input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
            cb.indeterminate = false;
        });
        updateOutput();
    });

    // --- 3. STATE MANAGEMENT & UI SYNC ---

    function handleCheckboxChange(checkbox) {
        const majorNameKey = '专业名';
        const majorCodeKey = '专业码';
        const currentLi = checkbox.closest('li');
        const isChecked = checkbox.checked;

        // Find all affected L3 majors
        const affectedMajors = [];
        currentLi.querySelectorAll('.level-3-li').forEach(li => {
            const majorData = JSON.parse(decodeURIComponent(atob(li.dataset.details)));
            affectedMajors.push(majorData);
        });
        // If the clicked checkbox is an L3 itself
        if (affectedMajors.length === 0 && currentLi.classList.contains('level-3-li')) {
             const majorData = JSON.parse(decodeURIComponent(atob(currentLi.dataset.details)));
             affectedMajors.push(majorData);
        }

        // Update the selection state map
        affectedMajors.forEach(major => {
            const code = major[majorCodeKey];
            if (isChecked) {
                if (!selectedMajors.has(code)) {
                    selectedMajors.set(code, major);
                }
            } else {
                selectedMajors.delete(code);
            }
        });
        
        // Cascade visual changes and update output
        cascadeCheckboxVisuals(checkbox);
        updateOutput();
    }
    
    function updateOutput() {
        const majorNameKey = '专业名';
        const names = Array.from(selectedMajors.values()).map(major => major[majorNameKey]);
        outputTextarea.value = names.join(' ');
        updateButtonsState();
    }

    function updateButtonsState() {
        const hasContent = selectedMajors.size > 0;
        copyButton.classList.toggle('disabled', !hasContent);
        clearButton.classList.toggle('disabled', !hasContent);
    }

    function syncCheckboxesWithState() {
        const majorCodeKey = '专业码';
        document.querySelectorAll('.level-3-li').forEach(li => {
            const majorData = JSON.parse(decodeURIComponent(atob(li.dataset.details)));
            const code = majorData[majorCodeKey];
            li.querySelector('input').checked = selectedMajors.has(code);
        });
        // After syncing L3, update all parent states
        document.querySelectorAll('.level-1-li, .level-2-li').forEach(parentLi => {
            cascadeCheckboxVisuals(parentLi.querySelector('input'));
        });
    }

    // --- 4. UTILITY & HELPER FUNCTIONS ---
    
    function cascadeCheckboxVisuals(checkbox) {
        const currentLi = checkbox.closest('li');
        const isChecked = checkbox.checked;
        currentLi.querySelectorAll('input[type="checkbox"]').forEach(childCb => {
            if (childCb !== checkbox) childCb.checked = isChecked;
        });
        let parentLi = currentLi.parentElement.closest('li');
        while (parentLi) {
            const parentCheckbox = parentLi.querySelector(':scope > input[type="checkbox"]');
            const childCheckboxes = Array.from(parentLi.querySelectorAll(':scope > ul > li > input[type="checkbox"]'));
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
    
    function generateFilteredData(sourceData, keyword) { /* ... same as before ... */ }
    function renderTreeHTML(hierarchy, type, autoExpand = false) { /* ... same as before ... */ }
    function attachEventListeners() { /* ... same as before, BUT with a change in the 'change' listener */ }
    function showDetails(targetLi) { /* ... same as before ... */ }
    
    // --- Final Initialization ---
    fetchData('bachelor');
    updateButtonsState(); // Initial button state
    
    // --- Full function definitions for copy-paste convenience ---
    function generateFilteredData(sourceData, keyword) {
        const filteredHierarchy = {};
        const majorNameKey = '专业名';
        for (const l1Value in sourceData) {
            for (const l2Value in sourceData[l1Value]) {
                const majors = sourceData[l1Value][l2Value];
                const matchingMajors = majors.filter(major => (major[majorNameKey] || '').toLowerCase().includes(keyword));
                if (matchingMajors.length > 0) {
                    if (!filteredHierarchy[l1Value]) filteredHierarchy[l1Value] = {};
                    filteredHierarchy[l1Value][l2Value] = matchingMajors;
                }
            }
        }
        return filteredHierarchy;
    }
    function renderTreeHTML(hierarchy, type, autoExpand = false) {
        const majorNameKey = '专业名'; const majorCodeKey = '专业码'; let html = '<ul id="major-tree">';
        if (Object.keys(hierarchy).length === 0) { html += '<li>没有找到匹配的专业。</li>'; }
        else {
            for (const level1Key in hierarchy) {
                html += `<li class="level-1-li"><input type="checkbox" class="level-1"> <span class="caret ${autoExpand ? 'caret-down' : ''} tree-label">${level1Key}</span><ul class="nested ${autoExpand ? 'active' : ''}">`;
                for (const level2Key in hierarchy[level1Key]) {
                    const majors = hierarchy[level1Key][level2Key];
                    html += `<li class="level-2-li"><input type="checkbox" class="level-2"> <span class="caret ${autoExpand ? 'caret-down' : ''} tree-label">${level2Key}</span><ul class="nested ${autoExpand ? 'active' : ''}">`;
                    majors.sort((a, b) => (a[majorCodeKey] || '').localeCompare(b[majorCodeKey] || ''));
                    majors.forEach(major => {
                        const detailsBase64 = btoa(encodeURIComponent(JSON.stringify(major)));
                        const majorName = major[majorNameKey] || '未知专业'; const majorCode = major[majorCodeKey] || '';
                        html += `<li class="level-3-li" data-details="${detailsBase64}"><input type="checkbox" class="level-3" value="${majorName}"><span class="major-label" title="${majorName} (${majorCode})">${majorName} (${majorCode})</span></li>`;
                    });
                    html += '</ul></li>';
                }
                html += '</ul></li>';
            }
        }
        html += '</ul>'; return html;
    }
    function attachEventListeners() {
        const tree = document.getElementById('major-tree');
        if (!tree) return;
        tree.addEventListener('click', function (e) {
            if (e.target.classList.contains('tree-label')) {
                const parentLi = e.target.closest('li');
                parentLi.querySelector('.nested')?.classList.toggle('active');
                parentLi.querySelector('.caret')?.classList.toggle('caret-down');
            }
            if (e.target.classList.contains('major-label')) {
                showDetails(e.target.closest('li'));
            }
        });
        tree.addEventListener('change', function (e) { if (e.target.type === 'checkbox') { handleCheckboxChange(e.target); } });
        tree.addEventListener('mouseover', function (e) { if (e.target.classList.contains('major-label')) { showDetails(e.target.closest('li')); } });
    }
    function showDetails(targetLi) {
        if (targetLi && targetLi.hasAttribute('data-details')) {
            const d = JSON.parse(decodeURIComponent(atob(targetLi.getAttribute('data-details'))));
            let detailsHtml = '';
            for (const key in d) {
                if (d.hasOwnProperty(key) && d[key]) {
                    let value = d[key];
                    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
                        value = `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
                    }
                    detailsHtml += `<p><strong>${key}:</strong> <span>${value}</span></p>`;
                }
            }
            detailsContent.innerHTML = detailsHtml;
        }
    }
});
