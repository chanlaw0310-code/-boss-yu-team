// Supabase 配置
// 请在部署时替换为您的 Supabase 项目配置

// 开发环境使用本地存储模拟
const USE_LOCAL_STORAGE = true;

// Supabase 配置（部署时替换）
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// 初始化 Supabase 客户端（避免变量名冲突）
let supabaseClient = null;

if (!USE_LOCAL_STORAGE && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// 本地存储键名
const STORAGE_KEYS = {
    USERS: 'case_mgmt_users',
    CASES: 'case_mgmt_cases',
    STAGES: 'case_mgmt_stages',
    TASKS: 'case_mgmt_tasks',
    TIME_ENTRIES: 'case_mgmt_time_entries',
    ACTIVITIES: 'case_mgmt_activities',
    CURRENT_USER: 'case_mgmt_current_user'
};

// 阶段模板
const STAGE_TEMPLATES = {
    '投融资项目': ['签约', '尽调', '谈判', '交割', '归档'],
    '并购重组': ['立项', '尽调', '方案设计', '谈判签约', '交割', '归档'],
    '法律尽调': ['项目启动', '资料收集', '尽调报告', '结项'],
    '常法咨询': ['接受委托', '提供服务', '结案'],
    '其他类型': ['启动', '进行中', '结项']
};

// 角色权限配置
const ROLE_PERMISSIONS = {
    admin: {
        canManageUsers: true,
        canManageAllCases: true,
        canViewAllData: true,
        canDeleteData: true
    },
    partner: {
        canManageUsers: false,
        canManageAllCases: true,
        canViewAllData: true,
        canDeleteData: false
    },
    lawyer: {
        canManageUsers: false,
        canManageAllCases: false,
        canViewAllData: false,
        canDeleteData: false
    },
    assistant: {
        canManageUsers: false,
        canManageAllCases: false,
        canViewAllData: false,
        canDeleteData: false
    }
};

// 辅助函数 - 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 辅助函数 - 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
}

// 辅助函数 - 格式化相对时间
function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return formatDate(dateStr);
}

// 辅助函数 - 格式化时长
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 辅助函数 - 格式化小时数
function formatHours(hours) {
    return hours.toFixed(1) + ' 小时';
}

// 辅助函数 - 获取本地存储数据
function getLocalData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

// 辅助函数 - 保存本地存储数据
function saveLocalData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// 辅助函数 - 检查权限
function hasPermission(permission) {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    const rolePerms = ROLE_PERMISSIONS[currentUser.role];
    return rolePerms && rolePerms[permission];
}

// 辅助函数 - 判断是否即将到期（3天内）
function isDueSoon(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date - now;
    const days = Math.ceil(diff / 86400000);
    return days >= 0 && days <= 3;
}

// 辅助函数 - 判断是否已过期
function isOverdue(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    return date < now;
}

// 辅助函数 - 添加活动记录
function addActivity(type, content, relatedId) {
    const currentUser = getCurrentUser();
    const activities = getLocalData(STORAGE_KEYS.ACTIVITIES);
    activities.unshift({
        id: generateId(),
        type,
        content,
        related_id: relatedId,
        user_id: currentUser.id,
        user_name: currentUser.name,
        created_at: new Date().toISOString()
    });
    // 只保留最近50条
    if (activities.length > 50) {
        activities.splice(50);
    }
    saveLocalData(STORAGE_KEYS.ACTIVITIES, activities);
}

// 导出配置
window.appConfig = {
    USE_LOCAL_STORAGE,
    supabaseClient,
    STORAGE_KEYS,
    STAGE_TEMPLATES,
    ROLE_PERMISSIONS,
    generateId,
    formatDate,
    formatRelativeTime,
    formatDuration,
    formatHours,
    getLocalData,
    saveLocalData,
    hasPermission,
    isDueSoon,
    isOverdue,
    addActivity
};