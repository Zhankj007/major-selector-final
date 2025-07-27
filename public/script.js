document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Element References ---
    const catalogSwitcher = document.querySelector('input[name="catalog-type"]')?.parentElement;
    const modeSwitcher = document.querySelector('input[name="mode-type"]')?.parentElement;
    const searchContainer = document.getElementById('search-container');
    const searchInput = document.getElementById('search-input');
    const queryButton = document.getElementById('query-button');
    const treeContainer = document.getElementById('major-tree-container');
    const outputTextarea = document.getElementById('output-textarea');
    const detailsContent = document.getElementById('details-content');
    const copyButton = document.getElementById('copy-button');

    // --- Application State ---
    let currentCatalogType = 'bachelor';

    // --- 1. DATA FETCHING & INITIALIZATION ---
    async function fetchData(type = 'bachelor') {
        currentCatalogType = type;
        treeContainer.innerHTML = '<p>正在从云端加载专业数据，请稍候...</p>';
        detailsContent.innerHTML = '<p>请选择一个目录，然后将鼠标悬停或轻点具体专业名称以查看详情。</p>';
        outputTextarea.value = '';

        try {
            const response = await fetch(`/api/getMajors?type=${type}`);
            if (!response.ok) throw new Error(`网络请求失败: ${response.statusText}`);
            
            const fullMajorData = await response.json();

            if (Object.keys(fullMajorData).length === 0) {
                treeContainer.innerHTML = '<p>加载数据为空或解析失败，请检查数据源或后台日志。</p>';
                return;
            }
            
            treeContainer.innerHTML = renderTreeHTML(fullMajorData, type);
            attachEventListeners();
        } catch (error) {
            console.error('Fetch error:', error);
            treeContainer.innerHTML = `<p>加载数据时发生错误: ${error.message}。</p>`;
        }
    }

    // --- 2. EVENT LISTENERS ---
    catalogSwitcher.addEventListener('change', (e) => fetchData(e.target.value));
    
    modeSwitcher.addEventListener('change', (e) => {
        const mode = e.target.value;
        if (mode === 'query') {
            searchContainer.classList.remove('hidden');
        } else {
            searchContainer.classList.add('hidden');
            searchInput.value = '';
            filterTree(); // Reset the tree to show all items
        }
    });

    queryButton.addEventListener('click', () => {
        const keyword = searchInput.value.trim().toLowerCase();
        filterTree(keyword);
    });

    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            queryButton.click();
        }
    });

    copyButton.addEventListener('click', () => {
        if (!outputTextarea.value) {
            alert('没有内容可以复制！');
            return;
        }
        navigator.clipboard.writeText(outputTextarea.value).then(() => {
            const originalText = copyButton.textContent;
            copyButton.textContent = '已复制!';
            setTimeout(() => {
                copyButton.textContent = originalText;
            }, 1500);
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制。');
        });
    });

    // --- 3. RENDERING & FILTERING ---
    function renderTreeHTML(hierarchy, type) {
        const majorNameKey = '专业名'; 
        const majorCodeKey = '专业码'; 
        let html = '<ul id="major-tree">';
        for (const level1Key in hierarchy) {
            html += `<li class="level-1-li"><input type="checkbox" class="level-1"> <span class="caret tree-label">${level1Key}</span><ul class="nested">`;
            for (const level2Key in hierarchy[level1Key]) {
                const majors = hierarchy[level1Key][level2Key];
                html += `<li class="level-2-li"><input type="checkbox" class="level-2"> <span class="caret tree-label">${level2Key}</span><ul class="nested">`;
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
        html += '</ul>';
        return html;
    }

    function filterTree(keyword = '') {
        const majorNameKey = '专业名';
        document.querySelectorAll('.level-3-li').forEach(li => {
            const detailsJson = decodeURIComponent(atob(li.dataset.details));
            const majorData = JSON.parse(detailsJson);
            const majorName = (majorData[majorNameKey] || '').toLowerCase();
            const isMatch = keyword ? majorName.includes(keyword) : true;
            li.classList.toggle('hidden', !isMatch);
        });

        document.querySelectorAll('.level-2-li').forEach(li => {
            const hasVisibleChildren = li.querySelector('.level-3-li:not(.hidden)');
            li.classList.toggle('hidden', !hasVisibleChildren);
            const shouldBeActive = !!(hasVisibleChildren && keyword);
            li.querySelector('.nested')?.classList.toggle('active', shouldBeActive);
            li.querySelector('.caret')?.classList.toggle('caret-down', shouldBeActive);
        });

        document.querySelectorAll('.level-1-li').forEach(li => {
            const hasVisibleChildren = li.querySelector('.level-2-li:not(.hidden)');
            li.classList.toggle('hidden', !hasVisibleChildren);
            const shouldBeActive = !!(hasVisibleChildren && keyword);
            li.querySelector('.nested')?.classList.toggle('active', shouldBeActive);
            li.querySelector('.caret')?.classList.toggle('caret-down', shouldBeActive);
        });
    }

    // --- 4. ATTACHING LISTENERS & UTILITY FUNCTIONS ---
    function attachEventListeners() {
        const tree = document.getElementById('major-tree');
        if (!tree) return;
        tree.addEventListener('click', function(e) {
            if (e.target.classList.contains('tree-label')) {
                const parentLi = e.target.closest('li');
                parentLi.querySelector('.nested')?.classList.toggle('active');
                e.target.classList.toggle('caret-down');
            }
            if (e.target.classList.contains('major-label')) {
                showDetails(e.target.closest('li'));
            }
        });
        tree.addEventListener('change', function(e) { if (e.target.type === 'checkbox') { handleCheckboxChange(e.target); updateOutput(); }});
        tree.addEventListener('mouseover', function(e) { if (e.target.classList.contains('major-label')) { showDetails(e.target.closest('li')); }});
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
    
    function handleCheckboxChange(checkbox) {
        const currentLi = checkbox.closest('li');
        const isChecked = checkbox.checked;
        currentLi.querySelectorAll('input[type="checkbox"]').forEach(childCb => { if (childCb !== checkbox) { childCb.checked = isChecked; childCb.indeterminate = false; } });
        let parentLi = currentLi.parentElement.closest('li');
        while (parentLi) {
            const parentCheckbox = parentLi.querySelector(':scope > input[type="checkbox"]');
            const childCheckboxes = Array.from(parentLi.querySelectorAll(':scope > ul > li > input[type="checkbox"]'));
            const allChecked = childCheckboxes.every(cb => cb.checked);
            const someChecked = childCheckboxes.some(cb => cb.checked || cb.indeterminate);
            if (allChecked) { parentCheckbox.checked = true; parentCheckbox.indeterminate = false; }
            else if (someChecked) { parentCheckbox.checked = false; parentCheckbox.indeterminate = true; }
            else { parentCheckbox.checked = false; parentCheckbox.indeterminate = false; }
            parentLi = parentLi.parentElement.closest('li');
        }
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

    // Initial data load
    fetchData('bachelor');
});
