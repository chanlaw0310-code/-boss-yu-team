// 用户管理模块 - 支持 Supabase 云数据库

// 加载用户列表
async function loadUsers() {
    const currentUser = window.auth.getCurrentUser();

    // 非管理员不加载
    if (!window.appConfig.hasPermission('canManageUsers')) {
        return;
    }

    try {
        const { data: users, error } = await window.appConfig.supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('加载用户失败:', error);
            return;
        }

        const tbody = document.getElementById('users-list');
        if (!users || users.length === 0) {
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
            const initials = user.name ? user.name.charAt(0) : '?';

            return `
                <tr>
                    <td class="px-6 py-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                                ${initials}
                            </div>
                            <span class="font-medium text-gray-800">${user.name || '-'}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-gray-500">${user.email || '-'}</td>
                    <td class="px-6 py-4">
                        <span class="status-badge ${roleClass}">${window.getRoleName(user.role)}</span>
                    </td>
                    <td class="px-6 py-4 text-gray-500">${window.appConfig.formatDate(user.created_at)}</td>
                    <td class="px-6 py-4">
                        ${user.id !== currentUser?.id ?
                            `<button onclick="editUser('${user.id}')" class="text-blue-600 hover:text-blue-700 font-medium mr-3">编辑</button>
                             <button onclick="deleteUser('${user.id}')" class="text-red-500 hover:text-red-700 font-medium">删除</button>` :
                            '<span class="text-gray-300">当前用户</span>'
                        }
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('加载用户异常:', err);
    }
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
async function editUser(userId) {
    try {
        const { data: users, error } = await window.appConfig.supabaseClient
            .from('users')
            .select('*')
            .eq('id', userId);

        if (error || !users || users.length === 0) {
            alert('获取用户信息失败');
            return;
        }

        const user = users[0];

        // 填充表单
        document.getElementById('user-modal-title').textContent = '编辑成员';
        document.getElementById('user-id').value = user.id;
        document.getElementById('user-input-name').value = user.name || '';
        document.getElementById('user-input-email').value = user.email || '';
        document.getElementById('user-input-role').value = user.role || 'lawyer';
        document.getElementById('user-input-password').value = '';

        window.editingUserId = userId;
        document.getElementById('user-modal').classList.remove('hidden');
    } catch (err) {
        console.error('编辑用户异常:', err);
        alert('获取用户信息失败');
    }
}

// 保存用户
async function saveUser() {
    const name = document.getElementById('user-input-name').value.trim();
    const email = document.getElementById('user-input-email').value.trim();
    const role = document.getElementById('user-input-role').value;
    const password = document.getElementById('user-input-password').value;
    const userId = document.getElementById('user-id').value;

    if (!name || !email || !role) {
        alert('请填写完整信息');
        return;
    }

    try {
        if (userId) {
            // 编辑模式
            const updates = {
                name,
                email,
                role
            };
            if (password) {
                updates.password = password;
            }

            const { error } = await window.appConfig.supabaseClient
                .from('users')
                .update(updates)
                .eq('id', userId);

            if (error) {
                console.error('更新用户失败:', error);
                alert('保存失败，请重试');
                return;
            }

            window.editingUserId = null;
        } else {
            // 新增模式
            if (!password) {
                alert('请输入初始密码');
                return;
            }

            // 检查邮箱是否已存在
            const { data: existing } = await window.appConfig.supabaseClient
                .from('users')
                .select('id')
                .eq('email', email);

            if (existing && existing.length > 0) {
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

            const { error } = await window.appConfig.supabaseClient
                .from('users')
                .insert(newUser);

            if (error) {
                console.error('创建用户失败:', error);
                alert('创建失败，请重试');
                return;
            }
        }

        closeUserModal();
        loadUsers();
        loadCases(); // 刷新案件列表的负责人选择器
    } catch (err) {
        console.error('保存用户异常:', err);
        alert('保存失败，请检查网络');
    }
}

// 删除用户
async function deleteUser(userId) {
    if (!confirm('确定要删除此成员吗？')) return;

    try {
        const { error } = await window.appConfig.supabaseClient
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) {
            console.error('删除用户失败:', error);
            alert('删除失败，请重试');
            return;
        }

        // 清理案件中的负责人引用
        const { data: cases } = await window.appConfig.supabaseClient
            .from('cases')
            .select('*');

        if (cases) {
            for (const caseItem of cases) {
                if (caseItem.assigned_users && caseItem.assigned_users.includes(userId)) {
                    const newAssigned = caseItem.assigned_users.filter(id => id !== userId);
                    await window.appConfig.supabaseClient
                        .from('cases')
                        .update({ assigned_users: newAssigned })
                        .eq('id', caseItem.id);
                }
            }
        }

        loadUsers();
        loadCases();
    } catch (err) {
        console.error('删除用户异常:', err);
        alert('���除失败，请检查网络');
    }
}

// 导出函数
window.loadUsers = loadUsers;
window.showUserModal = showUserModal;
window.closeUserModal = closeUserModal;
window.editUser = editUser;
window.saveUser = saveUser;
window.deleteUser = deleteUser;