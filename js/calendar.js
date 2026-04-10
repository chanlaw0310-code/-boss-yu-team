// 日历模块 - 支持 Supabase 云数据库

let currentCalendarDate = new Date();

// 加载日历
function loadCalendar() {
    renderCalendar();
}

// 渲染日历
async function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // 更新标题
    document.getElementById('calendar-title').textContent = `${year}年${month + 1}月`;

    // 获取该月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();

    // 获取上月补充天数
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays = startWeekday;

    // 获取数据
    const currentUser = window.auth.getCurrentUser();
    const { data: cases } = await window.appConfig.supabaseClient.from('cases').select('*');
    const { data: stages } = await window.appConfig.supabaseClient.from('stages').select('*');
    const { data: tasks } = await window.appConfig.supabaseClient.from('tasks').select('*');

    // 筛选可见数据
    let visibleCases = cases || [];
    if (!window.appConfig.hasPermission('canViewAllData')) {
        visibleCases = visibleCases.filter(c => c.assigned_users?.includes(currentUser.id));
    }

    let visibleTasks = tasks || [];
    if (!window.appConfig.hasPermission('canViewAllData')) {
        visibleTasks = visibleTasks.filter(t => t.assignee_id === currentUser.id);
    }

    // 构建日期格子
    const grid = document.getElementById('calendar-grid');
    let html = '';

    // 上月日期
    for (let i = prevMonthDays - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        html += `<div class="calendar-cell other-month">
            <div class="text-sm mb-2">${day}</div>
        </div>`;
    }

    // 当月日期
    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
        const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
        const currentDate = new Date(year, month, day);
        const dateStr = currentDate.toISOString().split('T')[0];

        // 获取当天的事件
        const events = getEventsForDate(dateStr, visibleCases, stages || [], visibleTasks);

        html += `<div class="calendar-cell ${isToday ? 'today' : ''}" onclick="showDateDetail('${dateStr}')">
            <div class="text-sm mb-2 font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}">${day}</div>
            <div class="space-y-1">
                ${events.slice(0, 3).map(e => `
                    <div class="calendar-event ${e.type}" title="${e.title}">${e.title}</div>
                `).join('')}
                ${events.length > 3 ? `<div class="text-xs text-gray-400">+${events.length - 3} 更多</div>` : ''}
            </div>
        </div>`;
    }

    // 下月日期
    const remainingCells = 42 - (prevMonthDays + totalDays);
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="calendar-cell other-month">
            <div class="text-sm mb-2">${day}</div>
        </div>`;
    }

    grid.innerHTML = html;
}

// 获取某日期的事件
function getEventsForDate(dateStr, cases, stages, tasks) {
    const events = [];

    // 阶段截止日期
    stages.forEach(stage => {
        if (stage.due_date && stage.due_date.startsWith(dateStr)) {
            const caseItem = cases.find(c => c.id === stage.case_id);
            if (caseItem) {
                events.push({
                    type: 'project',
                    title: `${caseItem.name} - ${stage.stage_name}`,
                    relatedId: stage.case_id
                });
            }
        }
    });

    // 任务截止日期
    tasks.forEach(task => {
        if (task.due_date && task.due_date.startsWith(dateStr) && task.status !== '已完成') {
            const isOverdue = window.appConfig.isOverdue(task.due_date);
            events.push({
                type: isOverdue ? 'due' : 'task',
                title: task.content,
                relatedId: task.id
            });
        }
    });

    return events;
}

// 显示日期详情
async function showDateDetail(dateStr) {
    const date = new Date(dateStr);
    const dateDisplay = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

    const currentUser = window.auth.getCurrentUser();
    const { data: cases } = await window.appConfig.supabaseClient.from('cases').select('*');
    const { data: stages } = await window.appConfig.supabaseClient.from('stages').select('*');
    const { data: tasks } = await window.appConfig.supabaseClient.from('tasks').select('*');

    let visibleCases = cases || [];
    if (!window.appConfig.hasPermission('canViewAllData')) {
        visibleCases = visibleCases.filter(c => c.assigned_users?.includes(currentUser.id));
    }

    let visibleTasks = tasks || [];
    if (!window.appConfig.hasPermission('canViewAllData')) {
        visibleTasks = visibleTasks.filter(t => t.assignee_id === currentUser.id);
    }

    // 获取当天阶段截止
    const dueStages = (stages || []).filter(s => s.due_date && s.due_date.startsWith(dateStr));
    const stageItems = dueStages.map(s => {
        const caseItem = visibleCases.find(c => c.id === s.case_id);
        return caseItem ? { stage: s, case: caseItem } : null;
    }).filter(item => item);

    // 获取当天任务截止
    const dueTasks = visibleTasks.filter(t => t.due_date && t.due_date.startsWith(dateStr) && t.status !== '已完成');

    // 构建内容
    let content = `<div class="text-gray-600 mb-4">${dateDisplay}</div>`;

    if (stageItems.length > 0) {
        content += `<div class="mb-4"><h4 class="font-medium text-gray-700 mb-2">项目阶段截止</h4>`;
        stageItems.forEach(item => {
            content += `<div class="p-2 bg-blue-50 rounded-lg mb-2 flex items-center justify-between">
                <span class="text-blue-700">${item.case.name} - ${item.stage.stage_name}</span>
                <span class="text-xs text-blue-500">${item.stage.status}</span>
            </div>`;
        });
        content += '</div>';
    }

    if (dueTasks.length > 0) {
        content += `<div class="mb-4"><h4 class="font-medium text-gray-700 mb-2">任务截止</h4>`;
        dueTasks.forEach(task => {
            const isOverdue = window.appConfig.isOverdue(task.due_date);
            content += `<div class="p-2 ${isOverdue ? 'bg-red-50' : 'bg-green-50'} rounded-lg mb-2 flex items-center justify-between cursor-pointer" onclick="editTask('${task.id}')">
                <span class="${isOverdue ? 'text-red-700' : 'text-green-700'}">${task.content}</span>
                <span class="text-xs ${isOverdue ? 'text-red-500' : 'text-green-500'}">${task.status}</span>
            </div>`;
        });
        content += '</div>';
    }

    if (stageItems.length === 0 && dueTasks.length === 0) {
        content += '<div class="text-gray-400 text-center py-8">当天没有截止的项目阶段或任务</div>';
    }

    // 使用简单弹窗显示
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-800">日期详情</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            ${content}
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

// 上个月
function prevMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
}

// 下个月
function nextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
}

// 回到今天
function goToday() {
    currentCalendarDate = new Date();
    renderCalendar();
}

// 导出函数
window.loadCalendar = loadCalendar;
window.prevMonth = prevMonth;
window.nextMonth = nextMonth;
window.goToday = goToday;
window.showDateDetail = showDateDetail;