// api/register.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(request, response) {
  // --- CORS and Method Pre-checks ---
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // --- Input Validation ---
  const { email, password, username, phone, unit_name } = request.body;
  if (!email || !password || !username || !phone || !unit_name) {
    return response.status(400).json({ error: '所有字段均为必填项。' });
  }

  // Email format validation
  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  if (!emailRegex.test(email)) {
    return response.status(400).json({ error: '请输入有效的邮箱地址。' });
  }

  // Phone format validation (China mainland)
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return response.status(400).json({ error: '请输入有效的中国大陆手机号码（11位数字，以1开头）。' });
  }

  try {
    // --- Step 1: Create the user in Supabase Auth ---
    // 这会触发我们在第一阶段设置的第一个触发器，自动在 profiles 表中创建一条空记录
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (signUpError) {
      throw signUpError;
    }
    if (!authData.user) {
      // 虽然罕见，但这是一个额外的安全检查
      throw new Error('注册失败，未能成功创建用户。');
    }

    // --- Step 2: Update the user's profile with the extra information ---
    // 此时，触发器已经创建了 profiles 记录，我们只需用表单提交的额外信息去更新它
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username: username,
        phone: phone,
        unit_name: unit_name,
      })
      .eq('id', authData.user.id);

    if (updateError) {
      // 如果个人信息更新失败，这是一个需要关注的问题。
      // 在更复杂的系统中，可能会在这里删除刚刚创建的 auth 用户以保持数据一致性。
      // 目前我们只报告错误。
      throw updateError;
    }

    // --- Success ---
    // 同时，我们设置的第二个触发器也已运行，为用户赋予了默认权限。
    return response.status(201).json({ message: '注册成功！请检查您的邮箱以确认账户。' });

  } catch (error) {
    // --- Error Handling ---
    let errorMessage = error.message || '发生未知错误。';
    // 将Supabase返回的常见英文错误翻译成中文
    if (errorMessage.includes('User already registered')) {
        errorMessage = '此邮箱已被注册，请直接登录。';
    } else if (errorMessage.includes('Password should be at least 6 characters')) {
        errorMessage = '密码长度至少需要6位。';
    }
    return response.status(400).json({ error: errorMessage });
  }
}
