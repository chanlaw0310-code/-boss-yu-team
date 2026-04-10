// 计时器模块 - 支持 Supabase 云数据库

let timerInterval = null;
let timerStartTime = null;
let timerElapsed = 0;
let isTimerRunning = false;

// 加载工时记录
async function loadTimeEntries() {
    const currentUser = window.auth.getCurrentUser();
    if (!currentUser) return;

    try {
        const { data: timeEntries, error } = await window.appConfig.supabaseClient
            .from('time_entries')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('加载工时失败:', error);
            return;
        }

        const { data: cases } = await window.appConfig.supabaseClient
            .from('cases')
            .select('*');

        const { data: users } = await window.appConfig.supabaseClient
            .from('users')
            .select('*');

        // 筛选可见记录
        let visibleEntries = timeEntries || [];
        if (!window.appConfig.hasPermission('canViewAllData')) {
            visibleEntries = visibleEntries.filter(e => e.user_id === currentUser.id);
        }

        // 渲染列表
        const tbody = document.getElementById('time-list');
        if (!tbody) return;

        if (visibleEntries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-gray-400">暂无工时记录</td></tr>';
            return;
        }

        tbody.innerHTML = visibleEntries.map(entry => {
            const caseItem = cases?.find(c => c.id === entry.case_id);
            const user = users?.find(u => u.id === entry.user_id);
            const hours = (entry.duration || 0) / 3600;
            const date = window.appConfig.formatDate(entry.start_time || entry.created_at);
            const entryType = entry.entry_type === 'timer' ? '计时器' : '手动录入';

            return `
                <tr>
                    <td class="px-6 py-4 text-gray-600">${date}</td>
                    <td class="px-6 py-4 font-medium text-gray-700">${caseItem?.name || '-'}</td>
                    <td class="px-6 py-4 text-gray-600">${entry.description || '-'}</td>
                    <td class="px-6 py-4"><span class="font-bold text-cyan-600">${hours.toFixed(1)} 小时</span></td>
                    <td class="px-6 py-4">
                        <span class="text-xs px-2 py-1 rounded-full ${entry.entry_type === 'timer' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}">${entryType}</span>
                    </td>
                    <td class="px-6 py-4">
                        ${entry.user_id === currentUser.id || window.appConfig.hasPermission('canDeleteData') ?
                            `<button onclick="deleteTimeEntry('${entry.id}')" class="text-red-500 hover:text-red-700 font-medium">删除</button>` :
                            '-'
                        }
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('加载工时异常:', err);
    }
}

// 开始计时
function startTimer() {
    const caseId = document.getElementById('timer-case').value;
    const description = document.getElementById('timer-desc').value;

    if (!caseId) {
        alert('请选择项目');
        return;
    }

    isTimerRunning = true;
    timerStartTime = Date.now();
    timerElapsed = 0;

    document.getElementById('timer-start-btn').classList.add('hidden');
    document.getElementById('timer-stop-btn').classList.remove('hidden');
    document.getElementById('timer-display').classList.add('timer-running');

    // 更新显示
    timerInterval = setInterval(() => {
        timerElapsed = Date.now() - timerStartTime;
        document.getElementById('timer-display').textContent = window.appConfig.formatDuration(Math.floor(timerElapsed / 1000));
    }, 1000);
}

// 停止计时
async function stopTimer() {
    if (!isTimerRunning) return;

    isTimerRunning = false;
    clearInterval(timerInterval);

    const caseId = document.getElementById('timer-case').value;
    const description = document.getElementById('timer-desc').value;
    const currentUser = window.auth.getCurrentUser();

    try {
        // 保存记录
        const newEntry = {
            id: window.appConfig.generateId(),
            case_id: caseId,
            user_id: currentUser.id,
            description: description || '计时记录',
            start_time: new Date(timerStartTime).toISOString(),
            duration: Math.floor(timerElapsed / 1000),
            entry_type: 'timer',
            created_at: new Date().toISOString()
        };

        const { error } = await window.appConfig.supabaseClient
            .from('time_entries')
            .insert(newEntry);

        if (error) {
            console.error('保存工时失败:', error);
            alert('保存失败，请重试');
        }
    } catch (err) {
        console.error('保存工时异常:', err);
    }

    // 重置计时器
    document.getElementById('timer-start-btn').classList.remove('hidden');
    document.getElementById('timer-stop-btn').classList.add('hidden');
    document.getElementById('timer-display').textContent = '00:00:00';
    document.getElementById('timer-display').classList.remove('timer-running');
    document.getElementById('timer-case').value = '';
    document.getElementById('timer-desc').value = '';
    timerElapsed = 0;

    // 刷新列表
    loadTimeEntries();
    loadDashboard();

    alert('已保存工时记录');
}

// 显示手动录入弹窗
async function showTimeModal() {
    document.getElementById('time-form').reset();
    document.getElementById('time-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('time-modal').classList.remove('hidden');

    // 更新案件选择器
    const currentUser = window.auth.getCurrentUser();
    const { data: cases } = await window.appConfig.supabaseClient.from('cases').select('*');

    let visibleCases = cases || [];
    if (!window.appConfig.hasPermission('canViewAllData')) {
        visibleCases = visibleCases.filter(c => c.assigned_users?.includes(currentUser.id));
    }

    const timeCaseSelect = document.getElementById('time-case');
    if (timeCaseSelect) {
        timeCaseSelect.innerHTML = '<option value="">选择项目</option>' +
            visibleCases.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
}

// 关闭手动录入弹窗
function closeTimeModal() {
    document.getElementById('time-modal').classList.add('hidden');
}

// 保存手动录入工时
async function saveTimeEntry() {
    const caseId = document.getElementById('time-case').value;
    const description = document.getElementById('time-desc').value.trim();
    const date = document.getElementById('time-date').value;
    const hours = parseFloat(document.getElementById('time-hours').value);

    if (!caseId || !description || !date || !hours) {
        alert('请填写完整信息');
        return;
    }

    const currentUser = window.auth.getCurrentUser();

    try {
        const newEntry = {
            id: window.appConfig.generateId(),
            case_id: caseId,
            user_id: currentUser.id,
            description,
            start_time: new Date(date).toISOString(),
            duration: hours * 3600,
            entry_type: 'manual',
            created_at: new Date().toISOString()
        };

        const { error } = await window.appConfig.supabaseClient
            .from('time_entries')
            .insert(newEntry);

        if (error) {
            console.error('保存工时失败:', error);
            alert('保存失败，请重试');
            return;
        }

        closeTimeModal();
        loadTimeEntries();
        loadDashboard();
    } catch (err) {
        console.error('保存工时异常:', err);
        alert('保存失败，请检查网络');
    }
}

// 删除工时记录
async function deleteTimeEntry(entryId) {
    if (!confirm('确定要删除此工时记录吗？')) return;

    try {
        await window.appConfig.supabaseClient
            .from('time_entries')
            .delete()
            .eq('id', entryId);

        loadTimeEntries();
        loadDashboard();
    } catch (err) {
        console.error('删除工时异常:', err);
        alert('删除失败，请检查网络');
    }
}

// 页面离开时警告计时器运行
window.addEventListener('beforeunload', function(e) {
    if (isTimerRunning) {
        e.preventDefault();
        e.returnValue = '计时器正在运行，确定要离开吗？';
    }
});

// 导出函数
window.loadTimeEntries = loadTimeEntries;
window.startTimer = startTimer;
window.stopTimer = stopTimer;
window.showTimeModal = showTimeModal;
window.closeTimeModal = closeTimeModal;
window.saveTimeEntry = saveTimeEntry;
window.deleteTimeEntry = deleteTimeEntry;