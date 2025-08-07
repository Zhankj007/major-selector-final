// api/counter.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(request, response) {
  try {
    const { data, error } = await supabase.rpc('increment_counter');

    if (error) {
      throw error;
    }
    
    // 【解决方案】新增以下三行“反缓存”的响应头
    response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');

    // 保留原有的CORS跨域访问响应头
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 返回最新的计数值
    return response.status(200).json({ count: data });

  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
