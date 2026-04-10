// 任务管理模块

// 加载任务列表
function loadTasks() {
    const currentUser = window.auth.getCurrentUser();
    const tasks = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.TASKS);
    const cases = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.CASES);
    const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);

    // 筛选可见任务
    let visibleTasks = tasks;
    if (!window.appConfig.hasPermission('canViewAllData')) {
        visibleTasks = tasks.filter(t => t.assignee_id === currentUser.id);
    }

    // 按截止日期排序
    visibleTasks.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
    });

    // 更新筛选器
    updateTaskFilters(cases, users);

    // 渲染任务列表
    renderTasksList(visibleTasks, cases, users);
}

// 更新任务筛选器
function updateTaskFilters(cases, users) {
    const currentUser = window.auth.getCurrentUser();

    // 项目筛选器
    const projectFilter = document.getElementById('task-filter-project');
    if (projectFilter) {
        let visibleCases = cases;
        if (!window.appConfig.hasPermission('canViewAllData')) {
            visibleCases = cases.filter(c => c.assigned_users?.includes(currentUser.id));
        }
        projectFilter.innerHTML = '<option value="">全部项目</option>' +
            visibleCases.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    // 负责人筛选器（管理员/合伙人可看全部）
    const assigneeFilter = document.getElementById('task-filter-assignee');
    if (assigneeFilter) {
        if (window.appConfig.hasPermission('canViewAllData')) {
            assigneeFilter.innerHTML = '<option value="">全部负责人</option>' +
                users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
        } else {
            assigneeFilter.innerHTML = '<option value="">全部负责人</option>' +
                `<option value="${currentUser.id}">${currentUser.name}</option>`;
        }
    }
}

// 渲染任务列表
function renderTasksList(tasks, cases, users) {
    const tbody = document.getElementById('tasks-list');
    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-gray-400">暂无任务</td></tr>';
        return;
    }

    tbody.innerHTML = tasks.map(task => {
        const caseItem = cases.find(c => c.id === task.project_id);
        const assignee = users.find(u => u.id === task.assignee_id);

        // 状态样式
        const statusStyle = {
            '待处理': 'bg-gray-100 text-gray-600',
            '进行中': 'bg-blue-100 text-blue-600',
            '已完成': 'bg-green-100 text-green-600'
        };
        const statusClass = statusStyle[task.status] || 'bg-gray-100 text-gray-600';

        // 截止日期样式
        let dueDateClass = 'text-gray-600';
        let dueDateText = window.appConfig.formatDate(task.due_date);
        if (window.appConfig.isOverdue(task.due_date) && task.status !== '已完成') {
            dueDateClass = 'text-red-600 font-medium';
            dueDateText = '已过期 ' + dueDateText;
        } else if (window.appConfig.isDueSoon(task.due_date) && task.status !== '已完成') {
            dueDateClass = 'text-orange-600 font-medium';
        }

        return `
            <tr>
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <button onclick="toggleTaskStatus('${task.id}')" class="mr-3 p-1 rounded hover:bg-gray-100">
                            ${task.status === '已完成' ?
                                '<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' :
                                '<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/></svg>'
                            }
                        </button>
                        <span class="${task.status === '已完成' ? 'text-gray-400' : 'text-gray-700'}">${task.content}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-gray-500">${caseItem?.name || '-'}</td>
                <td class="px-6 py-4">
                    <span class="status-badge ${statusClass}">${task.status}</span>
                </td>
                <td class="px-6 py-4 text-gray-500">${assignee?.name || '-'}</td>
                <td class="px-6 py-4 ${dueDateClass}">${dueDateText}</td>
                <td class="px-6 py-4">
                    <button onclick="editTask('${task.id}')" class="text-blue-600 hover:text-blue-700 mr-3">编辑</button>
                    <button onclick="deleteTask('${task.id}')" class="text-red-600 hover:text-red-700">删除</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 筛选任务
function filterTasks() {
    const projectId = document.getElementById('task-filter-project').value;
    const status = document.getElementById('task-filter-status').value;
    const assigneeId = document.getElementById('task-filter-assignee').value;

    const currentUser = window.auth.getCurrentUser();
    let tasks = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.TASKS);

    // 权限筛选
    if (!window.appConfig.hasPermission('canViewAllData')) {
        tasks = tasks.filter(t => t.assignee_id === currentUser.id);
    }

    // 项目筛选
    if (projectId) {
        tasks = tasks.filter(t => t.project_id === projectId);
    }

    // 状态筛选
    if (status) {
        tasks = tasks.filter(t => t.status === status);
    }

    // 负责人筛选
    if (assigneeId) {
        tasks = tasks.filter(t => t.assignee_id === assigneeId);
    }

    const cases = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.CASES);
    const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);
    renderTasksList(tasks, cases, users);
}

// 显示任务弹窗
function showTaskModal(preselectedProjectId = null) {
    const currentUser = window.auth.getCurrentUser();
    const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);
    const cases = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.CASES);

    // 重置表单
    document.getElementById('task-modal-title').textContent = '新建任务';
    document.getElementById('task-form').reset();
    document.getElementById('task-id').value = '';
    document.getElementById('task-status').value = '待处理';

    // 项目选择器
    let visibleCases = cases;
    if (!window.appConfig.hasPermission('canViewAllData')) {
        visibleCases = cases.filter(c => c.assigned_users?.includes(currentUser.id));
    }
    const projectSelect = document.getElementById('task-project');
    projectSelect.innerHTML = '<option value="">独立任务（无项目）</option>' +
        visibleCases.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (preselectedProjectId) {
        projectSelect.value = preselectedProjectId;
    }

    // 负责人选择器
    const assigneeSelect = document.getElementById('task-assignee');
    if (window.appConfig.hasPermission('canViewAllData')) {
        assigneeSelect.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    } else {
        assigneeSelect.innerHTML = `<option value="${currentUser.id}">${currentUser.name}</option>`;
    }
    assigneeSelect.value = currentUser.id;

    document.getElementById('task-modal').classList.remove('hidden');
}

// 关闭任务弹窗
function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
    window.editingTaskId = null;
}

// 编辑任务
function editTask(taskId) {
    const currentUser = window.auth.getCurrentUser();
    const tasks = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.TASKS);
    const task = tasks.find(t => t.id === taskId);

    if (!task) return;

    document.getElementById('task-modal-title').textContent = '编辑任务';
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-content').value = task.content;
    document.getElementById('task-due-date').value = task.due_date || '';
    document.getElementById('task-status').value = task.status;

    // 项目选择器
    const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);
    const cases = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.CASES);
    let visibleCases = cases;
    if (!window.appConfig.hasPermission('canViewAllData')) {
        visibleCases = cases.filter(c => c.assigned_users?.includes(currentUser.id));
    }
    const projectSelect = document.getElementById('task-project');
    projectSelect.innerHTML = '<option value="">独立任务（无项目）</option>' +
        visibleCases.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    projectSelect.value = task.project_id || '';

    // 负责人选择器
    const assigneeSelect = document.getElementById('task-assignee');
    if (window.appConfig.hasPermission('canViewAllData')) {
        assigneeSelect.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    } else {
        assigneeSelect.innerHTML = `<option value="${currentUser.id}">${currentUser.name}</option>`;
    }
    assigneeSelect.value = task.assignee_id;

    window.editingTaskId = taskId;
    document.getElementById('task-modal').classList.remove('hidden');
}

// 保存任务
function saveTask() {
    const currentUser = window.auth.getCurrentUser();
    const taskId = document.getElementById('task-id').value;
    const content = document.getElementById('task-content').value;
    const projectId = document.getElementById('task-project').value;
    const assigneeId = document.getElementById('task-assignee').value;
    const dueDate = document.getElementById('task-due-date').value;
    const status = document.getElementById('task-status').value;

    if (!content) {
        alert('请输入任务内容');
        return;
    }

    const tasks = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.TASKS);

    if (taskId) {
        // 编辑
        const index = tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            const oldStatus = tasks[index].status;
            tasks[index] = {
                ...tasks[index],
                content,
                project_id: projectId,
                assignee_id: assigneeId,
                due_date: dueDate,
                status,
                updated_at: new Date().toISOString()
            };

            // 添加动态
            if (status === '已完成' && oldStatus !== '已完成') {
                window.appConfig.addActivity('complete_task', `完成任务：${content}`, taskId);
            }
        }
        window.editingTaskId = null;
    } else {
        // 新建
        const newTask = {
            id: window.appConfig.generateId(),
            content,
            project_id: projectId,
            assignee_id: assigneeId,
            due_date: dueDate,
            status,
            created_at: new Date().toISOString(),
            created_by: currentUser.id
        };
        tasks.push(newTask);
        window.appConfig.addActivity('create_task', `创建任务：${content}`, newTask.id);
    }

    window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.TASKS, tasks);
    closeTaskModal();
    loadTasks();
    loadDashboard();
}

// 切换任务状态
function toggleTaskStatus(taskId) {
    const tasks = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.TASKS);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === '已完成' ? '待处理' : '已完成';
    task.status = newStatus;
    task.updated_at = new Date().toISOString();

    if (newStatus === '已完成') {
        window.appConfig.addActivity('complete_task', `完成任务：${task.content}`, taskId);
    }

    window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.TASKS, tasks);
    loadTasks();
    loadDashboard();
}

// 删除任务
function deleteTask(taskId) {
    if (!confirm('确定要删除此任务吗？')) return;

    let tasks = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.TASKS);
    tasks = tasks.filter(t => t.id !== taskId);
    window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.TASKS, tasks);

    loadTasks();
    loadDashboard();
}

// 为项目添加任务（从项目详情页）
function addTaskForCase() {
    const caseId = window.currentDetailCaseId;
    showTaskModal(caseId);
}

// 导出函数
window.loadTasks = loadTasks;
window.filterTasks = filterTasks;
window.showTaskModal = showTaskModal;
window.closeTaskModal = closeTaskModal;
window.editTask = editTask;
window.saveTask = saveTask;
window.toggleTaskStatus = toggleTaskStatus;
window.deleteTask = deleteTask;
window.addTaskForCase = addTaskForCase;