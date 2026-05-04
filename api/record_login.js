// api/record_login.js (纯后台记录日志，不阻塞登录)
import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  return { supabaseUrl, supabaseServiceKey };
};

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

  // 1. 立即返回成功响应给前端，让前端无需等待
  response.status(200).json({ message: 'Log task accepted' });

  // 2. 在后台继续执行日志记录操作（这里不会阻塞前端）
  try {
    const { userId, email } = request.body;
    if (!userId) return;

    const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();
    if (!supabaseUrl || !supabaseServiceKey) return; // 配置缺失则放弃记录

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const ip_address = request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown';

    // 并发执行，即便失败也只在控制台报警，绝不影响用户
    await Promise.allSettled([
      supabaseAdmin.from('login_logs').insert({
        user_id: userId,
        ip_address: ip_address,
        email: email
      }),
      supabaseAdmin.rpc('increment_login_count', {
        user_id_to_increment: userId
      })
    ]).then(results => {
      results.forEach((res, i) => {
        if (res.status === 'rejected') console.error(`后台任务[${i}]失败:`, res.reason);
        else if (res.value?.error) console.error(`后台任务[${i}]错误:`, res.value.error.message);
      });
    });
  } catch (error) {
    console.error(`日志记录全过程中断: ${error.message}`);
  }
}
