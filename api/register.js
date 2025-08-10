// api/register.js
import { createClient } from '@supabase/supabase-js';

// 从环境变量读取（只在服务端使用）
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 简单的注册频率限制（IP -> 时间戳数组）
const registerAttempts = {};
const MAX_ATTEMPTS = 5;        // 5分钟内最多5次
const TIME_WINDOW_MS = 5 * 60 * 1000;

export default async function handler(request, response) {
  // --- CORS ---
  const allowedOrigin = 'https://www.igaokao.top';
  response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // --- 获取 IP ---
  const ip_address = (request.headers['x-forwarded-for'] || request.socket.remoteAddress || '')
    .split(',')[0].trim();

  // --- 注册频率限制 ---
  const now = Date.now();
  if (!registerAttempts[ip_address]) registerAttempts[ip_address] = [];
  registerAttempts[ip_address] = registerAttempts[ip_address].filter(ts => now - ts < TIME_WINDOW_MS);
  if (registerAttempts[ip_address].length >= MAX_ATTEMPTS) {
    return response.status(429).json({ error: '注册次数过多，请稍后再试。' });
  }
  registerAttempts[ip_address].push(now);

  // --- 参数验证 ---
  const { email, password, username, phone, unit_name } = request.body;
  if (!email || !password || !username || !phone || !unit_name) {
    return response.status(400).json({ error: '所有字段均为必填项。' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response.status(400).json({ error: '邮箱格式不正确。' });
  }
  if (password.length < 6) {
    return response.status(400).json({ error: '密码长度至少为 6 位。' });
  }
if (!/^1[3-9]\d{9}$/.test(phone)) {
    return response.status(400).json({ error: '请输入有效的中国大陆手机号。' });
}

  try {
    // --- Step 1: 注册 Supabase Auth 用户 ---
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
    });
    if (signUpError) throw signUpError;
    if (!authData.user) throw new Error('注册失败，未能成功创建用户。');

    // --- Step 2: 更新 profiles 表 ---
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username: username,
        phone: phone,
        unit_name: unit_name
      })
      .eq('id', authData.user.id);

    if (updateError) throw updateError;

    // --- 返回成功信息 ---
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
