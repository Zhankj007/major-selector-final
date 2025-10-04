// ========== 个人测评功能模块 ==========
(function() {
    'use strict';

    // 使用全局定义的Supabase客户端
    const supabaseClient = window.supabaseClient;

    // ========== 页面状态管理 ==========
    let currentStep = 'welcome'; // welcome, assessment, result
    let currentQuestionIndex = 0;
    let allQuestions = [];
    let userAnswers = [];
    let isQuickTestMode = false;
    let quickTestData = {};
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
    let assessmentTab = null;

    // ========== 页面渲染控制 ==========
    async function renderPage() {
        if (!assessmentTab) {
            assessmentTab = document.getElementById('assessment-tab');
            if (!assessmentTab) {
                console.error('找不到assessment-tab元素');
                return;
            }
        }

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
                default:
                    renderWelcomePage();
            }
        } catch (error) {
            console.error('渲染页面时出错:', error);
            showErrorPage(error);
        }
    }

    // 渲染欢迎页面
    function renderWelcomePage() {
        assessmentTab.innerHTML = `
            <div class="welcome-container">
                <div class="welcome-header">
                    <h2>🎯 个人测评系统</h2>
                    <p>通过科学的测评方法，为您推荐最适合的专业方向</p>
                </div>
                
                <div class="welcome-content">
                    <div class="test-info">
                        <h3>测评内容</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-icon">🎨</div>
                                <h4>霍兰德职业兴趣</h4>
                                <p>评估您对不同工作环境和活动的兴趣偏好</p>
                                <span class="question-count">42题</span>
                            </div>
                            <div class="info-item">
                                <div class="info-icon">🧠</div>
                                <h4>MBTI性格类型</h4>
                                <p>分析您的性格特征和行为倾向</p>
                                <span class="question-count">32题</span>
                            </div>
                            <div class="info-item">
                                <div class="info-icon">⚡</div>
                                <h4>能力自评</h4>
                                <p>评估您在各项核心能力上的表现</p>
                                <span class="question-count">26题</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="test-actions">
                        <button id="start-assessment-btn" class="primary-button">
                            开始测评 (约10-15分钟)
                        </button>
                        <p class="test-note">
                            <strong>温馨提示：</strong>请根据您的真实想法回答，没有标准答案，只有最适合您的选择。
                        </p>
                    </div>
                </div>
            </div>
        `;

        // 添加开始测评按钮事件
        document.getElementById('start-assessment-btn').addEventListener('click', startAssessment);
    }

    // 开始测评
    async function startAssessment() {
        try {
            currentStep = 'assessment';
            currentQuestionIndex = 0;
            userAnswers = [];
            
            // 重置分数
            hollandScores = { 'R': 0, 'I': 0, 'A': 0, 'S': 0, 'E': 0, 'C': 0 };
            mbtiScores = {
                'EI': { 'E': 0, 'I': 0 },
                'SN': { 'S': 0, 'N': 0 },
                'TF': { 'T': 0, 'F': 0 },
                'JP': { 'J': 0, 'P': 0 }
            };
            abilityScores = {};
            
            // 显示加载状态
            assessmentTab.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <h3>正在加载题目...</h3>
                    <p>请稍等，我们正在为您准备个性化的测评题目</p>
                </div>
            `;
            
            // 加载题目
            await loadQuestions();
            
            // 开始答题
            await renderPage();
            
        } catch (error) {
            console.error('开始测评时出错:', error);
            showErrorPage(error);
        }
    }

    // 重新开始测评
    function restartAssessment() {
        currentStep = 'welcome';
        currentQuestionIndex = 0;
        allQuestions = [];
        userAnswers = [];
        isQuickTestMode = false;
        renderPage();
    }

    // 加载题目
    async function loadQuestions() {
        try {
            if (!supabaseClient) {
                throw new Error('数据库连接未初始化');
            }

            // 获取所有题目和选项
            const { data: questions, error: questionsError } = await supabaseClient
                .from('questions')
                .select(`
                    id,
                    question_text,
                    question_type,
                    choices (
                        id,
                        choice_text,
                        score_type,
                        score_value
                    )
                `)
                .order('id');

            if (questionsError) {
                throw new Error('获取题目失败: ' + questionsError.message);
            }

            if (!questions || questions.length === 0) {
                throw new Error('未找到测评题目');
            }

            // 按类型分组题目
            const hollandQuestions = questions.filter(q => q.question_type === 'holland');
            const mbtiQuestions = questions.filter(q => q.question_type === 'mbti');
            const abilityQuestions = questions.filter(q => q.question_type === 'ability');

            console.log('题目统计:', {
                总数: questions.length,
                霍兰德: hollandQuestions.length,
                MBTI: mbtiQuestions.length,
                能力: abilityQuestions.length
            });

            // 随机打乱题目顺序
            const shuffledHolland = shuffleArray([...hollandQuestions]);
            const shuffledMbti = shuffleArray([...mbtiQuestions]);
            const shuffledAbility = shuffleArray([...abilityQuestions]);

            // 合并所有题目
            allQuestions = [...shuffledHolland, ...shuffledMbti, ...shuffledAbility];

            console.log('加载完成，总题目数:', allQuestions.length);

        } catch (error) {
            console.error('加载题目失败:', error);
            throw error;
        }
    }

    // 随机打乱数组
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // 渲染测评页面
    function renderAssessmentPage() {
        if (!allQuestions || allQuestions.length === 0) {
            showErrorPage(new Error('没有可用的测评题目'));
            return;
        }

        const question = allQuestions[currentQuestionIndex];
        const progress = Math.round(((currentQuestionIndex + 1) / allQuestions.length) * 100);
        
        assessmentTab.innerHTML = `
            <div class="assessment-container">
                <div class="assessment-header">
                    <div class="progress-info">
                        <span class="question-counter">${currentQuestionIndex + 1} / ${allQuestions.length}</span>
                        <span class="question-type">${getQuestionTypeLabel(question.question_type)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-percentage">${progress}%</span>
                </div>
                
                <div class="question-container">
                    <h3 class="question-text">${question.question_text}</h3>
                    
                    <div class="choices-container">
                        ${question.choices.map((choice, index) => `
                            <label class="choice-item">
                                <input type="radio" name="choice" value="${choice.id}" />
                                <span class="choice-label">${choice.choice_text}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div class="assessment-controls">
                    <button id="prev-btn" class="secondary-button" ${currentQuestionIndex === 0 ? 'disabled' : ''}>
                        上一题
                    </button>
                    <button id="next-btn" class="primary-button" disabled>
                        ${currentQuestionIndex === allQuestions.length - 1 ? '完成测评' : '下一题'}
                    </button>
                </div>
            </div>
        `;

        // 添加事件监听器
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const choices = document.querySelectorAll('input[name="choice"]');

        // 选择答案时启用下一题按钮
        choices.forEach(choice => {
            choice.addEventListener('change', () => {
                nextBtn.disabled = false;
                nextBtn.classList.add('enabled');
            });
        });

        // 上一题按钮
        prevBtn.addEventListener('click', () => {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                renderPage();
            }
        });

        // 下一题按钮
        nextBtn.addEventListener('click', () => {
            const selectedChoice = document.querySelector('input[name="choice"]:checked');
            if (!selectedChoice) {
                alert('请选择一个答案');
                return;
            }

            // 记录答案
            const choiceId = selectedChoice.value;
            const choice = question.choices.find(c => c.id == choiceId);
            
            userAnswers.push({
                question_id: question.id,
                choice_id: choiceId,
                score_type: choice.score_type,
                score_value: choice.score_value
            });

            // 计算分数
            calculateScores(choice);

            // 检查是否完成
            if (currentQuestionIndex === allQuestions.length - 1) {
                finishAssessment();
            } else {
                currentQuestionIndex++;
                renderPage();
            }
        });
    }

    // 获取题目类型标签
    function getQuestionTypeLabel(type) {
        const labels = {
            'holland': '职业兴趣',
            'mbti': '性格倾向',
            'ability': '能力自评'
        };
        return labels[type] || '测评题目';
    }

    // 计算分数
    function calculateScores(choice) {
        const { score_type, score_value } = choice;
        
        if (['R', 'I', 'A', 'S', 'E', 'C'].includes(score_type)) {
            // 霍兰德分数
            hollandScores[score_type] += score_value;
        } else if (['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P'].includes(score_type)) {
            // MBTI分数
            if (['E', 'I'].includes(score_type)) {
                mbtiScores['EI'][score_type] += score_value;
            } else if (['S', 'N'].includes(score_type)) {
                mbtiScores['SN'][score_type] += score_value;
            } else if (['T', 'F'].includes(score_type)) {
                mbtiScores['TF'][score_type] += score_value;
            } else if (['J', 'P'].includes(score_type)) {
                mbtiScores['JP'][score_type] += score_value;
            }
        } else {
            // 能力分数
            if (!abilityScores[score_type]) {
                abilityScores[score_type] = { sum: 0, count: 0 };
            }
            abilityScores[score_type].sum += score_value;
            abilityScores[score_type].count += 1;
        }
    }

    // 完成测评
    function finishAssessment() {
        // 显示加载动画
        assessmentTab.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <h3>正在分析您的测评结果...</h3>
                <p>请稍等，我们正在为您生成专属的专业推荐报告</p>
            </div>
        `;

        // 延迟显示结果
        setTimeout(() => {
            currentStep = 'result';
            renderPage();
        }, 2000);
    }

    // 渲染结果页面
    async function renderResultPage() {
        try {
            const hollandCode = generateHollandCode();
            const mbtiType = generateMBTIType();
            
            console.log('生成结果:', { hollandCode, mbtiType });

            // 获取推荐专业
            recommendedMajors = await generateRecommendedMajors(hollandCode, mbtiType);

            assessmentTab.innerHTML = `
                <div class="result-container">
                    <div class="result-header">
                        <h2>🎉 您的个人测评报告</h2>
                        <p>根据您的回答，我们为您生成了专属的分析结果</p>
                        <div class="result-time">生成时间：${new Date().toLocaleString()}</div>
                    </div>

                    <div class="result-content">
                        <div class="result-summary">
                            <div class="summary-item">
                                <h3>霍兰德职业兴趣代码</h3>
                                <div class="code-display">${hollandCode}</div>
                                <p>${getHollandDescription(hollandCode)}</p>
                            </div>
                            
                            <div class="summary-item">
                                <h3>MBTI性格类型</h3>
                                <div class="code-display">${mbtiType}</div>
                                <p>${getMBTIDescription(mbtiType)}</p>
                            </div>
                        </div>

                        <div class="major-recommendations">
                            <h3>💼 推荐专业</h3>
                            ${recommendedMajors && recommendedMajors.length > 0 ? 
                                recommendedMajors.slice(0, 5).map((major, index) => `
                                    <div class="major-card">
                                        <div class="major-rank">${index + 1}</div>
                                        <div class="major-info">
                                            <h4>${major.name}</h4>
                                            <div class="major-scores">
                                                <span class="score-item">综合匹配: ${major.matchScore}%</span>
                                                <span class="score-item">兴趣: ${major.hollandScore}%</span>
                                                <span class="score-item">性格: ${major.mbtiScore}%</span>
                                                <span class="score-item">能力: ${major.abilityScore}%</span>
                                            </div>
                                            <p class="major-reason">${major.reason}</p>
                                        </div>
                                        <button class="detail-btn" onclick="viewMajorDetails('${major.code}')">
                                            查看详情
                                        </button>
                                    </div>
                                `).join('') :
                                '<div class="no-results">暂未找到匹配的专业，建议重新测评或咨询专业顾问。</div>'
                            }
                        </div>
                    </div>

                    <div class="result-actions">
                        <button onclick="restartAssessment()" class="secondary-button">重新测评</button>
                        <button onclick="saveReport()" class="primary-button">保存报告</button>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('生成结果页面失败:', error);
            showErrorPage(error);
        }
    }

    // 生成霍兰德代码
    function generateHollandCode() {
        const sortedTypes = Object.entries(hollandScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        return sortedTypes.map(([type]) => type).join('');
    }

    // 生成MBTI类型
    function generateMBTIType() {
        let type = '';
        type += mbtiScores['EI']['E'] > mbtiScores['EI']['I'] ? 'E' : 'I';
        type += mbtiScores['SN']['S'] > mbtiScores['SN']['N'] ? 'S' : 'N';
        type += mbtiScores['TF']['T'] > mbtiScores['TF']['F'] ? 'T' : 'F';
        type += mbtiScores['JP']['J'] > mbtiScores['JP']['P'] ? 'J' : 'P';
        return type;
    }

    // 获取霍兰德描述
    function getHollandDescription(code) {
        const descriptions = {
            'R': '实用型 - 喜欢动手操作和技术工作',
            'I': '研究型 - 喜欢分析、思考和解决问题',
            'A': '艺术型 - 具有创造力，喜欢艺术表达',
            'S': '社会型 - 喜欢帮助他人，具有同理心',
            'E': '企业型 - 具有领导力和说服力',
            'C': '常规型 - 注重细节，喜欢有序的工作'
        };
        const types = code.split('').map(c => descriptions[c] || c).join('、');
        return `您的主要兴趣类型是：${types}`;
    }

    // 获取MBTI描述
    function getMBTIDescription(type) {
        const descriptions = {
            'INTJ': '建筑师 - 富有想象力和战略性的思想家',
            'INTP': '思想家 - 具有创新精神的发明家',
            'ENTJ': '指挥官 - 大胆、富有想象力的强力领导者',
            'ENTP': '辩论家 - 聪明好奇的思想家',
            'INFJ': '提倡者 - 安静而神秘的理想主义者',
            'INFP': '调停者 - 富有诗意、善良的利他主义者',
            'ENFJ': '主人公 - 具有魅力的天生领导者',
            'ENFP': '竞选者 - 热情、有创造力的社交家',
            'ISTJ': '物流师 - 实用主义的可靠工作者',
            'ISFJ': '守护者 - 温暖心地善良的守护者',
            'ESTJ': '总经理 - 出色的管理者',
            'ESFJ': '执政官 - 极有同情心的支持者',
            'ISTP': '鉴赏家 - 大胆而实用的实验者',
            'ISFP': '探险家 - 灵活有魅力的艺术家',
            'ESTP': '企业家 - 精明、精力充沛的感知者',
            'ESFP': '娱乐家 - 自发的、精力充沛的演艺者'
        };
        return descriptions[type] || `您的MBTI类型是${type}，具有独特的个性特征`;
    }

    // 生成推荐专业
    async function generateRecommendedMajors(hollandCode, mbtiType) {
        try {
            if (!supabaseClient) {
                throw new Error('数据库连接失败');
            }

            // 从数据库获取匹配的专业
            const { data: majorRules, error } = await supabaseClient
                .from('major_rules')
                .select('*')
                .or(`匹配的霍兰德代码组合.eq.${hollandCode},匹配的MBTI类型.eq.${mbtiType}`)
                .limit(10);

            if (error) {
                console.error('查询专业失败:', error);
                return [];
            }

            if (!majorRules || majorRules.length === 0) {
                console.warn('未找到匹配的专业');
                return [];
            }

            // 计算匹配度并排序
            const majorsWithScores = majorRules.map(major => {
                const hollandScore = calculateHollandSimilarity(hollandCode, major['匹配的霍兰德代码组合']) * 100;
                const mbtiScore = calculateMBTISimilarity(mbtiType, major['匹配的MBTI类型']) * 100;
                const abilityScore = 75; // 简化的能力分数
                const matchScore = Math.round(hollandScore * 0.4 + mbtiScore * 0.3 + abilityScore * 0.3);

                return {
                    code: major['专业码'],
                    name: major['专业名'],
                    matchScore,
                    hollandScore: Math.round(hollandScore),
                    mbtiScore: Math.round(mbtiScore),
                    abilityScore,
                    reason: major['推荐理由'] || `该专业与您的兴趣和性格特征相匹配，综合匹配度${matchScore}%`
                };
            });

            return majorsWithScores.sort((a, b) => b.matchScore - a.matchScore);

        } catch (error) {
            console.error('生成推荐专业失败:', error);
            return [];
        }
    }

    // 计算霍兰德相似度
    function calculateHollandSimilarity(userCode, majorCode) {
        if (!majorCode) return 0;
        let similarity = 0;
        for (let i = 0; i < userCode.length && i < majorCode.length; i++) {
            if (userCode[i] === majorCode[i]) {
                similarity += (3 - i) * 0.2; // 位置权重
            }
        }
        return Math.min(similarity, 1);
    }

    // 计算MBTI相似度
    function calculateMBTISimilarity(userType, majorType) {
        if (!majorType) return 0;
        let matches = 0;
        for (let i = 0; i < 4; i++) {
            if (userType[i] === majorType[i]) {
                matches++;
            }
        }
        return matches / 4;
    }

    // 显示错误页面
    function showErrorPage(error) {
        assessmentTab.innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <h3>出现了问题</h3>
                <p>${error.message}</p>
                <button onclick="restartAssessment()" class="primary-button">重新开始</button>
            </div>
        `;
    }

    // 查看专业详情
    function viewMajorDetails(majorCode) {
        alert(`查看专业详情功能开发中，专业代码：${majorCode}`);
    }

    // 保存报告
    function saveReport() {
        alert('报告保存功能开发中');
    }

    // 初始化CSS样式
    function initStyles() {
        if (document.getElementById('assessment-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'assessment-styles';
        style.textContent = `
            .welcome-container {
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 20px;
                text-align: center;
            }

            .welcome-header h2 {
                color: #2c3e50;
                margin-bottom: 10px;
                font-size: 2.5em;
            }

            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }

            .info-item {
                background: white;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                transition: transform 0.3s ease;
            }

            .info-item:hover {
                transform: translateY(-5px);
            }

            .info-icon {
                font-size: 3em;
                margin-bottom: 15px;
            }

            .question-count {
                background: #3498db;
                color: white;
                padding: 5px 12px;
                border-radius: 15px;
                font-size: 0.9em;
                font-weight: bold;
            }

            .primary-button {
                background: linear-gradient(135deg, #3498db, #2980b9);
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 25px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                margin: 20px 10px;
            }

            .primary-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(52, 152, 219, 0.3);
            }

            .secondary-button {
                background: #95a5a6;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                margin: 10px;
            }

            .secondary-button:hover {
                background: #7f8c8d;
            }

            .secondary-button:disabled {
                background: #bdc3c7;
                cursor: not-allowed;
            }

            .assessment-container {
                max-width: 900px;
                margin: 0 auto;
                padding: 20px;
            }

            .assessment-header {
                background: white;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 30px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .progress-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .progress-bar {
                height: 12px;
                background: #ecf0f1;
                border-radius: 6px;
                overflow: hidden;
                margin-bottom: 10px;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #3498db, #2ecc71);
                transition: width 0.3s ease;
            }

            .question-container {
                background: white;
                padding: 30px;
                border-radius: 12px;
                margin-bottom: 30px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .question-text {
                font-size: 1.4em;
                color: #2c3e50;
                margin-bottom: 25px;
                line-height: 1.6;
            }

            .choices-container {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .choice-item {
                display: flex;
                align-items: center;
                padding: 15px 20px;
                background: #f8f9fa;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .choice-item:hover {
                background: #e3f2fd;
                border-color: #3498db;
            }

            .choice-item input[type="radio"] {
                margin-right: 15px;
                transform: scale(1.2);
            }

            .choice-label {
                flex: 1;
                font-size: 1.1em;
                color: #2c3e50;
            }

            .assessment-controls {
                display: flex;
                justify-content: space-between;
                padding: 0 20px;
            }

            .loading-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 400px;
                text-align: center;
            }

            .loading-spinner {
                width: 50px;
                height: 50px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .result-container {
                max-width: 1000px;
                margin: 0 auto;
                padding: 20px;
            }

            .result-header {
                text-align: center;
                padding: 30px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 15px;
                margin-bottom: 30px;
            }

            .result-summary {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 30px;
                margin-bottom: 40px;
            }

            .summary-item {
                background: white;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                text-align: center;
            }

            .code-display {
                font-size: 2.5em;
                font-weight: bold;
                color: #3498db;
                margin: 15px 0;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
            }

            .major-recommendations {
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                margin-bottom: 30px;
            }

            .major-card {
                display: flex;
                align-items: center;
                gap: 20px;
                padding: 20px;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                margin-bottom: 15px;
                transition: all 0.3s ease;
            }

            .major-card:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                transform: translateY(-2px);
            }

            .major-rank {
                background: #3498db;
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 1.2em;
            }

            .major-info {
                flex: 1;
            }

            .major-info h4 {
                margin: 0 0 10px 0;
                color: #2c3e50;
                font-size: 1.3em;
            }

            .major-scores {
                display: flex;
                gap: 15px;
                margin-bottom: 10px;
                flex-wrap: wrap;
            }

            .score-item {
                background: #ecf0f1;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.9em;
                color: #2c3e50;
            }

            .major-reason {
                color: #7f8c8d;
                font-size: 0.95em;
                margin: 0;
                line-height: 1.4;
            }

            .detail-btn {
                background: #2ecc71;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9em;
            }

            .result-actions {
                text-align: center;
                padding: 20px;
            }

            .error-container {
                text-align: center;
                padding: 50px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                margin: 40px auto;
                max-width: 500px;
            }

            .error-icon {
                font-size: 4em;
                margin-bottom: 20px;
            }

            @media (max-width: 768px) {
                .info-grid {
                    grid-template-columns: 1fr;
                }
                
                .result-summary {
                    grid-template-columns: 1fr;
                }
                
                .major-card {
                    flex-direction: column;
                    text-align: center;
                }
                
                .major-scores {
                    justify-content: center;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // 主要初始化函数
    function initializeAssessmentTab() {
        assessmentTab = document.getElementById('assessment-tab');
        if (!assessmentTab) {
            console.error('找不到assessment-tab元素');
            return;
        }
        
        // 重置状态
        currentStep = 'welcome';
        currentQuestionIndex = 0;
        allQuestions = [];
        userAnswers = [];
        isQuickTestMode = false;
        
        // 重置分数
        hollandScores = { 'R': 0, 'I': 0, 'A': 0, 'S': 0, 'E': 0, 'C': 0 };
        mbtiScores = {
            'EI': { 'E': 0, 'I': 0 },
            'SN': { 'S': 0, 'N': 0 },
            'TF': { 'T': 0, 'F': 0 },
            'JP': { 'J': 0, 'P': 0 }
        };
        abilityScores = {};
        
        // 渲染欢迎页面
        renderPage();
        
        // 标记为已初始化
        assessmentTab.dataset.initialized = 'true';
        
        console.log('个人测评模块初始化完成');
    }

    // 初始化样式
    initStyles();

    // 导出全局函数
    window.initializeAssessmentTab = initializeAssessmentTab;
    window.restartAssessment = restartAssessment;
    window.viewMajorDetails = viewMajorDetails;
    window.saveReport = saveReport;

    console.log('个人测评模块已加载');

})();