window.initializePlansTab = function() {
    const plansTab = document.getElementById('plans-tab');
    if (!plansTab || plansTab.dataset.initialized) return;
    plansTab.dataset.initialized = 'true';

    // 1. 注入HTML结构 (无变化)
    plansTab.innerHTML = `...`; // 省略

    // ... (其他函数和变量定义无变化) ...

    function populateCityFilter() {
        const container = plansTab.querySelector('#filter-city .filter-options');
        if (!allFilterOptions.provinceCityTree) {
            container.innerHTML = `<p style="color:red;">城市数据加载不完整。</p>`;
            return;
        }
        
        let cityHtml = '<ul id="province-city-tree">';

        // **新的排序逻辑：按省份编码排序**
        const sortedProvinces = Object.keys(allFilterOptions.provinceCityTree).sort((a, b) => {
            const provinceA = allFilterOptions.provinceCityTree[a];
            const provinceB = allFilterOptions.provinceCityTree[b];
            // 规则：有编码的排在前面，然后按编码大小排序；都没有则按拼音
            if (!provinceA.code && !provinceB.code) return a.localeCompare(b, 'zh-CN');
            return (provinceA.code || Infinity) - (provinceB.code || Infinity);
        });

        for (const province of sortedProvinces) {
            const provinceData = allFilterOptions.provinceCityTree[province];
            
            // **新的排序逻辑：按城市编码排序**
            const sortedCities = provinceData.cities.sort((a, b) => {
                // 规则：有编码的排在前面，然后按编码大小排序
                // 如果都没有编码，则按拼音排序
                if (!a.code && !b.code) return a.name.localeCompare(b.name, 'zh-CN');
                return (a.code || Infinity) - (b.code || Infinity);
            });

            cityHtml += `<li><label><input type="checkbox" class="parent-checkbox"> <span class="caret tree-label">${province}</span></label><ul class="nested">`;
            cityHtml += sortedCities.map(city => `<li><label><input type="checkbox" name="city" value="${city.name}"> ${city.name} <small style="color:#888;">(${city.tier})</small></label></li>`).join('');
            cityHtml += `</ul></li>`;
        }
        cityHtml += '</ul>';
        container.innerHTML = cityHtml;
    }

    // ... (文件其余部分与上一版完全相同，此处省略以保持简洁) ...
    // 您只需用上面的 populateCityFilter 函数覆盖掉旧版本即可。
};
