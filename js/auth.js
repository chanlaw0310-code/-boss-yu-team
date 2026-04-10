// 认证模块 - 支持 Supabase 云数据库

// 获取当前用户
function getCurrentUser() {
    const userStr = localStorage.getItem('bossyu_current_user');
    return userStr ? JSON.parse(userStr) : null;
}

// 登录
async function login(email, password) {
    try {
        // 从 Supabase 查询用户
        const { data: users, error } = await window.appConfig.supabaseClient
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password);

        if (error) {
            console.error('登录查询失败:', error);
            return { success: false, error: '登录失败，请重试' };
        }

        if (users && users.length > 0) {
            const user = users[0];
            // 保存到本地（不含密码）
            const userData = { ...user };
            delete userData.password;
            localStorage.setItem('bossyu_current_user', JSON.stringify(userData));
            return { success: true, user: userData };
        } else {
            return { success: false, error: '邮箱或密码错误' };
        }
    } catch (err) {
        console.error('登录异常:', err);
        return { success: false, error: '登录失败，请检查网络' };
    }
}

// 注册新用户（管理员添加成员时使用）
async function register(email, password, name, role) {
    try {
        // 检查邮箱是否已存在
        const { data: existing } = await window.appConfig.supabaseClient
            .from('users')
            .select('id')
            .eq('email', email);

        if (existing && existing.length > 0) {
            return { success: false, error: '该邮箱已被注册' };
        }

        // 创建新用户
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
            return { success: false, error: '创建用户失败' };
        }

        return { success: true, user: newUser };
    } catch (err) {
        console.error('注册异常:', err);
        return { success: false, error: '注册失败，请检查网络' };
    }
}

// 退出登录
async function logout() {
    localStorage.removeItem('bossyu_current_user');
    window.location.reload();
}

// 初始化默认用户（Supabase 已通过 SQL 创建）
function initDefaultUsers() {
    // 云数据库模式下，默认用户已在 SQL 中创建，无需初始化
}

// 导出认证函数
window.auth = {
    getCurrentUser,
    login,
    register,
    logout,
    initDefaultUsers
};