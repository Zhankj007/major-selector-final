// api/login.js
import { createClient } from '@supabase/supabase-js';

// --- 从Vercel环境变量中获取所有需要的密钥 ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// --- 初始化普通客户端，用于用户认证 ---
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(request, response) {
  // --- CORS 和方法检查 (保持不变) ---
  response.setHeader('Access-Control-Allow-Origin', '*');
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
    if (!email || !password) {
      return response.status(400).json({ error: '请输入邮箱和密码。' });
    }

    // 步骤1：使用普通客户端进行登录验证
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (authError) {
      let friendlyMessage = '登录失败，发生未知错误。';
      if (authError.message === 'Invalid login credentials') {
        friendlyMessage = '邮箱或密码错误，请重试。';
      }
      return response.status(401).json({ error: friendlyMessage });
    }

    // 步骤2：登录成功后，执行日志记录和次数统计
    if (authData.user) {
      // 创建一个临时的、拥有超级权限的Admin客户端来执行后台操作
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const ip_address = request.headers['x-forwarded-for'] || request.socket.remoteAddress;

      // 使用 Promise.all 并发执行两个后台任务，效率更高
      await Promise.all([
        // 任务一：插入登录日志
        supabaseAdmin.from('login_logs').insert({
          user_id: authData.user.id,
          ip_address: ip_address,
        }),
        // 任务二：调用数据库函数，为该用户的登录次数+1
        supabaseAdmin.rpc('increment_login_count', {
            user_id_to_increment: authData.user.id
        })
      ]).catch(console.error); // 如果后台任务出错，就在Vercel后台打印错误，但不影响用户登录
    }

    // 步骤3：向前端返回成功信息
    return response.status(200).json({
      message: 'Login successful',
      user: authData.user,
      session: authData.session,
    });

  } catch (error) {
    return response.status(500).json({ error: `服务器发生意外错误: ${error.message}` });
  }
}
