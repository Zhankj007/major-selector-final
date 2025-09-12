window.initializeAssessmentTab = function() {
    // 个人测评功能模块
    // 使用全局定义的Supabase客户端
    const supabaseClient = window.supabaseClient;

    // 页面状态管理
    let currentStep = 'welcome'; // welcome, assessment, result
    let currentQuestionIndex = 0;
    let allQuestions = [];
    let userAnswers = [];
    let hollandScores = { 'R': 0, 'I': 0, 'A': 0, 'S': 0, 'E': 0, 'C': 0 };
    let mbtiScores = {
        'EI': { 'E': 0, 'I': 0 },
        'SN': { 'S': 0, 'N': 0 },
        'TF': { 'T': 0, 'F': 0 },
        'JP': { 'J': 0, 'P': 0 }
    };
    let abilityScores = {};
    let recommendedMajors = [];

    // 获取DOM元素
    const assessmentTab = document.getElementById('assessment-tab');
    if (!assessmentTab || assessmentTab.dataset.initialized) return;
    assessmentTab.dataset.initialized = 'true';

    // 添加CSS样式
    addStyles();

    // 渲染页面内容
    async function renderPage() {
        try {
            switch (currentStep) {
                case 'welcome':
                    renderWelcomePage();
                    break;
                case 'assessment':
                    renderAssessmentPage();
                    break;
                case 'result':
                    await renderResultPage();
                    break;
            }
        } catch (error) {
            console.error('渲染页面时出错:', error);
            // 显示通用错误信息
            assessmentTab.innerHTML = `
                <div class="error-container">
                    <h2>页面加载失败</h2>
                    <p>抱歉，加载页面时遇到了问题。请稍后再试。</p>
                    <button id="refresh-page-btn" class="primary-button">刷新页面</button>
                </div>
            `;
            
            // 添加刷新按钮事件监听
            document.getElementById('refresh-page-btn').addEventListener('click', async () => {
                currentStep = 'welcome';
                await renderPage();
            });
        }
    }

    // 渲染欢迎页面
    function renderWelcomePage() {
        assessmentTab.innerHTML = `
            <div class="assessment-welcome">
                <div class="welcome-content">
                    <h2>个人测评中心</h2>
                    <p>欢迎使用詹老师高考志愿工具箱的个人测评功能！</p>
                    <p>通过完成职业兴趣(霍兰德)、性格倾向(类MBTI)和个人能力自评三部分问卷，我们将为您推荐最适合的大学专业。</p>
                    <div class="assessment-info">
                        <div class="info-item">
                            <h3>霍兰德职业兴趣测评</h3>
                            <p>6个维度，每个维度随机抽取7题，共42题</p>
                        </div>
                        <div class="info-item">
                            <h3>性格倾向测评</h3>
                            <p>4个维度，每个维度随机抽取7题，共28题</p>
                        </div>
                        <div class="info-item">
                            <h3>能力自评</h3>
                            <p>10个维度，每个维度随机抽取2题，共20题</p>
                        </div>
                    </div>
                    <button id="start-assessment-btn" class="primary-button">开始测评</button>
                </div>
            </div>
        `;

        document.getElementById('start-assessment-btn').addEventListener('click', startAssessment);
    }

    // 开始测评
    function startAssessment() {
        currentStep = 'assessment';
        currentQuestionIndex = 0;
        userAnswers = [];
        hollandScores = { 'R': 0, 'I': 0, 'A': 0, 'S': 0, 'E': 0, 'C': 0 };
        mbtiScores = {
            'EI': { 'E': 0, 'I': 0 },
            'SN': { 'S': 0, 'N': 0 },
            'TF': { 'T': 0, 'F': 0 },
            'JP': { 'J': 0, 'P': 0 }
        };
        abilityScores = {};
        
        loadQuestions().then(async () => {
            await renderPage();
        });
    }
    
    // 重新测评 - 跳转到欢迎页面
    function restartAssessment() {
        currentStep = 'welcome';
        currentQuestionIndex = 0;
        userAnswers = [];
        hollandScores = { 'R': 0, 'I': 0, 'A': 0, 'S': 0, 'E': 0, 'C': 0 };
        mbtiScores = {
            'EI': { 'E': 0, 'I': 0 },
            'SN': { 'S': 0, 'N': 0 },
            'TF': { 'T': 0, 'F': 0 },
            'JP': { 'J': 0, 'P': 0 }
        };
        abilityScores = {};
        recommendedMajors = [];
        
        renderPage();
    }
    
    // 检查霍兰德测评是否激活（当前正在作答）
    function isHollandActive() {
        if (!allQuestions || !allQuestions[currentQuestionIndex]) return false;
        return allQuestions[currentQuestionIndex].question_type === 'holland';
    }
    
    // 检查MBTI测评是否激活（当前正在作答）
    function isMbtiActive() {
        if (!allQuestions || !allQuestions[currentQuestionIndex]) return false;
        return allQuestions[currentQuestionIndex].question_type === 'mbti';
    }
    
    // 检查能力自评是否激活（当前正在作答）
    function isAbilityActive() {
        if (!allQuestions || !allQuestions[currentQuestionIndex]) return false;
        return allQuestions[currentQuestionIndex].question_type === 'ability';
    }
    
    // 获取霍兰德测评状态
    function getHollandStatus() {
        // 计算霍兰德题目的总数
        const totalHollandQuestions = allQuestions.filter(q => q.question_type === 'holland').length;
        // 计算已回答的霍兰德题目数量
        let answeredHollandQuestions = 0;
        for (let i = 0; i <= currentQuestionIndex; i++) {
            if (allQuestions[i] && allQuestions[i].question_type === 'holland' && userAnswers[i]) {
                answeredHollandQuestions++;
            }
        }
        
        // 检查是否所有霍兰德题目都已完成
        const hollandCompleted = totalHollandQuestions > 0 && answeredHollandQuestions === totalHollandQuestions;
        
        if (hollandCompleted) {
            return '已完成';
        } else if (isHollandActive()) {
            return '作答中';
        } else if (answeredHollandQuestions > 0) {
            return `${answeredHollandQuestions}/${totalHollandQuestions}`;
        } else {
            return '未开始';
        }
    }
    
    // 获取MBTI测评状态
    function getMbtiStatus() {
        // 计算MBTI题目的总数
        const totalMbtiQuestions = allQuestions.filter(q => q.question_type === 'mbti').length;
        // 计算霍兰德题目的总数，用于确定MBTI是否已经可以开始
        const totalHollandQuestions = allQuestions.filter(q => q.question_type === 'holland').length;
        // 计算已回答的霍兰德题目数量，用于确定MBTI是否已经可以开始
        let answeredHollandQuestions = 0;
        for (let i = 0; i < allQuestions.length; i++) {
            if (allQuestions[i] && allQuestions[i].question_type === 'holland' && userAnswers[i]) {
                answeredHollandQuestions++;
            }
        }
        // 计算已回答的MBTI题目数量
        let answeredMbtiQuestions = 0;
        for (let i = 0; i <= currentQuestionIndex; i++) {
            if (allQuestions[i] && allQuestions[i].question_type === 'mbti' && userAnswers[i]) {
                answeredMbtiQuestions++;
            }
        }
        
        // 检查是否所有MBTI题目都已完成
        const mbtiCompleted = totalMbtiQuestions > 0 && answeredMbtiQuestions === totalMbtiQuestions;
        // 检查霍兰德是否已完成（MBTI是否可以开始）
        const hollandCompleted = totalHollandQuestions > 0 && answeredHollandQuestions === totalHollandQuestions;
        
        if (mbtiCompleted) {
            return '已完成';
        } else if (isMbtiActive()) {
            return '作答中';
        } else if (hollandCompleted) {
            return `${answeredMbtiQuestions}/${totalMbtiQuestions}`;
        } else {
            return '未开始（需先完成霍兰德）';
        }
    }
    
    // 获取能力自评状态
    function getAbilityStatus() {
        // 计算能力自评题目的总数
        const totalAbilityQuestions = allQuestions.filter(q => q.question_type === 'ability').length;
        // 计算霍兰德和MBTI题目的总数，用于确定能力自评是否已经可以开始
        const totalHollandQuestions = allQuestions.filter(q => q.question_type === 'holland').length;
        const totalMbtiQuestions = allQuestions.filter(q => q.question_type === 'mbti').length;
        // 计算已回答的霍兰德和MBTI题目数量，用于确定能力自评是否已经可以开始
        let answeredHollandQuestions = 0;
        let answeredMbtiQuestions = 0;
        for (let i = 0; i < allQuestions.length; i++) {
            if (allQuestions[i] && allQuestions[i].question_type === 'holland' && userAnswers[i]) {
                answeredHollandQuestions++;
            }
            if (allQuestions[i] && allQuestions[i].question_type === 'mbti' && userAnswers[i]) {
                answeredMbtiQuestions++;
            }
        }
        // 计算已回答的能力自评题目数量
        let answeredAbilityQuestions = 0;
        for (let i = 0; i <= currentQuestionIndex; i++) {
            if (allQuestions[i] && allQuestions[i].question_type === 'ability' && userAnswers[i]) {
                answeredAbilityQuestions++;
            }
        }
        
        // 检查是否所有能力自评题目都已完成
        const abilityCompleted = totalAbilityQuestions > 0 && answeredAbilityQuestions === totalAbilityQuestions;
        // 检查霍兰德和MBTI是否已完成（能力自评是否可以开始）
        const hollandCompleted = totalHollandQuestions > 0 && answeredHollandQuestions === totalHollandQuestions;
        const mbtiCompleted = totalMbtiQuestions > 0 && answeredMbtiQuestions === totalMbtiQuestions;
        
        if (abilityCompleted) {
            return '已完成';
        } else if (isAbilityActive()) {
            return '作答中';
        } else if (hollandCompleted && mbtiCompleted) {
            return `${answeredAbilityQuestions}/${totalAbilityQuestions}`;
        } else {
            return '未开始（需先完成霍兰德和MBTI）';
        }
    }

    // 加载测评题目 - 实现按维度随机抽题的逻辑
    async function loadQuestions() {
        try {
            // 从questions表中获取所有题目
            let questionsData = [];
            let choicesData = [];
            
            // 尝试从数据库获取数据
            if (supabaseClient) {
                const { data: qData, error: qError } = await supabaseClient
                    .from('questions')
                    .select('*');
                
                const { data: cData, error: cError } = await supabaseClient
                    .from('choices')
                    .select('*');
                
                if (!qError && !cError) {
                    questionsData = qData;
                    choicesData = cData;
                }
            }
            
            // 如果数据库没有数据或连接失败，使用备用的模拟数据
            if (!questionsData.length) {
                questionsData = [
                    // 霍兰德问题
                    { id: '1', question_text: '喜欢修理出故障的电器或机械设备。', question_type: 'holland', dimension: 'R' },
                    { id: '2', question_text: '喜欢动手操作工具或机械。', question_type: 'holland', dimension: 'R' },
                    { id: '3', question_text: '喜欢参加户外活动或运动。', question_type: 'holland', dimension: 'R' },
                    { id: '4', question_text: '喜欢观察和研究自然现象。', question_type: 'holland', dimension: 'R' },
                    { id: '5', question_text: '喜欢从事需要体力劳动的工作。', question_type: 'holland', dimension: 'R' },
                    { id: '6', question_text: '喜欢使用各种工具解决实际问题。', question_type: 'holland', dimension: 'R' },
                    { id: '7', question_text: '喜欢组装或修理家具。', question_type: 'holland', dimension: 'R' },
                    { id: '8', question_text: '喜欢研究和解决复杂的数学问题。', question_type: 'holland', dimension: 'I' },
                    { id: '9', question_text: '喜欢阅读科学书籍或文章。', question_type: 'holland', dimension: 'I' },
                    { id: '10', question_text: '喜欢进行实验或研究工作。', question_type: 'holland', dimension: 'I' },
                    { id: '11', question_text: '喜欢分析数据或统计信息。', question_type: 'holland', dimension: 'I' },
                    { id: '12', question_text: '喜欢探索新的知识领域。', question_type: 'holland', dimension: 'I' },
                    { id: '13', question_text: '喜欢思考抽象的哲学问题。', question_type: 'holland', dimension: 'I' },
                    { id: '14', question_text: '喜欢撰写学术论文或报告。', question_type: 'holland', dimension: 'I' },
                    { id: '15', question_text: '喜欢绘画、音乐、写作等创造性活动。', question_type: 'holland', dimension: 'A' },
                    { id: '16', question_text: '喜欢设计或装饰物品。', question_type: 'holland', dimension: 'A' },
                    { id: '17', question_text: '喜欢参加艺术展览或表演。', question_type: 'holland', dimension: 'A' },
                    { id: '18', question_text: '喜欢创作故事或诗歌。', question_type: 'holland', dimension: 'A' },
                    { id: '19', question_text: '喜欢学习音乐或乐器。', question_type: 'holland', dimension: 'A' },
                    { id: '20', question_text: '喜欢摄影或录像创作。', question_type: 'holland', dimension: 'A' },
                    { id: '21', question_text: '喜欢时尚设计或搭配。', question_type: 'holland', dimension: 'A' },
                    { id: '22', question_text: '喜欢帮助他人解决问题。', question_type: 'holland', dimension: 'S' },
                    { id: '23', question_text: '喜欢参与社区服务或志愿活动。', question_type: 'holland', dimension: 'S' },
                    { id: '24', question_text: '喜欢教育或指导他人。', question_type: 'holland', dimension: 'S' },
                    { id: '25', question_text: '喜欢与他人合作完成任务。', question_type: 'holland', dimension: 'S' },
                    { id: '26', question_text: '喜欢倾听他人的心声或烦恼。', question_type: 'holland', dimension: 'S' },
                    { id: '27', question_text: '喜欢照顾老人或儿童。', question_type: 'holland', dimension: 'S' },
                    { id: '28', question_text: '喜欢从事医疗或护理工作。', question_type: 'holland', dimension: 'S' },
                    { id: '29', question_text: '喜欢领导或组织团队活动。', question_type: 'holland', dimension: 'E' },
                    { id: '30', question_text: '喜欢参与商业活动或创业。', question_type: 'holland', dimension: 'E' },
                    { id: '31', question_text: '喜欢销售产品或服务。', question_type: 'holland', dimension: 'E' },
                    { id: '32', question_text: '喜欢制定计划或策略。', question_type: 'holland', dimension: 'E' },
                    { id: '33', question_text: '喜欢谈判或说服他人。', question_type: 'holland', dimension: 'E' },
                    { id: '34', question_text: '喜欢竞争或挑战目标。', question_type: 'holland', dimension: 'E' },
                    { id: '35', question_text: '喜欢关注经济或市场动态。', question_type: 'holland', dimension: 'E' },
                    { id: '36', question_text: '喜欢整理或归档文件资料。', question_type: 'holland', dimension: 'C' },
                    { id: '37', question_text: '喜欢按照规则或程序办事。', question_type: 'holland', dimension: 'C' },
                    { id: '38', question_text: '喜欢处理数字或财务数据。', question_type: 'holland', dimension: 'C' },
                    { id: '39', question_text: '喜欢填写表格或报表。', question_type: 'holland', dimension: 'C' },
                    { id: '40', question_text: '喜欢保持环境整洁有序。', question_type: 'holland', dimension: 'C' },
                    { id: '41', question_text: '喜欢遵守时间表或计划。', question_type: 'holland', dimension: 'C' },
                    { id: '42', question_text: '喜欢精确计算或记录数据。', question_type: 'holland', dimension: 'C' },
                    // MBTI问题
                    { id: '43', question_text: '在社交场合中，我倾向于：', question_type: 'mbti', dimension: 'EI' },
                    { id: '44', question_text: '我更喜欢：', question_type: 'mbti', dimension: 'EI' },
                    { id: '45', question_text: '当我需要放松时，我通常：', question_type: 'mbti', dimension: 'EI' },
                    { id: '46', question_text: '我更关注：', question_type: 'mbti', dimension: 'SN' },
                    { id: '47', question_text: '我做决定时，更注重：', question_type: 'mbti', dimension: 'TF' },
                    { id: '48', question_text: '我更喜欢：', question_type: 'mbti', dimension: 'TF' },
                    { id: '49', question_text: '我更倾向于：', question_type: 'mbti', dimension: 'JP' },
                    { id: '50', question_text: '在规划未来时，我更倾向于：', question_type: 'mbti', dimension: 'JP' },
                    { id: '51', question_text: '当计划被打乱时，我通常：', question_type: 'mbti', dimension: 'JP' },
                    { id: '52', question_text: '在团队工作中，我更擅长：', question_type: 'mbti', dimension: 'EI' },
                    { id: '53', question_text: '我更相信：', question_type: 'mbti', dimension: 'SN' },
                    { id: '54', question_text: '我更重视：', question_type: 'mbti', dimension: 'SN' },
                    { id: '55', question_text: '我处理冲突时，通常：', question_type: 'mbti', dimension: 'TF' },
                    { id: '56', question_text: '在工作中，我更关注：', question_type: 'mbti', dimension: 'TF' },
                    { id: '57', question_text: '我更喜欢怎样的生活方式：', question_type: 'mbti', dimension: 'JP' },
                    { id: '58', question_text: '当面临压力时，我更倾向于：', question_type: 'mbti', dimension: 'JP' },
                    { id: '59', question_text: '在聚会中，我通常是：', question_type: 'mbti', dimension: 'EI' },
                    { id: '60', question_text: '我更擅长：', question_type: 'mbti', dimension: 'SN' },
                    { id: '61', question_text: '我更倾向于从哪个角度看问题：', question_type: 'mbti', dimension: 'TF' },
                    { id: '62', question_text: '对于待办事项，我通常：', question_type: 'mbti', dimension: 'JP' },
                    { id: '63', question_text: '在讨论中，我更倾向于：', question_type: 'mbti', dimension: 'EI' },
                    { id: '64', question_text: '我更关注事物的：', question_type: 'mbti', dimension: 'SN' },
                    { id: '65', question_text: '我做决策时更依赖：', question_type: 'mbti', dimension: 'TF' },
                    { id: '66', question_text: '我更喜欢：', question_type: 'mbti', dimension: 'JP' },
                    { id: '67', question_text: '当有空闲时间时，我更愿意：', question_type: 'mbti', dimension: 'EI' },
                    { id: '68', question_text: '我更相信：', question_type: 'mbti', dimension: 'SN' },
                    { id: '69', question_text: '在评价他人时，我更看重：', question_type: 'mbti', dimension: 'TF' },
                    { id: '70', question_text: '我更倾向于：', question_type: 'mbti', dimension: 'JP' },
                    // 能力自评问题
                    { id: '71', question_text: '请评价您的逻辑思维能力：', question_type: 'ability', dimension: '逻辑思维能力' },
                    { id: '72', question_text: '请评价您的创新思维能力：', question_type: 'ability', dimension: '创新思维能力' },
                    { id: '73', question_text: '请评价您的语言表达能力：', question_type: 'ability', dimension: '语言表达能力' },
                    { id: '74', question_text: '请评价您的数学计算能力：', question_type: 'ability', dimension: '数学计算能力' },
                    { id: '75', question_text: '请评价您的动手实践能力：', question_type: 'ability', dimension: '动手实践能力' },
                    { id: '76', question_text: '请评价您的空间想象能力：', question_type: 'ability', dimension: '空间想象能力' },
                    { id: '77', question_text: '请评价您的记忆能力：', question_type: 'ability', dimension: '记忆能力' },
                    { id: '78', question_text: '请评价您的注意力：', question_type: 'ability', dimension: '注意力' },
                    { id: '79', question_text: '请评价您的情绪管理能力：', question_type: 'ability', dimension: '情绪管理能力' },
                    { id: '80', question_text: '请评价您的团队协作能力：', question_type: 'ability', dimension: '团队协作能力' }
                ];
                
                // 生成对应的选项数据
                choicesData = [];
                let choiceId = 1;
                
                // 为霍兰德问题生成5点量表选项
                for (let i = 1; i <= 42; i++) {
                    const question = questionsData[i-1];
                    for (let j = 1; j <= 5; j++) {
                        const choiceTexts = ['非常喜欢', '比较喜欢', '一般', '不太喜欢', '不喜欢'];
                        choicesData.push({
                            id: choiceId.toString(),
                            question_id: question.id,
                            choice_text: choiceTexts[j-1],
                            score_type: question.dimension,
                            score_value: 6 - j // 反向计分，非常喜欢=5分，不喜欢=1分
                        });
                        choiceId++;
                    }
                }
                
                // 为MBTI问题生成2选项
                for (let i = 43; i <= 70; i++) {
                    const question = questionsData[i-1];
                    let options = [];
                    
                    if (question.dimension === 'EI') {
                        options = [
                            { text: '主动与他人交流，享受社交活动', type: 'E' },
                            { text: '倾向于观察和倾听，需要独处恢复精力', type: 'I' }
                        ];
                    } else if (question.dimension === 'SN') {
                        options = [
                            { text: '关注具体事实和细节', type: 'S' },
                            { text: '关注抽象概念和可能性', type: 'N' }
                        ];
                    } else if (question.dimension === 'TF') {
                        options = [
                            { text: '逻辑分析和客观事实', type: 'T' },
                            { text: '个人价值观和他人感受', type: 'F' }
                        ];
                    } else if (question.dimension === 'JP') {
                        options = [
                            { text: '有计划、有条理', type: 'J' },
                            { text: '灵活、即兴', type: 'P' }
                        ];
                    }
                    
                    options.forEach(option => {
                        choicesData.push({
                            id: choiceId.toString(),
                            question_id: question.id,
                            choice_text: option.text,
                            score_type: option.type,
                            score_value: 1
                        });
                        choiceId++;
                    });
                }
                
                // 为能力自评问题生成5点量表选项
                for (let i = 71; i <= 80; i++) {
                    const question = questionsData[i-1];
                    for (let j = 1; j <= 5; j++) {
                        const choiceTexts = ['很强', '较强', '一般', '较弱', '很弱'];
                        choicesData.push({
                            id: choiceId.toString(),
                            question_id: question.id,
                            choice_text: choiceTexts[j-1],
                            score_type: question.dimension,
                            score_value: 6 - j // 反向计分，很强=5分，很弱=1分
                        });
                        choiceId++;
                    }
                }
            }
            
            // 构建题目和选项的关系
            let fullQuestionsList = questionsData.map(question => {
                const questionChoices = choicesData
                    .filter(choice => choice.question_id === question.id)
                    .map(choice => ({
                        id: choice.id,
                        choice_text: choice.choice_text,
                        score_type: choice.score_type,
                        score_value: choice.score_value
                    }));
                
                return {
                    id: question.id,
                    question_text: question.question_text,
                    question_type: question.question_type,
                    dimension: question.dimension,
                    choices: questionChoices
                };
            });
            
            // 按维度分组并随机抽取指定数量的题目
            const hollandDimensions = ['R', 'I', 'A', 'S', 'E', 'C'];
            const mbtiDimensions = ['EI', 'SN', 'TF', 'JP'];
            const abilityDimensions = ['逻辑思维能力', '创新思维能力', '语言表达能力', '数学计算能力', '动手实践能力', '空间想象能力', '记忆能力', '注意力', '情绪管理能力', '团队协作能力'];
            
            // 从每个霍兰德维度随机抽取7题
            const hollandQuestions = [];
            hollandDimensions.forEach(dimension => {
                const dimQuestions = fullQuestionsList.filter(q => q.question_type === 'holland' && q.dimension === dimension);
                const shuffled = dimQuestions.sort(() => Math.random() - 0.5);
                const selected = shuffled.slice(0, 7);
                hollandQuestions.push(...selected);
            });
            
            // 从每个MBTI维度随机抽取7题
            const mbtiQuestions = [];
            mbtiDimensions.forEach(dimension => {
                const dimQuestions = fullQuestionsList.filter(q => q.question_type === 'mbti' && q.dimension === dimension);
                const shuffled = dimQuestions.sort(() => Math.random() - 0.5);
                const selected = shuffled.slice(0, 7);
                mbtiQuestions.push(...selected);
            });
            
            // 从每个能力维度随机抽取2题（如果没有那么多题，则抽取所有可用的）
            const abilityQuestions = [];
            abilityDimensions.forEach(dimension => {
                const dimQuestions = fullQuestionsList.filter(q => q.question_type === 'ability' && q.dimension === dimension);
                const shuffled = dimQuestions.sort(() => Math.random() - 0.5);
                const selected = shuffled.slice(0, 2);
                abilityQuestions.push(...selected);
            });
            
            // 按类型分组，同一类型内题目随机排序，类型间保持固定顺序：holland -> mbti -> ability
            // 霍兰德题目内部随机排序
            const shuffledHollandQuestions = hollandQuestions.sort(() => Math.random() - 0.5);
            // MBTI题目内部随机排序
            const shuffledMbtiQuestions = mbtiQuestions.sort(() => Math.random() - 0.5);
            // 能力自评题目内部随机排序
            const shuffledAbilityQuestions = abilityQuestions.sort(() => Math.random() - 0.5);
            
            // 合并所有题目，保持类型顺序
            allQuestions = [...shuffledHollandQuestions, ...shuffledMbtiQuestions, ...shuffledAbilityQuestions];
            
        } catch (error) {
            console.error('获取题目数据失败:', error);
            throw error;
        }
    }

    // 渲染测评页面 - 实现左侧40%答题区域，右侧60%结果报告页布局
    function renderAssessmentPage() {
        const question = allQuestions[currentQuestionIndex];
        const progress = Math.round(((currentQuestionIndex + 1) / allQuestions.length) * 100);
        
        // 查找当前题目的用户答案
        const userAnswer = userAnswers.find(answer => answer.question_id === question.id);
        const selectedChoiceId = userAnswer ? userAnswer.choice_id : null;
        
        assessmentTab.innerHTML = `
            <div class="assessment-layout">
                <div class="assessment-left-panel">
                    <div class="assessment-header">
                            <h2>个人测评</h2>
                            <div class="assessment-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${progress}%">
                                        <span class="progress-text">${currentQuestionIndex + 1}/${allQuestions.length}</span>
                                    </div>
                                </div>
                                <span class="progress-percentage">${progress}%</span>
                            </div>
                        </div>
                        
                        <!-- 题目内容容器 - 添加滚动条支持 -->
                        <div class="question-content-container">
                            <div class="question-container">
                                <div class="question-header">
                                    <span class="question-type">${getQuestionTypeLabel(question.question_type)}</span>
                                    <h3>${question.question_text}</h3>
                                </div>
                                
                                <div class="question-options">
                                    ${question.choices.map((choice, index) => `
                                        <label class="choice-option">
                                            <input type="radio" name="question-${question.id}" value="${choice.id}" ${selectedChoiceId === choice.id ? 'checked' : ''} onchange="handleChoiceSelection(event)">
                                            <span class="choice-text">${choice.choice_text}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        
                        <!-- 显示上一题和下一题按钮 -->
                        <div class="assessment-controls">
                            <button id="prev-question-btn" class="secondary-button" ${currentQuestionIndex === 0 ? 'disabled' : ''}>
                                上一题
                            </button>
                            <button id="next-question-btn" class="primary-button">
                                ${currentQuestionIndex === allQuestions.length - 1 ? '完成测评' : '下一题'}
                            </button>
                        </div>
                </div>
                
                <div class="assessment-right-panel">
                    <div class="result-preview">
                        <h3>结果预览</h3>
                        <p>完成所有题目后，这里将显示您的详细测评报告，包括：</p>
                        <ul>
                            <li>霍兰德职业兴趣代码分析</li>
                            <li>MBTI性格类型分析</li>
                            <li>个人能力优势雷达图</li>
                            <li>定制化专业推荐列表</li>
                        </ul>
                        <div class="preview-tips">
                            <p><strong>温馨提示：</strong></p>
                            <p>• 请根据您的真实想法选择答案</p>
                            <p>• 没有绝对的对错，只有最适合您的选择</p>
                            <p>• 完成测评大约需要10-15分钟</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加事件监听器
        document.getElementById('prev-question-btn').addEventListener('click', async () => {
            await handlePrevQuestion();
        });
        document.getElementById('next-question-btn').addEventListener('click', async () => {
            await handleNextQuestion();
        });
        
        // 为选项添加事件监听器的全局函数
        window.handleChoiceSelection = async function(event) {
            // 使用setTimeout稍微延迟一下，让用户看到选择效果
            setTimeout(async () => {
                await handleNextQuestion();
            }, 300);
        };
    }

    // 获取题目类型标签
    function getQuestionTypeLabel(type) {
        switch (type) {
            case 'holland': return '职业兴趣';
            case 'mbti': return '性格倾向';
            case 'ability': return '能力自评';
            default: return '测评题目';
        }
    }

    // 处理上一题
    async function handlePrevQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            await renderPage();
        }
    }

    // 处理下一题
    async function handleNextQuestion() {
        const selectedChoice = document.querySelector(`input[name="question-${allQuestions[currentQuestionIndex].id}"]:checked`);
        
        if (!selectedChoice && currentQuestionIndex < allQuestions.length - 1) {
            alert('请选择一个答案');
            return;
        }
        
        // 记录答案
        if (selectedChoice) {
            const choiceId = selectedChoice.value;
            const choice = allQuestions[currentQuestionIndex].choices.find(c => c.id === choiceId);
            
            userAnswers.push({
                question_id: allQuestions[currentQuestionIndex].id,
                choice_id: choiceId,
                score_type: choice.score_type,
                score_value: choice.score_value
            });
            
            // 计算分数
            calculateScores(choice);
        }
        
        // 检查是否完成所有题目
        if (currentQuestionIndex === allQuestions.length - 1) {
            // 显示加载动画
            showLoadingAnimation();
            
            // 模拟计算时间
            setTimeout(() => {
                currentStep = 'result';
                renderPage();
            }, 2000);
        } else {
            currentQuestionIndex++;
            await renderPage();
        }
    }

    // 显示加载动画
    function showLoadingAnimation() {
        assessmentTab.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <h3>正在为您生成专属报告...</h3>
                <p>我们正在分析您的测评结果，为您推荐最适合的专业</p>
            </div>
        `;
    }

    // 计算分数
    function calculateScores(choice) {
        const questionType = allQuestions[currentQuestionIndex].question_type;
        
        if (questionType === 'holland') {
            // 霍兰德分数计算
            hollandScores[choice.score_type] += choice.score_value;
        } else if (questionType === 'mbti') {
            // MBTI分数计算
            const dimension = allQuestions[currentQuestionIndex].dimension;
            mbtiScores[dimension][choice.score_type] += choice.score_value;
        } else if (questionType === 'ability') {
            // 能力分数计算
            if (!abilityScores[choice.score_type]) {
                abilityScores[choice.score_type] = { sum: 0, count: 0 };
            }
            abilityScores[choice.score_type].sum += choice.score_value;
            abilityScores[choice.score_type].count += 1;
        }
    }

    // 渲染结果页面
    async function renderResultPage() {
        try {
            const hollandCode = generateHollandCode();
            const mbtiType = generateMBTIType();
            
            // 使用异步专业匹配算法获取推荐专业
            recommendedMajors = await generateRecommendedMajors(hollandCode, mbtiType);
            
            assessmentTab.innerHTML = `
            <div class="result-page">
                <div class="result-header">
                    <h2>您的个人测评报告</h2>
                    <p>根据您的回答，我们为您生成了专属的专业推荐</p>
                    <div class="report-meta">
                        <span>生成时间：${new Date().toLocaleString()}</span>
                        <button id="share-report-btn" class="secondary-button">
                            <i class="fas fa-share-alt"></i> 分享报告
                        </button>
                    </div>
                </div>
                
                <!-- 修改为左右分栏布局 -->
                <div class="result-layout">
                    <!-- 左侧显示三种测评结果 -->
                    <div class="result-left-panel">
                        <div class="result-section">
                            <h3>霍兰德职业兴趣代码分析</h3>
                            <div class="holland-result">
                                <div class="holland-code">
                                    <span class="code-label">您的霍兰德代码：</span>
                                    <span class="code-value">${hollandCode}</span>
                                </div>
                                <div class="holland-description">
                                    <p>${getHollandDescription(hollandCode)}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="result-section">
                            <h3>MBTI性格类型分析</h3>
                            <div class="mbti-result">
                                <div class="mbti-type">
                                    <span class="type-label">您的MBTI类型：</span>
                                    <span class="type-value">${mbtiType}</span>
                                </div>
                                <div class="mbti-description">
                                    <p>${getMBTIDescription(mbtiType)}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="result-section">
                            <h3>能力优势雷达图</h3>
                            <div class="ability-radar">
                                <canvas id="abilityChart" width="400" height="300"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 右侧显示推荐专业 -->
                    <div class="result-right-panel">
                        <div class="result-section">
                            <h3>推荐专业列表</h3>
                            <div class="recommended-majors">
                                ${recommendedMajors.map((major, index) => `
                                    <div class="major-card">
                                        <div class="major-rank">${index + 1}</div>
                                        <div class="major-info">
                                            <h4 class="major-name">${major.name}</h4>
                                            <p class="major-code">专业代码：${major.code}</p>
                                            <p class="match-score">匹配度：${major.matchScore}%</p>
                                        </div>
                                        <div class="recommendation-reason">
                                            <p>${major.reason}</p>
                                        </div>
                                        <button class="view-major-details" data-major-code="${major.code}">查看详情</button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="result-footer">
                    <button id="restart-assessment-btn" class="secondary-button">重新测评</button>
                    <button id="save-report-btn" class="primary-button">保存报告</button>
                </div>
            </div>
            `;
        
        // 绘制能力雷达图
        drawAbilityRadar();
        
        // 添加事件监听器
        document.getElementById('restart-assessment-btn').addEventListener('click', restartAssessment);
        document.getElementById('save-report-btn').addEventListener('click', saveReport);
        document.getElementById('share-report-btn').addEventListener('click', shareReport);
        
        // 为每个专业卡片的查看详情按钮添加事件监听器
        document.querySelectorAll('.view-major-details').forEach(button => {
            button.addEventListener('click', function() {
                const majorCode = this.getAttribute('data-major-code');
                viewMajorDetails(majorCode);
            });
        });
        } catch (error) {
            console.error('渲染结果页面时出错:', error);
            // 显示错误信息
            assessmentTab.innerHTML = `
                <div class="error-container">
                    <h2>生成报告失败</h2>
                    <p>抱歉，生成您的专属报告时遇到了问题。请稍后再试。</p>
                    <button id="retry-btn" class="primary-button">重试</button>
                </div>
            `;
            
            // 添加重试按钮事件监听
            document.getElementById('retry-btn').addEventListener('click', renderResultPage);
        }
    }

    // 生成霍兰德代码
    function generateHollandCode() {
        // 对霍兰德分数进行排序
        const sortedScores = Object.entries(hollandScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        // 返回前三个字母作为代码
        return sortedScores.map(item => item[0]).join('');
    }

    // 生成MBTI类型
    function generateMBTIType() {
        let mbti = '';
        
        // 外倾(E)/内倾(I)
        mbti += mbtiScores['EI']['E'] > mbtiScores['EI']['I'] ? 'E' : 'I';
        
        // 感觉(S)/直觉(N)
        mbti += mbtiScores['SN']['S'] > mbtiScores['SN']['N'] ? 'S' : 'N';
        
        // 思考(T)/情感(F)
        mbti += mbtiScores['TF']['T'] > mbtiScores['TF']['F'] ? 'T' : 'F';
        
        // 判断(J)/感知(P)
        mbti += mbtiScores['JP']['J'] > mbtiScores['JP']['P'] ? 'J' : 'P';
        
        return mbti;
    }

    // 实现两阶段专业匹配算法
    async function generateRecommendedMajors(hollandCode, mbtiType) {
        try {
            // 检查是否有Supabase客户端实例
            if (!window.supabaseClient) {
                throw new Error('未找到数据库连接实例');
            }
            
            // 第一阶段：初步筛选 (硬匹配)
            // 使用用户计算出的霍兰德代码和MBTI类型从major_rules表中筛选专业
            const { data: majorRules, error: rulesError } = await window.supabaseClient
                .from('major_rules')
                .select('*')
                .contains('holland_codes', [hollandCode])
                .contains('mbti_types', [mbtiType]);
                
            if (rulesError) {
                throw new Error(`查询专业规则失败: ${rulesError.message}`);
            }
            
            if (!majorRules || majorRules.length === 0) {
                // 如果没有找到完全匹配的专业，返回一些默认推荐
                return getDefaultRecommendedMajors();
            }
            
            // 第二阶段：权重排序 (软匹配)
            // 遍历第一阶段筛选出的每一个专业，计算能力匹配度得分
            const majorsWithScores = majorRules.map(majorRule => {
                // 获取该专业所需的核心能力
                const requiredAbilities = majorRule.required_abilities || [];
                
                // 计算能力匹配度得分
                let abilityMatchScore = 0;
                let abilityCount = 0;
                
                if (requiredAbilities.length > 0) {
                    requiredAbilities.forEach(ability => {
                        if (abilityScores[ability] && abilityScores[ability].count > 0) {
                            // 计算该能力的平均分（1-5分）
                            const avgScore = abilityScores[ability].sum / abilityScores[ability].count;
                            // 转换为百分比（1分=20%，5分=100%）
                            abilityMatchScore += avgScore * 20;
                            abilityCount++;
                        }
                    });
                    
                    // 计算平均能力匹配度得分
                    if (abilityCount > 0) {
                        abilityMatchScore = Math.round(abilityMatchScore / abilityCount);
                    } else {
                        // 如果没有匹配的能力项，给予一个基础分
                        abilityMatchScore = 60;
                    }
                } else {
                    // 如果专业没有指定所需能力，给予一个基础分
                    abilityMatchScore = 70;
                }
                
                // 返回带匹配度得分的专业数据
                return {
                    code: majorRule.major_code,
                    name: majorRule.major_name,
                    matchScore: abilityMatchScore,
                    reason: majorRule.recommendation_reason || '该专业与您的个人特质和能力相匹配。'
                };
            });
            
            // 根据能力匹配度得分进行降序排序
            majorsWithScores.sort((a, b) => b.matchScore - a.matchScore);
            
            // 返回排序后的前10个专业
            return majorsWithScores.slice(0, 10);
            
        } catch (error) {
            console.error('生成推荐专业时出错:', error);
            // 如果出错，返回默认推荐
            return getDefaultRecommendedMajors();
        }
    }
    
    // 获取默认推荐专业（当数据库查询失败时使用）
    function getDefaultRecommendedMajors() {
        return [
            {
                code: '080901',
                name: '计算机科学与技术',
                matchScore: 92,
                reason: '适合逻辑思维能力强、喜欢解决复杂问题的学生。该专业与您的霍兰德代码和MBTI类型高度匹配，能够充分发挥您的分析能力和创新思维。'
            },
            {
                code: '050201',
                name: '英语',
                matchScore: 88,
                reason: '适合语言表达能力强、喜欢与人交流的学生。该专业能够发挥您的沟通能力和文化理解能力，与您的性格特点相契合。'
            },
            {
                code: '020101',
                name: '经济学',
                matchScore: 85,
                reason: '适合逻辑思维能力和数学计算能力强的学生。该专业能够充分发挥您的分析能力和决策能力，与您的能力优势相匹配。'
            },
            {
                code: '120201',
                name: '工商管理',
                matchScore: 82,
                reason: '适合团队协作能力强、具有领导潜质的学生。该专业能够发挥您的组织能力和人际交往能力，与您的性格特点和职业兴趣相契合。'
            },
            {
                code: '070101',
                name: '数学与应用数学',
                matchScore: 80,
                reason: '适合数学计算能力和逻辑思维能力强的学生。该专业能够充分发挥您的抽象思维能力和问题解决能力，与您的能力优势高度匹配。'
            }
        ];
    }

    // 获取霍兰德代码描述
    function getHollandDescription(code) {
        const descriptions = {
            'R': '现实型（实际、动手能力强、喜欢具体工作）',
            'I': '研究型（理性、善于思考、喜欢分析问题）',
            'A': '艺术型（创造力强、情感丰富、喜欢艺术表达）',
            'S': '社会型（善于社交、乐于助人、喜欢与人合作）',
            'E': '企业型（自信、领导能力强、喜欢挑战和竞争）',
            'C': '传统型（细心、有条理、喜欢按规则办事）'
        };
        
        let description = '';
        for (let char of code) {
            if (descriptions[char]) {
                description += descriptions[char] + '、';
            }
        }
        
        return description.slice(0, -1) + '的组合，表明您适合...';
    }

    // 获取MBTI类型描述
    function getMBTIDescription(type) {
        const descriptions = {
            'ISTJ': '安静、严肃，通过全面性和可靠性获得成功。实际，有责任感。决定有逻辑性，并一步步地朝着目标前进，不易分心。喜欢将工作、家庭和生活安排得井井有条。重视传统和忠诚。',
            'ISFJ': '安静、友好、有责任感和良知。坚定地致力于完成他们的义务。全面、勤勉、精确，忠诚、体贴，留心和记得他们重视的人的小细节，关心他们的感受。努力把工作和家庭环境营造得有序而温馨。',
            'INFJ': '寻求思想、关系、物质等之间的意义和联系。希望了解什么能够激励人，对人有很强的洞察力。有责任心，坚持自己的价值观。对于怎样更好地服务大众有清晰的远景。在对于目标的实现过程中有计划而且果断坚定。',
            'INTJ': '在实现自己的想法和达成自己的目标时有创新的想法和非凡的动力。能很快洞察到外界事物间的规律并形成长期的远景计划。一旦决定做一件事就会开始规划并直到完成为止。多疑、独立，对于自己和他人能力和表现的要求都非常高。',
            'ISTP': '灵活、忍耐力强，是个安静的观察者直到有问题发生，就会马上行动，找到实用的解决方法。分析事物运作的原理，能从大量信息中很快找到关键的症结所在。对于原因和结果感兴趣，用逻辑的方式处理问题，重视效率。',
            'ISFP': '安静、友好、敏感、和善。享受当前。喜欢有自己的空间，喜欢按照自己的时间表工作。对于自己的价值观和自己觉得重要的人非常忠诚，有责任心。不喜欢争论和冲突。不会将自己的观念和价值观强加到别人身上。',
            'INFP': '理想主义，对于自己的价值观和自己觉得重要的人非常忠诚。希望外部的生活和自己内心的价值观是统一的。好奇心重，很快能看到事情的可能性，能成为实现想法的催化剂。寻求理解别人和帮助他们实现潜能。适应力强，灵活，善于接受，除非是有悖于自己的价值观的。',
            'INTP': '对于自己感兴趣的任何事物都寻求找到合理的解释。喜欢理论性的和抽象的事物，热衷于思考而非社交活动。安静、内向、灵活、适应力强。对于自己感兴趣的领域有超凡的集中精力深度解决问题的能力。多疑，有时会有点挑剔，喜欢分析。',
            'ESTP': '灵活、忍耐力强，实际，注重结果。觉得理论和抽象的解释非常无趣。喜欢积极地采取行动解决问题。注重当前，自然不做作，享受和他人在一起的时刻。喜欢物质享受和时尚。学习新事物最有效的方式是通过亲身感受和练习。',
            'ESFP': '外向、友好、接受力强。热爱生活、人类和物质上的享受。喜欢和别人一起将事情做成功。在工作中讲究常识和实用性，并使工作显得有趣。灵活、自然不做作，对于新的任何事物都能很快地适应。学习新事物最有效的方式是和他人一起尝试。',
            'ENFP': '热情洋溢、富有想象力。认为人生有很多的可能性。能很快地将事情和信息联系起来，然后很自信地根据自己的判断解决问题。总是需要得到别人的认可，也总是准备着给与他人赏识和帮助。灵活、自然不做作，有很强的即兴发挥的能力，言语流畅。',
            'ENTP': '反应快、睿智，有激励别人的能力，警觉性强、直言不讳。在解决新的、具有挑战性的问题时机智而有策略。善于找出理论上的可能性，然后再用战略的眼光分析。善于理解别人。不喜欢例行公事，很少会用相同的方法做相同的事情，倾向于一个接一个的发展新的爱好。',
            'ESTJ': '实际、现实主义。果断，一旦下决心就会马上行动。善于将项目和人组织起来将事情完成，并尽可能用最有效率的方法得到结果。注重日常的细节。有一套非常清晰的逻辑标准，有系统性地遵循，并希望他人也同样遵循。在实施计划时强而有力。',
            'ESFJ': '热心、有责任心，合作。希望周边的环境温馨而和谐，并为此果断地执行任务。喜欢和他人一起精确并及时地完成任务。忠诚，即使在细微的事情上也如此。能体察到他人在日常生活中的所需并竭尽全力帮助。希望自己和自己的所为能受到他人的认可和赏识。',
            'ENFJ': '热情、为他人着想、易感应、有责任心。非常注重他人的感情、需求和动机。善于发现他人的潜能，并希望能帮助他们实现。能成为个人或群体成长和进步的催化剂。忠诚，对于赞扬和批评都会积极地回应。友善、好社交。在团体中能很好地帮助他人，并有鼓舞他人的领导能力。',
            'ENTJ': '坦诚、果断，有天生的领导能力。能很快看到公司/组织程序和政策中的不合理性和低效能性，发展并实施有效和全面的系统来解决问题。善于做长期的计划和目标的设定。通常见多识广，博览群书，喜欢拓广自己的知识面并将此分享给他人。在陈述自己的想法时非常强而有力。'
        };
        
        return descriptions[type] || '您的性格特点独特而有价值，适合在...领域发展。';
    }

    // 绘制能力雷达图
    function drawAbilityRadar() {
        // 检查Chart.js是否已加载
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }
        
        // 准备数据
        const ctx = document.getElementById('abilityChart').getContext('2d');
        const labels = [];
        const data = [];
        
        // 计算平均能力分数
        Object.entries(abilityScores).forEach(([dimension, scoreInfo]) => {
            labels.push(dimension);
            data.push(Math.round(scoreInfo.sum / scoreInfo.count));
        });
        
        // 创建雷达图
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: '您的能力评分',
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(75, 192, 192, 1)'
                }]
            },
            options: {
                scales: {
                    r: {
                        min: 1,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // 保存报告
    function saveReport() {
        // 这里可以实现保存报告到本地的功能
        alert('报告已保存！');
    }

    // 分享报告
    function shareReport() {
        // 这里可以实现生成分享链接或长图的功能
        alert('分享功能开发中，敬请期待！');
    }

    // 查看专业详情
    function viewMajorDetails(majorCode) {
        // 切换到专业目录标签页并显示该专业的详情
        window.switchToTab('majors-tab');
        
        // 这里可以添加显示特定专业详情的逻辑
        setTimeout(() => {
            // 模拟查找并点击该专业
            alert(`将为您显示专业代码 ${majorCode} 的详细信息`);
        }, 500);
    }

    // 添加CSS样式
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 测评页面整体样式 */
            .assessment-welcome {
                width: 40%;
                margin: 5px 0 5px 5px;
                min-height: calc(100vh - 10px);
                box-sizing: border-box;
            }
            
            .welcome-content {
                background-color: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                text-align: center;
                width: 100%;
            }
            
            .welcome-content h2 {
                color: #333;
                margin-bottom: 20px;
            }
            
            .welcome-content p {
                color: #666;
                line-height: 1.6;
                margin-bottom: 30px;
            }
            
            .assessment-info {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .info-item {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
            }
            
            .info-item h3 {
                color: #4caf50;
                margin-bottom: 10px;
                font-size: 18px;
            }
            
            .info-item p {
                color: #666;
                margin: 0;
                font-size: 14px;
            }
            
            /* 按钮样式 */
            .primary-button {
                background-color: #4caf50;
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                transition: background-color 0.3s;
            }
            
            .primary-button:hover {
                background-color: #45a049;
            }
            
            .secondary-button {
                background-color: #f0f0f0;
                color: #333;
                border: 1px solid #ddd;
                padding: 15px 30px;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .secondary-button:hover {
                background-color: #e0e0e0;
            }
            
            .secondary-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            /* 测评布局样式 */
            .assessment-layout {
                width: 40%;
                margin: 5px 0 5px 5px;
                min-height: calc(100vh - 10px);
                box-sizing: border-box;
                overflow-y: auto;
            }
            
            .assessment-left-panel {
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .assessment-content-container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
                flex: 1;
            }
            
            .assessment-right-panel {
                display: none; /* 答题时隐藏右侧面板 */
                flex: 1;
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                overflow-y: auto;
            }
            
            /* 测评类型文本框 */
            .assessment-types {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .assessment-type-box {
                padding: 15px 20px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                transition: all 0.3s;
            }
            
            /* 题目内容容器样式 - 添加滚动条 */
            .question-content-container {
                max-height: 400px;
                overflow-y: auto;
                padding-right: 10px;
                margin-bottom: 15px;
            }
            
            /* 美化滚动条 */
            .question-content-container::-webkit-scrollbar {
                width: 6px;
            }
            
            .question-content-container::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }
            
            .question-content-container::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 3px;
            }
            
            .question-content-container::-webkit-scrollbar-thumb:hover {
                background: #555;
            }
            
            .type-holland {
                background-color: #e3f2fd;
                color: #1976d2;
                border: 2px solid #1976d2;
            }
            
            .type-mbti {
                background-color: #f3e5f5;
                color: #7b1fa2;
                border: 2px solid #7b1fa2;
                opacity: 0.6;
            }
            
            .type-ability {
                background-color: #e8f5e9;
                color: #388e3c;
                border: 2px solid #388e3c;
                opacity: 0.6;
            }
            
            .assessment-type-box.active {
                opacity: 1;
                transform: translateX(5px);
            }
            
            /* 结果页面布局 */
            .result-page {
                width: 40%;
                margin: 5px 0 5px 5px;
                min-height: calc(100vh - 10px);
                box-sizing: border-box;
                overflow-y: auto;
            }
            
            .result-layout {
                display: flex;
                flex-direction: column;
                gap: 15px;
                padding: 5px;
                box-sizing: border-box;
            }
            
            .result-left-panel {
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .result-right-panel {
                width: 100%;
                overflow-y: auto;
            }
            
            /* 测评头部和进度条 */
            .assessment-header h2 {
                color: #333;
                margin-bottom: 20px;
            }
            
            .assessment-progress {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 30px;
            }
            
            .progress-bar {
                flex: 1;
                height: 20px;
                background-color: #e0e0e0;
                border-radius: 10px;
                overflow: hidden;
                position: relative;
            }
            
            .progress-fill {
                height: 100%;
                background-color: #4caf50;
                border-radius: 10px;
                transition: width 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .progress-text {
                color: white;
                font-size: 12px;
                font-weight: bold;
            }
            
            .progress-percentage {
                color: #666;
                font-size: 14px;
                font-weight: bold;
            }
            
            /* 问题容器 */
            .question-container {
                flex: 1;
                margin-bottom: 30px;
            }
            
            .question-header {
                margin-bottom: 20px;
            }
            
            .question-type {
                background-color: #4caf50;
                color: white;
                padding: 5px 10px;
                border-radius: 3px;
                font-size: 12px;
                margin-bottom: 10px;
                display: inline-block;
            }
            
            .question-header h3 {
                color: #333;
                font-size: 24px;
                line-height: 1.4;
                margin: 15px 0;
            }
            
            /* 选项样式 */
            .question-options {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .choice-option {
                display: flex;
                align-items: center;
                padding: 15px 20px;
                background-color: #f8f9fa;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
                border: 2px solid transparent;
            }
            
            .choice-option:hover {
                background-color: #e9ecef;
                border-color: #4caf50;
            }
            
            .choice-option input[type="radio"] {
                margin-right: 15px;
                transform: scale(1.5);
            }
            
            .choice-text {
                font-size: 18px;
                color: #333;
                cursor: pointer;
            }
            
            /* 控制按钮 */
            .assessment-controls {
                display: flex;
                justify-content: space-between;
                gap: 15px;
            }
            
            /* 结果预览 */
            .result-preview h3 {
                color: #333;
                margin-bottom: 20px;
            }
            
            .result-preview p {
                color: #666;
                line-height: 1.6;
                margin-bottom: 15px;
            }
            
            .result-preview ul {
                color: #666;
                line-height: 1.8;
                margin-bottom: 25px;
                padding-left: 20px;
            }
            
            .preview-tips {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 20px;
            }
            
            .preview-tips strong {
                color: #856404;
            }
            
            /* 结果页面样式 */
            .result-page {
                padding: 20px;
            }
            
            .result-header {
                text-align: center;
                margin-bottom: 40px;
            }
            
            .result-header h2 {
                color: #333;
                margin-bottom: 10px;
            }
            
            .result-header p {
                color: #666;
                margin-bottom: 20px;
            }
            
            .report-meta {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 30px;
                margin-top: 20px;
            }
            
            .report-meta span {
                color: #666;
                font-size: 14px;
            }
            
            /* 结果内容区域 */
            .result-content {
                display: flex;
                flex-direction: column;
                gap: 40px;
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .result-section {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .result-section h3 {
                color: #333;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #4caf50;
            }
            
            /* 霍兰德和MBTI结果样式 */
            .holland-result, .mbti-result {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .holland-code, .mbti-type {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .code-label, .type-label {
                font-weight: bold;
                color: #666;
                min-width: 120px;
            }
            
            .code-value, .type-value {
                font-size: 24px;
                font-weight: bold;
                color: #4caf50;
                padding: 10px 20px;
                background-color: #f8f9fa;
                border-radius: 5px;
            }
            
            .holland-description, .mbti-description {
                color: #666;
                line-height: 1.6;
                padding: 20px;
                background-color: #f8f9fa;
                border-radius: 5px;
            }
            
            /* 能力雷达图容器 */
            .ability-radar {
                display: flex;
                justify-content: center;
                padding: 20px;
            }
            
            /* 推荐专业样式 */
            .recommended-majors {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .major-card {
                background-color: white;
                padding: 20px;
                border-radius: 10px;
                display: flex;
                gap: 20px;
                align-items: flex-start;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                border-left: 4px solid #4caf50;
            }
            
            .major-rank {
                width: 40px;
                height: 40px;
                background-color: #4caf50;
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                border-radius: 50%;
                font-size: 18px;
                font-weight: bold;
                flex-shrink: 0;
            }
            
            .major-info {
                flex: 1;
                min-width: 200px;
            }
            
            .major-name {
                font-size: 18px;
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
            }
            
            .major-code {
                font-size: 14px;
                color: #666;
                margin-bottom: 5px;
            }
            
            .match-score {
                font-size: 14px;
                color: #4caf50;
                font-weight: bold;
            }
            
            .recommendation-reason {
                flex: 2;
                line-height: 1.6;
                color: #333;
                font-size: 14px;
            }
            
            .view-major-details {
                background-color: #4caf50;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                align-self: center;
            }
            
            .view-major-details:hover {
                background-color: #45a049;
            }
            
            /* 结果页脚样式 */
            .result-footer {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin-top: 40px;
                padding: 20px;
            }
            
            /* 加载和错误页面样式 */
            .loading-container, .error-container, .login-required {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 500px;
                gap: 20px;
                text-align: center;
                padding: 20px;
            }
            
            .loading-spinner {
                width: 80px;
                height: 80px;
                border: 8px solid #f3f3f3;
                border-top: 8px solid #4caf50;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // 初始化渲染页面
    (async function() {
        try {
            await renderPage();
        } catch (error) {
            console.error('初始化页面时出错:', error);
            // 显示初始化错误信息
            assessmentTab.innerHTML = `
                <div class="error-container">
                    <h2>页面初始化失败</h2>
                    <p>抱歉，加载个人测评页面时遇到了问题。请刷新页面重试。</p>
                </div>
            `;
        }
    })();
}
