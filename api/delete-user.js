// api/delete-user.js
import { createClient } from '@supabase/supabase-js';

// --- 从Vercel环境变量中获取所有需要的密钥 ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// --- 初始化两个客户端 ---
// 1. 普通客户端：用于验证前端传来的用户凭证
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// 2. 管理员客户端：拥有超级权限，用于执行删除等敏感操作
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
    // --- 1. 验证发起请求的用户的凭证是否有效 ---
    const authHeader = request.headers['authorization'];
    const jwt = authHeader?.split('Bearer ')[1];
    const { data: { user: adminUser }, error: adminError } = await supabase.auth.getUser(jwt);

    if (adminError || !adminUser) {
      return response.status(401).json({ error: '无权访问：无效的管理员凭证。' });
    }
    
    // --- 2. 【已修正】使用拥有超级权限的 supabaseAdmin 客户端来验证该用户的角色 ---
    // 这样可以绕过RLS的死循环问题
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();
      
    if (profileError || !adminProfile || adminProfile.role !== 'admin') {
      return response.status(403).json({ error: '无权访问：您不是管理员。' });
    }

    // --- 3. 获取要删除的用户ID ---
    const { userIdToDelete } = request.body;
    if (!userIdToDelete) {
      return response.status(400).json({ error: '缺少要删除的用户ID。' });
    }

    // --- 4. 使用超级权限客户端删除用户 ---
    // 数据库的“级联删除”规则会自动删除 profiles, user_permissions, login_logs 中的相关记录
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);
    if (deleteError) {
      throw deleteError;
    }

    // --- 5. 返回成功信息 ---
    return response.status(200).json({ message: '用户已成功删除。' });

  } catch (error) {
    return response.status(500).json({ error: `删除失败: ${error.message}` });
  }
}
