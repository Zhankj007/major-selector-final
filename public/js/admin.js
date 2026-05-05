function initializeAdminTab() {
    const adminPanel = document.getElementById('admin-tab');
    if (adminPanel.dataset.initialized) return;
    adminPanel.dataset.initialized = 'true';

    // 1. 在HTML骨架中，搜索框旁边增加一个“刷新列表”按钮
    adminPanel.innerHTML = `
        <div class="admin-container" style="padding: 20px; height: 100%; display: flex; flex-direction: column; box-sizing: border-box;">
            
            <!-- 内部标签导航 -->
            <div class="admin-sub-tabs" style="display: flex; gap: 15px; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; flex-shrink: 0;">
                <button class="sub-tab-btn active" data-target="admin-users-section" style="background: none; border: none; font-size: 15px; cursor: pointer; padding: 5px 10px; color: #007bff; border-bottom: 2px solid #007bff; font-weight: bold; transition: all 0.2s;">用户管理</button>
                <button class="sub-tab-btn" data-target="admin-global-section" style="background: none; border: none; font-size: 15px; cursor: pointer; padding: 5px 10px; color: #666; border-bottom: 2px solid transparent; font-weight: normal; transition: all 0.2s;">全局设置</button>
                <button class="sub-tab-btn" data-target="admin-maintenance-section" style="background: none; border: none; font-size: 15px; cursor: pointer; padding: 5px 10px; color: #666; border-bottom: 2px solid transparent; font-weight: normal; transition: all 0.2s;">数据维护</button>
            </div>

            <!-- 用户管理区 -->
            <div id="admin-users-section" class="admin-sub-content" style="display: flex; flex-direction: column; flex-grow: 1; overflow: hidden;">
                <div class="admin-toolbar" style="margin-bottom: 15px; display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
                    <input type="search" id="user-search-input" placeholder="查询邮箱、昵称、单位等..." style="padding: 8px; width: 300px; border: 1px solid #ccc; border-radius: 4px;">
                    <button id="refresh-users-btn" class="query-button" style="padding: 8px 15px; cursor: pointer;">刷新列表</button>
                </div>
                <div class="admin-table-container" style="flex-grow: 1; overflow: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <table id="users-table" class="admin-table" style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="position: sticky; top: 0; background: #f8f9fa; padding: 12px; border: 1px solid #ddd; text-align: center; z-index: 5;">序号</th>
                                <th style="position: sticky; top: 0; background: #f8f9fa; padding: 12px; border: 1px solid #ddd; text-align: center; z-index: 5;">登录邮箱</th>
                                <th style="position: sticky; top: 0; background: #f8f9fa; padding: 12px; border: 1px solid #ddd; text-align: center; z-index: 5;">用户昵称</th>
                                <th style="position: sticky; top: 0; background: #f8f9fa; padding: 12px; border: 1px solid #ddd; text-align: center; z-index: 5;">账户类型</th>
                                <th style="position: sticky; top: 0; background: #f8f9fa; padding: 12px; border: 1px solid #ddd; text-align: center; z-index: 5;">手机号码</th>
                                <th style="position: sticky; top: 0; background: #f8f9fa; padding: 12px; border: 1px solid #ddd; text-align: center; z-index: 5;">工作单位</th>
                                <th style="position: sticky; top: 0; background: #f8f9fa; padding: 12px; border: 1px solid #ddd; text-align: center; z-index: 5;">注册时间</th>
                                <th style="position: sticky; top: 0; background: #f8f9fa; padding: 12px; border: 1px solid #ddd; text-align: center; z-index: 5;">最后登录</th>
                                <th style="position: sticky; top: 0; background: #f8f9fa; padding: 12px; border: 1px solid #ddd; text-align: center; z-index: 5;">登录次数</th>
                                <th style="position: sticky; top: 0; background: #f8f9fa; padding: 12px; border: 1px solid #ddd; text-align: center; z-index: 5;">操作</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body">
                            <tr><td colspan="10" style="padding: 20px; text-align: center;">正在加载用户数据...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 全局权限设置区 -->
            <div id="admin-global-section" class="admin-sub-content" style="display: none; overflow-y: auto;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                    <h3 style="margin-top: 0; margin-bottom: 10px;">全局功能页公开设置 <span style="font-size: 12px; font-weight: normal; color: #666;">（设置哪些功能对未登录的游客及所有用户默认开放）</span></h3>
                    <div id="global-permissions-container" style="display: flex; gap: 20px; align-items: center; margin-top: 15px;">
                        <span style="color: #666;">正在加载全局设置...</span>
                    </div>
                </div>
            </div>

            <!-- 数据维护区 -->
            <div id="admin-maintenance-section" class="admin-sub-content" style="display: none; flex-direction: column; overflow: hidden;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #ddd; display: flex; flex-direction: column; flex-grow: 1;">
                    <h3 style="margin-top: 0; margin-bottom: 15px; flex-shrink: 0;">数据维护区 <span style="font-size: 12px; font-weight: normal; color: #666;">（仅在本地或服务端有环境时执行，用于更新底层数据结构）</span></h3>
                    
                    <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap; flex-shrink: 0; margin-bottom: 20px;">
                        <button id="btn-generate-static" class="query-button" title="执行前准备：请确保已经在 Supabase 数据库中更新了最新数据。&#10;功能：执行 generate_static_data.mjs，重新生成省份、城市、科类等静态 JSON 缓存文件。" style="border-radius: 4px;">1. 生成静态筛选数据</button>
                        
                        <div style="display: flex; align-items: center; gap: 10px; border-left: 1px solid #ccc; padding-left: 20px;">
                            <input type="file" id="ranking-file-input" accept=".xlsx, .xls" style="display: none;">
                            <button id="btn-select-ranking-file" class="output-button" style="border-radius: 4px; background-color: #6c757d;" title="点击从本地电脑选择年度排行榜 Excel 文件">2. 选择排行榜数据源</button>
                            <span id="ranking-file-name" style="font-size: 13px; color: #666; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">未选择文件</span>
                            <button id="btn-convert-ranking" class="query-button disabled" disabled style="border-radius: 4px; margin-left: 10px;" title="请先选择数据源。&#10;功能：后台将首先检查文件格式，验证通过后自动生成对应年份的 JSON 排行榜数据。">3. 验证并转换排行榜</button>
                        </div>
                    </div>
                    
                    <div style="flex-shrink: 0; font-weight: bold; margin-bottom: 5px; color: #444;">实时运行日志：</div>
                    <div id="maintenance-log" style="flex-grow: 1; padding: 15px; background: #1e1e1e; color: #4af626; border-radius: 6px; font-family: Consolas, monospace; font-size: 13px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; border: 1px solid #000; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">系统就绪，等待执行任务...</div>
                </div>
            </div>
        </div>
        <div id="edit-user-modal" class="hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div id="edit-user-panel" style="background: white; padding: 20px 30px; border-radius: 8px; width: 500px; max-height: 80vh; overflow-y: auto;">
            </div>
        </div>
    `;

    // 2. 获取新创建的DOM元素
    const searchInput = document.getElementById('user-search-input');
    const tableBody = document.getElementById('users-table-body');
    const editModal = document.getElementById('edit-user-modal');
    const editPanel = document.getElementById('edit-user-panel');
    const refreshButton = document.getElementById('refresh-users-btn'); // 获取刷新按钮

    // --- 内部标签切换逻辑 ---
    const subTabBtns = document.querySelectorAll('.sub-tab-btn');
    const subContents = document.querySelectorAll('.admin-sub-content');

    subTabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 移除所有激活状态
            subTabBtns.forEach(b => {
                b.classList.remove('active');
                b.style.color = '#666';
                b.style.borderBottomColor = 'transparent';
                b.style.fontWeight = 'normal';
            });
            subContents.forEach(c => c.style.display = 'none');

            // 激活当前
            const targetId = e.target.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            
            e.target.classList.add('active');
            e.target.style.color = '#007bff';
            e.target.style.borderBottomColor = '#007bff';
            e.target.style.fontWeight = 'bold';
            
            if (targetContent) {
                targetContent.style.display = targetId === 'admin-maintenance-section' || targetId === 'admin-users-section' ? 'flex' : 'block';
            }
        });
    });

    let allUsers = [];

    // 为刷新按钮绑定点击事件，让它调用 fetchData 函数
    refreshButton.addEventListener('click', fetchData);

    // 3. 从数据库获取所有用户数据
    async function fetchData() {
        try {
            const { data: users, error } = await window.supabaseClient
                .from('user_details')
                .select('*')
                .order('registration_time', { ascending: true });

            if (error) throw error;

            allUsers = users.filter(u => u.role !== 'admin');
            renderTable(allUsers);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="8" style="color: red; padding: 20px; text-align: center;">加载用户失败: ${error.message}</td></tr>`;
        }
    }

    // 4. 将用户数据渲染成表格
    function renderTable(users) {
        tableBody.innerHTML = '';
        if (users.length === 0) {
            // 【修改点】colspan 增加到 10
            tableBody.innerHTML = `<tr><td colspan="10" style="padding: 20px; text-align: center;">没有找到符合条件的用户。</td></tr>`;
            return;
        }
        // 【修改点】forEach循环中加入 index 参数
        users.forEach((user, index) => {
            const lastLogin = user.last_login_time ? user.last_login_time : '从未';
            const rowHTML = `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">${user.email || ''}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">${user.username || ''}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">${user.role || ''}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">${user.phone || ''}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">${user.unit_name || ''}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">${user.registration_time || ''}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">${lastLogin}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${user.login_count || 0}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">
                        <button class="edit-btn" data-user-id="${user.id}" style="padding: 5px 10px; cursor: pointer;">权限</button>
                        <button class="delete-btn" data-user-id="${user.id}" data-username="${user.username || user.email}" style="padding: 5px 10px; cursor: pointer; background-color: #dc3545; color: white; border: none; margin-left: 5px;">删除</button>
                    </td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', rowHTML);
        });

        // 为“编辑”按钮绑定点击事件
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => showEditModal(e.target.dataset.userId));
        });

        // 为“删除”按钮绑定点击事件
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.userId;
                const username = e.target.dataset.username;
                handleDeleteUser(userId, username);
            });
        });
    }

    // 5. 实现前端搜索功能
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (!searchTerm) {
            renderTable(allUsers);
            return;
        }
        const filteredUsers = allUsers.filter(user => 
            Object.values(user).some(val => val && val.toString().toLowerCase().includes(searchTerm))
        );
        renderTable(filteredUsers);
    });

    // 6. 显示并处理编辑用户的弹窗
    async function showEditModal(userId) {
        const user = allUsers.find(u => u.id === userId);
        const { data: permissions, error } = await window.supabaseClient.from('user_permissions').select('*').eq('user_id', userId);

        if (error) {
            alert('获取用户权限失败: ' + error.message);
            return;
        }
        
        const availableTabs = { 
            plans: `浙江高考招生计划`,
            ranking: `投档线排行榜`
        };
        let permissionsHTML = '';

        for (const tabKey in availableTabs) {
            const currentPerm = permissions.find(p => p.tab_name === tabKey);
            const isChecked = !!currentPerm;
            const expiresAt = currentPerm && currentPerm.expires_at ? currentPerm.expires_at.split('T')[0] : '';
            permissionsHTML += `
                <div style="margin-bottom: 15px; display: flex; align-items: center;">
                    <label style="flex-grow: 1;">
                        <input type="checkbox" data-tab-name="${tabKey}" ${isChecked ? 'checked' : ''}>
                        ${availableTabs[tabKey]}
                    </label>
                    <input type="date" data-tab-date="${tabKey}" value="${expiresAt}" style="margin-left: 10px;">
                </div>
            `;
        }

        editPanel.innerHTML = `
            <h3>编辑用户: ${user.username}</h3>
            <p><strong>邮箱:</strong> ${user.email}</p>
            <hr style="margin: 15px 0;">
            <h4>权限设置</h4>
            ${permissionsHTML}
            <hr style="margin: 15px 0;">
            <div style="text-align: right;">
                <button id="save-permissions-btn" class="query-button">保存更改</button>
                <button id="cancel-edit-btn" style="margin-left: 10px;">取消</button>
            </div>
        `;
        editModal.classList.remove('hidden');

        document.getElementById('save-permissions-btn').addEventListener('click', () => savePermissions(userId));
        document.getElementById('cancel-edit-btn').addEventListener('click', () => editModal.classList.add('hidden'));
    }

    // 7. 保存权限更改的函数
    async function savePermissions(userId) {
        const permissionsToUpsert = [];
        const permissionsToDelete = [];

        const checkboxes = editPanel.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            const tabName = cb.dataset.tabName;
            const dateInput = editPanel.querySelector(`input[data-tab-date="${tabName}"]`);
            const expiresAt = dateInput.value ? new Date(dateInput.value).toISOString() : null;

            if (cb.checked) {
                permissionsToUpsert.push({ user_id: userId, tab_name: tabName, expires_at: expiresAt });
            } else {
                permissionsToDelete.push({ user_id: userId, tab_name: tabName });
            }
        });

        try {
            if (permissionsToUpsert.length > 0) {
                const { error } = await window.supabaseClient.from('user_permissions').upsert(permissionsToUpsert);
                if (error) throw error;
            }
            if (permissionsToDelete.length > 0) {
                for (const perm of permissionsToDelete) {
                     const { error } = await window.supabaseClient.from('user_permissions')
                        .delete()
                        .match({ user_id: perm.user_id, tab_name: perm.tab_name });
                     if (error) throw error;
                }
            }
            alert('权限保存成功！');
            editModal.classList.add('hidden');
            await fetchData();
        } catch (error) {
            alert(`保存失败: ${error.message}`);
        }
    }

    // 8. 【新增】处理删除用户的函数
    async function handleDeleteUser(userId, username) {
        // 安全确认，防止误操作
        if (!confirm(`您确定要永久删除用户 "${username}" 吗？此操作将删除该用户的所有相关数据，且无法撤销。`)) {
            return;
        }

        try {
            // 获取当前管理员的认证token，用于向后端API证明自己的身份
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) {
                alert('您的登录会话已过期，请重新登录。');
                return;
            }

            // 调用我们创建的后端API来执行安全删除
            const response = await fetch('/api/delete-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ userIdToDelete: userId })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error);
            }

            alert('用户删除成功！');
            await fetchData(); // 重新加载数据以刷新列表

        } catch (error) {
            alert(`删除失败: ${error.message}`);
        }
    }
    
    // 9. 加载和保存全局权限设置
    async function loadGlobalPermissions() {
        const container = document.getElementById('global-permissions-container');
        const availableTabs = [
            { id: 'universities', name: '高校库' },
            { id: 'majors', name: '专业目录' },
            { id: 'plans', name: '浙江高考招生计划' },
            { id: 'ranking', name: '投档线排行榜' }
        ];
        
        try {
            const { data, error } = await window.supabaseClient.from('global_permissions').select('*');
            if (error) throw error;
            
            const permsMap = {};
            if (data) {
                data.forEach(p => permsMap[p.tab_name] = p.is_public);
            }

            let html = '';
            availableTabs.forEach(tab => {
                // 默认如果没有记录，高校库和专业库为 true，计划为 false
                let isChecked = false;
                if (permsMap.hasOwnProperty(tab.id)) {
                    isChecked = permsMap[tab.id] === true;
                } else {
                    isChecked = (tab.id === 'universities' || tab.id === 'majors');
                }

                html += `
                    <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                        <input type="checkbox" class="global-perm-checkbox" data-tab="${tab.id}" ${isChecked ? 'checked' : ''}>
                        ${tab.name}
                    </label>
                `;
            });
            html += `<button id="save-global-perms-btn" class="query-button" style="padding: 5px 15px; margin-left: auto;">保存全局设置</button>`;
            
            container.innerHTML = html;
            
            document.getElementById('save-global-perms-btn').addEventListener('click', async () => {
                const checkboxes = document.querySelectorAll('.global-perm-checkbox');
                const updates = Array.from(checkboxes).map(cb => ({
                    tab_name: cb.dataset.tab,
                    is_public: cb.checked
                }));
                
                try {
                    const { error: upsertError } = await window.supabaseClient.from('global_permissions').upsert(updates);
                    if (upsertError) throw upsertError;
                    alert('全局设置保存成功！为了体验最新权限，建议刷新页面。');
                } catch (err) {
                    alert('保存失败: ' + err.message);
                }
            });
        } catch (error) {
            container.innerHTML = `<span style="color: red;">加载全局设置失败: ${error.message}</span>`;
        }
    }

    // --- 数据维护区逻辑 ---
    const btnGenerateStatic = document.getElementById('btn-generate-static');
    const btnConvertRanking = document.getElementById('btn-convert-ranking');
    const rankingFilenameInput = document.getElementById('ranking-filename');
    const maintenanceLog = document.getElementById('maintenance-log');

    function appendLog(text, type = 'info') {
        if (!maintenanceLog) return;
        maintenanceLog.style.display = 'block';
        const color = type === 'error' ? '#ff4d4f' : type === 'success' ? '#4af626' : '#d9d9d9';
        const time = new Date().toLocaleTimeString();
        maintenanceLog.innerHTML += `<div style="color: ${color};"><span style="color: #888;">[${time}]</span> ${text}</div>`;
        maintenanceLog.scrollTop = maintenanceLog.scrollHeight;
    }

    async function runMaintenanceTask(action, payload = {}) {
        try {
            const response = await fetch('/api/run_maintenance_script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...payload })
            });
            const data = await response.json();
            
            if (!response.ok) {
                appendLog(`执行失败: ${data.error}`, 'error');
                if (data.stderr) appendLog(`错误信息: \n${data.stderr}`, 'error');
            } else {
                appendLog(`执行成功!`, 'success');
                if (data.stdout) appendLog(data.stdout, 'info');
            }
        } catch (error) {
            appendLog(`网络或请求错误: ${error.message}`, 'error');
        }
    }

    if (btnGenerateStatic) {
        btnGenerateStatic.addEventListener('click', async () => {
            if (!confirm('确定要重新生成所有的静态筛选数据吗？这可能需要几秒钟的时间。')) return;
            btnGenerateStatic.disabled = true;
            btnGenerateStatic.textContent = '执行中...';
            appendLog('开始执行 generate_static_data.mjs...');
            await runMaintenanceTask('generate_static_data');
            btnGenerateStatic.textContent = '生成静态筛选数据';
            btnGenerateStatic.disabled = false;
        });
    }

    const btnSelectFile = document.getElementById('btn-select-ranking-file');
    const fileInput = document.getElementById('ranking-file-input');
    const fileNameDisplay = document.getElementById('ranking-file-name');
    let selectedFileBase64 = null;
    let selectedFileName = '';

    if (btnSelectFile && fileInput) {
        btnSelectFile.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) {
                fileNameDisplay.textContent = '未选择文件';
                btnConvertRanking.classList.add('disabled');
                btnConvertRanking.disabled = true;
                selectedFileBase64 = null;
                selectedFileName = '';
                return;
            }
            
            fileNameDisplay.textContent = file.name;
            fileNameDisplay.title = file.name;
            selectedFileName = file.name;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                selectedFileBase64 = event.target.result;
                btnConvertRanking.classList.remove('disabled');
                btnConvertRanking.disabled = false;
            };
            reader.readAsDataURL(file);
        });
    }

    if (btnConvertRanking) {
        btnConvertRanking.addEventListener('click', async () => {
            if (!selectedFileBase64 || !selectedFileName) {
                alert('请先选择数据源文件！');
                return;
            }
            if (!confirm(`系统将先验证数据格式，通过后自动生成排行榜。是否立即处理 [${selectedFileName}] 吗？`)) return;
            
            btnConvertRanking.disabled = true;
            btnConvertRanking.classList.add('disabled');
            btnConvertRanking.textContent = '验证并转换中...';
            appendLog(`开始上传并处理数据源 ${selectedFileName} ...`);
            
            await runMaintenanceTask('convert_ranking', { 
                filename: selectedFileName,
                fileBase64: selectedFileBase64
            });
            
            btnConvertRanking.textContent = '2. 生成投档线排行榜';
            btnConvertRanking.disabled = false;
            btnConvertRanking.classList.remove('disabled');
        });
    }

    // 10. 初始加载数据
    loadGlobalPermissions();
    fetchData();
}
