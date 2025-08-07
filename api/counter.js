// api/counter.js
import { createClient } from '@supabase/supabase-js';

// 【已修正】使用您在 Vercel 中设置的、不带前缀的环境变量名
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(request, response) {
  try {
    // 调用我们在Supabase中创建的数据库函数
    const { data, error } = await supabase.rpc('increment_counter');

    if (error) {
      // 如果调用函数出错，则抛出错误
      throw error;
    }
    
    // 允许所有域名访问这个接口
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 返回从数据库函数获取的最新计数值
    return response.status(200).json({ count: data });

  } catch (error) {
    // 如果try块中任何地方出错，返回500错误和错误信息
    return response.status(500).json({ error: error.message });
  }
}
