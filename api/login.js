// api/login.js
import { createClient } from '@supabase/supabase-js';

// 从环境变量中读取（确保这些变量只在服务端配置）
// 注意：SUPABASE_SERVICE_KEY 切勿暴露到前端！
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Supabase 客户端（匿名 Key 用于 Auth 登录）
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 简单的内存缓存用于限制登录尝试（IP -> 时间戳数组）
const loginAttempts = {};
const MAX_ATTEMPTS = 5;        // 最大尝试次数
const TIME_WINDOW_MS = 5 * 60 * 1000; // 5 分钟窗口期

export default async function handler(request, response) {
  // CORS 限制
  const allowedOrigin = 'https://www.igaokao.top';
  response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, password } = request.body;

    // 基础参数校验
    if (!email || !password) {
      return response.status(400).json({ error: '请输入邮箱和密码。' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response.status(400).json({ error: '邮箱格式不正确。' });
    }
    if (password.length < 6) {
      return response.status(400).json({ error: '密码长度至少为 6 位。' });
    }

    // 获取客户端 IP（取第一个）
    const ip_address = (request.headers['x-forwarded-for'] || request.socket.remoteAddress || '')
      .split(',')[0].trim();

    // 登录尝试频率限制
    const now = Date.now();
    if (!loginAttempts[ip_address]) loginAttempts[ip_address] = [];
    // 过滤掉窗口期外的尝试记录
    loginAttempts[ip_address] = loginAttempts[ip_address].filter(ts => now - ts < TIME_WINDOW_MS);
    if (loginAttempts[ip_address].length >= MAX_ATTEMPTS) {
      return response.status(429).json({ error: '尝试次数过多，请稍后再试。' });
    }

    // 记录本次尝试
    loginAttempts[ip_address].push(now);

    // 登录
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (authError) {
      let friendlyMessage = '登录失败，请检查账号或密码。';
      if (authError.message === 'Invalid login credentials') {
        friendlyMessage = '邮箱或密码错误，请重试。';
      }
      return response.status(401).json({ error: friendlyMessage });
    }

    if (authData.user) {
      // 用 service key（仅在服务端使用）更新日志和计数
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      Promise.all([
        supabaseAdmin.from('login_logs').insert({
          user_id: authData.user.id,
          ip_address: ip_address,
          email: authData.user.email
        }),
        supabaseAdmin.rpc('increment_login_count', {
          user_id_to_increment: authData.user.id
        })
      ]).catch(console.error);
    }

    return response.status(200).json({
      message: 'Login successful',
      user: authData.user,
      session: authData.session,
    });

  } catch (error) {
    console.error('Login API Error:', error);
    return response.status(500).json({ error: '服务器发生意外错误，请稍后再试。' });
  }
}
