window.initializeUniversitiesTab = function() {
    const container = document.getElementById('universities-tab');
    if (!container || container.dataset.initialized) return;
    container.dataset.initialized = 'true';
    container.innerHTML = `
        <div class="app-container" id="app-container-universities">
            <div class="left-panel">
                <div class="header-controls">
                    <div class="switcher">
                        <input type="radio" name="uni-group-by" value="region" id="group-by-region" checked>
                        <label for="group-by-region">按地域</label>
                        <input type="radio" name="uni-group-by" value="department" id="group-by-department">
                        <label for="group-by-department">按主管部门</label>
                    </div>
                    <div class="switcher">
                        <input type="radio" name="expand-collapse" value="collapse" id="collapse-all" checked>
                        <label for="collapse-all">折叠</label>
                        <input type="radio" name="expand-collapse" value="expand" id="expand-all">
                        <label for="expand-all">展开</label>
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
        const orderMap = {
            '城市评级': cityTierOrder,
            '办学性质': ownershipOrder,
            '办学层次': eduLevelOrder
        };
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
        let html = '<div style="color: blue; margin-bottom: 10px; font-size: 14px;">鼠标在院校名称上悬停显示院校详情，点击显示2027年选考科目要求</div><ul id="uni-tree">';
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
            if (e.target.classList.contains("uni-label")) show2027SubjectRequirements(e.target.closest("li"));
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
        try {
            if (!li || !li.dataset.details) { 
                detailsContent.innerHTML = '<h3>院校详情</h3><p>请在左侧选择或查询院校...</p>';
                return;
            }

            const d = JSON.parse(decodeURIComponent(atob(li.dataset.details)));
            if (typeof d !== 'object' || d === null) {
                 throw new Error("解析后的数据不是一个有效的对象。");
            }
            
            const renderRow = (label, value) => {
                const cleanValue = value === null || typeof value === 'undefined' ? '' : String(value).trim();
                if (cleanValue === '') return '';
                let displayValue = cleanValue;
                if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
                     displayValue = `<a href="${cleanValue}" target="_blank" rel="noopener noreferrer">${cleanValue}</a>`;
                }
                return `<p><strong>${label}:</strong> <span>${displayValue}</span></p>`;
            };

            const 办学信息_parts = [d['办学性质'], d['办学层次'], d['院校类型']].filter(Boolean);
            const 所在地区_parts = [d['省份'], d['城市']].filter(Boolean);
            const 主管建校_parts = [d['主管部门'], d['建校时间']].filter(Boolean);
            
            const 硕博点_parts = [];
            if (d['校硕点']) 硕博点_parts.push(`${d['校硕点']}硕士点`);
            if (d['校博点']) 硕博点_parts.push(`${d['校博点']}博士点`);
            
            const rates_parts = ['25年', '24年', '23年', '22年', '21年', '20年'].map(year => {
                const rateKey = `${year}推免率`;
                return d[rateKey] ? `${year} ${d[rateKey]}` : null;
            }).filter(Boolean);

            const 升学比例_parts = [];
            // **最终修复：使用您提供的正确字段名**
            if (d['国内升学比例']) 升学比例_parts.push(`国内 ${d['国内升学比例']}`);
            if (d['国外升学比例']) 升学比例_parts.push(`国外 ${d['国外升学比例']}`);
            
            let html = `<h3>${d[UNI_NAME_KEY] || '---'} - ${d[UNI_CODE_KEY] || '---'}</h3>`;
            if (办学信息_parts.length > 0) html += `<p><strong>办学信息:</strong> <span>${办学信息_parts.join(' - ')}</span></p>`;
            if (所在地区_parts.length > 0) html += `<p><strong>所在地区:</strong> <span>${所在地区_parts.join(' - ')}` + (d['城市评级'] ? ` (${d['城市评级']})` : '') + `</span></p>`;
            if (主管建校_parts.length > 0) html += `<p><strong>主管/建校:</strong> <span>${主管建校_parts.join(' - ')}</span></p>`;
            html += renderRow('院校水平', d['院校水平']);
            html += renderRow('院校来历', d['院校来历']);
            html += renderRow('招生电话', d['招生电话']);
            html += renderRow('院校地址', d['院校地址']);
            html += renderRow('软科校排', d['软科校排']);
            if (硕博点_parts.length > 0) html += `<p><strong>硕博点:</strong> <span>${硕博点_parts.join('； ')}</span></p>`;
            html += renderRow('第四轮学科评估统计', d['第四轮学科评估统计']);
            html += renderRow('第四轮学科评估结果', d['第四轮学科评估结果']);
            html += renderRow('一流学科数量', d['一流学科数量']);
            html += renderRow('一流学科', d['一流学科']);
            if (rates_parts.length > 0) html += `<p><strong>历年推免率:</strong> <span>${rates_parts.join(' | ')}</span></p>`;
            if (升学比例_parts.length > 0) html += `<p><strong>升学比例:</strong> <span>${升学比例_parts.join(' | ')}</span></p>`;
            if (d['23年升本率']) html += renderRow('23年升本率', d['23年升本率']);
            html += renderRow('招生章程', d['招生章程']);
            html += renderRow('学校招生信息', d['学校招生信息']);
            html += renderRow('校园VR', d['校园VR']);
            html += renderRow('院校百科', d['院校百科']);
            html += renderRow('就业质量', d['就业质量']);
            
            detailsContent.innerHTML = html;
        } catch(error) {
            console.error("显示院校详情时出错:", error);
            detailsContent.innerHTML = `<p style="color:red;">加载详情失败: ${error.message}。请检查浏览器控制台获取详细信息。</p>`;
        }
    }

    function show2027SubjectRequirements(li) {
        try {
            if (!li || !li.dataset.details) {
                detailsContent.innerHTML = '<h3>院校详情</h3><p>请在左侧选择或查询院校...</p>';
                return;
            }

            const d = JSON.parse(decodeURIComponent(atob(li.dataset.details)));
            const universityCode = d[UNI_CODE_KEY];
            const universityName = d[UNI_NAME_KEY];

            // 显示加载状态
            detailsContent.innerHTML = `<h3>${universityName || '---'} - ${universityCode || '---'}</h3><p>正在加载2027年选考科目要求数据...</p>`;

            // 使用全局的supabaseClient实例直接查询数据库
            if (window.supabaseClient) {
                console.log(`查询院校编码: ${universityCode} 的2027年选考科目要求`);
                
                // 暂时不使用字段别名，直接查询原始带引号的字段名
                window.supabaseClient
                    .from('2027xkkmyq')
                    .select('"层次", "专业(类)名称", "选考科目要求"')
                    .eq('"院校编码"', universityCode)
                    .then(({ data, error }) => {
                        let html = `<h3>${universityName || '---'} - ${universityCode || '---'}</h3>`;
                        
                        console.log('查询结果数据:', data);
                        console.log('查询错误:', error);
                        
                        if (error) {
                            console.error("查询2027年选考科目要求数据失败:", error);
                            html += `<p style="color:red;">查询数据失败: ${error.message}</p>`;
                        } else if (!data || data.length === 0) {
                            html += '<p>该校2027年在浙江没有拟招生专业。</p>';
                        } else {
                            // 记录返回数据的结构
                            if (data.length > 0) {
                                console.log('数据字段结构:', Object.keys(data[0]));
                            }
                            
                            // 构建表格
                            html += `
                                <div class="table-container">
                                    <table class="subject-requirements-table">
                                        <thead>
                                            <tr>
                                                <th>层次</th>
                                                <th>专业(类)名称</th>
                                                <th>选考科目要求</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                            `;
                            
                            // 添加表格数据行
                            data.forEach((row, index) => {
                                console.log(`第${index+1}行数据:`, row);
                                
                                // 优先使用带双引号的字段名访问数据
                                const level = row['"层次"'] || row['层次'] || row.level || '';
                                const majorName = row['"专业(类)名称"'] || row['专业(类)名称'] || row.major_name || '';
                                const subjectRequirement = row['"选考科目要求"'] || row['选考科目要求'] || row.subject_req || '';
                                
                                html += `
                                    <tr>
                                        <td>${level}</td>
                                        <td>${majorName}</td>
                                        <td>${subjectRequirement}</td>
                                    </tr>
                                `;
                            });
                            
                            html += `
                                        </tbody>
                                    </table>
                                </div>
                            `;
                        }
                        
                        console.log('生成的HTML内容:', html);
                        detailsContent.innerHTML = html;
                    })
                    .catch(error => {
                        console.error("加载2027年选考科目要求数据失败:", error);
                        detailsContent.innerHTML = `
                            <h3>${universityName || '---'} - ${universityCode || '---'}</h3>
                            <p style="color:red;">加载2027年选考科目要求数据失败: ${error.message}</p>
                        `;
                    });
            } else {
                console.error("未找到supabaseClient实例");
                detailsContent.innerHTML = `
                    <h3>${universityName || '---'} - ${universityCode || '---'}</h3>
                    <p style="color:red;">系统错误：未找到数据库连接实例</p>
                `;
            }

        } catch(error) {
            console.error("显示2027年选考科目要求时出错:", error);
            detailsContent.innerHTML = `<p style="color:red;">加载数据失败: ${error.message}</p>`;
        }
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



