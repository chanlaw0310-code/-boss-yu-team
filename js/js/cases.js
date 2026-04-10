// 案件管理模块

// 加载案件列表
function loadCases() {
    const currentUser = window.auth.getCurrentUser();
    const cases = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.CASES);
    const stages = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.STAGES);
    const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);

    // 筛选可见案件
    let visibleCases = cases;
    if (!window.appConfig.hasPermission('canViewAllData')) {
        visibleCases = cases.filter(c => c.assigned_users?.includes(currentUser.id));
    }

    // 更新案件下拉选择器
    updateCaseSelectors(visibleCases);

    // 更新负责人选择器
    updateAssignedSelector(users);

    // 渲染案件卡片
    renderCasesGrid(visibleCases, stages, users);
}

// 更新案件下拉选择器
function updateCaseSelectors(cases) {
    const timerCaseSelect = document.getElementById('timer-case');
    const timeCaseSelect = document.getElementById('time-case');

    const options = '<option value="" class="text-gray-700">选择项目</option>' +
        cases.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (timerCaseSelect) timerCaseSelect.innerHTML = options;
    if (timeCaseSelect) timeCaseSelect.innerHTML = options;
}

// 更新负责人选择器
function updateAssignedSelector(users) {
    const assignedSelect = document.getElementById('case-assigned');
    if (assignedSelect) {
        assignedSelect.innerHTML = users.map(u =>
            `<option value="${u.id}">${u.name} (${window.getRoleName(u.role)})</option>`
        ).join('');
    }
}

// 渲染案件卡片
function renderCasesGrid(cases, stages, users) {
    const grid = document.getElementById('cases-grid');
    if (cases.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-16">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
                <div class="text-gray-400 text-lg">暂无项目</div>
                <div class="text-gray-300 text-sm mt-2">点击右上角「新建项目」开始</div>
            </div>`;
        return;
    }

    // 类型颜色映射
    const typeColors = {
        '投融资项目': { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
        '并购重组': { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
        '法律尽调': { bg: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
        '常法咨询': { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
        '其他类型': { bg: 'bg-gray-500', light: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
    };

    grid.innerHTML = cases.map(caseItem => {
        // 计算进度
        const caseStages = stages.filter(s => s.case_id === caseItem.id);
        const completedStages = caseStages.filter(s => s.status === '已完成').length;
        const totalStages = caseStages.length || 1;
        const progress = Math.round((completedStages / totalStages) * 100);

        // 获取负责人名称
        const assignedNames = caseItem.assigned_users?.map(uid => {
            const user = users.find(u => u.id === uid);
            return user?.name || '未知';
        }).join('、') || '未分配';

        const colors = typeColors[caseItem.type] || typeColors['其他类型'];

        // 状态样式
        const statusStyle = caseItem.status === '已完成' ? 'completed' :
                           caseItem.status === '暂停' ? 'paused' : 'active';

        return `
            <div class="project-card cursor-pointer" onclick="showCaseDetail('${caseItem.id}')">
                <div class="p-5">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center shadow-lg">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                                </svg>
                            </div>
                            <div>
                                <div class="font-semibold text-gray-800">${caseItem.name}</div>
                                <div class="text-sm text-gray-500">${caseItem.client_name}</div>
                            </div>
                        </div>
                        <span class="status-badge ${statusStyle}">${caseItem.status}</span>
                    </div>

                    <div class="flex items-center space-x-2 mb-4">
                        <span class="text-xs px-2 py-1 ${colors.light} ${colors.text} rounded-full">${caseItem.type}</span>
                        ${caseItem.priority === '高' ? '<span class="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">高优先级</span>' : ''}
                    </div>

                    <div class="text-sm text-gray-500 mb-4">
                        <span class="font-medium text-gray-600">负责人：</span>${assignedNames}
                    </div>

                    <div class="pt-4 border-t border-gray-100">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm text-gray-500">进度</span>
                            <span class="text-sm font-medium text-gray-700">${completedStages}/${totalStages} 阶段</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 筛选案件
function filterCases() {
    const type = document.getElementById('filter-type').value;
    const status = document.getElementById('filter-status').value;
    const search = document.getElementById('filter-search').value.toLowerCase();

    const currentUser = window.auth.getCurrentUser();
    let cases = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.CASES);

    // 权限筛选
    if (!window.appConfig.hasPermission('canViewAllData')) {
        cases = cases.filter(c => c.assigned_users?.includes(currentUser.id));
    }

    // 类型筛选
    if (type) {
        cases = cases.filter(c => c.type === type);
    }

    // 状态筛选
    if (status) {
        cases = cases.filter(c => c.status === status);
    }

    // 搜索筛选
    if (search) {
        cases = cases.filter(c =>
            c.name.toLowerCase().includes(search) ||
            c.client_name.toLowerCase().includes(search)
        );
    }

    const stages = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.STAGES);
    const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);
    renderCasesGrid(cases, stages, users);
}

