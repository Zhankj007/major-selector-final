// 个人测评模块的简化版本 - 用于修复空白页面问题

window.initializeAssessmentTab = function() {
    console.log('开始初始化个人测评模块');
    
    // 获取DOM元素
    const assessmentTab = document.getElementById('assessment-tab');
    if (!assessmentTab) {
        console.error('未找到assessment-tab元素');
        return;
    }
    
    if (assessmentTab.dataset.initialized) {
        console.log('个人测评模块已初始化，跳过');
        return;
    }
    
    assessmentTab.dataset.initialized = 'true';
    
    // 显示基本的欢迎页面
    try {
        assessmentTab.innerHTML = `
            <div class="assessment-welcome" style="max-width: 800px; margin: 0 auto; padding: 20px;">
                <div class="welcome-content">
                    <h2 style="text-align: center; color: #333; margin-bottom: 20px;">个人测评中心</h2>
                    <p style="text-align: center; color: #666; margin-bottom: 30px;">
                        欢迎使用詹老师高考志愿工具箱的个人测评功能！
                    </p>
                    <p style="text-align: center; color: #666; margin-bottom: 30px;">
                        通过完成职业兴趣(霍兰德)、性格倾向(类MBTI)和个人能力自评三部分问卷，我们将为您推荐最适合的大学专业。
                    </p>
                    
                    <div class="assessment-info" style="display: grid; gap: 20px; margin-bottom: 40px;">
                        <div class="info-item" style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff;">
                            <h3 style="margin: 0 0 10px 0; color: #007bff;">霍兰德职业兴趣测评</h3>
                            <p style="margin: 0; color: #666;">6个维度，每个维度随机抽取7题，共42题</p>
                        </div>
                        <div class="info-item" style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
                            <h3 style="margin: 0 0 10px 0; color: #28a745;">性格倾向测评</h3>
                            <p style="margin: 0; color: #666;">4个维度，每个维度随机抽取7题，共28题</p>
                        </div>
                        <div class="info-item" style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545;">
                            <h3 style="margin: 0 0 10px 0; color: #dc3545;">能力自评</h3>
                            <p style="margin: 0; color: #666;">10个维度，每个维度随机抽取3题，共30题</p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button id="start-assessment-btn" style="
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border: none;
                            padding: 15px 40px;
                            border-radius: 25px;
                            font-size: 18px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                        ">开始测评</button>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #999; font-size: 14px;">
                            ⚠️ 注意：完整功能正在加载中，当前为简化版界面
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        // 添加开始按钮事件
        const startBtn = document.getElementById('start-assessment-btn');
        if (startBtn) {
            startBtn.addEventListener('click', function() {
                alert('测评功能正在修复中，请稍后再试！');
            });
            
            // 添加悬停效果
            startBtn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
            });
            
            startBtn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
            });
        }
        
        console.log('个人测评模块基础界面已加载');
        
    } catch (error) {
        console.error('渲染测评界面时出错:', error);
        assessmentTab.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #666;">
                <h2>页面加载失败</h2>
                <p>抱歉，个人测评模块遇到了问题。</p>
                <p>错误信息: ${error.message}</p>
                <button onclick="location.reload()" style="
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                ">刷新页面</button>
            </div>
        `;
    }
};

// 确保在页面加载完成后可以使用
if (typeof window !== 'undefined') {
    console.log('个人测评模块备用版已加载');
}