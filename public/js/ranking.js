// public/js/ranking.js — 投档线排行榜模块
(function () {
    'use strict';

    const panel = document.getElementById('ranking-tab');
    if (!panel) return;

    // ========== 状态变量 ==========
    let allData = [];           // 当前年份的全部数据
    let compareData = [];       // 对比年份的全部数据
    let availableYears = [];    // 可用年份列表
    let currentYear = null;
    let compareYear = null;
    let currentSort = '总排位';
    let isCompareMode = false;

    // ========== 初始化 UI ==========
    panel.innerHTML = `
    <div class="ranking-container">
        <div class="ranking-header">
            <h2 id="ranking-title">📊 投档线排行榜</h2>
            <div id="ranking-stats" class="ranking-stats">正在加载...</div>
        </div>

        <div class="ranking-toolbar">
            <div class="ranking-filter-group">
                <label>年份选择</label>
                <select id="ranking-year-select"></select>
            </div>
            <div class="ranking-filter-group">
                <label>省份筛选</label>
                <select id="ranking-prov-filter"><option value="">全部省份</option></select>
            </div>
            <div class="ranking-filter-group">
                <label>搜索院校</label>
                <input type="text" id="ranking-name-filter" placeholder="输入关键字...">
            </div>
            <div class="ranking-filter-group">
                <label>
                    <input type="checkbox" id="ranking-compare-toggle"> 对比上一年
                </label>
            </div>
            <div style="flex-grow: 1"></div>
            <div class="ranking-filter-group">
                <label>按位次升序排序</label>
                <div class="ranking-sort-group">
                    <button class="ranking-btn-sort" data-sort="理科排位">理科位次↑</button>
                    <button class="ranking-btn-sort" data-sort="文科排位">文科位次↑</button>
                    <button class="ranking-btn-sort active" data-sort="总排位">总位次↑</button>
                </div>
            </div>
        </div>

        <div class="ranking-table-wrapper">
            <table class="ranking-table">
                <thead>
                    <tr id="ranking-thead-row">
                        <th>省份</th>
                        <th>院校</th>
                        <th>理科排位 / 均值</th>
                        <th>理科均分</th>
                        <th>文科排位 / 均值</th>
                        <th>文科均分</th>
                        <th>总排位 / 均值</th>
                        <th>总均分</th>
                    </tr>
                </thead>
                <tbody id="ranking-tbody"></tbody>
            </table>
        </div>
    </div>`;

    // ========== DOM 引用 ==========
    const titleEl = document.getElementById('ranking-title');
    const statsEl = document.getElementById('ranking-stats');
    const yearSelect = document.getElementById('ranking-year-select');
    const provFilter = document.getElementById('ranking-prov-filter');
    const nameFilter = document.getElementById('ranking-name-filter');
    const compareToggle = document.getElementById('ranking-compare-toggle');
    const tbody = document.getElementById('ranking-tbody');
    const sortButtons = panel.querySelectorAll('.ranking-btn-sort');

    // ========== 事件绑定 ==========
    yearSelect.addEventListener('change', () => {
        currentYear = parseInt(yearSelect.value);
        loadYearData(currentYear);
    });
    provFilter.addEventListener('change', renderTable);
    nameFilter.addEventListener('input', renderTable);
    compareToggle.addEventListener('change', () => {
        isCompareMode = compareToggle.checked;
        if (isCompareMode) {
            loadCompareData();
        } else {
            compareData = [];
            compareYear = null;
            renderTable();
        }
    });
    sortButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            sortButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSort = btn.dataset.sort;
            renderTable();
        });
    });

    // ========== 数据加载 ==========
    async function init() {
        try {
            const res = await fetch('/api/getRanking?year=list');
            const json = await res.json();
            availableYears = json.years || [];
            if (availableYears.length === 0) {
                statsEl.textContent = '暂无排行榜数据';
                return;
            }
            // 填充年份下拉
            yearSelect.innerHTML = availableYears.map(y =>
                `<option value="${y}">${y}年</option>`
            ).join('');
            currentYear = availableYears[0]; // 默认最新年份
            await loadYearData(currentYear);
        } catch (err) {
            statsEl.textContent = '加载失败: ' + err.message;
        }
    }

    async function loadYearData(year) {
        statsEl.textContent = '正在加载数据...';
        tbody.innerHTML = '';
        try {
            const res = await fetch(`/api/getRanking?year=${year}`);
            const json = await res.json();
            allData = json.data || [];
            titleEl.textContent = `📊 ${year}年浙江高考普通类平行录取高校投档线排行榜`;

            // 填充省份下拉，使用官方排序
            const provOrder = ['北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆', '台湾', '香港', '澳门'];
            const provinces = [...new Set(allData.map(d => d['省份']))].sort((a, b) => {
                const idxA = provOrder.indexOf(a);
                const idxB = provOrder.indexOf(b);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.localeCompare(b, 'zh-Hans-CN');
            });
            provFilter.innerHTML = '<option value="">全部省份</option>' +
                provinces.map(p => `<option value="${p}">${p}</option>`).join('');

            // 如果对比模式开启，也加载对比数据
            if (isCompareMode) {
                await loadCompareData();
            } else {
                renderTable();
            }
        } catch (err) {
            statsEl.textContent = '加载失败: ' + err.message;
        }
    }

    async function loadCompareData() {
        const idx = availableYears.indexOf(currentYear);
        if (idx < 0 || idx >= availableYears.length - 1) {
            compareData = [];
            compareYear = null;
            statsEl.textContent = '没有更早年份的数据可供对比';
            renderTable();
            return;
        }
        compareYear = availableYears[idx + 1];
        try {
            const res = await fetch(`/api/getRanking?year=${compareYear}`);
            const json = await res.json();
            compareData = json.data || [];
            renderTable();
        } catch {
            compareData = [];
            compareYear = null;
            renderTable();
        }
    }

    // ========== 排序辅助 ==========
    function extractRankNum(rankStr) {
        // 从 "理0001" / "文0012" / "总0003" 中提取数字
        if (!rankStr || typeof rankStr !== 'string') return Infinity;
        const m = rankStr.match(/\d+/);
        return m ? parseInt(m[0]) : Infinity;
    }

    // ========== 渲染表格 ==========
    function renderTable() {
        const provVal = provFilter.value;
        const nameVal = nameFilter.value.trim().toLowerCase();

        // 筛选
        let filtered = allData.filter(d => {
            if (provVal && d['省份'] !== provVal) return false;
            if (nameVal && !d['院校'].toLowerCase().includes(nameVal)) return false;
            return true;
        });

        // 排序
        filtered.sort((a, b) => extractRankNum(a[currentSort]) - extractRankNum(b[currentSort]));

        // 构建对比索引（用院校名作为 key）
        let compareMap = {};
        if (isCompareMode && compareData.length > 0) {
            compareData.forEach(d => { compareMap[d['院校']] = d; });
        }

        // 渲染
        let html = '';
        for (const row of filtered) {
            const prev = compareMap[row['院校']];
            html += buildRow(row, prev);
        }

        tbody.innerHTML = html;
        statsEl.textContent = `共 ${filtered.length} / ${allData.length} 所院校` +
            (isCompareMode && compareYear ? ` (对比 ${compareYear} 年)` : '');
    }

    function buildRow(cur, prev) {
        const sciRank = cur['理科排位'] || '';
        const sciScore = cur['理科校投档线均分'];
        const sciPos = cur['理科校投档位次号均值'];
        const artRank = cur['文科排位'] || '';
        const artScore = cur['文科校投档线均分'];
        const artPos = cur['文科校投档位次号均值'];
        const totalRank = cur['总排位'] || '';
        const totalScore = cur['校投档线均分'];
        const totalPos = cur['校投档位次号均值'];

        const isNoSci = sciRank.includes('无理科');
        const isNoArt = artRank.includes('无文科');

        return `<tr>
            <td>${cur['省份']}</td>
            <td>${cur['院校']}</td>
            <td>${isNoSci ? '<span style="color:#94a3b8;font-size:12px;">无理科专业计划</span>' :
                `<span class="ranking-rank-label ranking-rank-sci">${sciRank}</span>
                 <span class="ranking-sub-info">位次均值: ${formatNum(sciPos)}</span>
                 ${prev ? buildDelta('位次', sciPos, prev['理科校投档位次号均值'], true) : ''}`}
            </td>
            <td>${isNoSci ? '' : `<span class="ranking-score">${sciScore}</span>
                 ${prev ? buildDelta('分', sciScore, prev['理科校投档线均分'], false) : ''}`}
            </td>
            <td>${isNoArt ? '<span style="color:#94a3b8;font-size:12px;">无文科专业计划</span>' :
                `<span class="ranking-rank-label ranking-rank-art">${artRank}</span>
                 <span class="ranking-sub-info">位次均值: ${formatNum(artPos)}</span>
                 ${prev ? buildDelta('位次', artPos, prev['文科校投档位次号均值'], true) : ''}`}
            </td>
            <td>${isNoArt ? '' : `<span class="ranking-score">${artScore}</span>
                 ${prev ? buildDelta('分', artScore, prev['文科校投档线均分'], false) : ''}`}
            </td>
            <td>
                <span class="ranking-rank-label ranking-rank-total">${totalRank}</span>
                <span class="ranking-sub-info">位次均值: ${formatNum(totalPos)}</span>
                ${prev ? buildDelta('位次', totalPos, prev['校投档位次号均值'], true) : ''}
            </td>
            <td>
                <span class="ranking-score">${totalScore}</span>
                ${prev ? buildDelta('分', totalScore, prev['校投档线均分'], false) : ''}
            </td>
        </tr>`;
    }

    /**
     * 生成对比变化标签
     * @param {string} unit - 单位（"位次" 或 "分"）
     * @param {number} curVal - 当前值
     * @param {number} prevVal - 上一年值
     * @param {boolean} lowerIsBetter - true=位次(越小越好)，false=分数(越大越好)
     */
    function buildDelta(unit, curVal, prevVal, lowerIsBetter) {
        if (curVal === '' || curVal == null || prevVal === '' || prevVal == null) return '';
        const c = Number(curVal), p = Number(prevVal);
        if (isNaN(c) || isNaN(p)) return '';
        const diff = c - p;
        if (diff === 0) return '<span class="ranking-delta ranking-delta-same">→ 持平</span>';

        const absDiff = Math.abs(diff);
        // 位次：下降（数字变大）=退步，分数：下降=退步
        const isImproved = lowerIsBetter ? diff < 0 : diff > 0;
        const arrow = isImproved ? '↑' : '↓';
        const cls = isImproved ? 'ranking-delta-up' : 'ranking-delta-down';

        return `<span class="ranking-delta ${cls}">${arrow} ${formatNum(absDiff)}${unit === '位次' ? '位' : '分'}</span>`;
    }

    function formatNum(n) {
        if (n === '' || n == null) return '-';
        return Number(n).toLocaleString();
    }

    // ========== 启动 ==========
    // 使用 MutationObserver 监测标签页激活，延迟加载数据
    let loaded = false;
    const observer = new MutationObserver(() => {
        if (panel.classList.contains('active') && !loaded) {
            loaded = true;
            init();
        }
    });
    observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
    // 也检查初始状态
    if (panel.classList.contains('active') && !loaded) {
        loaded = true;
        init();
    }
})();