// 显示案件弹窗
function showCaseModal() {
    document.getElementById('case-modal-title').textContent = '新建项目';
    document.getElementById('case-form').reset();
    document.getElementById('case-id').value = '';
    document.getElementById('case-modal').classList.remove('hidden');

    // 更新负责人选择器
    const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);
    updateAssignedSelector(users);
}

// 关闭案件弹窗
function closeCaseModal() {
    document.getElementById('case-modal').classList.add('hidden');
}

// 编辑案件
function editCase(caseId) {
    const cases = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.CASES);
    const caseItem = cases.find(c => c.id === caseId);

    if (!caseItem) return;

    document.getElementById('case-modal-title').textContent = '编辑项目';
    document.getElementById('case-id').value = caseItem.id;
    document.getElementById('case-name').value = caseItem.name;
    document.getElementById('case-client').value = caseItem.client_name;
    document.getElementById('case-type').value = caseItem.type;
    document.getElementById('case-priority').value = caseItem.priority || '中';

    // 更新负责人选择器并选中
    const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);
    updateAssignedSelector(users);

    // 设置选中的负责人
    const assignedSelect = document.getElementById('case-assigned');
    if (assignedSelect && caseItem.assigned_users) {
        Array.from(assignedSelect.options).forEach(option => {
            option.selected = caseItem.assigned_users.includes(option.value);
        });
    }

    document.getElementById('case-modal').classList.remove('hidden');
}

// 保存案件
function saveCase() {
    const caseId = document.getElementById('case-id').value;
    const name = document.getElementById('case-name').value;
    const client = document.getElementById('case-client').value;
    const type = document.getElementById('case-type').value;
    const priority = document.getElementById('case-priority').value;

    const assignedSelect = document.getElementById('case-assigned');
    const assignedUsers = Array.from(assignedSelect.selectedOptions).map(opt => opt.value);

    if (!name || !client) {
        alert('请填写项目名称和客户名称');
        return;
    }

    const cases = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.CASES);

    if (caseId) {
        // 编辑
        const index = cases.findIndex(c => c.id === caseId);
        if (index !== -1) {
            cases[index] = {
                ...cases[index],
                name,
                client_name: client,
                type,
                priority,
                assigned_users: assignedUsers,
                updated_at: new Date().toISOString()
            };
            window.appConfig.addActivity('update_case', `更新项目：${name}`, caseId);
        }
    } else {
        // 新建
        const newCase = {
            id: window.appConfig.generateId(),
            name,
            client_name: client,
            type,
            status: '进行中',
            priority,
            assigned_users: assignedUsers,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        cases.push(newCase);

        // 创建默认阶段
        const template = window.appConfig.STAGE_TEMPLATES[type] || window.appConfig.STAGE_TEMPLATES['其他类型'];
        const stages = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.STAGES);
        template.forEach((stageName, index) => {
            stages.push({
                id: window.appConfig.generateId(),
                case_id: newCase.id,
                stage_name: stageName,
                stage_order: index,
                status: index === 0 ? '进行中' : '待处理',
                created_at: new Date().toISOString()
            });
        });
        window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.STAGES, stages);
        window.appConfig.addActivity('create_case', `创建项目：${name}`, newCase.id);
    }

    window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.CASES, cases);
    closeCaseModal();
    loadCases();
    loadDashboard();
}

