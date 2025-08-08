// public/js/admin.js

// 这个全局函数会在用户点击“后台管理”标签页时被 main.js 调用
function initializeAdminTab() {
    const adminPanel = document.getElementById('admin-tab');
    // 防止重复加载
    if (adminPanel.dataset.initialized) return;
    adminPanel.dataset.initialized = 'true';

    adminPanel.innerHTML = `
        <div class="admin-container" style="display: flex; gap: 20px; padding: 20px;">
            <div class="user-list-panel" style="flex: 1; border-right: 1px solid #ccc; padding-right: 20px;">
                <h3>用户列表</h3>
                <ul id="admin-user-list" style="list-style: none; padding: 0; cursor: pointer;">
                    <li>加载中...</li>
                </ul>
            </div>
            <div class="permission-panel" style="flex: 3;">
                <h3>权限管理</h3>
                <div id="admin-permission-details"><p>请从左侧选择一个用户进行管理。</p></div>
            </div>
        </div>
    `;

    const userListElement = document.getElementById('admin-user-list');
    const permissionDetailsElement = document.getElementById('admin-permission-details');
    let allUsers = [];
    let allPermissions = [];

    // 获取所有用户和他们的权限
    async function fetchData() {
        try {
            // 使用我们在 main.js 中初始化的 supabaseClient
            const { data: users, error: usersError } = await window.supabaseClient.from('profiles').select('id, username, role');
            if (usersError) throw usersError;
            
            const { data: permissions, error: permsError } = await window.supabaseClient.from('user_permissions').select('*');
            if (permsError) throw permsError;

            allUsers = users.filter(u => u.role !== 'admin'); // 只显示普通用户
            allPermissions = permissions;
            renderUserList();

        } catch (error) {
            userListElement.innerHTML = `<li>加载失败: ${error.message}</li>`;
        }
    }

    // 渲染左侧的用户列表
    function renderUserList() {
        userListElement.innerHTML = '';
        allUsers.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user.username || user.id;
            li.dataset.userId = user.id;
            li.style.padding = '8px';
            li.style.borderBottom = '1px solid #eee';
            li.addEventListener('click', () => {
                // 设置选中高亮
                Array.from(userListElement.children).forEach(child => child.style.backgroundColor = '');
                li.style.backgroundColor = '#f0f0f0';
                renderPermissionDetails(user.id);
            });
            userListElement.appendChild(li);
        });
    }

    // 渲染右侧的权限编辑区
    function renderPermissionDetails(userId) {
        const user = allUsers.find(u => u.id === userId);
        const userPerms = allPermissions.filter(p => p.user_id === userId);
        
        const availableTabs = ['universities', 'majors', 'plans'];
        const tabNamesMap = {
            universities: '高校库',
            majors: '专业目录',
            plans: '2025浙江高考招生计划'
        };

        let formHTML = `<h4>正在管理用户: ${user.username}</h4>`;
        availableTabs.forEach(tab => {
            const currentPerm = userPerms.find(p => p.tab_name === tab);
            const isChecked = !!currentPerm;
            const expiresAt = currentPerm && currentPerm.expires_at ? currentPerm.expires_at.split('T')[0] : '';

            formHTML += `
                <div style="margin-bottom: 15px;">
                    <label>
                        <input type="checkbox" data-tab-name="${tab}" ${isChecked ? 'checked' : ''}>
                        ${tabNamesMap[tab]}
                    </label>
                    <input type="date" data-tab-date="${tab}" value="${expiresAt}" style="margin-left: 10px;">
                </div>
            `;
        });

        formHTML += `<button id="save-permissions-btn" class="query-button">保存更改</button>`;
        permissionDetailsElement.innerHTML = formHTML;

        document.getElementById('save-permissions-btn').addEventListener('click', async () => {
            await savePermissions(userId);
        });
    }

    // 保存权限更改
    async function savePermissions(userId) {
        const permissionsToUpsert = [];
        const permissionsToDelete = [];

        const checkboxes = permissionDetailsElement.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            const tabName = cb.dataset.tabName;
            const dateInput = permissionDetailsElement.querySelector(`input[data-tab-date="${tabName}"]`);
            const expiresAt = dateInput.value ? new Date(dateInput.value).toISOString() : null;

            if (cb.checked) {
                permissionsToUpsert.push({
                    user_id: userId,
                    tab_name: tabName,
                    expires_at: expiresAt
                });
            } else {
                permissionsToDelete.push({
                    user_id: userId,
                    tab_name: tabName
                });
            }
        });

        try {
            // Upsert (如果存在就更新，不存在就插入) 选中的权限
            if (permissionsToUpsert.length > 0) {
                const { error } = await window.supabaseClient.from('user_permissions').upsert(permissionsToUpsert);
                if (error) throw error;
            }

            // 删除未选中的权限
            if (permissionsToDelete.length > 0) {
                for(const perm of permissionsToDelete) {
                     const { error } = await window.supabaseClient.from('user_permissions')
                        .delete()
                        .match({ user_id: perm.user_id, tab_name: perm.tab_name });
                     if (error) throw error;
                }
            }

            alert('权限保存成功！');
            // 重新获取最新数据并刷新界面
            fetchData();

        } catch (error) {
            alert(`保存失败: ${error.message}`);
        }
    }
    
    // 初始加载数据
    fetchData();
}
