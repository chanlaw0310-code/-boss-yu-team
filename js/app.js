// 主应用逻辑

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化默认用户
    window.auth.initDefaultUsers();

    // 检查登录状态
    const currentUser = window.auth.getCurrentUser();
    if (currentUser) {
        showMainApp(currentUser);
    } else {
        showLoginPage();
    }

    // 绑定登录表单
    document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const result = await window.auth.login(email, password);
        if (result.success) {
            showMainApp(result.user);
        } else {
            showLoginError(result.error);
        }
    });

    // 绑定退出登录
    document.getElementById('logout-btn').addEventListener('click', function() {
        window.auth.logout();
    });

    // 绑定筛选器
    document.getElementById('filter-type')?.addEventListener('change', filterCases);
    document.getElementById('filter-status')?.addEventListener('change', filterCases);
    document.getElementById('filter-search')?.addEventListener('input', filterCases);

    document.getElementById('task-filter-project')?.addEventListener('change', filterTasks);
    document.getElementById('task-filter-status')?.addEventListener('change', filterTasks);
    document.getElementById('task-filter-assignee')?.addEventListener('change', filterTasks);

    // 设置今天日期为默认值
    const timeDateInput = document.getElementById('time-date');
    if (timeDateInput) {
        timeDateInput.value = new Date().toISOString().split('T')[0];
    }
});

// 显示登录页面
function showLoginPage() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
}

// 显示主应用
function showMainApp(user) {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-role').textContent = getRoleName(user.role);
    document.getElementById('user-avatar').textContent = user.name.charAt(0);

    // 根据角色显示/隐藏用户管理
    if (window.appConfig.hasPermission('canManageUsers')) {
        document.getElementById('users-nav').classList.remove('hidden');
    } else {
        document.getElementById('users-nav').classList.add('hidden');
    }

    // 加载数据
    loadDashboard();
    loadCases();
    loadTasks();
    loadCalendar();
    loadTimeEntries();
    loadUsers();
}

// 显示登录错误
function showLoginError(message) {
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    setTimeout(() => errorEl.classList.add('hidden'), 3000);
}

// 显示区块
function showSection(sectionName, e) {
    // 更新导航激活状态
    document.querySelectorAll('.nav-btn').forEach(item => {
        item.classList.remove('active');
    });
    if (e && e.currentTarget) {
        e.currentTarget.classList.add('active');
    }

    // 显示对应区块
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionName + '-section').classList.remove('hidden');

    // 刷新数据
    if (sectionName === 'dashboard') loadDashboard();
    if (sectionName === 'cases') loadCases();
    if (sectionName === 'tasks') loadTasks();
    if (sectionName === 'calendar') loadCalendar();
    if (sectionName === 'time') loadTimeEntries();
    if (sectionName === 'users') loadUsers();
}

// 获取角色名称
function getRoleName(role) {
    const roleNames = {
        admin: '管理员',
        partner: '合伙人',
        lawyer: '律师',
        assistant: '助理'
    };
    return roleNames[role] || role;
}

// 加载仪表盘
function loadDashboard() {
    const currentUser = window.auth.getCurrentUser();
    const cases = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.CASES);
    const tasks = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.TASKS);
    const timeEntries = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.TIME_ENTRIES);
    const activities = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.ACTIVITIES);

    // 筛选可见数据
    let visibleCases = cases;
    if (!window.appConfig.hasPermission('canViewAllData')) {
        visibleCases = cases.filter(c => c.assigned_users?.includes(currentUser.id));
    }

    // 1. 进行中的项目
    const activeCases = visibleCases.filter(c => c.status === '进行中');
    document.getElementById('active-count').textContent = activeCases.length;
    renderActiveProjects(activeCases);

    // 2. 我的任务（未完成）
    let myTasks = tasks.filter(t => t.status !== '已完成');
    if (!window.appConfig.hasPermission('canViewAllData')) {
        myTasks = myTasks.filter(t => t.assignee_id === currentUser.id);
    }
    document.getElementById('my-task-count').textContent = myTasks.length;
    renderMyTasks(myTasks.slice(0, 5));

    // 3. 即将到期任务
    const dueTasks = myTasks.filter(t => window.appConfig.isDueSoon(t.due_date));
    const overdueTasks = myTasks.filter(t => window.appConfig.isOverdue(t.due_date));
    document.getElementById('due-count').textContent = dueTasks.length + overdueTasks.length;
    renderDueTasks([...overdueTasks, ...dueTasks].slice(0, 5));

    // 4. 最新动态
    renderActivities(activities.slice(0, 10));

    // 统计数据
    const totalCases = visibleCases.length;
    document.getElementById('stat-cases').textContent = totalCases;

    // 本月工时
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const myEntries = timeEntries.filter(e => {
        const entryDate = new Date(e.start_time || e.created_at);
        return e.user_id === currentUser.id &&
               entryDate.getMonth() === currentMonth &&
               entryDate.getFullYear() === currentYear;
    });
    const totalHours = myEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600;
    document.getElementById('stat-hours').textContent = totalHours.toFixed(1);
}

