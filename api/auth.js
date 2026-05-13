// api/auth.js
import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    return { supabaseUrl, supabaseServiceKey, supabaseAnonKey };
};

export default async function handler(request, response) {
    const { action } = request.query;

    // CORS and Method Pre-checks
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const config = getSupabaseConfig();

    if (action === 'register') {
        return handleRegister(request, response, config);
    } else if (action === 'record_login') {
        return handleRecordLogin(request, response, config);
    } else {
        return response.status(400).json({ error: 'Invalid action' });
    }
}

async function handleRegister(request, response, { supabaseUrl, supabaseAnonKey }) {
    const { email, password, username, phone, unit_name } = request.body;
    if (!email || !password || !username || !phone || !unit_name) {
        return response.status(400).json({ error: '所有字段均为必填项。' });
    }

    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(email)) {
        return response.status(400).json({ error: '请输入有效的邮箱地址。' });
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
        return response.status(400).json({ error: '请输入有效的中国大陆手机号码（11位数字，以1开头）。' });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('注册失败，未能成功创建用户。');

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ username, phone, unit_name })
            .eq('id', authData.user.id);

        if (updateError) throw updateError;

        return response.status(201).json({ message: '注册成功！请检查您的邮箱以确认账户。' });
    } catch (error) {
        let errorMessage = error.message || '发生未知错误。';
        if (errorMessage.includes('User already registered')) {
            errorMessage = '此邮箱已被注册，请直接登录。';
        } else if (errorMessage.includes('Password should be at least 6 characters')) {
            errorMessage = '密码长度至少需要6位。';
        }
        return response.status(400).json({ error: errorMessage });
    }
}

async function handleRecordLogin(request, response, { supabaseUrl, supabaseServiceKey }) {
    // 立即返回成功，避免阻塞前端
    response.status(200).json({ message: 'Log task accepted' });

    try {
        const { userId, email } = request.body;
        if (!userId || !supabaseUrl || !supabaseServiceKey) return;

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const ip_address = request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown';

        await Promise.allSettled([
            supabaseAdmin.from('login_logs').insert({ user_id: userId, ip_address, email }),
            supabaseAdmin.rpc('increment_login_count', { user_id_to_increment: userId })
        ]);
    } catch (error) {
        console.error(`日志记录失败: ${error.message}`);
    }
}
