document.addEventListener('DOMContentLoaded', function () {
    const switcher = document.querySelector('.switcher');
    const treeContainer = document.getElementById('major-tree-container');
    const outputTextarea = document.getElementById('output-textarea');
    const detailsContent = document.getElementById('details-content');

    // --- 1. DATA FETCHING LOGIC ---
    async function fetchData(type = 'bachelor') {
        treeContainer.innerHTML = '<p>正在从云端加载专业数据，请稍候...</p>';
        detailsContent.innerHTML = '<p>请选择一个目录，然后将鼠标悬停或轻点具体专业名称以查看详情。</p>';
        outputTextarea.value = '';

        try {
            const response = await fetch(`/api/getMajors?type=${type}`);
            if (!response.ok) throw new Error(`网络请求失败: ${response.statusText}`);
            const data = await response.json();

            if (Object.keys(data).length === 0) {
                treeContainer.innerHTML = '<p>加载数据为空，请检查数据源或后台日志。</p>';
                return;
            }
            treeContainer.innerHTML = renderTree(data, type);
            attachEventListeners();

        } catch (error) {
            console.error('Fetch error:', error);
            treeContainer.innerHTML = `<p>加载数据时发生错误: ${error.message}。</p>`;
        }
    }

    // --- 2. EVENT LISTENERS ---
    switcher.addEventListener('change', (e) => {
        fetchData(e.target.value);
    });

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

    // --- 3. RENDERING & CORE LOGIC ---
    function renderTree(hierarchy, type) {
        const majorNameKey = '专业名称';
        const majorCodeKey = (type === 'bachelor') ? '代码' : '专业代码';

        let html = '<ul id="major-tree">';
        for (const level1Key in hierarchy) {
            html += `<li><input type="checkbox" class="level-1"> <span class="caret tree-label">${level1Key}</span><ul class="nested">`;
            
            for (const level2Key in hierarchy[level1Key]) {
                const majors = hierarchy[level1Key][level2Key];
                
                // *** FIX: Always render the level-2 (专业类) container ***
                html += `<li><input type="checkbox" class="level-2"> <span class="caret tree-label">${level2Key}</span><ul class="nested">`;
                
                // *** NEW: Sort majors by code before rendering ***
                majors.sort((a, b) => {
                    const codeA = a[majorCodeKey] || '';
                    const codeB = b[majorCodeKey] || '';
                    return codeA.localeCompare(codeB);
                });

                majors.forEach(major => {
                    const detailsBase64 = btoa(encodeURIComponent(JSON.stringify(major)));
                    const majorName = major[majorNameKey] || '未知专业';
                    const majorCode = major[majorCodeKey] || '';
                    html += `<li data-details="${detailsBase64}"><input type="checkbox" class="level-3" value="${majorName}"><span class="major-label" title="${majorName} (${majorCode})">${majorName} (${majorCode})</span></li>`;
                });

                html += `</ul></li>`; // Close level-2 li
            }
            html += `</ul></li>`; // Close level-1 li
        }
        html += `</ul>`;
        return html;
    }
    
    // (The rest of the functions are unchanged but included for completeness)
    function showDetails(targetLi) {
        if (targetLi && targetLi.hasAttribute('data-details')) {
            const detailsBase64 = targetLi.getAttribute('data-details');
            const detailsJson = decodeURIComponent(atob(detailsBase64));
            const d = JSON.parse(detailsJson);
            let detailsHtml = '';
            for (const key in d) {
                if (d.hasOwnProperty(key) && d[key]) {
                    detailsHtml += `<p><strong>${key}:</strong> <span>${d[key]}</span></p>`;
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
        const selectedCheckboxes = tree.querySelectorAll('.level-3:checked');
        selectedCheckboxes.forEach(cb => { selectedMajors.push(cb.value); });
        outputTextarea.value = selectedMajors.join(' ');
    }

    // Initial data load for the default selection
    fetchData('bachelor');
});
