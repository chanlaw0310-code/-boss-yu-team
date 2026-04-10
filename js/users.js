// 用户管理模块

// 加载用户列表
function loadUsers() {
    const currentUser = window.auth.getCurrentUser();

    // 非管理员不加载
    if (!window.appConfig.hasPermission('canManageUsers')) {
        return;
    }

    const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);

    const tbody = document.getElementById('users-list');
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-400">暂无团队成员</td></tr>';
        return;
    }

    // 角色颜色
    const roleColors = {
        admin: 'bg-red-100 text-red-600',
        partner: 'bg-purple-100 text-purple-600',
        lawyer: 'bg-blue-100 text-blue-600',
        assistant: 'bg-green-100 text-green-600'
    };

    tbody.innerHTML = users.map(user => {
        const roleClass = roleColors[user.role] || 'bg-gray-100 text-gray-600';
        const initials = user.name.charAt(0);

        return `
            <tr>
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                            ${initials}
                        </div>
                        <span class="font-medium text-gray-800">${user.name}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-gray-500">${user.email}</td>
                <td class="px-6 py-4">
                    <span class="status-badge ${roleClass}">${window.getRoleName(user.role)}</span>
                </td>
                <td class="px-6 py-4 text-gray-500">${window.appConfig.formatDate(user.created_at)}</td>
                <td class="px-6 py-4">
                    ${user.id !== currentUser.id ?
                        `<button onclick="editUser('${user.id}')" class="text-blue-600 hover:text-blue-700 font-medium mr-3">编辑</button>
                         <button onclick="deleteUser('${user.id}')" class="text-red-500 hover:text-red-700 font-medium">删除</button>` :
                        '<span class="text-gray-300">当前用户</span>'
                    }
                </td>
            </tr>
        `;
    }).join('');
}

// 显示添加用户弹窗
function showUserModal() {
    document.getElementById('user-modal-title').textContent = '添加成员';
    document.getElementById('user-form').reset();
    document.getElementById('user-id').value = '';
    document.getElementById('user-modal').classList.remove('hidden');
}

// 关闭用户弹窗
function closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
    window.editingUserId = null;
}

// 编辑用户
function editUser(userId) {
    const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);
    const user = users.find(u => u.id === userId);

    if (!user) return;

    // 填充表单
    document.getElementById('user-modal-title').textContent = '编辑成员';
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-input-name').value = user.name;
    document.getElementById('user-input-email').value = user.email;
    document.getElementById('user-input-role').value = user.role;
    document.getElementById('user-input-password').value = '';

    window.editingUserId = userId;
    document.getElementById('user-modal').classList.remove('hidden');
}

// 保存用户
async function saveUser() {
    const name = document.getElementById('user-input-name').value;
    const email = document.getElementById('user-input-email').value;
    const role = document.getElementById('user-input-role').value;
    const password = document.getElementById('user-input-password').value;
    const userId = document.getElementById('user-id').value;

    if (!name || !email || !role) {
        alert('请填写完整信息');
        return;
    }

    const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);

    if (userId) {
        // 编辑模式
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            users[index].name = name;
            users[index].email = email;
            users[index].role = role;
            if (password) {
                users[index].password = password;
            }
        }
        window.editingUserId = null;
    } else {
        // 新增模式
        if (!password) {
            alert('请输入初始密码');
            return;
        }

        // 检查邮箱是否已存在
        if (users.find(u => u.email === email)) {
            alert('该邮箱已被注册');
            return;
        }

        const newUser = {
            id: window.appConfig.generateId(),
            email,
            name,
            role,
            password,
            created_at: new Date().toISOString()
        };
        users.push(newUser);
    }

    window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.USERS, users);
    closeUserModal();
    loadUsers();
    loadCases(); // 刷新案件列表的负责人选择器
}

// 删除用户
function deleteUser(userId) {
    if (!confirm('确定要删除此成员吗？')) return;

    let users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);
    users = users.filter(u => u.id !== userId);
    window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.USERS, users);

    // 清理案件中的负责人引用
    let cases = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.CASES);
    cases = cases.map(c => {
        if (c.assigned_users) {
            c.assigned_users = c.assigned_users.filter(uid => uid !== userId);
        }
        return c;
    });
    window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.CASES, cases);

    // 清理任务中的负责人引用
    let tasks = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.TASKS);
    tasks = tasks.map(t => {
        if (t.assignee_id === userId) {
            t.assignee_id = null;
        }
        return t;
    });
    window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.TASKS, tasks);

    loadUsers();
    loadCases();
}

// 导出函数
window.loadUsers = loadUsers;
window.showUserModal = showUserModal;
window.closeUserModal = closeUserModal;
window.editUser = editUser;
window.saveUser = saveUser;
window.deleteUser = deleteUser;