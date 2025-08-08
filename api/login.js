// api/login.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(request, response) {
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
      // 【修改点】在这里判断并翻译错误信息
      let friendlyMessage = '登录失败，发生未知错误。';
      if (authError.message === 'Invalid login credentials') {
        friendlyMessage = '邮箱或密码错误，请重试。';
      }
      return response.status(401).json({ error: friendlyMessage });
    }

    if (authData.user) {
      const ip_address = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
      supabase.from('login_logs').insert({
        user_id: authData.user.id,
        ip_address: ip_address,
      }).then();
    }

    return response.status(200).json({
      message: 'Login successful',
      user: authData.user,
      session: authData.session,
    });

  } catch (error) {
    return response.status(500).json({ error: '服务器发生意外错误。' });
  }
}