// 删除案件
function deleteCase(caseId) {
    if (!confirm('确定要删除此项目吗？相关阶段、任务和工时记录也将被删除。')) {
        return;
    }

    // 删除案件
    let cases = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.CASES);
    cases = cases.filter(c => c.id !== caseId);
    window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.CASES, cases);

    // 删除相关阶段
    let stages = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.STAGES);
    stages = stages.filter(s => s.case_id !== caseId);
    window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.STAGES, stages);

    // 删除相关任务
    let tasks = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.TASKS);
    tasks = tasks.filter(t => t.project_id !== caseId);
    window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.TASKS, tasks);

    // 删除相关工时
    let timeEntries = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.TIME_ENTRIES);
    timeEntries = timeEntries.filter(t => t.case_id !== caseId);
    window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.TIME_ENTRIES, timeEntries);

    loadCases();
    loadDashboard();
}

// 显示案件详情
function showCaseDetail(caseId) {
    const cases = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.CASES);
    const stages = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.STAGES);
    const tasks = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.TASKS);
    const timeEntries = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.TIME_ENTRIES);
    const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);

    const caseItem = cases.find(c => c.id === caseId);
    if (!caseItem) return;

    // 基本信息
    document.getElementById('detail-case-name').textContent = caseItem.name;
    document.getElementById('detail-client').textContent = caseItem.client_name;
    document.getElementById('detail-type').textContent = caseItem.type;
    document.getElementById('detail-status').innerHTML = `<span class="status-badge ${caseItem.status === '已完成' ? 'completed' : 'active'}">${caseItem.status}</span>`;
    document.getElementById('detail-priority').textContent = caseItem.priority || '中';

    const assignedNames = caseItem.assigned_users?.map(uid => {
        const user = users.find(u => u.id === uid);
        return user?.name || '未知';
    }).join('、') || '-';
    // 在详情中显示负责人（如果有位置的话）
    // document.getElementById('detail-assigned').textContent = assignedNames;

    // 阶段列表
    const caseStages = stages.filter(s => s.case_id === caseId).sort((a, b) => a.stage_order - b.stage_order);
    const stagesEl = document.getElementById('detail-stages');
    stagesEl.innerHTML = caseStages.map(stage => {
        const stageClass = stage.status === '已完成' ? 'completed' :
                          stage.status === '进行中' ? 'in-progress' : 'pending';
        return `
            <div class="stage-card ${stageClass}">
                <div class="flex-1">
                    <div class="font-medium text-gray-800">${stage.stage_name}</div>
                    <div class="text-sm text-gray-500">${stage.status}</div>
                </div>
                <select onchange="updateStageStatus('${stage.id}', this.value)"
                        class="border-2 border-gray-100 rounded-lg px-3 py-1.5 text-sm focus:border-blue-500"
                        ${stage.status === '已完成' ? 'disabled' : ''}>
                    <option value="待处理" ${stage.status === '待处理' ? 'selected' : ''}>待处理</option>
                    <option value="进行中" ${stage.status === '进行中' ? 'selected' : ''}>进行中</option>
                    <option value="已完成" ${stage.status === '已完成' ? 'selected' : ''}>已完成</option>
                </select>
            </div>
        `;
    }).join('');

    // 项目任务
    const caseTasks = tasks.filter(t => t.project_id === caseId);
    const tasksEl = document.getElementById('detail-tasks');
    if (caseTasks.length === 0) {
        tasksEl.innerHTML = '<div class="text-gray-400 text-center py-4">暂无任务</div>';
    } else {
        tasksEl.innerHTML = caseTasks.map(task => {
            const assignee = users.find(u => u.id === task.assignee_id);
            const statusClass = task.status === '已完成' ? 'text-green-500' :
                               task.status === '进行中' ? 'text-blue-500' : 'text-gray-400';
            return `
                <div class="task-item cursor-pointer" onclick="editTask('${task.id}')">
                    <svg class="w-5 h-5 ${statusClass} mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <div class="flex-1">
                        <div class="font-medium text-gray-700">${task.content}</div>
                        <div class="text-xs text-gray-400 mt-1">${assignee?.name || '未分配'} · ${task.status}</div>
                    </div>
                    ${task.due_date ? `<span class="text-xs text-gray-500">${window.appConfig.formatDate(task.due_date)}</span>` : ''}
                </div>
            `;
        }).join('');
    }

    // 工时统计
    const caseTimeEntries = timeEntries.filter(t => t.case_id === caseId);
    const totalDuration = caseTimeEntries.reduce((sum, t) => sum + (t.duration || 0), 0);
    const totalHours = totalDuration / 3600;

    // 按用户统计
    const userHours = {};
    caseTimeEntries.forEach(entry => {
        if (!userHours[entry.user_id]) userHours[entry.user_id] = 0;
        userHours[entry.user_id] += (entry.duration || 0) / 3600;
    });

    const hoursEl = document.getElementById('detail-hours');
    hoursEl.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <span class="text-gray-600">总计</span>
            <span class="text-2xl font-bold text-cyan-600">${totalHours.toFixed(1)} 小时</span>
        </div>
        <div class="space-y-2">
            ${Object.entries(userHours).map(([uid, hours]) => {
                const user = users.find(u => u.id === uid);
                return `<div class="flex items-center justify-between text-sm">
                    <span class="text-gray-500">${user?.name || '未知'}</span>
                    <span class="text-gray-700">${hours.toFixed(1)} 小时</span>
                </div>`;
            }).join('')}
        </div>
    `;

    // 保存当前案件ID
    window.currentDetailCaseId = caseId;

    document.getElementById('case-detail-modal').classList.remove('hidden');
}

// 关闭案件详情弹窗
function closeCaseDetailModal() {
    document.getElementById('case-detail-modal').classList.add('hidden');
}

// 更新阶段状态
function updateStageStatus(stageId, newStatus) {
    let stages = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.STAGES);
    const index = stages.findIndex(s => s.id === stageId);

    if (index !== -1) {
        const oldStatus = stages[index].status;
        stages[index].status = newStatus;
        if (newStatus === '已完成') {
            stages[index].completed_at = new Date().toISOString();
            window.appConfig.addActivity('complete_stage', `完成阶段：${stages[index].stage_name}`, stages[index].case_id);
        }
        window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.STAGES, stages);

        // 检查是否所有阶段都已完成
        const caseId = stages[index].case_id;
        const caseStages = stages.filter(s => s.case_id === caseId);
        if (caseStages.every(s => s.status === '已完成')) {
            let cases = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.CASES);
            const caseIndex = cases.findIndex(c => c.id === caseId);
            if (caseIndex !== -1) {
                cases[caseIndex].status = '已完成';
                window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.CASES, cases);
            }
        }

        // 刷新详情
        showCaseDetail(caseId);
        loadCases();
        loadDashboard();
    }
}

// 添加阶段
function addStage() {
    const caseId = window.currentDetailCaseId;
    if (!caseId) return;

    const stageName = prompt('请输入阶段名称：');
    if (!stageName) return;

    const stages = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.STAGES);
    const caseStages = stages.filter(s => s.case_id === caseId);
    const maxOrder = caseStages.reduce((max, s) => Math.max(max, s.stage_order), -1);

    stages.push({
        id: window.appConfig.generateId(),
        case_id: caseId,
        stage_name: stageName,
        stage_order: maxOrder + 1,
        status: '待处理',
        created_at: new Date().toISOString()
    });

    window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.STAGES, stages);
    showCaseDetail(caseId);
    loadCases();
}

// 导出函数
window.loadCases = loadCases;
window.filterCases = filterCases;
window.showCaseModal = showCaseModal;
window.closeCaseModal = closeCaseModal;
window.editCase = editCase;
window.saveCase = saveCase;
window.deleteCase = deleteCase;
window.showCaseDetail = showCaseDetail;
window.closeCaseDetailModal = closeCaseDetailModal;
window.updateStageStatus = updateStageStatus;
window.addStage = addStage;