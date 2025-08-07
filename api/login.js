// api/login.js
import { createClient } from '@supabase/supabase-js';

// 使用 Vercel 环境变量初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(request, response) {
  // 设置CORS响应头，允许所有来源的请求
  // 这对于确保您的前端（无论在哪个域名）都能调用这个API很重要
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理浏览器在发送POST请求前的“预检”请求（OPTIONS方法）
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // 确保这个接口只接受POST方法的请求
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, password } = request.body;

    // 检查请求体中是否包含邮箱和密码
    if (!email || !password) {
      return response.status(400).json({ error: 'Email and password are required.' });
    }

    // 1. 使用用户提供的凭据，调用 Supabase Auth 进行登录验证
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (authError) {
      // 如果登录验证失败（如密码错误），返回401未授权错误
      return response.status(401).json({ error: authError.message });
    }

    // 2. 登录成功后，异步记录登录日志
    if (authData.user) {
      // 从请求头中获取用户的IP地址
      const ip_address = request.headers['x-forwarded-for'] || request.socket.remoteAddress;

      // 将日志信息插入到 login_logs 表中
      // 我们在这里不等待(await)日志插入完成，也不处理它的错误，
      // 这样可以确保即使用户日志记录失败，他们仍然可以成功登录。
      supabase.from('login_logs').insert({
        user_id: authData.user.id,
        ip_address: ip_address,
      }).then(); // .then() 用于触发这个异步操作
    }

    // 3. 向前端返回登录成功的信息，包括用户和会话数据
    return response.status(200).json({
      message: 'Login successful',
      user: authData.user,
      session: authData.session,
    });

  } catch (error) {
    // 捕获任何意外的服务器错误
    return response.status(500).json({ error: 'An unexpected error occurred.' });
  }
}
