window.initializeAssessmentTab = function() {
    // ========== 个人测评功能模块 ==========
    // 使用全局定义的Supabase客户端
    const supabaseClient = window.supabaseClient;

    // ========== 页面状态管理 ==========
    let currentStep = 'welcome'; // welcome, assessment, result
    let currentQuestionIndex = 0;
    let allQuestions = [];
    let userAnswers = [];
    let isQuickTestMode = false; // 标记是否为快速测试模式
    let quickTestData = {}; // 保存快速测试设置的数据
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
                <!-- 快速测试模式入口 -->
                <div class="test-mode-panel">
                    <h3>🛠️ 开发者调试模式</h3>
                    <button class="quick-test-btn" onclick="showQuickTestPanel()">
                        快速测试模式
                        <span class="test-mode-hint">跳过100道题，直接设置参数</span>
                    </button>
                </div>
                
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
                            <p>10个维度，每个维度随机抽取3题，共30题</p>
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
        isQuickTestMode = false; // 重置快速测试模式标记
        quickTestData = {}; // 清空快速测试数据
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
        isQuickTestMode = false; // 重置快速测试模式标记
        quickTestData = {}; // 清空快速测试数据
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
    
    // ========== 已废弃的状态检查函数 - 这些函数不再使用，已被注释 ==========
    /*
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
    */

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
                
                // 添加调试信息，查看从数据库获取的题目和选项数量
                console.log('从数据库获取的题目数量:', qData ? qData.length : 0);
                console.log('从数据库获取的选项数量:', cData ? cData.length : 0);
                
                // 查看选项数据的详细信息
                if (cData && cData.length > 0) {
                    console.log('选项数据示例:', cData.slice(0, 3)); // 只显示前3个选项作为示例
                    
                    // 统计不同维度的选项数量
                    const dimensionCount = {};
                    cData.forEach(choice => {
                        if (choice.score_type) {
                            dimensionCount[choice.score_type] = (dimensionCount[choice.score_type] || 0) + 1;
                        }
                    });
                    console.log('各维度选项数量统计:', dimensionCount);
                    
                    // 查找是否存在目标题目的选项
                    const targetQuestionId = '6b83c9f7-b842-4669-ac0a-24c798473a51';
                    const targetChoices = cData.filter(choice => choice.question_id === targetQuestionId);
                    console.log(`目标题目(ID: ${targetQuestionId})的选项数量:`, targetChoices.length);
                    if (targetChoices.length > 0) {
                        console.log('目标题目选项详情:', targetChoices);
                    }
                }
                
                if (!qError && !cError) {
                    questionsData = qData;
                    choicesData = cData;
                } else {
                    // 数据库查询失败时，抛出错误
                    console.error('数据库查询错误 - 题目:', qError);
                    console.error('数据库查询错误 - 选项:', cError);
                    throw new Error('数据库连接失败或查询出错');
                }
            } else {
                throw new Error('Supabase客户端未初始化');
            }
            
            // 如果数据库没有数据，抛出错误
            if (!questionsData.length) {
                throw new Error('数据库中没有找到题目数据');
            }
            
            // 构建题目和选项的关系
            let fullQuestionsList = questionsData.map(question => {
                // 专门针对特定题目的调试代码
                const targetQuestionId = '6b83c9f7-b842-4669-ac0a-24c798473a51';
                const isTargetQuestion = question.id === targetQuestionId;
                
                if (isTargetQuestion) {
                    console.log(`======= 调试特定题目开始 =======`);
                    console.log(`题目ID: ${question.id}`);
                    console.log(`题目文本: ${question.question_text}`);
                    console.log(`题目类型: ${question.question_type}`);
                    console.log(`题目维度: ${question.dimension}`);
                    console.log(`题目ID数据类型: ${typeof question.id}`);
                }
                
                // 优化的选项匹配策略：根据题目类型采用不同的匹配方式
                let questionChoices = [];
                
                // 对于mbti类型的题目，使用question_id进行精确匹配
                if (question.question_type === 'mbti') {
                    questionChoices = choicesData
                        .filter(choice => choice.question_id === question.id)
                        .map(choice => ({
                            id: choice.id,
                            choice_text: choice.choice_text,
                            score_type: choice.score_type,
                            score_value: choice.score_value
                        }));
                }
                // 对于holland和ability类型的题目，使用question_type进行匹配（question_id为NULL）
                else if (question.question_type === 'holland' || question.question_type === 'ability') {
                    // 筛选出对应类型的选项，并确保question_id为NULL（统一选项）
                    questionChoices = choicesData
                        .filter(choice => choice.question_type === question.question_type && choice.question_id === null)
                        .map(choice => ({
                            id: choice.id,
                            choice_text: choice.choice_text,
                            // 动态设置score_type为题目维度
                            score_type: question.dimension,
                            score_value: choice.score_value
                        }));
                    
                    // 如果没有从数据库中找到对应类型的选项，报错提示
                    if (questionChoices.length === 0) {
                        throw new Error(`数据库中未找到${question.question_type}类型的统一选项，请确保数据表中有正确的选项配置`);
                    }
                }
                
                // 调试信息：显示选项匹配结果
                if (isTargetQuestion) {
                    console.log(`匹配策略: ${question.question_type === 'mbti' ? 'question_id匹配' : 'question_type匹配（统一选项）'}`);
                    console.log(`找到的选项数量: ${questionChoices.length}`);
                    
                    if (questionChoices.length > 0) {
                        questionChoices.forEach((choice, index) => {
                            console.log(`选项${index + 1}: ${choice.choice_text}, ID: ${choice.id}, 分值: ${choice.score_value}`);
                        });
                    } else {
                        console.warn(`没有找到与题目ID ${question.id} 匹配的选项!`);
                    }
                    console.log(`======= 调试特定题目结束 =======`);
                }
                
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
            const abilityDimensions = ['逻辑思维能力', '动手实践能力', '沟通表达能力', '创新思维能力', '组织协调能力', '共情与同理心', '艺术审美能力', '数据分析能力', '耐心与专注力', '空间想象能力'];
            
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
            
            // 从每个能力维度随机抽取3题（如果没有那么多题，则抽取所有可用的）
            const abilityQuestions = [];
            abilityDimensions.forEach(dimension => {
                const dimQuestions = fullQuestionsList.filter(q => q.question_type === 'ability' && q.dimension === dimension);
                const shuffled = dimQuestions.sort(() => Math.random() - 0.5);
                const selectCount = Math.min(3, dimQuestions.length); // 确保不会抽取超过可用题目的数量
                const selected = shuffled.slice(0, selectCount);
                abilityQuestions.push(...selected);
                console.log(`能力维度 '${dimension}' 抽取了 ${selected.length} 题，可用题目总数: ${dimQuestions.length}`);
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
            
            // 调试日志：记录各部分题目数量
            console.log('霍兰德题目数量:', shuffledHollandQuestions.length);
            console.log('MBTI题目数量:', shuffledMbtiQuestions.length);
            console.log('能力测评题目数量:', shuffledAbilityQuestions.length);
            console.log('总题目数量:', allQuestions.length);
            
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
                <!-- 左侧做题区域 70% -->
                <div class="assessment-left-panel">
                    <!-- 进度条 -->
                    <div class="assessment-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%">
                                <span class="progress-text">${currentQuestionIndex + 1}/${allQuestions.length}</span>
                            </div>
                        </div>
                        <span class="progress-percentage">${progress}%</span>
                    </div>
                    
                    <!-- 题目内容容器 -->
                    <div class="question-content-container">
                        <div class="question-content">
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
                    
                    <!-- 控制按钮 -->
                    <div class="assessment-controls">
                        <button id="prev-question-btn" class="secondary-button" ${currentQuestionIndex === 0 ? 'disabled' : ''}>
                            上一题
                        </button>
                        <button id="next-question-btn" class="primary-button">
                            ${currentQuestionIndex === allQuestions.length - 1 ? '完成测评' : '下一题'}
                        </button>
                    </div>
                </div>
                
                <!-- 右侧提示区域 30% -->
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

        // 显示快速测试面板
        function showQuickTestPanel() {
            assessmentTab.innerHTML = `
                <div class="quick-test-panel">
                    <div class="panel-header">
                        <h2>🛠️ 快速测试模式</h2>
                        <p>跳过100道题，直接设置测评参数进行算法测试</p>
                        <button class="back-to-normal" onclick="startAssessment()">返回正常测评</button>
                    </div>
                    
                    <div class="test-form">
                        <!-- 霍兰德代码选择 -->
                        <div class="form-section">
                            <h3>霍兰德兴趣代码</h3>
                            <div class="holland-selector">
                                <div class="code-builder">
                                    <label>第一位（主导兴趣）：</label>
                                    <select id="holland1">
                                        <option value="R">实用型 (R) - 喜欢动手操作</option>
                                        <option value="I">研究型 (I) - 喜欢分析研究</option>
                                        <option value="A">艺术型 (A) - 喜欢创造表达</option>
                                        <option value="S">社会型 (S) - 喜欢帮助他人</option>
                                        <option value="E">企业型 (E) - 喜欢领导管理</option>
                                        <option value="C" selected>常规型 (C) - 喜欢有序规则</option>
                                    </select>
                                </div>
                                <div class="code-builder">
                                    <label>第二位：</label>
                                    <select id="holland2">
                                        <option value="R" selected>实用型 (R)</option>
                                        <option value="I">研究型 (I)</option>
                                        <option value="A">艺术型 (A)</option>
                                        <option value="S">社会型 (S)</option>
                                        <option value="E">企业型 (E)</option>
                                        <option value="C">常规型 (C)</option>
                                    </select>
                                </div>
                                <div class="code-builder">
                                    <label>第三位：</label>
                                    <select id="holland3">
                                        <option value="R">实用型 (R)</option>
                                        <option value="I" selected>研究型 (I)</option>
                                        <option value="A">艺术型 (A)</option>
                                        <option value="S">社会型 (S)</option>
                                        <option value="E">企业型 (E)</option>
                                        <option value="C">常规型 (C)</option>
                                    </select>
                                </div>
                                <div class="code-preview">
                                    预览：<span id="hollandPreview">CRI</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- MBTI类型选择 -->
                        <div class="form-section">
                            <h3>MBTI性格类型</h3>
                            <div class="mbti-selector">
                                <div class="mbti-dimension">
                                    <label>精力来源：</label>
                                    <select id="mbti1">
                                        <option value="E">外倾 (E) - 外向交际</option>
                                        <option value="I" selected>内倾 (I) - 内向思考</option>
                                    </select>
                                </div>
                                <div class="mbti-dimension">
                                    <label>信息获取：</label>
                                    <select id="mbti2">
                                        <option value="S" selected>感觉 (S) - 关注细节</option>
                                        <option value="N">直觉 (N) - 关注概念</option>
                                    </select>
                                </div>
                                <div class="mbti-dimension">
                                    <label>决策方式：</label>
                                    <select id="mbti3">
                                        <option value="T" selected>思考 (T) - 逻辑分析</option>
                                        <option value="F">情感 (F) - 价值关怀</option>
                                    </select>
                                </div>
                                <div class="mbti-dimension">
                                    <label>生活方式：</label>
                                    <select id="mbti4">
                                        <option value="J" selected>判断 (J) - 有计划</option>
                                        <option value="P">感知 (P) - 灵活开放</option>
                                    </select>
                                </div>
                                <div class="mbti-preview">
                                    预览：<span id="mbtiPreview">ISTJ</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 能力分值设置 -->
                        <div class="form-section">
                            <h3>个人能力评分 (1-5分)</h3>
                            <div class="ability-sliders">
                                <div class="ability-item">
                                    <label>逻辑思维能力：</label>
                                    <input type="range" id="ability1" min="1" max="5" value="4" step="1">
                                    <span class="score-display">4</span>
                                </div>
                                <div class="ability-item">
                                    <label>创新思维能力：</label>
                                    <input type="range" id="ability2" min="1" max="5" value="3" step="1">
                                    <span class="score-display">3</span>
                                </div>
                                <div class="ability-item">
                                    <label>数据分析能力：</label>
                                    <input type="range" id="ability3" min="1" max="5" value="4" step="1">
                                    <span class="score-display">4</span>
                                </div>
                                <div class="ability-item">
                                    <label>组织协调能力：</label>
                                    <input type="range" id="ability4" min="1" max="5" value="3" step="1">
                                    <span class="score-display">3</span>
                                </div>
                                <div class="ability-item">
                                    <label>沟通表达能力：</label>
                                    <input type="range" id="ability5" min="1" max="5" value="3" step="1">
                                    <span class="score-display">3</span>
                                </div>
                                <div class="ability-item">
                                    <label>动手实践能力：</label>
                                    <input type="range" id="ability6" min="1" max="5" value="4" step="1">
                                    <span class="score-display">4</span>
                                </div>
                                <div class="ability-item">
                                    <label>共情与同理心：</label>
                                    <input type="range" id="ability7" min="1" max="5" value="3" step="1">
                                    <span class="score-display">3</span>
                                </div>
                                <div class="ability-item">
                                    <label>艺术审美能力：</label>
                                    <input type="range" id="ability8" min="1" max="5" value="2" step="1">
                                    <span class="score-display">2</span>
                                </div>
                                <div class="ability-item">
                                    <label>耐心与专注力：</label>
                                    <input type="range" id="ability9" min="1" max="5" value="4" step="1">
                                    <span class="score-display">4</span>
                                </div>
                                <div class="ability-item">
                                    <label>空间想象能力：</label>
                                    <input type="range" id="ability10" min="1" max="5" value="3" step="1">
                                    <span class="score-display">3</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 预设方案 -->
                        <div class="form-section">
                            <h3>快速预设</h3>
                            <div class="preset-buttons">
                                <button class="preset-btn" onclick="applyPreset('engineering')">工科生 (RIC + 高逻辑)</button>
                                <button class="preset-btn" onclick="applyPreset('business')">商科生 (ECS + 高沟通)</button>
                                <button class="preset-btn" onclick="applyPreset('liberal')">文科生 (SAI + 高情感)</button>
                                <button class="preset-btn" onclick="applyPreset('research')">研究型 (IAE + 高创新)</button>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button class="generate-result-btn" onclick="generateQuickTestResult()">生成测评结果</button>
                        </div>
                    </div>
                </div>
            `;
            
            // 绑定事件监听器
            bindQuickTestEvents();
        }        // 绑定快速测试事件
        function bindQuickTestEvents() {
            // 霍兰德代码预览更新
            const updateHollandPreview = () => {
                const h1 = document.getElementById('holland1').value;
                const h2 = document.getElementById('holland2').value;
                const h3 = document.getElementById('holland3').value;
                document.getElementById('hollandPreview').textContent = h1 + h2 + h3;
            };
            
            document.getElementById('holland1').addEventListener('change', updateHollandPreview);
            document.getElementById('holland2').addEventListener('change', updateHollandPreview);
            document.getElementById('holland3').addEventListener('change', updateHollandPreview);
            
            // MBTI类型预览更新
            const updateMBTIPreview = () => {
                const m1 = document.getElementById('mbti1').value;
                const m2 = document.getElementById('mbti2').value;
                const m3 = document.getElementById('mbti3').value;
                const m4 = document.getElementById('mbti4').value;
                document.getElementById('mbtiPreview').textContent = m1 + m2 + m3 + m4;
            };
            
            document.getElementById('mbti1').addEventListener('change', updateMBTIPreview);
            document.getElementById('mbti2').addEventListener('change', updateMBTIPreview);
            document.getElementById('mbti3').addEventListener('change', updateMBTIPreview);
            document.getElementById('mbti4').addEventListener('change', updateMBTIPreview);
            
            // 能力滑块更新
            for (let i = 1; i <= 10; i++) {
                const slider = document.getElementById(`ability${i}`);
                const display = slider.nextElementSibling;
                slider.addEventListener('input', function() {
                    display.textContent = this.value;
                });
            }
        }
        
        // 应用预设方案
        function applyPreset(type) {
            switch(type) {
                case 'engineering': // 工科生
                    document.getElementById('holland1').value = 'R';
                    document.getElementById('holland2').value = 'I';
                    document.getElementById('holland3').value = 'C';
                    document.getElementById('mbti1').value = 'I';
                    document.getElementById('mbti2').value = 'S';
                    document.getElementById('mbti3').value = 'T';
                    document.getElementById('mbti4').value = 'J';
                    // 能力设置
                    document.getElementById('ability1').value = 5; // 逻辑思维
                    document.getElementById('ability2').value = 4; // 创新思维
                    document.getElementById('ability3').value = 5; // 数据分析
                    document.getElementById('ability4').value = 3; // 组织协调
                    document.getElementById('ability5').value = 3; // 沟通表达
                    document.getElementById('ability6').value = 5; // 动手实践
                    document.getElementById('ability7').value = 2; // 共情同理
                    document.getElementById('ability8').value = 2; // 艺术审美
                    document.getElementById('ability9').value = 4; // 耐心专注
                    document.getElementById('ability10').value = 4; // 空间想象
                    break;
                case 'business': // 商科生
                    document.getElementById('holland1').value = 'E';
                    document.getElementById('holland2').value = 'C';
                    document.getElementById('holland3').value = 'S';
                    document.getElementById('mbti1').value = 'E';
                    document.getElementById('mbti2').value = 'S';
                    document.getElementById('mbti3').value = 'T';
                    document.getElementById('mbti4').value = 'J';
                    // 能力设置
                    document.getElementById('ability1').value = 4; // 逻辑思维
                    document.getElementById('ability2').value = 4; // 创新思维
                    document.getElementById('ability3').value = 4; // 数据分析
                    document.getElementById('ability4').value = 5; // 组织协调
                    document.getElementById('ability5').value = 5; // 沟通表达
                    document.getElementById('ability6').value = 3; // 动手实践
                    document.getElementById('ability7').value = 4; // 共情同理
                    document.getElementById('ability8').value = 3; // 艺术审美
                    document.getElementById('ability9').value = 4; // 耐心专注
                    document.getElementById('ability10').value = 3; // 空间想象
                    break;
                case 'liberal': // 文科生
                    document.getElementById('holland1').value = 'S';
                    document.getElementById('holland2').value = 'A';
                    document.getElementById('holland3').value = 'I';
                    document.getElementById('mbti1').value = 'I';
                    document.getElementById('mbti2').value = 'N';
                    document.getElementById('mbti3').value = 'F';
                    document.getElementById('mbti4').value = 'P';
                    // 能力设置
                    document.getElementById('ability1').value = 3; // 逻辑思维
                    document.getElementById('ability2').value = 5; // 创新思维
                    document.getElementById('ability3').value = 3; // 数据分析
                    document.getElementById('ability4').value = 4; // 组织协调
                    document.getElementById('ability5').value = 5; // 沟通表达
                    document.getElementById('ability6').value = 2; // 动手实践
                    document.getElementById('ability7').value = 5; // 共情同理
                    document.getElementById('ability8').value = 5; // 艺术审美
                    document.getElementById('ability9').value = 4; // 耐心专注
                    document.getElementById('ability10').value = 3; // 空间想象
                    break;
                case 'research': // 研究型
                    document.getElementById('holland1').value = 'I';
                    document.getElementById('holland2').value = 'A';
                    document.getElementById('holland3').value = 'E';
                    document.getElementById('mbti1').value = 'I';
                    document.getElementById('mbti2').value = 'N';
                    document.getElementById('mbti3').value = 'T';
                    document.getElementById('mbti4').value = 'P';
                    // 能力设置
                    document.getElementById('ability1').value = 5; // 逻辑思维
                    document.getElementById('ability2').value = 5; // 创新思维
                    document.getElementById('ability3').value = 5; // 数据分析
                    document.getElementById('ability4').value = 3; // 组织协调
                    document.getElementById('ability5').value = 3; // 沟通表达
                    document.getElementById('ability6').value = 3; // 动手实践
                    document.getElementById('ability7').value = 3; // 共情同理
                    document.getElementById('ability8').value = 4; // 艺术审美
                    document.getElementById('ability9').value = 5; // 耐心专注
                    document.getElementById('ability10').value = 4; // 空间想象
                    break;
            }
            
            // 更新所有显示
            document.getElementById('hollandPreview').textContent = 
                document.getElementById('holland1').value + 
                document.getElementById('holland2').value + 
                document.getElementById('holland3').value;
                
            document.getElementById('mbtiPreview').textContent = 
                document.getElementById('mbti1').value + 
                document.getElementById('mbti2').value + 
                document.getElementById('mbti3').value + 
                document.getElementById('mbti4').value;
                
            // 更新所有能力滑块显示
            for (let i = 1; i <= 10; i++) {
                const slider = document.getElementById(`ability${i}`);
                const display = slider.nextElementSibling;
                display.textContent = slider.value;
            }
        }
        
        // 生成快速测试结果
        window.generateQuickTestResult = async function() {
            try {
                // 获取设置的参数
                const hollandCode = document.getElementById('hollandPreview').textContent;
                const mbtiType = document.getElementById('mbtiPreview').textContent;
                
                console.log('🛠️ 快速测试 - 输入参数:', { hollandCode, mbtiType });
                
                // 验证输入参数
                if (!hollandCode || hollandCode.length !== 3) {
                    alert('霍兰德代码格式错误，应为3位字母');
                    return;
                }
                if (!mbtiType || mbtiType.length !== 4) {
                    alert('MBTI类型格式错误，应为4位字母');
                    return;
                }
                
                // 模拟霍兰德分数
                hollandScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
                const codes = hollandCode.split('');
                hollandScores[codes[0]] = 50; // 第一位最高分
                hollandScores[codes[1]] = 35; // 第二位中等分
                hollandScores[codes[2]] = 25; // 第三位较低分
                // 其他类型随机低分
                Object.keys(hollandScores).forEach(key => {
                    if (!codes.includes(key)) {
                        hollandScores[key] = Math.floor(Math.random() * 15) + 5;
                    }
                });
                
                // 模拟MBTI分数
                mbtiScores = {
                    'EI': { 'E': 0, 'I': 0 },
                    'SN': { 'S': 0, 'N': 0 },
                    'TF': { 'T': 0, 'F': 0 },
                    'JP': { 'J': 0, 'P': 0 }
                };
                
                const mbtiChars = mbtiType.split('');
                mbtiScores['EI'][mbtiChars[0]] = 30;
                mbtiScores['EI'][mbtiChars[0] === 'E' ? 'I' : 'E'] = 15;
                mbtiScores['SN'][mbtiChars[1]] = 30;
                mbtiScores['SN'][mbtiChars[1] === 'S' ? 'N' : 'S'] = 15;
                mbtiScores['TF'][mbtiChars[2]] = 30;
                mbtiScores['TF'][mbtiChars[2] === 'T' ? 'F' : 'T'] = 15;
                mbtiScores['JP'][mbtiChars[3]] = 30;
                mbtiScores['JP'][mbtiChars[3] === 'J' ? 'P' : 'J'] = 15;
                
                // 模拟能力分数
                const abilityNames = [
                    '逻辑思维能力', '创新思维能力', '数据分析能力', 
                    '组织协调能力', '沟通表达能力', '动手实践能力',
                    '共情与同理心', '艺术审美能力', '耐心与专注力', '空间想象能力'
                ];
                
                abilityScores = {};
                abilityNames.forEach((name, index) => {
                    const score = parseInt(document.getElementById(`ability${index + 1}`).value);
                    abilityScores[name] = { sum: score, count: 1 };
                });
                
                // 设置快速测试模式标记和数据
                isQuickTestMode = true;
                quickTestData = {
                    hollandCode: hollandCode,
                    mbtiType: mbtiType
                };
                
                console.log('🛠️ 快速测试模式 - 模拟数据:', {
                    hollandCode, mbtiType, hollandScores, mbtiScores, abilityScores
                });
                
                // 显示加载动画
                showLoadingAnimation();
                
                // 等待一下再显示结果，模拟真实计算过程
                setTimeout(async () => {
                    await renderResultPage();
                }, 1500);
                
            } catch (error) {
                console.error('快速测试错误详情:', error);
                console.error('错误堆栈:', error.stack);
                console.error('当前状态:', { 
                    isQuickTestMode, 
                    quickTestData, 
                    hollandScores, 
                    mbtiScores, 
                    abilityScores 
                });
                alert(`生成测试结果失败: ${error.message}\n\n请打开浏览器开发者工具查看详细错误信息`);
            }
        }    // ========== 已移除的冗余专业详情函数 - 使用数据库查询版本替代 ==========
    /*
    // 此函数已被移除，因为：
    // 1. 与后面的 viewMajorDetails 函数重复
    // 2. 包含大量硬编码的模拟专业数据，违背了"务必使用实际数据"的要求
    // 3. 存在未定义的 details 变量错误
    // 现在统一使用从数据库查询真实数据的版本
    */
            
            // 渲染结果页面
            async function renderResultPage() {
                try {
            // 根据模式选择不同的代码生成方式
            let hollandCode, mbtiType;
            if (isQuickTestMode && quickTestData.hollandCode && quickTestData.mbtiType) {
                // 快速测试模式：使用预设的值
                hollandCode = quickTestData.hollandCode;
                mbtiType = quickTestData.mbtiType;
                console.log('🛠️ 使用快速测试预设值:', { hollandCode, mbtiType });
            } else {
                // 正常测试模式：基于评分计算
                hollandCode = generateHollandCode();
                mbtiType = generateMBTIType();
                console.log('📊 使用正常测试计算值:', { hollandCode, mbtiType });
            }
            
            const hollandAnalysis = generateHollandAnalysis();
            const mbtiAnalysis = generateMBTIAnalysis();
            
            // 使用异步专业匹配算法获取推荐专业
            recommendedMajors = await generateRecommendedMajors(hollandCode, mbtiType);            // 确保recommendedMajors是全局变量
            window.recommendedMajors = recommendedMajors;
            
            // 设置全局assessmentResult对象，保存完整的测评结果
            console.log('[调试信息] 设置window.assessmentResult对象');
            window.assessmentResult = {
                timestamp: new Date().toISOString(),
                hollandCode: hollandCode,
                mbtiType: mbtiType,
                recommendedMajors: recommendedMajors,
                abilityScores: abilityScores,
                hollandScores: hollandScores,
                mbtiScores: mbtiScores
            };
            console.log('[调试信息] window.assessmentResult内容:', window.assessmentResult);
            
            // 检查是否找到匹配的专业
            if (!recommendedMajors || recommendedMajors.length === 0) {
                assessmentTab.innerHTML = `
                <div class="result-page">
                    <div class="result-header">
                        <h2>您的个人测评报告${isQuickTestMode ? ' 🛠️ (快速测试模式)' : ''}</h2>
                        <p>根据您的回答，我们为您生成了专属的测评结果${isQuickTestMode ? ' (模拟数据)' : ''}</p>
                        <div class="report-meta">
                            <span>生成时间：${new Date().toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <!-- 修改为左右分栏布局 -->
                    <div class="result-layout">
                        <!-- 左侧显示三种测评结果 -->
                        <div class="result-left-panel">
                            <div class="result-section">
                                <h3>霍兰德职业兴趣代码分析</h3>
                                <div class="holland-result">
                                    <div class="code-display">
                                        <span class="code-label">您的兴趣代码：</span>
                                        <span class="code-value">${hollandCode}</span>
                                    </div>
                                    <div class="detailed-analysis">
                                        <h4>详细分析</h4>
                                        ${hollandAnalysis.map(item => `
                                            <div class="analysis-item ${item.isMainType ? 'main-type' : 'sub-type'}">
                                                <div class="type-header">
                                                    <span class="type-code">${item.code}</span>
                                                    <span class="type-name">${item.name}</span>
                                                    <span class="type-percentage">${item.percentage}%</span>
                                                </div>
                                                <div class="type-description">${item.description}</div>
                                                <div class="score-info">得分: ${item.score}分 (排名: 第${item.rank}位)</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="result-section">
                                <h3>MBTI性格类型分析</h3>
                                <div class="mbti-result">
                                    <div class="code-display">
                                        <span class="code-label">您的MBTI类型：</span>
                                        <span class="code-value">${mbtiType}</span>
                                    </div>
                                    <div class="detailed-analysis">
                                        <h4>各维度详细分析</h4>
                                        ${mbtiAnalysis.map(dim => {
                                            const winnerKey = dim.result;
                                            const loserKey = Object.keys(dim.scores).find(k => k !== winnerKey);
                                            return `
                                                <div class="mbti-dimension">
                                                    <div class="dimension-header">
                                                        <span class="dimension-name">${dim.dimension}维度结果</span>
                                                        <span class="dimension-result">${dim.result} - ${dim.resultName}</span>
                                                    </div>
                                                    <div class="dimension-scores">
                                                        <div class="score-bar">
                                                            <div class="score-item winner">
                                                                <span>${winnerKey}: ${dim.scores[winnerKey]}分 (${dim.percentages[winnerKey]}%)</span>
                                                            </div>
                                                            <div class="score-item">
                                                                <span>${loserKey}: ${dim.scores[loserKey]}分 (${dim.percentages[loserKey]}%)</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="dimension-description">${dim.description}</div>
                                                </div>
                                            `;
                                        }).join('')}
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
                                    <div class="no-majors-message">
                                        <p>抱歉，目前没有找到与您的个人特质完全匹配的专业。</p>
                                        <p>我们建议您：</p>
                                        <ul>
                                            <li>重新进行测评，确保您的回答准确反映您的兴趣和能力</li>
                                            <li>联系我们的专业顾问获取个性化建议</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="result-footer">
                        ${isQuickTestMode ? `
                        <div class="debug-info" style="background: #f0f8ff; padding: 10px; margin: 20px 0; border-left: 4px solid #2196f3; font-size: 12px;">
                            <strong>🛠️ 快速测试调试信息:</strong><br>
                            霍兰德代码: ${quickTestData.hollandCode}<br>
                            MBTI类型: ${quickTestData.mbtiType}<br>
                            模式标记: ${isQuickTestMode ? '✅ 快速测试' : '❌ 正常测试'}
                        </div>
                        ` : ''}
                        <button id="restart-assessment-btn" class="secondary-button">重新测评</button>
                        <button id="save-report-btn" class="primary-button">保存报告</button>
                    </div>
                </div>
                `;
                
                // 绘制能力雷达图
                drawAbilityRadar();
                
                // 添加事件监听器
                document.getElementById('restart-assessment-btn').addEventListener('click', restartAssessment);
                
                // 确保saveReport函数存在，如果不存在则创建一个临时函数
                if (typeof saveReport !== 'function') {
                    console.warn('saveReport函数未定义，创建临时函数');
                    window.saveReport = function() {
                        alert('报告保存功能即将上线！');
                    };
                }
                
                document.getElementById('save-report-btn').addEventListener('click', window.saveReport);
                
                return;
            }
            
            assessmentTab.innerHTML = `
            <div class="result-page">
                <div class="result-header">
                    <h2>您的个人测评报告</h2>
                    <p>根据您的回答，我们为您生成了专属的专业推荐</p>
                    <div class="report-meta">
                        <span>生成时间：${new Date().toLocaleString()}</span>
                    </div>
                </div>
                
                <!-- 全宽布局 -->
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
                                        <div class="major-header">
                                            <div class="major-rank">${index + 1}</div>
                                            <div class="major-info">
                                                <h4 class="major-name">${major.name || '未定义'}</h4>
                                                <div class="major-meta">
                                                    <span class="major-code">代码：${major.code || '未定义'}</span>
                                                    <span class="match-score comprehensive">综合匹配：${major.matchScore || 0}%</span>
                                                </div>
                                                <div class="detailed-scores">
                                                    <span class="score-item holland">兴趣: ${major.hollandScore || 0}%</span>
                                                    <span class="score-item mbti">性格: ${major.mbtiScore || 0}%</span>
                                                    <span class="score-item ability">能力: ${major.abilityScore || 0}%</span>
                                                    ${major.matchedAbilitiesCount !== undefined ? `<span class="ability-match">(${major.matchedAbilitiesCount}/${major.totalAbilitiesCount}项匹配)</span>` : ''}
                                                </div>
                                            </div>
                                            <button class="view-major-details" data-major-code="${major.code || ''}">查看详情</button>
                                        </div>
                                        <div class="recommendation-reason">
                                            <p>${major.reason || '该专业与您的个人特质和能力相匹配。'}</p>
                                        </div>
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
        
        // 确保saveReport函数存在，如果不存在则创建一个临时函数
        if (typeof saveReport !== 'function') {
            console.warn('saveReport函数未定义，创建临时函数');
            window.saveReport = function() {
                alert('报告保存功能即将上线！');
            };
        }
        document.getElementById('save-report-btn').addEventListener('click', window.saveReport);
        
        // 由于分享报告功能已移除，不再为shareReport按钮添加事件监听器
        // 原代码已被注释，避免尝试为不存在的元素添加事件监听器
        
        // 为每个专业卡片的查看详情按钮添加事件监听器
        document.querySelectorAll('.view-major-details').forEach(button => {
            button.addEventListener('click', function(event) {
                const majorCode = this.getAttribute('data-major-code');
                viewMajorDetails(majorCode, event);
            });
        });
        } catch (error) {
            console.error('渲染结果页面时出错:', error);
            console.error('错误堆栈:', error.stack);
            console.error('当前模式状态:', { 
                isQuickTestMode, 
                quickTestData, 
                currentStep,
                hollandScores, 
                mbtiScores, 
                abilityScores 
            });
            
            // 显示错误信息，包含具体的错误消息
            const errorMessage = error.message || '抱歉，生成您的专属报告时遇到了问题。请稍后再试。';
            const isConnectionError = errorMessage.includes('数据库服务') || errorMessage.includes('连接');
            
            assessmentTab.innerHTML = `
                <div class="error-container">
                    <div class="error-icon">⚠️</div>
                    <h2>${isConnectionError ? '数据库连接失败' : '生成报告失败'}</h2>
                    <div class="error-message">
                        <p><strong>错误详情：</strong></p>
                        <p>${errorMessage}</p>
                    </div>
                    
                    ${isConnectionError ? `
                    <div class="connection-help">
                        <h3>可能的解决方案：</h3>
                        <ul>
                            <li>检查网络连接是否正常</li>
                            <li>确认数据库服务是否可用</li>
                            <li>刷新页面重新尝试</li>
                            <li>如果问题持续，请联系系统管理员</li>
                        </ul>
                        <p><strong>重要说明：</strong>本系统的所有专业推荐都基于真实的数据库数据进行精确匹配，不提供模拟或预设推荐。</p>
                    </div>
                    ` : ''}
                    
                    <div class="error-actions">
                        <button id="back-to-welcome-btn" class="primary-button">返回首页</button>
                        ${isConnectionError ? '<button id="retry-connection-btn" class="secondary-button">重试连接</button>' : ''}
                    </div>
                    
                    <details class="debug-details">
                        <summary>调试信息 (开发者)</summary>
                        <pre>请打开浏览器开发者工具(F12)查看控制台获取详细技术信息</pre>
                    </details>
                </div>
                
                <style>
                .error-container {
                    max-width: 600px;
                    margin: 40px auto;
                    padding: 30px;
                    text-align: center;
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .error-icon {
                    font-size: 48px;
                    margin-bottom: 20px;
                }
                .error-message {
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                    text-align: left;
                }
                .connection-help {
                    background: #e3f2fd;
                    border: 1px solid #bbdefb;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                    text-align: left;
                }
                .connection-help ul {
                    margin: 10px 0;
                    padding-left: 20px;
                }
                .error-actions {
                    margin: 20px 0;
                }
                .error-actions button {
                    margin: 0 10px;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .primary-button {
                    background: #007bff;
                    color: white;
                }
                .secondary-button {
                    background: #6c757d;
                    color: white;
                }
                .debug-details {
                    margin-top: 20px;
                    text-align: left;
                }
                .debug-details summary {
                    cursor: pointer;
                    color: #666;
                    font-size: 12px;
                }
                .debug-details pre {
                    background: #f8f9fa;
                    padding: 10px;
                    border-radius: 4px;
                    font-size: 11px;
                    overflow-x: auto;
                }
                </style>
            `;
            
            // 添加返回按钮事件
            document.getElementById('back-to-welcome-btn').addEventListener('click', () => {
                currentStep = 'welcome';
                isQuickTestMode = false;
                quickTestData = {};
                renderPage();
            });
            
            // 如果是连接错误，添加重试按钮事件
            if (isConnectionError) {
                const retryBtn = document.getElementById('retry-connection-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', async () => {
                        retryBtn.textContent = '重试中...';
                        retryBtn.disabled = true;
                        try {
                            await renderResultPage();
                        } catch (retryError) {
                            retryBtn.textContent = '重试连接';
                            retryBtn.disabled = false;
                        }
                    });
                }
            }
                    <p>${errorMessage}</p>
                    <button id="retry-btn" class="primary-button">重试</button>
                </div>
            `;
            
            // 添加重试按钮事件监听
            document.getElementById('retry-btn').addEventListener('click', renderResultPage);
        }
    }

    // 霍兰德类型详细信息
    const hollandTypeInfo = {
        'R': { name: '实用型', description: '喜欢动手操作，偏爱机械、工具、植物或动物，性格坚韧、实际' },
        'I': { name: '研究型', description: '喜欢观察、学习、研究、分析、评估和解决问题，性格理性、精确' },
        'A': { name: '艺术型', description: '喜欢艺术性、创造性的活动，富有想象力，情感丰富，直觉敏锐' },
        'S': { name: '社会型', description: '喜欢帮助、教导、治疗他人，性格友善、合作、慷慨、耐心' },
        'E': { name: '企业型', description: '喜欢领导、管理、说服他人，性格自信、有野心、精力充沛' },
        'C': { name: '常规型', description: '喜欢有序、规则、明确的活动，性格谨慎、保守、实际、有条理' }
    };
    
    // MBTI维度详细信息
    const mbtiDimensionInfo = {
        'E': { name: '外倾', description: '精力来源于外部世界，善于表达，喜欢与人交往' },
        'I': { name: '内倾', description: '精力来源于内心世界，善于思考，喜欢独立工作' },
        'S': { name: '感觉', description: '关注具体细节和事实，重视经验和实际应用' },
        'N': { name: '直觉', description: '关注可能性和概念，重视创新和理论思考' },
        'T': { name: '思考', description: '以逻辑和客观分析为决策基础，重视公正和效率' },
        'F': { name: '情感', description: '以价值观和人际和谐为决策基础，重视关爱和支持' },
        'J': { name: '判断', description: '喜欢有计划、有组织的生活方式，追求确定性' },
        'P': { name: '感知', description: '喜欢灵活、开放的生活方式，适应性强' }
    };

    // 生成霍兰德代码
    function generateHollandCode() {
        // 将分数排序
        const sortedScores = Object.entries(hollandScores).sort((a, b) => b[1] - a[1]);
        
        // 返回前三个字母作为代码
        return sortedScores.map(item => item[0]).join('');
    }
    
    // 生成霍兰德详细分析
    function generateHollandAnalysis() {
        const sortedScores = Object.entries(hollandScores).sort((a, b) => b[1] - a[1]);
        const totalScore = Object.values(hollandScores).reduce((sum, score) => sum + score, 0);
        
        return sortedScores.map((item, index) => {
            const [code, score] = item;
            const percentage = totalScore > 0 ? Math.round((score / totalScore) * 100) : 0;
            const info = hollandTypeInfo[code];
            
            return {
                code,
                name: info.name,
                description: info.description,
                score,
                percentage,
                rank: index + 1,
                isMainType: index < 3
            };
        });
    }
    
    // 生成MBTI详细分析
    function generateMBTIAnalysis() {
        const analysis = [];
        
        // EI 维度
        const eScore = mbtiScores['EI']['E'];
        const iScore = mbtiScores['EI']['I'];
        const eiTotal = eScore + iScore;
        const eiResult = eScore > iScore ? 'E' : 'I';
        analysis.push({
            dimension: 'EI',
            result: eiResult,
            resultName: mbtiDimensionInfo[eiResult].name,
            description: mbtiDimensionInfo[eiResult].description,
            scores: { E: eScore, I: iScore },
            percentages: eiTotal > 0 ? { 
                E: Math.round((eScore / eiTotal) * 100), 
                I: Math.round((iScore / eiTotal) * 100) 
            } : { E: 50, I: 50 }
        });
        
        // SN 维度
        const sScore = mbtiScores['SN']['S'];
        const nScore = mbtiScores['SN']['N'];
        const snTotal = sScore + nScore;
        const snResult = sScore > nScore ? 'S' : 'N';
        analysis.push({
            dimension: 'SN',
            result: snResult,
            resultName: mbtiDimensionInfo[snResult].name,
            description: mbtiDimensionInfo[snResult].description,
            scores: { S: sScore, N: nScore },
            percentages: snTotal > 0 ? { 
                S: Math.round((sScore / snTotal) * 100), 
                N: Math.round((nScore / snTotal) * 100) 
            } : { S: 50, N: 50 }
        });
        
        // TF 维度
        const tScore = mbtiScores['TF']['T'];
        const fScore = mbtiScores['TF']['F'];
        const tfTotal = tScore + fScore;
        const tfResult = tScore > fScore ? 'T' : 'F';
        analysis.push({
            dimension: 'TF',
            result: tfResult,
            resultName: mbtiDimensionInfo[tfResult].name,
            description: mbtiDimensionInfo[tfResult].description,
            scores: { T: tScore, F: fScore },
            percentages: tfTotal > 0 ? { 
                T: Math.round((tScore / tfTotal) * 100), 
                F: Math.round((fScore / tfTotal) * 100) 
            } : { T: 50, F: 50 }
        });
        
        // JP 维度
        const jScore = mbtiScores['JP']['J'];
        const pScore = mbtiScores['JP']['P'];
        const jpTotal = jScore + pScore;
        const jpResult = jScore > pScore ? 'J' : 'P';
        analysis.push({
            dimension: 'JP',
            result: jpResult,
            resultName: mbtiDimensionInfo[jpResult].name,
            description: mbtiDimensionInfo[jpResult].description,
            scores: { J: jScore, P: pScore },
            percentages: jpTotal > 0 ? { 
                J: Math.round((jScore / jpTotal) * 100), 
                P: Math.round((pScore / jpTotal) * 100) 
            } : { J: 50, P: 50 }
        });
        
        return analysis;
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

    // ========== 改进的匹配度计算算法 ==========
    
    // 计算霍兰德代码相似度
    function calculateHollandSimilarity(userCode, majorCodes) {
        if (!majorCodes || majorCodes.length === 0) return 0;
        
        // 处理多个匹配代码的情况
        let maxSimilarity = 0;
        const codes = Array.isArray(majorCodes) ? majorCodes : [majorCodes];
        
        codes.forEach(majorCode => {
            if (!majorCode || typeof majorCode !== 'string') return;
            
            // 位置权重：第一位权重最高
            const positionWeights = [0.5, 0.3, 0.2];
            let similarity = 0;
            
            for (let i = 0; i < Math.min(3, userCode.length, majorCode.length); i++) {
                if (userCode[i] === majorCode[i]) {
                    // 位置完全匹配
                    similarity += positionWeights[i];
                } else if (majorCode.includes(userCode[i])) {
                    // 包含但位置不同
                    similarity += positionWeights[i] * 0.5;
                }
            }
            
            maxSimilarity = Math.max(maxSimilarity, similarity);
        });
        
        return maxSimilarity;
    }
    
    // 计算MBTI类型相似度
    function calculateMBTISimilarity(userType, majorTypes) {
        if (!majorTypes || majorTypes.length === 0) return 0;
        
        let maxSimilarity = 0;
        const types = Array.isArray(majorTypes) ? majorTypes : [majorTypes];
        
        types.forEach(majorType => {
            if (!majorType || typeof majorType !== 'string') return;
            
            let similarity = 0;
            // MBTI每个维度权重相等
            for (let i = 0; i < Math.min(4, userType.length, majorType.length); i++) {
                if (userType[i] === majorType[i]) {
                    similarity += 0.25; // 每个维度25%
                }
            }
            
            maxSimilarity = Math.max(maxSimilarity, similarity);
        });
        
        return maxSimilarity;
    }
    
    // 能力重要性权重配置
    const abilityWeights = {
        '逻辑思维能力': 1.2,
        '创新思维能力': 1.1,
        '数据分析能力': 1.1,
        '组织协调能力': 1.0,
        '沟通表达能力': 1.0,
        '动手实践能力': 0.9,
        '共情与同理心': 0.9,
        '艺术审美能力': 0.8,
        '耐心与专注力': 0.8,
        '空间想象能力': 0.8
    };
    
    // 综合匹配度权重配置
    const matchWeights = {
        holland: 0.4,  // 霍兰德兴趣权重40%
        mbti: 0.3,     // MBTI性格权重30%
        ability: 0.3   // 能力权重30%
    };

    // ========== 改进的匹配度计算算法 ==========
    
    // 计算霍兰德代码相似度
    function calculateHollandSimilarity(userCode, majorCodes) {
        if (!majorCodes || majorCodes.length === 0) return 0;
        
        // 处理多个匹配代码的情况
        let maxSimilarity = 0;
        const codes = Array.isArray(majorCodes) ? majorCodes : [majorCodes];
        
        codes.forEach(majorCode => {
            if (!majorCode || typeof majorCode !== 'string') return;
            
            // 位置权重：第一位权重最高
            const positionWeights = [0.5, 0.3, 0.2];
            let similarity = 0;
            
            for (let i = 0; i < Math.min(3, userCode.length, majorCode.length); i++) {
                if (userCode[i] === majorCode[i]) {
                    // 位置完全匹配
                    similarity += positionWeights[i];
                } else if (majorCode.includes(userCode[i])) {
                    // 包含但位置不同
                    similarity += positionWeights[i] * 0.5;
                }
            }
            
            maxSimilarity = Math.max(maxSimilarity, similarity);
        });
        
        return maxSimilarity;
    }
    
    // 计算MBTI类型相似度
    function calculateMBTISimilarity(userType, majorTypes) {
        if (!majorTypes || majorTypes.length === 0) return 0;
        
        let maxSimilarity = 0;
        const types = Array.isArray(majorTypes) ? majorTypes : [majorTypes];
        
        types.forEach(majorType => {
            if (!majorType || typeof majorType !== 'string') return;
            
            let similarity = 0;
            // MBTI每个维度权重相等
            for (let i = 0; i < Math.min(4, userType.length, majorType.length); i++) {
                if (userType[i] === majorType[i]) {
                    similarity += 0.25; // 每个维度25%
                }
            }
            
            maxSimilarity = Math.max(maxSimilarity, similarity);
        });
        
        return maxSimilarity;
    }

    // 实现两阶段专业匹配算法
    async function generateRecommendedMajors(hollandCode, mbtiType) {
        try {
            console.log('开始生成推荐专业，霍兰德代码:', hollandCode, 'MBTI类型:', mbtiType);
            console.log('能力分数数据:', abilityScores);
            
            // 检查是否有Supabase客户端实例
            if (!window.supabaseClient) {
                console.error('未找到数据库连接实例');
                throw new Error('系统错误：无法连接到数据库服务，请检查网络连接或稍后再试。所有专业推荐必须基于真实数据库数据进行匹配。');
            }
            
            // 第一阶段：初步筛选 (硬匹配)
            // 使用用户计算出的霍兰德代码和MBTI类型从major_rules表中筛选专业
            // 注意：使用eq而非contains，因为数据库列是文本类型
            const { data: majorRules, error: rulesError } = await window.supabaseClient
                .from('major_rules')
                .select('*')
                .eq('匹配的霍兰德代码组合', hollandCode)
                .eq('匹配的MBTI类型', mbtiType);
                
            if (rulesError) {
                console.error(`查询专业规则失败: ${rulesError.message}`);
                throw new Error('数据查询错误：无法获取专业匹配规则，请稍后再试');
            }
            
            if (!majorRules || majorRules.length === 0) {
                console.warn('没有找到完全匹配的专业，使用扩大搜索范围');
                
                // 尝试只匹配霍兰德代码或MBTI类型中的一个
                // 使用正确的or语法，针对文本类型字段使用eq操作符
                const { data: fallbackRules, error: fallbackError } = await window.supabaseClient
                    .from('major_rules')
                    .select('*')
                    .or(`匹配的霍兰德代码组合.eq.${hollandCode},匹配的MBTI类型.eq.${mbtiType}`);
                    
                if (fallbackError) {
                    console.error(`扩大搜索范围失败: ${fallbackError.message}`);
                    throw new Error('数据查询错误：扩大搜索范围失败，请稍后再试');
                }
                
                if (!fallbackRules || fallbackRules.length === 0) {
                    console.warn('扩大搜索范围后仍未找到匹配专业，尝试直接从专业库获取并基于能力得分推荐');
                    
                    // 第三阶段：基于能力得分的推荐 (最终备选方案)
                    try {
                        // 获取所有专业信息
                        const { data: allMajors, error: allMajorsError } = await window.supabaseClient
                            .from('major_rules')
                            .select('*')
                            .limit(50); // 限制获取数量以提高性能
                             
                        if (allMajorsError) {
                            console.error(`获取专业数据失败: ${allMajorsError.message}`);
                            throw new Error('数据查询错误：无法获取专业数据，请稍后再试');
                        }
                         
                        if (!allMajors || allMajors.length === 0) {
                            console.warn('没有获取到任何专业数据');
                            return [];
                        }
                         
                        // major_rules表的数据已经包含processMajorsWithScores函数所需的所有字段
                        // 直接将数据传递给处理函数
                        return processMajorsWithScores(allMajors, hollandCode, mbtiType);
                    } catch (e) {
                            console.error('获取专业数据时出错:', e);
                            throw new Error('数据处理错误：处理专业数据时发生异常，请稍后再试');
                        }
                }
                
                return processMajorsWithScores(fallbackRules, hollandCode, mbtiType);
            }
            
            console.log(`找到${majorRules.length}个匹配的专业`);
            return processMajorsWithScores(majorRules, hollandCode, mbtiType);
            
        } catch (error) {
            console.error('生成推荐专业时出错:', error);
            throw new Error('推荐系统错误：生成专业推荐时发生异常，请稍后再试');
        }
    }
    
    // 处理专业数据并计算综合匹配得分
    function processMajorsWithScores(majorRules, hollandCode, mbtiType) {
        console.log('开始计算综合匹配度，用户信息:', { hollandCode, mbtiType });
        console.log('改进的霍兰德匹配算法：支持字母相同但顺序不同的情况 (如CRI vs RIC)');
        
        // 第二阶段：综合权重排序 (软匹配)
        // 遍历筛选出的每一个专业，计算综合匹配度得分
        const majorsWithScores = majorRules.map(majorRule => {
            // 1. 计算霍兰德匹配度
            let hollandMatchScore = 0;
            try {
                const majorHollandCodes = majorRule['匹配的霍兰德代码组合'];
                if (majorHollandCodes) {
                    let codes = [];
                    if (typeof majorHollandCodes === 'string') {
                        // 处理字符串格式
                        codes = majorHollandCodes.split(',').map(c => c.trim()).filter(c => c.length > 0);
                    } else if (Array.isArray(majorHollandCodes)) {
                        codes = majorHollandCodes;
                    }
                    hollandMatchScore = calculateHollandSimilarity(hollandCode, codes) * 100;
                }
            } catch (e) {
                console.warn('处理霍兰德代码时出错:', e);
                hollandMatchScore = 0;
            }
            
            // 2. 计算MBTI匹配度
            let mbtiMatchScore = 0;
            try {
                const majorMbtiTypes = majorRule['匹配的MBTI类型'];
                if (majorMbtiTypes) {
                    let types = [];
                    if (typeof majorMbtiTypes === 'string') {
                        // 处理字符串格式
                        types = majorMbtiTypes.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    } else if (Array.isArray(majorMbtiTypes)) {
                        types = majorMbtiTypes;
                    }
                    mbtiMatchScore = calculateMBTISimilarity(mbtiType, types) * 100;
                }
            } catch (e) {
                console.warn('处理MBTI类型时出错:', e);
                mbtiMatchScore = 0;
            }
            
            // 3. 计算能力匹配度（改进版）
            let abilityMatchScore = 0;
            let totalAbilityWeight = 0;
            let matchedAbilities = 0;
            
            // 获取该专业所需的核心能力
            let requiredAbilities = [];
            try {
                // 确保 requiredAbilities 是数组格式
                if (Array.isArray(majorRule['所需核心能力'])) {
                    requiredAbilities = majorRule['所需核心能力'];
                } else if (typeof majorRule['所需核心能力'] === 'string') {
                    // 处理不同格式的核心能力字符串
                    let abilityStr = majorRule['所需核心能力'].trim();
                    
                    if (abilityStr.startsWith('{') && abilityStr.endsWith('}')) {
                        abilityStr = abilityStr.substring(1, abilityStr.length - 1);
                        requiredAbilities = abilityStr.split(',').map(ability => ability.trim()).filter(ability => ability.length > 0);
                    } else if (abilityStr.startsWith('[') && abilityStr.endsWith(']')) {
                        requiredAbilities = JSON.parse(abilityStr);
                    } else if (abilityStr.includes(',')) {
                        requiredAbilities = abilityStr.split(',').map(ability => ability.trim()).filter(ability => ability.length > 0);
                    } else if (abilityStr.length > 0) {
                        requiredAbilities = [abilityStr];
                    }
                }
            } catch (e) {
                console.warn('处理所需核心能力时出错:', e);
                requiredAbilities = [];
            }
            
            if (requiredAbilities.length > 0) {
                requiredAbilities.forEach(ability => {
                    const weight = abilityWeights[ability] || 1.0; // 默认权重1.0
                    totalAbilityWeight += weight;
                    
                    if (abilityScores[ability] && abilityScores[ability].count > 0) {
                        // 计算该能力的平均分（1-5分）
                        const avgScore = abilityScores[ability].sum / abilityScores[ability].count;
                        // 转换为百分比并应用权重
                        abilityMatchScore += (avgScore * 20) * weight;
                        matchedAbilities++;
                    } else {
                        // 未测评的能力给予中等分数
                        abilityMatchScore += 60 * weight;
                    }
                });
                
                // 计算加权平均能力匹配度得分
                if (totalAbilityWeight > 0) {
                    abilityMatchScore = Math.round(abilityMatchScore / totalAbilityWeight);
                } else {
                    abilityMatchScore = 65; // 无能力要求的基础分
                }
            } else {
                // 如果专业没有指定所需能力，给予较高的基础分
                abilityMatchScore = 75;
            }
            
            // 4. 计算综合匹配度
            const comprehensiveScore = Math.round(
                hollandMatchScore * matchWeights.holland +
                mbtiMatchScore * matchWeights.mbti +
                abilityMatchScore * matchWeights.ability
            );
            
            // 调试信息
            if (majorRule['专业名']) {
                let debugMsg = `专业: ${majorRule['专业名']}, 霍兰德: ${hollandMatchScore.toFixed(1)}`;
                if (majorRule['匹配的霍兰德代码组合']) {
                    debugMsg += ` (${majorRule['匹配的霍兰德代码组合']} vs ${hollandCode})`;
                }
                debugMsg += `, MBTI: ${mbtiMatchScore.toFixed(1)}, 能力: ${abilityMatchScore}, 综合: ${comprehensiveScore}`;
                console.log(debugMsg);
            }
            
            // 返回带综合匹配度得分的专业数据
            return {
                code: majorRule['专业码'],
                name: majorRule['专业名'],
                category: majorRule['门类'],
                subCategory: majorRule['专业类'],
                degree: majorRule['学位'],
                duration: majorRule['学制'],
                establishedYear: majorRule['设立年份'],
                requiredCourses: majorRule['指引必选科目'],
                medicalRestrictions: majorRule['体检限制'],
                objectives: majorRule['培养目标'],
                courses: majorRule['专业课程'],
                careerPaths: majorRule['就业方向'],
                matchScore: comprehensiveScore,
                hollandScore: Math.round(hollandMatchScore),
                mbtiScore: Math.round(mbtiMatchScore),
                abilityScore: abilityMatchScore,
                matchedAbilitiesCount: matchedAbilities,
                totalAbilitiesCount: requiredAbilities.length,
                reason: majorRule['推荐理由'] || `该专业与您的个人特质和能力相匹配。综合匹配度: ${comprehensiveScore}%`
            };
        });
        
        // 根据综合匹配度得分进行降序排序
        majorsWithScores.sort((a, b) => b.matchScore - a.matchScore);
        
        console.log('专业排序结果:', majorsWithScores.slice(0, 5).map(m => ({
            name: m.name, 
            total: m.matchScore,
            holland: m.hollandScore,
            mbti: m.mbtiScore, 
            ability: m.abilityScore
        })));
        
        // 返回排序后的前10个专业
        return majorsWithScores.slice(0, 10);
    }
    
    // ========== 未使用的模拟专业规则数据函数 - 已被注释 ==========
    /*
    // 获取模拟专业规则数据（用于演示或当数据库不可用时）
    function getMockMajorRules(hollandCode = 'RIA', mbtiType = 'INTJ') {
        console.log('使用模拟数据生成专业推荐，霍兰德代码:', hollandCode, 'MBTI类型:', mbtiType);
        
        // 根据用户的霍兰德代码和MBTI类型调整模拟数据
        // 提取霍兰德代码中的主要兴趣类型
        const primaryHollandType = hollandCode.charAt(0);
        
        // 根据MBTI类型判断用户倾向
        const isIntroverted = mbtiType.includes('I');
        const isSensing = mbtiType.includes('S');
        const isThinking = mbtiType.includes('T');
        const isJudging = mbtiType.includes('J');
        
        // 模拟数据，包含多个专业的详细信息
        // 根据霍兰德代码和MBTI类型调整推荐优先级
        const mockData = [
            // ... 大量模拟数据已被注释以减少代码冗余 ...
        ];
        
        // 根据用户的霍兰德代码和MBTI类型调整模拟数据
        // 这里可以添加更多的逻辑来根据用户的具体情况调整返回的专业列表
        return mockData;
    }
    */
    
    // ========== 已废弃的默认专业推荐函数 - 不再使用 ==========
    /*
    function getDefaultRecommendedMajors() {
        return [
            // ... 已废弃的默认专业推荐数据 ...
        ];
    }
    */

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
        // 确保显示所有10种能力维度，即使某些维度没有得分
        const abilityDimensions = ['逻辑思维能力', '动手实践能力', '沟通表达能力', '创新思维能力', '组织协调能力', '共情与同理心', '艺术审美能力', '数据分析能力', '耐心与专注力', '空间想象能力'];
        
        abilityDimensions.forEach(dimension => {
            labels.push(dimension);
            if (abilityScores[dimension] && abilityScores[dimension].count > 0) {
                data.push(Math.round(abilityScores[dimension].sum / abilityScores[dimension].count));
            } else {
                // 对于没有得分的维度，显示默认值3
                data.push(3);
            }
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
                },
                // 优化雷达图显示效果
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw}分`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 保存报告 - 已注释掉
    function saveReport() {
        // 实现保存报告到本地的功能
        alert('报告已保存！');
    }

    // ========== 已移除的分享报告功能 - 不再需要 ==========
    /*
    // 分享报告
    function shareReport() {
        // 这里可以实现生成分享链接或长图的功能
        alert('分享功能开发中，敬请期待！');
    }
    */

    // 查看专业详情 - 统一使用数据库查询，确保数据真实性
    async function viewMajorDetails(majorCode, event) {
        // 阻止事件冒泡（如果有event参数）
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        
        try {
            const button = event.currentTarget;
            const majorCard = button.closest('.major-card');
            const detailsId = `major-details-${majorCode}`;
            
            // 检查是否已存在详情，如果存在则切换显示状态
            const existingDetails = document.getElementById(detailsId);
            if (existingDetails) {
                if (existingDetails.style.display === 'none') {
                    existingDetails.style.display = 'block';
                    button.textContent = '收起';
                } else {
                    existingDetails.style.display = 'none';
                    button.textContent = '查看详情';
                }
                return;
            }
            
            let majorDetails = null;
            
            // 首先尝试从recommendedMajors数组中获取完整专业详情（已包含数据库数据）
            if (recommendedMajors && recommendedMajors.length > 0) {
                majorDetails = recommendedMajors.find(m => m.code === majorCode);
            }
            
            // 如果推荐列表中没有找到，直接从数据库查询
            if (!majorDetails && window.supabaseClient) {
                const { data, error } = await window.supabaseClient
                    .from('major_rules')
                    .select('*')
                    .eq('专业码', majorCode)
                    .single();
                
                if (error) {
                    throw new Error(`查询专业详情失败: ${error.message}`);
                }
                
                if (data) {
                    majorDetails = {
                        code: data['专业码'],
                        name: data['专业名'],
                        category: data['门类'],
                        subCategory: data['专业类'],
                        degree: data['学位'],
                        duration: data['学制'],
                        establishedYear: data['设立年份'],
                        requiredCourses: data['指引必选科目'],
                        medicalRestrictions: data['体检限制'],
                        objectives: data['培养目标'],
                        courses: data['专业课程'],
                        careerPaths: data['就业方向'],
                        matchScore: 0,
                        reason: data['推荐理由']
                    };
                }
            }
            
            if (!majorDetails) {
                alert(`未找到专业代码为 ${majorCode} 的详细信息`);
                return;
            }
            
            // 创建详情元素，直接在测评结果页面显示
            const detailsElement = document.createElement('div');
            detailsElement.id = detailsId;
            detailsElement.className = 'major-details';
            detailsElement.innerHTML = `
                <div class="details-header">
                    <h5>${majorDetails.name} 详细信息</h5>
                </div>
                <div class="details-content">
                    <!-- 紧凑的左右布局 -->
                    <div class="major-details-compact">
                        <div class="basic-info-row">
                            <span><strong>代码：</strong>${majorDetails.code}</span>
                            <span><strong>门类：</strong>${majorDetails.category || '---'}</span>
                            ${majorDetails.subCategory ? `<span><strong>专业类：</strong>${majorDetails.subCategory}</span>` : ''}
                            ${majorDetails.degree ? `<span><strong>学位：</strong>${majorDetails.degree}</span>` : ''}
                            ${majorDetails.duration ? `<span><strong>学制：</strong>${majorDetails.duration}</span>` : ''}
                        </div>
                        
                        ${majorDetails.reason ? `
                        <div class="detail-row">
                            <strong>推荐理由：</strong>
                            <span>${majorDetails.reason}</span>
                        </div>
                        ` : ''}
                        
                        ${majorDetails.objectives ? `
                        <div class="detail-row">
                            <strong>培养目标：</strong>
                            <span>${majorDetails.objectives}</span>
                        </div>
                        ` : ''}
                        
                        ${majorDetails.courses ? `
                        <div class="detail-row">
                            <strong>专业课程：</strong>
                            <span>${majorDetails.courses}</span>
                        </div>
                        ` : ''}
                        
                        ${majorDetails.careerPaths ? `
                        <div class="detail-row">
                            <strong>就业方向：</strong>
                            <span>${majorDetails.careerPaths}</span>
                        </div>
                        ` : ''}
                        
                        ${majorDetails.requiredCourses && majorDetails.requiredCourses !== '---' ? `
                        <div class="detail-row">
                            <strong>指引必选科目：</strong>
                            <span>${majorDetails.requiredCourses}</span>
                        </div>
                        ` : ''}
                        
                        ${majorDetails.medicalRestrictions && majorDetails.medicalRestrictions !== '---' ? `
                        <div class="detail-row">
                            <strong>体检限制：</strong>
                            <span>${majorDetails.medicalRestrictions}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            // 添加到专业卡片中
            majorCard.appendChild(detailsElement);
            
            // 更改按钮文本
            button.textContent = '收起';
            
        } catch (error) {
            console.error('查看专业详情时出错:', error);
            alert(`获取专业详情失败: ${error.message}`);
        }
    }
    
    // 渲染专业详情
    function renderMajorDetails(container, majorDetails) {
        const p = (v) => v || '---';
        
        let detailsHtml = `
            <div class="major-details-container">
                <h3>${p(majorDetails.name)} <span class="major-code">(${p(majorDetails.code)})</span></h3>
                
                <div class="major-basic-info">
                    <div class="info-row">
                        <span class="info-label">门类:</span>
                        <span class="info-value">${p(majorDetails.category)}</span>
                        <span class="info-label">专业类:</span>
                        <span class="info-value">${p(majorDetails.subCategory)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">学位:</span>
                        <span class="info-value">${p(majorDetails.degree)}</span>
                        <span class="info-label">学制:</span>
                        <span class="info-value">${p(majorDetails.duration)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">设立年份:</span>
                        <span class="info-value">${p(majorDetails.establishedYear)}</span>
                    </div>
                </div>
                
                ${majorDetails.matchScore > 0 ? `
                <div class="match-score">
                    <span class="score-label">匹配度:</span>
                    <span class="score-value">${majorDetails.matchScore}%</span>
                </div>
                ` : ''}
                
                ${majorDetails.reason ? `
                <div class="recommendation-reason">
                    <h4>推荐理由</h4>
                    <p>${p(majorDetails.reason)}</p>
                </div>
                ` : ''}
                
                <div class="major-details-section">
                    <h4>培养目标</h4>
                    <p>${p(majorDetails.objectives)}</p>
                </div>
                
                <div class="major-details-section">
                    <h4>专业课程</h4>
                    <p>${p(majorDetails.courses)}</p>
                </div>
                
                <div class="major-details-section">
                    <h4>就业方向</h4>
                    <p>${p(majorDetails.careerPaths)}</p>
                </div>
                
                ${p(majorDetails.requiredCourses) !== '---' ? `
                <div class="major-details-section">
                    <h4>指引必选科目</h4>
                    <p>${p(majorDetails.requiredCourses)}</p>
                </div>
                ` : ''}
                
                ${p(majorDetails.medicalRestrictions) !== '---' ? `
                <div class="major-details-section">
                    <h4>体检限制</h4>
                    <p>${p(majorDetails.medicalRestrictions)}</p>
                </div>
                ` : ''}
            </div>
        `;
        
        container.innerHTML = detailsHtml;
    }

    // 添加CSS样式
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 测评页面整体样式 */
            .assessment-welcome {
                width: 100%;
                margin: 0;
                min-height: calc(100vh - 60px);
                box-sizing: border-box;
                padding: 20px;
            }
            
            /* 欢迎内容样式优化 - 调整宽度为页面80%并增大字体 */
            .welcome-content {
                background-color: white;
                padding: 25px;
                border-radius: 8px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.08);
                text-align: center;
                width: 80%;
                max-width: 900px;
                margin: 0 auto;
                border: 1px solid #e0e0e0;
            }
            
            .welcome-content h2 {
                color: #333;
                margin: 0 0 20px 0;
                font-size: 24px;
            }
            
            .welcome-content p {
                color: #666;
                line-height: 1.5;
                margin: 0 0 25px 0;
                font-size: 16px;
            }
            
            /* 测评信息样式优化 */
            .assessment-info {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .info-item {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                border: 1px solid #e9ecef;
            }
            
            .info-item h3 {
                color: #4caf50;
                margin: 0 0 8px 0;
                font-size: 16px;
            }
            
            .info-item p {
                color: #666;
                margin: 0;
                font-size: 13px;
                line-height: 1.4;
            }
            
            /* 按钮样式优化 */
            .primary-button {
                background-color: #4caf50;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 1px 3px rgba(76,175,80,0.3);
            }
            
            .primary-button:hover {
                background-color: #45a049;
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(76,175,80,0.4);
            }
            
            /* 主按钮和次按钮差异化设计 */
            .secondary-button {
                background-color: transparent;
                color: #4caf50;
                border: 1px solid #4caf50;
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .secondary-button:hover {
                background-color: #f8f9fa;
                border-color: #45a049;
                color: #45a049;
            }
            
            .secondary-button:disabled {
                background-color: #f0f0f0;
                color: #333;
                border: 1px solid #ddd;
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            /* 测评布局样式 - 左右布局：左侧70%做题，右侧30%提示 */
            .assessment-layout {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                flex-direction: row;
                box-sizing: border-box;
                background-color: white;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                padding: 20px;
                gap: 20px;
                height: calc(100vh - 120px);
                min-height: 600px;
            }
            
            /* 左侧做题区域 70% */
            .assessment-left-panel {
                width: 70%;
                display: flex;
                flex-direction: column;
                gap: 15px;
                height: 100%;
                overflow: hidden;
            }
            
            /* 右侧提示区域 30% */
            .assessment-right-panel {
                width: 30%;
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                overflow-y: auto;
                height: 100%;
            }
            
            /* 题目内容容器 - 确保有滚动条 */
            .question-content-container {
                flex: 1;
                overflow-y: auto;
                padding: 10px;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                background-color: #fff;
            }
            
            /* 控制按钮容器 - 固定在底部 */
            .assessment-controls {
                display: flex;
                justify-content: space-between;
                gap: 15px;
                padding: 15px 0;
                border-top: 1px solid #eee;
                flex-shrink: 0;
                background-color: white;
            }
            
            .question-header h3 {
                color: #333;
                font-size: 18px;
                line-height: 1.4;
                margin: 10px 0 20px 0;
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
            
            /* 结果页面布局 - 全宽无留空 */
            .result-page {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                min-height: calc(100vh - 80px);
                box-sizing: border-box;
                overflow-y: auto;
                padding: 20px;
            }
            
            .result-layout {
                display: flex;
                flex-direction: row;
                gap: 30px;
                padding: 0;
                box-sizing: border-box;
                width: 100%;
            }
            
            /* 左侧面板优化 */
            .result-left-panel {
                width: 45%;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            /* 右侧面板优化 */
            .result-right-panel {
                width: 55%;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            /* 测评头部和进度条 */
            .assessment-progress {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px 0;
                border-bottom: 1px solid #eee;
                flex-shrink: 0;
                background-color: white;
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
                min-width: 40px;
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
            
            /* 选项样式 */
            .question-options {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .choice-option {
                display: flex;
                align-items: center;
                padding: 12px 16px;
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
                margin-right: 12px;
                transform: scale(1.3);
            }
            
            /* 选项文字优化 */
            .choice-text {
                font-size: 15px;
                color: #333;
                cursor: pointer;
            }
            
            /* 右侧结果预览样式 */
            .result-preview {
                height: 100%;
            }
            
            .result-preview h3 {
                color: #333;
                margin: 0 0 15px 0;
                font-size: 18px;
                border-bottom: 2px solid #4caf50;
                padding-bottom: 8px;
            }
            
            .result-preview p {
                color: #666;
                line-height: 1.6;
                margin: 0 0 15px 0;
                font-size: 14px;
            }
            
            .result-preview ul {
                color: #666;
                line-height: 1.8;
                margin: 0 0 20px 0;
                padding-left: 20px;
                font-size: 14px;
            }
            
            .result-preview li {
                margin-bottom: 8px;
            }
            
            .preview-tips {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 15px;
                margin-top: 20px;
            }
            
            .preview-tips strong {
                color: #856404;
                font-size: 14px;
            }
            
            .preview-tips p {
                margin: 8px 0;
                font-size: 13px;
                line-height: 1.5;
            }
            
            /* 结果页面头部优化 */
            .result-header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px 0;
                border-bottom: 1px solid #eee;
            }
            
            .result-header h2 {
                color: #333;
                margin: 0 0 10px 0;
                font-size: 24px;
            }
            
            .result-header p {
                color: #666;
                margin: 0 0 15px 0;
                font-size: 16px;
            }
            
            /* 报告元数据优化 */
            .report-meta {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 15px;
                font-size: 14px;
                color: #666;
            }
            
            /* 结果页脚优化 */
            .result-footer {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin-top: 40px;
                padding: 20px;
                border-top: 1px solid #eee;
            }
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
            
            /* 结果内容区域优化 */
            .result-content {
                display: flex;
                flex-direction: column;
                gap: 15px;
                width: 100%;
                margin: 0;
            }
            
            /* 结果区块优化 */
            .result-section {
                background-color: #fff;
                border-radius: 8px;
                padding: 12px;
                border: 1px solid #e0e0e0;
                margin-bottom: 10px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            }
            
            .result-section h3 {
                margin-top: 0;
                margin-bottom: 12px;
                color: #333;
                font-size: 15px;
                font-weight: 600;
                padding-bottom: 8px;
                border-bottom: 1px solid #4caf50;
            }
            
            /* 霍兰德和MBTI结果样式优化 */
            .holland-result, .mbti-result {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .holland-code, .mbti-type {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .code-label, .type-label {
                font-weight: bold;
                color: #666;
                min-width: 90px;
                font-size: 14px;
            }
            
            .code-value, .type-value {
                font-size: 18px;
                font-weight: bold;
                color: #4caf50;
                padding: 6px 12px;
                background-color: #f8f9fa;
                border-radius: 4px;
            }
            
            .holland-description, .mbti-description {
                color: #666;
                line-height: 1.6;
                padding: 20px;
                background-color: #f8f9fa;
                border-radius: 5px;
            }
            
            /* 能力雷达图容器 - 增大尺寸 */
            .ability-radar {
                margin: 20px 0;
                display: flex;
                justify-content: center;
                padding: 15px;
            }
            
            .ability-radar canvas {
                max-width: 100% !important;
                height: auto !important;
                min-height: 350px; /* 增大雷达图的最小高度 */
            }
            
            /* 推荐专业样式 - 优化布局，减少换行和留空 */
            .recommended-majors {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .major-card {
                background-color: white;
                padding: 15px;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                border-left: 4px solid #4caf50;
                transition: all 0.3s ease;
            }
            
            /* 专业卡片头部 - 横向排列 */
            .major-header {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .major-rank {
                width: 32px;
                height: 32px;
                background-color: #4caf50;
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                border-radius: 50%;
                font-size: 14px;
                font-weight: bold;
                flex-shrink: 0;
            }
            
            .major-info {
                flex-grow: 1;
                min-width: 0;
            }
            
            .major-name {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #333;
                line-height: 1.3;
            }
            
            /* 专业元信息 - 横向排列 */
            .major-meta {
                display: flex;
                gap: 20px;
                margin-top: 5px;
                font-size: 13px;
                color: #666;
            }
            
            .major-code {
                margin: 0;
                line-height: 1.2;
            }
            
            .match-score {
                margin: 0;
                line-height: 1.2;
            }
            
            .match-score.comprehensive {
                color: #28a745;
                font-weight: 600;
            }
            
            /* 详细分数显示 */
            .detailed-scores {
                display: flex;
                gap: 12px;
                margin-top: 8px;
                font-size: 12px;
                flex-wrap: wrap;
            }
            
            .score-item {
                padding: 2px 6px;
                border-radius: 3px;
                font-weight: 500;
                white-space: nowrap;
            }
            
            .score-item.holland {
                background-color: #e3f2fd;
                color: #1976d2;
            }
            
            .score-item.mbti {
                background-color: #f3e5f5;
                color: #7b1fa2;
            }
            
            .score-item.ability {
                background-color: #e8f5e9;
                color: #388e3c;
            }
            
            .ability-match {
                color: #666;
                font-size: 11px;
                font-style: italic;
            }
            
            /* 详细分析样式 */
            .detailed-analysis {
                margin-top: 16px;
            }
            
            .detailed-analysis h4 {
                font-size: 16px;
                color: #333;
                margin: 0 0 12px 0;
                padding-bottom: 6px;
                border-bottom: 2px solid #e0e0e0;
            }
            
            .analysis-item {
                margin-bottom: 16px;
                padding: 12px;
                border-radius: 8px;
                border-left: 4px solid #ddd;
            }
            
            .analysis-item.main-type {
                background-color: #f0f8ff;
                border-left-color: #2196f3;
            }
            
            .analysis-item.sub-type {
                background-color: #f8f8f8;
                border-left-color: #999;
            }
            
            .type-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
            }
            
            .type-code {
                font-size: 18px;
                font-weight: bold;
                color: #2196f3;
                width: 30px;
                text-align: center;
            }
            
            .type-name {
                font-size: 16px;
                font-weight: 600;
                color: #333;
            }
            
            .type-percentage {
                font-size: 14px;
                color: #666;
                background-color: #e3f2fd;
                padding: 2px 8px;
                border-radius: 12px;
                margin-left: auto;
            }
            
            .type-description {
                font-size: 14px;
                color: #555;
                line-height: 1.5;
                margin-bottom: 6px;
            }
            
            .score-info {
                font-size: 12px;
                color: #777;
                font-style: italic;
            }
            
            /* MBTI维度分析样式 */
            .mbti-dimension {
                margin-bottom: 16px;
                padding: 12px;
                border-radius: 8px;
                background-color: #fafafa;
                border: 1px solid #e0e0e0;
            }
            
            .dimension-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .dimension-name {
                font-size: 14px;
                font-weight: 600;
                color: #333;
            }
            
            .dimension-result {
                font-size: 16px;
                font-weight: bold;
                color: #7b1fa2;
            }
            
            .dimension-scores {
                margin-bottom: 8px;
            }
            
            .score-bar {
                display: flex;
                gap: 16px;
            }
            
            .score-item {
                font-size: 13px;
                color: #666;
            }
            
            .score-item.winner {
                color: #2e7d32;
                font-weight: 600;
            }
            
            .dimension-description {
                font-size: 13px;
                color: #555;
                line-height: 1.4;
                font-style: italic;
            }
            
            /* 快速测试模式样式 */
            .test-mode-panel {
                text-align: center;
                margin: 20px 0;
                padding: 15px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 10px;
                color: white;
            }
            
            .quick-test-btn {
                background: rgba(255,255,255,0.2);
                color: white;
                border: 2px solid rgba(255,255,255,0.3);
                padding: 12px 24px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
            }
            
            .quick-test-btn:hover {
                background: rgba(255,255,255,0.3);
                border-color: rgba(255,255,255,0.5);
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(0,0,0,0.2);
            }
            
            .test-mode-hint {
                display: block;
                margin-top: 8px;
                font-size: 12px;
                opacity: 0.8;
            }
            
            .quick-test-panel {
                max-width: 900px;
                margin: 0 auto;
                padding: 20px;
            }
            
            .panel-header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                color: white;
            }
            
            .panel-header h2 {
                margin: 0 0 10px 0;
                font-size: 28px;
            }
            
            .panel-header p {
                margin: 0 0 15px 0;
                opacity: 0.9;
            }
            
            .back-to-normal {
                background: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                padding: 8px 16px;
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .back-to-normal:hover {
                background: rgba(255,255,255,0.3);
            }
            
            .test-form {
                display: grid;
                gap: 25px;
            }
            
            .form-section {
                background: white;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            
            .form-section h3 {
                margin: 0 0 20px 0;
                color: #333;
                font-size: 20px;
                border-bottom: 2px solid #e0e0e0;
                padding-bottom: 10px;
            }
            
            .holland-selector, .mbti-selector {
                display: grid;
                gap: 15px;
            }
            
            .code-builder, .mbti-dimension {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .code-builder label, .mbti-dimension label {
                min-width: 120px;
                font-weight: 600;
                color: #555;
            }
            
            .code-builder select, .mbti-dimension select {
                flex: 1;
                padding: 8px 12px;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                font-size: 14px;
                transition: border-color 0.3s ease;
            }
            
            .code-builder select:focus, .mbti-dimension select:focus {
                outline: none;
                border-color: #667eea;
            }
            
            .code-preview, .mbti-preview {
                text-align: center;
                margin-top: 15px;
                padding: 12px;
                background: #f0f8ff;
                border-radius: 8px;
                font-size: 18px;
                font-weight: bold;
                color: #2196f3;
            }
            
            .ability-sliders {
                display: grid;
                gap: 15px;
            }
            
            .ability-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 12px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .ability-item label {
                min-width: 140px;
                font-weight: 600;
                color: #555;
            }
            
            .ability-item input[type="range"] {
                flex: 1;
                height: 6px;
                background: #ddd;
                border-radius: 3px;
                outline: none;
                transition: all 0.3s ease;
            }
            
            .ability-item input[type="range"]::-webkit-slider-thumb {
                appearance: none;
                width: 20px;
                height: 20px;
                background: #667eea;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .ability-item input[type="range"]::-webkit-slider-thumb:hover {
                background: #5a6fd8;
                transform: scale(1.1);
            }
            
            .score-display {
                min-width: 30px;
                text-align: center;
                font-weight: bold;
                color: #667eea;
                background: white;
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid #e0e0e0;
            }
            
            .preset-buttons {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 12px;
            }
            
            .preset-btn {
                padding: 12px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .preset-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
            }
            
            .form-actions {
                text-align: center;
                margin-top: 20px;
            }
            
            .generate-result-btn {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                border: none;
                padding: 15px 40px;
                border-radius: 25px;
                font-size: 18px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            }
            
            .generate-result-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
            }
            
            /* 推荐理由样式 - 紧凑显示 */
            .recommendation-reason {
                font-size: 14px;
                color: #666;
                line-height: 1.4;
                margin: 0;
                padding: 8px 12px;
                background-color: #f8f9fa;
                border-radius: 4px;
            }
            
            .recommendation-reason p {
                margin: 0;
            }
            
            .view-major-details {
                padding: 8px 16px;
                font-size: 14px;
                background-color: #4caf50;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: background-color 0.3s;
                white-space: nowrap;
                align-self: flex-start;
            }
            
            .view-major-details:hover {
                background-color: #45a049;
            }
            
            /* 专业详情样式 - 紧凑的左右布局 */
            .major-details {
                margin-top: 15px;
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 6px;
                border: 1px solid #e9ecef;
                font-size: 14px;
            }
            
            .details-header h5 {
                margin: 0 0 15px 0;
                color: #4caf50;
                border-bottom: 1px solid #4caf50;
                padding-bottom: 8px;
                font-size: 16px;
            }
            
            /* 紧凑布局容器 */
            .major-details-compact {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            /* 基本信息行 - 横向排列 */
            .basic-info-row {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                padding: 10px;
                background-color: white;
                border-radius: 4px;
                border: 1px solid #dee2e6;
            }
            
            .basic-info-row span {
                font-size: 13px;
                white-space: nowrap;
            }
            
            /* 详情行 - 左右布局 */
            .detail-row {
                display: flex;
                gap: 10px;
                align-items: flex-start;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            
            .detail-row:last-child {
                border-bottom: none;
            }
            
            .detail-row strong {
                color: #4caf50;
                min-width: 100px;
                flex-shrink: 0;
                font-size: 13px;
            }
            
            .detail-row span {
                flex: 1;
                line-height: 1.4;
                font-size: 13px;
            }
            
            /* 结果页脚样式 */
            .result-footer {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin-top: 40px;
                padding: 20px;
                margin-bottom: 20px; /* 增加底部边距，确保按钮不被截断 */
            }

            /* 专业详情网格布局 */
            .major-details-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-top: 15px;
            }
            
            .major-detail-item {
                background-color: #fff;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }
            
            .major-detail-label {
                font-weight: bold;
                color: #4caf50;
                margin-bottom: 5px;
                font-size: 14px;
            }
            
            .major-detail-value {
                color: #333;
                font-size: 14px;
                line-height: 1.5;
            }
            
            .major-detail-section {
                margin-bottom: 20px;
            }
            
            .major-detail-section h4 {
                color: #4caf50;
                margin-bottom: 10px;
                font-size: 16px;
                border-bottom: 1px solid #eee;
                padding-bottom: 5px;
            }
            
            /* 无匹配专业提示信息样式 */
            .no-majors-message {
                text-align: center;
                padding: 40px 20px;
                background-color: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #dee2e6;
            }
            
            .no-majors-message p {
                margin-bottom: 15px;
                color: #666;
                font-size: 16px;
            }
            
            .no-majors-message ul {
                text-align: left;
                max-width: 300px;
                margin: 0 auto;
                color: #666;
            }
            
            .no-majors-message li {
                margin-bottom: 8px;
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                .major-details-grid {
                    grid-template-columns: 1fr;
                }
                
                .result-layout {
                    flex-direction: column;
                }
                
                .result-left-panel,
                .result-right-panel {
                    width: 100%;
                }
            }
            
            /* 加载和错误页面样式优化 */
            .loading-container, .error-container, .login-required {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 300px;
                gap: 15px;
                text-align: center;
                padding: 15px;
            }
            
            .loading-spinner {
                width: 60px;
                height: 60px;
                border: 6px solid #f3f3f3;
                border-top: 6px solid #4caf50;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            .error-container h3 {
                margin: 0;
                font-size: 18px;
                color: #d32f2f;
            }
            
            .error-container p {
                margin: 8px 0;
                font-size: 14px;
                color: #666;
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

    // 保存报告函数 - 生成以时间点命名的PDF文件并自动下载保存
    function saveReport() {
        console.log('[调试信息] 开始保存报告');
        try {
            // 多层次安全检查，确保数据完整性
            if (!window.assessmentResult) {
                console.warn('[调试信息] 没有找到测评结果数据');
                alert('无法保存报告：测评结果数据不存在');
                return;
            }
            
            // 验证关键数据字段
            const hasValidData = window.assessmentResult.hollandCode && 
                               window.assessmentResult.mbtiType && 
                               Array.isArray(window.assessmentResult.recommendedMajors);
                                
            if (!hasValidData) {
                console.warn('[调试信息] 测评结果数据不完整', window.assessmentResult);
                alert('无法保存报告：测评结果数据不完整，请重新进行测评');
                return;
            }
            
            console.log('[调试信息] 测评结果数据:', window.assessmentResult);
            
            // 创建完整的报告对象
            const report = {
                timestamp: new Date().toISOString(),
                assessmentTime: window.assessmentResult.timestamp || new Date().toISOString(),
                hollandCode: window.assessmentResult.hollandCode || '未知',
                mbtiType: window.assessmentResult.mbtiType || '未知',
                recommendedMajors: window.assessmentResult.recommendedMajors || [],
                abilityScores: window.assessmentResult.abilityScores || {},
                hollandScores: window.assessmentResult.hollandScores || {},
                mbtiScores: window.assessmentResult.mbtiScores || {},
                reportId: 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            };
            
            console.log('[调试信息] 生成的报告数据:', report);
            
            // 生成时间点命名的文件名
            const date = new Date();
            const fileName = `高考志愿测评报告_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}.json`;
            
            // 创建JSON格式的报告数据并下载
            try {
                // 将报告对象转换为JSON字符串
                const reportData = JSON.stringify(report, null, 2);
                
                // 创建Blob对象
                const blob = new Blob([reportData], { type: 'application/json;charset=utf-8;' });
                
                // 创建下载链接
                const link = document.createElement('a');
                
                // 对于Firefox，需要设置download属性
                if (link.download !== undefined) {
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', fileName);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url); // 释放URL对象
                }
                
                console.log('[调试信息] 报告已成功下载');
                alert('报告已成功下载为文件：' + fileName);
            } catch (downloadError) {
                console.error('[调试信息] 下载报告失败:', downloadError);
                alert('报告下载失败：' + downloadError.message);
            }
        } catch (error) {
            console.error('[调试信息] 保存报告时发生错误:', error);
            alert('报告保存失败：' + error.message);
        }
    }
    
    // 分享报告功能已移除 - 不再需要此功能
    // function shareReport() { ... }
    
    // ========== 快速测试模式功能 (仅用于调试) ==========
    
    // 全局快速测试函数，在window范围内定义
    window.showQuickTestPanel = function() {
        const assessmentTab = document.getElementById('assessment-tab');
        assessmentTab.innerHTML = `
            <div class="quick-test-panel" style="max-height: 90vh; overflow-y: auto; overflow-x: hidden;">
                <div class="panel-header">
                    <h2>🛠️ 快速测试模式</h2>
                    <p>跳过100道题，直接设置测评参数进行算法测试</p>
                    <button class="back-to-normal" onclick="location.reload()">返回正常测评</button>
                </div>
                
                <div class="test-form">
                    <!-- 霍兰德代码选择 -->
                    <div class="form-section">
                        <h3>霍兰德兴趣代码</h3>
                        <div class="holland-selector">
                            <div class="code-builder">
                                <label>第一位（主导兴趣）：</label>
                                <select id="holland1">
                                    <option value="R">实用型 (R) - 喜欢动手操作</option>
                                    <option value="I">研究型 (I) - 喜欢分析研究</option>
                                    <option value="A">艺术型 (A) - 喜欢创造表达</option>
                                    <option value="S">社会型 (S) - 喜欢帮助他人</option>
                                    <option value="E">企业型 (E) - 喜欢领导管理</option>
                                    <option value="C" selected>常规型 (C) - 喜欢有序规则</option>
                                </select>
                            </div>
                            <div class="code-builder">
                                <label>第二位：</label>
                                <select id="holland2">
                                    <option value="R" selected>实用型 (R)</option>
                                    <option value="I">研究型 (I)</option>
                                    <option value="A">艺术型 (A)</option>
                                    <option value="S">社会型 (S)</option>
                                    <option value="E">企业型 (E)</option>
                                    <option value="C">常规型 (C)</option>
                                </select>
                            </div>
                            <div class="code-builder">
                                <label>第三位：</label>
                                <select id="holland3">
                                    <option value="R">实用型 (R)</option>
                                    <option value="I" selected>研究型 (I)</option>
                                    <option value="A">艺术型 (A)</option>
                                    <option value="S">社会型 (S)</option>
                                    <option value="E">企业型 (E)</option>
                                    <option value="C">常规型 (C)</option>
                                </select>
                            </div>
                            <div class="code-preview">
                                预览：<span id="hollandPreview">CRI</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- MBTI类型选择 -->
                    <div class="form-section">
                        <h3>MBTI性格类型</h3>
                        <div class="mbti-selector">
                            <div class="mbti-dimension">
                                <label>精力来源：</label>
                                <select id="mbti1">
                                    <option value="E">外倾 (E) - 外向交际</option>
                                    <option value="I" selected>内倾 (I) - 内向思考</option>
                                </select>
                            </div>
                            <div class="mbti-dimension">
                                <label>信息获取：</label>
                                <select id="mbti2">
                                    <option value="S" selected>感觉 (S) - 关注细节</option>
                                    <option value="N">直觉 (N) - 关注概念</option>
                                </select>
                            </div>
                            <div class="mbti-dimension">
                                <label>决策方式：</label>
                                <select id="mbti3">
                                    <option value="T" selected>思考 (T) - 逻辑分析</option>
                                    <option value="F">情感 (F) - 价值关怀</option>
                                </select>
                            </div>
                            <div class="mbti-dimension">
                                <label>生活方式：</label>
                                <select id="mbti4">
                                    <option value="J" selected>判断 (J) - 有计划</option>
                                    <option value="P">感知 (P) - 灵活开放</option>
                                </select>
                            </div>
                            <div class="mbti-preview">
                                预览：<span id="mbtiPreview">ISTJ</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 能力分值设置 -->
                    <div class="form-section">
                        <h3>个人能力评分 (1-5分)</h3>
                        <div class="ability-sliders">
                            <div class="ability-item">
                                <label>逻辑思维能力：</label>
                                <input type="range" id="ability1" min="1" max="5" value="4" step="1">
                                <span class="score-display">4</span>
                            </div>
                            <div class="ability-item">
                                <label>创新思维能力：</label>
                                <input type="range" id="ability2" min="1" max="5" value="3" step="1">
                                <span class="score-display">3</span>
                            </div>
                            <div class="ability-item">
                                <label>数据分析能力：</label>
                                <input type="range" id="ability3" min="1" max="5" value="4" step="1">
                                <span class="score-display">4</span>
                            </div>
                            <div class="ability-item">
                                <label>组织协调能力：</label>
                                <input type="range" id="ability4" min="1" max="5" value="3" step="1">
                                <span class="score-display">3</span>
                            </div>
                            <div class="ability-item">
                                <label>沟通表达能力：</label>
                                <input type="range" id="ability5" min="1" max="5" value="3" step="1">
                                <span class="score-display">3</span>
                            </div>
                            <div class="ability-item">
                                <label>动手实践能力：</label>
                                <input type="range" id="ability6" min="1" max="5" value="4" step="1">
                                <span class="score-display">4</span>
                            </div>
                            <div class="ability-item">
                                <label>共情与同理心：</label>
                                <input type="range" id="ability7" min="1" max="5" value="3" step="1">
                                <span class="score-display">3</span>
                            </div>
                            <div class="ability-item">
                                <label>艺术审美能力：</label>
                                <input type="range" id="ability8" min="1" max="5" value="2" step="1">
                                <span class="score-display">2</span>
                            </div>
                            <div class="ability-item">
                                <label>耐心与专注力：</label>
                                <input type="range" id="ability9" min="1" max="5" value="4" step="1">
                                <span class="score-display">4</span>
                            </div>
                            <div class="ability-item">
                                <label>空间想象能力：</label>
                                <input type="range" id="ability10" min="1" max="5" value="3" step="1">
                                <span class="score-display">3</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 预设方案 -->
                    <div class="form-section">
                        <h3>快速预设</h3>
                        <div class="preset-buttons">
                            <button class="preset-btn" onclick="applyPreset('engineering')">工科生 (RIC + 高逻辑)</button>
                            <button class="preset-btn" onclick="applyPreset('business')">商科生 (ECS + 高沟通)</button>
                            <button class="preset-btn" onclick="applyPreset('liberal')">文科生 (SAI + 高情感)</button>
                            <button class="preset-btn" onclick="applyPreset('research')">研究型 (IAE + 高创新)</button>
                        </div>
                    </div>
                    
                    <div class="form-actions" style="margin-bottom: 50px;">
                        <button class="generate-result-btn" onclick="generateQuickTestResult()">生成测评结果</button>
                    </div>
                </div>
            </div>
            
            <style>
                /* 快速测试模式样式 */
                .test-mode-panel {
                    text-align: center;
                    margin: 20px 0;
                    padding: 15px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 10px;
                    color: white;
                }
                
                .quick-test-btn {
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: 2px solid rgba(255,255,255,0.3);
                    padding: 12px 24px;
                    border-radius: 25px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .quick-test-btn:hover {
                    background: rgba(255,255,255,0.3);
                    border-color: rgba(255,255,255,0.5);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.2);
                }
                
                .test-mode-hint {
                    display: block;
                    margin-top: 8px;
                    font-size: 12px;
                    opacity: 0.8;
                }
                
                .quick-test-panel {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 20px;
                    max-height: 90vh;
                    overflow-y: auto;
                    overflow-x: hidden;
                }
                
                .panel-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px;
                    color: white;
                }
                
                .panel-header h2 {
                    margin: 0 0 10px 0;
                    font-size: 28px;
                }
                
                .panel-header p {
                    margin: 0 0 15px 0;
                    opacity: 0.9;
                }
                
                .back-to-normal {
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.3);
                    padding: 8px 16px;
                    border-radius: 20px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .test-form {
                    display: grid;
                    gap: 25px;
                    max-height: none;
                    padding-bottom: 40px;
                }
                
                .form-section {
                    background: white;
                    padding: 25px;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                
                .form-section h3 {
                    margin: 0 0 20px 0;
                    color: #333;
                    font-size: 20px;
                    border-bottom: 2px solid #e0e0e0;
                    padding-bottom: 10px;
                }
                
                .holland-selector, .mbti-selector {
                    display: grid;
                    gap: 15px;
                }
                
                .code-builder, .mbti-dimension {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .code-builder label, .mbti-dimension label {
                    min-width: 120px;
                    font-weight: 600;
                    color: #555;
                }
                
                .code-builder select, .mbti-dimension select {
                    flex: 1;
                    padding: 8px 12px;
                    border: 2px solid #e0e0e0;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.3s ease;
                }
                
                .code-preview, .mbti-preview {
                    text-align: center;
                    margin-top: 15px;
                    padding: 12px;
                    background: #f0f8ff;
                    border-radius: 8px;
                    font-size: 18px;
                    font-weight: bold;
                    color: #2196f3;
                }
                
                .ability-sliders {
                    display: grid;
                    gap: 15px;
                }
                
                .ability-item {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 12px;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                
                .ability-item label {
                    min-width: 140px;
                    font-weight: 600;
                    color: #555;
                }
                
                .ability-item input[type="range"] {
                    flex: 1;
                    height: 6px;
                    background: #ddd;
                    border-radius: 3px;
                    outline: none;
                }
                
                .score-display {
                    min-width: 30px;
                    text-align: center;
                    font-weight: bold;
                    color: #667eea;
                    background: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    border: 1px solid #e0e0e0;
                }
                
                .preset-buttons {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 12px;
                }
                
                .preset-btn {
                    padding: 12px 16px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .preset-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
                }
                
                .form-actions {
                    text-align: center;
                    margin-top: 20px;
                }
                
                .generate-result-btn {
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    color: white;
                    border: none;
                    padding: 15px 40px;
                    border-radius: 25px;
                    font-size: 18px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
                }
                
                .generate-result-btn:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
                }
                
                /* 滚动条美化 */
                .quick-test-panel::-webkit-scrollbar {
                    width: 8px;
                }
                
                .quick-test-panel::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                }
                
                .quick-test-panel::-webkit-scrollbar-thumb {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 4px;
                }
                
                .quick-test-panel::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
                }
            </style>
        `;
        
        // 绑定事件
        bindQuickTestEvents();
    };
    
    // 其他全局快速测试函数
    window.bindQuickTestEvents = function() {
        const updateHollandPreview = () => {
            const h1 = document.getElementById('holland1').value;
            const h2 = document.getElementById('holland2').value;
            const h3 = document.getElementById('holland3').value;
            document.getElementById('hollandPreview').textContent = h1 + h2 + h3;
        };
        
        document.getElementById('holland1').addEventListener('change', updateHollandPreview);
        document.getElementById('holland2').addEventListener('change', updateHollandPreview);
        document.getElementById('holland3').addEventListener('change', updateHollandPreview);
        
        const updateMBTIPreview = () => {
            const m1 = document.getElementById('mbti1').value;
            const m2 = document.getElementById('mbti2').value;
            const m3 = document.getElementById('mbti3').value;
            const m4 = document.getElementById('mbti4').value;
            document.getElementById('mbtiPreview').textContent = m1 + m2 + m3 + m4;
        };
        
        document.getElementById('mbti1').addEventListener('change', updateMBTIPreview);
        document.getElementById('mbti2').addEventListener('change', updateMBTIPreview);
        document.getElementById('mbti3').addEventListener('change', updateMBTIPreview);
        document.getElementById('mbti4').addEventListener('change', updateMBTIPreview);
        
        // 能力滑块更新
        for (let i = 1; i <= 10; i++) {
            const slider = document.getElementById(`ability${i}`);
            if (slider) {
                const display = slider.nextElementSibling;
                slider.addEventListener('input', function() {
                    display.textContent = this.value;
                });
            }
        }
    };
    
    window.applyPreset = function(type) {
        const presets = {
            'engineering': {
                holland: ['R', 'I', 'C'],
                mbti: ['I', 'S', 'T', 'J'],
                abilities: [5, 4, 5, 3, 3, 5, 2, 2, 4, 4]
            },
            'business': {
                holland: ['E', 'C', 'S'],
                mbti: ['E', 'S', 'T', 'J'],
                abilities: [4, 4, 4, 5, 5, 3, 4, 3, 4, 3]
            },
            'liberal': {
                holland: ['S', 'A', 'I'],
                mbti: ['I', 'N', 'F', 'P'],
                abilities: [3, 5, 3, 4, 5, 2, 5, 5, 4, 3]
            },
            'research': {
                holland: ['I', 'A', 'E'],
                mbti: ['I', 'N', 'T', 'P'],
                abilities: [5, 5, 5, 3, 3, 3, 3, 4, 5, 4]
            }
        };
        
        const preset = presets[type];
        if (!preset) return;
        
        // 设置霍兰德代码
        document.getElementById('holland1').value = preset.holland[0];
        document.getElementById('holland2').value = preset.holland[1];
        document.getElementById('holland3').value = preset.holland[2];
        
        // 设置MBTI类型
        document.getElementById('mbti1').value = preset.mbti[0];
        document.getElementById('mbti2').value = preset.mbti[1];
        document.getElementById('mbti3').value = preset.mbti[2];
        document.getElementById('mbti4').value = preset.mbti[3];
        
        // 设置能力分值
        preset.abilities.forEach((score, index) => {
            const slider = document.getElementById(`ability${index + 1}`);
            const display = slider.nextElementSibling;
            slider.value = score;
            display.textContent = score;
        });
        
        // 更新预览
        document.getElementById('hollandPreview').textContent = preset.holland.join('');
        document.getElementById('mbtiPreview').textContent = preset.mbti.join('');
    };
    
    // 添加全局变量初始化，确保assessmentResult存在
    if (!window.assessmentResult) {
        window.assessmentResult = {};
        console.log('[调试信息] 初始化全局assessmentResult对象');
    }
    
    // 初始化完成后，渲染欢迎页面
    renderPage();
}
