// api/login.js (调试专用版)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(request, response) {
  // CORS 和方法检查
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

    if (authData.user) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const ip_address = request.headers['x-forwarded-for'] || request.socket.remoteAddress;

      // 【修改点】我们现在明确等待后台任务完成，并检查它们的错误
      const [logResult, rpcResult] = await Promise.all([
        supabaseAdmin.from('login_logs').insert({
          user_id: authData.user.id,
          ip_address: ip_address,
        }),
        supabaseAdmin.rpc('increment_login_count', {
            user_id_to_increment: authData.user.id
        })
      ]);

      // 检查每一步的错误，如果出错就抛出，让catch块捕获
      if (logResult.error) throw new Error(`日志记录失败: ${logResult.error.message}`);
      if (rpcResult.error) throw new Error(`登录计数失败: ${rpcResult.error.message}`);
    }

    return response.status(200).json({
      message: 'Login successful',
      user: authData.user,
      session: authData.session,
    });

  } catch (error) {
    // 现在，数据库的错误会在这里被捕获并返回给前端
    return response.status(500).json({ error: `服务器发生意外错误: ${error.message}` });
  }
}