// 渲染进行中的项目
function renderActiveProjects(cases) {
    const el = document.getElementById('active-projects');
    if (cases.length === 0) {
        el.innerHTML = `
            <div class="text-gray-400 text-center py-10">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                </svg>
                暂无进行中的项目
            </div>`;
        return;
    }

    const stages = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.STAGES);
    el.innerHTML = cases.map(caseItem => {
        const caseStages = stages.filter(s => s.case_id === caseItem.id);
        const completedStages = caseStages.filter(s => s.status === '已完成').length;
        const totalStages = caseStages.length || 1;
        const progress = Math.round((completedStages / totalStages) * 100);

        // 获取类型图标颜色
        const typeColors = {
            '投融资项目': 'blue',
            '并购重组': 'purple',
            '法律尽调': 'cyan',
            '常法咨询': 'green',
            '其他类型': 'gray'
        };
        const color = typeColors[caseItem.type] || 'gray';

        return `
            <div class="project-card cursor-pointer" onclick="showCaseDetail('${caseItem.id}')">
                <div class="p-4 border-b border-gray-100">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-${color}-100 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5 text-${color}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                                </svg>
                            </div>
                            <div>
                                <div class="font-medium text-gray-800">${caseItem.name}</div>
                                <div class="text-sm text-gray-500">${caseItem.client_name}</div>
                            </div>
                        </div>
                        <span class="text-xs px-2 py-1 bg-${color}-50 text-${color}-600 rounded-full">${caseItem.type}</span>
                    </div>
                </div>
                <div class="p-4">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm text-gray-500">进度</span>
                        <span class="text-sm font-medium text-gray-700">${progress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 渲染我的任务
function renderMyTasks(tasks) {
    const el = document.getElementById('my-tasks-dashboard');
    if (tasks.length === 0) {
        el.innerHTML = '<div class="text-gray-400 text-center py-6">暂无待办任务</div>';
        return;
    }

    el.innerHTML = tasks.map(task => {
        const statusClass = task.status === '进行中' ? 'text-blue-500' : 'text-gray-400';
        return `
            <div class="task-item cursor-pointer" onclick="editTask('${task.id}')">
                <svg class="w-5 h-5 ${statusClass} mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <div class="flex-1">
                    <div class="font-medium text-gray-700 text-sm">${task.content}</div>
                    ${task.due_date ? `<div class="text-xs text-gray-400 mt-1">截止：${window.appConfig.formatDate(task.due_date)}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// 渲染即将到期任务
function renderDueTasks(tasks) {
    const el = document.getElementById('due-tasks');
    if (tasks.length === 0) {
        el.innerHTML = '<div class="text-gray-400 text-center py-6">暂无即将到期任务</div>';
        return;
    }

    el.innerHTML = tasks.map(task => {
        const isOverdue = window.appConfig.isOverdue(task.due_date);
        const bgClass = isOverdue ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200';
        const textClass = isOverdue ? 'text-red-600' : 'text-orange-600';

        return `
            <div class="p-3 rounded-lg ${bgClass} border cursor-pointer" onclick="editTask('${task.id}')">
                <div class="font-medium ${textClass} text-sm">${task.content}</div>
                <div class="text-xs ${textClass} mt-1">
                    ${isOverdue ? '已过期' : '即将到期'}：${window.appConfig.formatDate(task.due_date)}
                </div>
            </div>
        `;
    }).join('');
}

// 渲染最新动态
function renderActivities(activities) {
    const el = document.getElementById('recent-activities');
    if (activities.length === 0) {
        el.innerHTML = `
            <div class="text-gray-400 text-center py-10">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                暂无动态
            </div>`;
        return;
    }

    const typeColors = {
        'create_case': 'bg-blue-500',
        'update_case': 'bg-green-500',
        'complete_stage': 'bg-purple-500',
        'create_task': 'bg-cyan-500',
        'complete_task': 'bg-emerald-500',
        'add_time': 'bg-orange-500'
    };

    el.innerHTML = activities.map(act => {
        const dotColor = typeColors[act.type] || 'bg-gray-500';
        return `
            <div class="activity-item">
                <div class="activity-dot ${dotColor}"></div>
                <div class="flex-1">
                    <div class="text-sm text-gray-700">${act.content}</div>
                    <div class="text-xs text-gray-400 mt-1">${act.user_name} · ${window.appConfig.formatRelativeTime(act.created_at)}</div>
                </div>
            </div>
        `;
    }).join('');
}

// 导出函数
window.showLoginPage = showLoginPage;
window.showMainApp = showMainApp;
window.showSection = showSection;
window.getRoleName = getRoleName;
window.loadDashboard = loadDashboard;