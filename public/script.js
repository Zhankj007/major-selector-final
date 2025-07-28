document.addEventListener('DOMContentLoaded', function () {
    // DOM references, fetchData, event listeners for switchers/buttons...
    // All of the above part remains the same as the last version.
    
    // The key change is in this function:
    function handleCheckboxChange(checkbox) {
        const currentLi = checkbox.closest('li');
        const isChecked = checkbox.checked;

        // 1. First, cascade the check/uncheck to all children
        currentLi.querySelectorAll('input[type="checkbox"]').forEach(childCb => {
            if (childCb !== checkbox) {
                childCb.checked = isChecked;
                childCb.indeterminate = false;
            }
        });

        // 2. Then, update the state of all parents
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
        
        // --- FIX: Update the output text area LAST, after all changes are made ---
        updateOutput();
    }

    // The rest of the script (updateOutput, renderTreeHTML, etc.) remains the same.
    // For convenience, the full script is below for copy-pasting.
});

// Full script for easy copy-paste
document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Element References ---
    const catalogSwitcher = document.querySelector('input[name="catalog-type"]')?.parentElement;
    const searchInput = document.getElementById('search-input');
    const queryButton = document.getElementById('query-button');
    const treeContainer = document.getElementById('major-tree-container');
    const outputTextarea = document.getElementById('output-textarea');
    const detailsContent = document.getElementById('details-content');
    const copyButton = document.getElementById('copy-button');
    const debugInfo = document.getElementById('debug-info');

    // --- Application State ---
    let fullMajorData = null;
    let currentCatalogType = 'bachelor';
    
    function showError(message) {
        console.error(message);
        debugInfo.textContent = `发生错误: ${message}`;
        debugInfo.style.display = 'block';
    }

    async function fetchData(type = 'bachelor') {
        currentCatalogType = type;
        treeContainer.innerHTML = '<p>正在从云端加载专业数据，请稍候...</p>';
        detailsContent.innerHTML = '<p>请选择目录后进行操作。</p>';
        outputTextarea.value = '';
        fullMajorData = null;
        debugInfo.style.display = 'none';

        try {
            const response = await fetch(`/api/getMajors?type=${type}`);
            if (!response.ok) throw new Error(`网络请求失败 (状态码: ${response.status})`);
            fullMajorData = await response.json();
            if (!fullMajorData || Object.keys(fullMajorData).length === 0) {
                throw new Error("获取到的数据为空，请检查后端或CSV文件。");
            }
            renderTree(fullMajorData, type);
        } catch (error) {
            showError(error.message);
            treeContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    }

    catalogSwitcher.addEventListener('change', (e) => {
        searchInput.value = '';
        fetchData(e.target.value);
    });

    queryButton.addEventListener('click', () => {
        if (!fullMajorData) {
            alert("数据尚未加载完成，请稍候。");
            return;
        }
        const keyword = searchInput.value.trim().toLowerCase();
        const dataToRender = keyword ? generateFilteredData(fullMajorData, keyword) : fullMajorData;
        renderTree(dataToRender, currentCatalogType, !!keyword);
    });

    searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') queryButton.click(); });

    copyButton.addEventListener('click', () => {
        if (!outputTextarea.value) return alert('没有内容可以复制！');
        navigator.clipboard.writeText(outputTextarea.value).then(() => {
            copyButton.textContent = '已复制!';
            setTimeout(() => { copyButton.textContent = '复制'; }, 1500);
        });
    });

    function generateFilteredData(sourceData, keyword) {
        const filteredHierarchy = {};
        const majorNameKey = '专业名';
        const level1Key = (currentCatalogType === 'bachelor') ? '门类' : '专业大类';
        const level2Key = '专业类';
        for (const l1Value in sourceData) {
            for (const l2Value in sourceData[l1Value]) {
                const majors = sourceData[l1Value][l2Value];
                const matchingMajors = majors.filter(major =>
                    (major[majorNameKey] || '').toLowerCase().includes(keyword)
                );
                if (matchingMajors.length > 0) {
                    if (!filteredHierarchy[l1Value]) {
                        filteredHierarchy[l1Value] = {};
                    }
                    filteredHierarchy[l1Value][l2Value] = matchingMajors;
                }
            }
        }
        return filteredHierarchy;
    }

    function renderTree(hierarchy, type, autoExpand = false) {
        const majorNameKey = '专业名';
        const majorCodeKey = '专业码';
        let html = '<ul id="major-tree">';
        if (Object.keys(hierarchy).length === 0) {
            html += '<li>没有找到匹配的专业。</li>';
        } else {
            for (const level1Key in hierarchy) {
                html += `<li class="level-1-li"><input type="checkbox" class="level-1"> <span class="caret ${autoExpand ? 'caret-down' : ''} tree-label">${level1Key}</span><ul class="nested ${autoExpand ? 'active' : ''}">`;
                for (const level2Key in hierarchy[level1Key]) {
                    const majors = hierarchy[level1Key][level2Key];
                    html += `<li class="level-2-li"><input type="checkbox" class="level-2"> <span class="caret ${autoExpand ? 'caret-down' : ''} tree-label">${level2Key}</span><ul class="nested ${autoExpand ? 'active' : ''}">`;
                    majors.sort((a, b) => (a[majorCodeKey] || '').localeCompare(b[majorCodeKey] || ''));
                    majors.forEach(major => {
                        const detailsBase64 = btoa(encodeURIComponent(JSON.stringify(major)));
                        const majorName = major[majorNameKey] || '未知专业';
                        const majorCode = major[majorCodeKey] || '';
                        html += `<li class="level-3-li" data-details="${detailsBase64}"><input type="checkbox" class="level-3" value="${majorName}"><span class="major-label" title="${majorName} (${majorCode})">${majorName} (${majorCode})</span></li>`;
                    });
                    html += '</ul></li>';
                }
                html += '</ul></li>';
            }
        }
        html += '</ul>';
        treeContainer.innerHTML = html;
        attachEventListeners();
    }

    function attachEventListeners() {
        const tree = document.getElementById('major-tree');
        if (!tree) return;
        tree.addEventListener('click', function (e) {
            if (e.target.classList.contains('tree-label')) {
                const parentLi = e.target.closest('li');
                parentLi.querySelector('.nested')?.classList.toggle('active');
                e.target.classList.toggle('caret-down');
            }
            if (e.target.classList.contains('major-label')) {
                showDetails(e.target.closest('li'));
            }
        });
        tree.addEventListener('change', function (e) { 
            if (e.target.type === 'checkbox') {
                handleCheckboxChange(e.target); 
            }
        });
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

    // --- THIS IS THE CORE FIX FOR THE CHECKBOX BUG ---
    function handleCheckboxChange(checkbox) {
        const currentLi = checkbox.closest('li');
        const isChecked = checkbox.checked;

        // 1. First, cascade the check/uncheck to all children
        currentLi.querySelectorAll('input[type="checkbox"]').forEach(childCb => {
            if (childCb !== checkbox) {
                childCb.checked = isChecked;
                childCb.indeterminate = false;
            }
        });

        // 2. Then, update the state of all parents
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
        
        // 3. FINALLY, update the output text area after all changes are made
        updateOutput();
    }

    function updateOutput() {
        const selectedMajors = [];
        const tree = document.getElementById('major-tree');
        if (!tree) return;
        const selectedCheckboxes = tree.querySelectorAll('.level-3-li input[type="checkbox"]:checked');
        const majorNameKey = '专业名';
        selectedCheckboxes.forEach(cb => {
            const detailsLi = cb.closest('li');
            if (detailsLi && detailsLi.hasAttribute('data-details')) {
                const majorData = JSON.parse(decodeURIComponent(atob(detailsLi.getAttribute('data-details'))));
                selectedMajors.push(majorData[majorNameKey] || cb.value);
            } else {
                selectedMajors.push(cb.value);
            }
        });
        outputTextarea.value = selectedMajors.join(' ');
    }

    fetchData('bachelor');
});
