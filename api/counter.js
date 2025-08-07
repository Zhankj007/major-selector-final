// api/counter.js
import { createClient } from '@supabase/supabase-js';

// 创建 Supabase 客户端实例
// Vercel会自动从您的项目设置中读取环境变量
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(request, response) {
  try {
    // 调用我们刚刚在Supabase中创建的数据库函数
    const { data, error } = await supabase.rpc('increment_counter');

    if (error) {
      throw error;
    }

    // 允许所有域名访问这个接口
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 返回从数据库函数获取的最新计数值
    return response.status(200).json({ count: data });

  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
