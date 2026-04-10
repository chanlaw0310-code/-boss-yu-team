// 认证模块

// 获取当前用户
function getCurrentUser() {
    if (window.appConfig.USE_LOCAL_STORAGE) {
        const userStr = localStorage.getItem(window.appConfig.STORAGE_KEYS.CURRENT_USER);
        return userStr ? JSON.parse(userStr) : null;
    } else {
        // Supabase 认证
        return window.appConfig.supabaseClient.auth.getUser();
    }
}

// 登录
async function login(email, password) {
    if (window.appConfig.USE_LOCAL_STORAGE) {
        // 本地存储模拟登录
        const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);

        // 如果没有用户，创建默认管理员
        if (users.length === 0) {
            const defaultAdmin = {
                id: window.appConfig.generateId(),
                email: 'admin@example.com',
                name: '管理员',
                role: 'admin',
                password: 'admin123',
                created_at: new Date().toISOString()
            };
            users.push(defaultAdmin);
            window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.USERS, users);
        }

        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            const userData = { ...user };
            delete userData.password;
            localStorage.setItem(window.appConfig.STORAGE_KEYS.CURRENT_USER, JSON.stringify(userData));
            return { success: true, user: userData };
        } else {
            return { success: false, error: '邮箱或密码错误' };
        }
    } else {
        // Supabase 登录
        const { data, error } = await window.appConfig.supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true, user: data.user };
    }
}

// 注册
async function register(email, password, name, role) {
    if (window.appConfig.USE_LOCAL_STORAGE) {
        const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);

        // 检查邮箱是否已存在
        if (users.find(u => u.email === email)) {
            return { success: false, error: '该邮箱已被注册' };
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
        window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.USERS, users);

        return { success: true, user: newUser };
    } else {
        // Supabase 注册
        const { data, error } = await window.appConfig.supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { name, role }
            }
        });
        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true, user: data.user };
    }
}

// 退出登录
async function logout() {
    if (window.appConfig.USE_LOCAL_STORAGE) {
        localStorage.removeItem(window.appConfig.STORAGE_KEYS.CURRENT_USER);
    } else {
        await window.appConfig.supabaseClient.auth.signOut();
    }
    // 刷新页面回到登录状态
    window.location.reload();
}

// 初始化默认用户（测试用）
function initDefaultUsers() {
    const users = window.appConfig.getLocalData(window.appConfig.STORAGE_KEYS.USERS);
    if (users.length === 0) {
        const defaultUsers = [
            { id: window.appConfig.generateId(), email: 'admin@example.com', name: '管理员', role: 'admin', password: 'admin123', created_at: new Date().toISOString() },
            { id: window.appConfig.generateId(), email: 'partner@example.com', name: '张合伙人', role: 'partner', password: 'partner123', created_at: new Date().toISOString() },
            { id: window.appConfig.generateId(), email: 'lawyer@example.com', name: '李律师', role: 'lawyer', password: 'lawyer123', created_at: new Date().toISOString() }
        ];
        window.appConfig.saveLocalData(window.appConfig.STORAGE_KEYS.USERS, defaultUsers);
    }
}

// 导出认证函数
window.auth = {
    getCurrentUser,
    login,
    register,
    logout,
    initDefaultUsers
};