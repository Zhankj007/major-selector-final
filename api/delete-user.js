// api/delete-user.js
import { createClient } from '@supabase/supabase-js';

// 使用环境变量初始化Supabase客户端
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
    // 1. 验证发起请求的用户是否是管理员
    const { user: adminUser, error: adminError } = await supabase.auth.getUser(
      request.headers.get('Authorization')?.split('Bearer ')[1]
    );
    if (adminError || !adminUser) {
      return response.status(401).json({ error: '无权访问：无效的管理员凭证。' });
    }
    const { data: adminProfile, error: profileError } = await supabase.from('profiles').select('role').eq('id', adminUser.id).single();
    if (profileError || adminProfile.role !== 'admin') {
      return response.status(403).json({ error: '无权访问：您不是管理员。' });
    }

    // 2. 获取要删除的用户ID
    const { userIdToDelete } = request.body;
    if (!userIdToDelete) {
      return response.status(400).json({ error: '缺少要删除的用户ID。' });
    }

    // 3. 创建一个拥有超级权限的特殊Supabase客户端
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 4. 使用超级权限客户端删除用户
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);
    if (deleteError) {
      throw deleteError;
    }

    // 5. 返回成功信息
    return response.status(200).json({ message: '用户已成功删除。' });

  } catch (error) {
    return response.status(500).json({ error: `删除失败: ${error.message}` });
  }
}
