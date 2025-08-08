/**
 * 初始化后台管理标签页的函数
 * 这个全局函数会在用户点击“后台管理”标签页时被 main.js 调用
 */
function initializeAdminTab() {
    const adminPanel = document.getElementById('admin-tab');
    // 防止因重复点击标签页而重复加载内容
    if (adminPanel.dataset.initialized) return;
    adminPanel.dataset.initialized = 'true';

    // 1. 搭建后台管理界面的HTML骨架：包含搜索框、用户表格和编辑弹窗
    adminPanel.innerHTML = `
        <div class="admin-container" style="padding: 20px;">
            <div class="admin-toolbar" style="margin-bottom: 20px;">
                <input type="search" id="user-search-input" placeholder="查询邮箱、昵称、单位等..." style="padding: 8px; width: 300px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div class="admin-table-container" style="overflow-x: auto;">
                <table id="users-table" class="admin-table" style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">登录邮箱</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">用户昵称</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">账户类型</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">手机号码</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">工作单位</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">登录次数</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">注册时间</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">最后登录</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">操作</th>
                        </tr>
                    </thead>
                    <tbody id="users-table-body">
                        <tr><td colspan="8" style="padding: 20px; text-align: center;">正在加载用户数据...</td></tr>
                    </tbody>
                </table>
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

    let allUsers = []; // 全局变量，用于存储所有用户数据，方便前端搜索

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
            tableBody.innerHTML = `<tr><td colspan="8" style="padding: 20px; text-align: center;">没有找到符合条件的用户。</td></tr>`;
            return;
        }
        users.forEach(user => {
            const lastLogin = user.last_login_time ? user.last_login_time : '从未';
            const rowHTML = `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; border: 1px solid #ddd;">${user.email || ''}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">${user.username || ''}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">${user.role || ''}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">${user.phone || ''}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">${user.unit_name || ''}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">${user.login_count || 0}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">${user.registration_time || ''}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">${lastLogin}</td>
                    <td style="padding: 12px; border: 1px solid #ddd;">
                        <button class="edit-btn" data-user-id="${user.id}" style="padding: 5px 10px; cursor: pointer;">编辑</button>
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
        
        const availableTabs = { universities: '高校库', majors: '专业目录', plans: '2025浙江高考招生计划' };
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
    
    // 9. 初始加载数据
    fetchData();
}
