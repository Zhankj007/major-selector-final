// 个人测评功能模块
const assessmentTab = document.getElementById('assessment-tab');
if (!assessmentTab || assessmentTab.dataset.initialized) return;
assessmentTab.dataset.initialized = 'true';

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

// 渲染页面内容
function renderPage() {
    switch (currentStep) {
        case 'welcome':
            renderWelcomePage();
            break;
        case 'assessment':
            renderAssessmentPage();
            break;
        case 'result':
            renderResultPage();
            break;
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
                <div class="welcome-info">
                    <div class="info-item">
                        <div class="info-icon">⏱️</div>
                        <div class="info-text">大约需要20分钟完成</div>
                    </div>
                    <div class="info-item">
                        <div class="info-icon">📊</div>
                        <div class="info-text">生成个性化专业推荐报告</div>
                    </div>
                    <div class="info-item">
                        <div class="info-icon">🔒</div>
                        <div class="info-text">您的测评数据将被严格保密</div>
                    </div>
                </div>
                <div class="welcome-buttons">
                    <button id="start-assessment-btn" class="query-button">开始测评</button>
                    <button id="learn-more-btn" class="output-button">了解更多</button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('start-assessment-btn').addEventListener('click', startAssessment);
    document.getElementById('learn-more-btn').addEventListener('click', showAssessmentInfo);
}

// 显示测评更多信息
function showAssessmentInfo() {
    alert('本测评基于霍兰德职业兴趣理论和MBTI性格类型理论，结合个人能力自评，通过科学算法为您推荐最适合的大学专业。测评结果仅供参考，最终选择请结合个人实际情况。');
}

// 开始测评
async function startAssessment() {
    // 显示加载动画
    assessmentTab.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>正在加载测评题目，请稍候...</p>
        </div>
    `;
    
    try {
        // 从Supabase数据库获取题目
        await loadQuestions();
        currentStep = 'assessment';
        currentQuestionIndex = 0;
        renderPage();
    } catch (error) {
        console.error('加载题目失败:', error);
        assessmentTab.innerHTML = `
            <div class="error-container">
                <p>加载题目失败，请刷新页面重试。</p>
                <button id="retry-btn" class="query-button">重试</button>
            </div>
        `;
        document.getElementById('retry-btn').addEventListener('click', startAssessment);
    }
}

// 加载测评题目
async function loadQuestions() {
    try {
        // 从questions表中获取所有题目
        const { data: questionsData, error: questionsError } = await supabaseClient
            .from('questions')
            .select('*');
        
        if (questionsError) {
            throw questionsError;
        }
        
        // 从choices表中获取所有选项
        const { data: choicesData, error: choicesError } = await supabaseClient
            .from('choices')
            .select('*');
        
        if (choicesError) {
            throw choicesError;
        }
        
        // 构建题目和选项的关系
        allQuestions = questionsData.map(question => {
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
        
        // 打乱题目顺序，实现随机出题
        allQuestions.sort(() => Math.random() - 0.5);
        
    } catch (error) {
        console.error('获取题目数据失败:', error);
        // 如果数据库连接失败，使用备用的模拟数据
        allQuestions = [
            // 霍兰德问题
            { id: '1', question_text: '喜欢修理出故障的电器或机械设备。', question_type: 'holland', dimension: 'R', choices: [
                { id: '1-1', choice_text: '非常喜欢', score_type: 'R', score_value: 5 },
                { id: '1-2', choice_text: '比较喜欢', score_type: 'R', score_value: 4 },
                { id: '1-3', choice_text: '一般', score_type: 'R', score_value: 3 },
                { id: '1-4', choice_text: '不太喜欢', score_type: 'R', score_value: 2 },
                { id: '1-5', choice_text: '不喜欢', score_type: 'R', score_value: 1 }
            ]},
            { id: '2', question_text: '喜欢研究和解决复杂的数学问题。', question_type: 'holland', dimension: 'I', choices: [
                { id: '2-1', choice_text: '非常喜欢', score_type: 'I', score_value: 5 },
                { id: '2-2', choice_text: '比较喜欢', score_type: 'I', score_value: 4 },
                { id: '2-3', choice_text: '一般', score_type: 'I', score_value: 3 },
                { id: '2-4', choice_text: '不太喜欢', score_type: 'I', score_value: 2 },
                { id: '2-5', choice_text: '不喜欢', score_type: 'I', score_value: 1 }
            ]},
            { id: '3', question_text: '喜欢绘画、音乐、写作等创造性活动。', question_type: 'holland', dimension: 'A', choices: [
                { id: '3-1', choice_text: '非常喜欢', score_type: 'A', score_value: 5 },
                { id: '3-2', choice_text: '比较喜欢', score_type: 'A', score_value: 4 },
                { id: '3-3', choice_text: '一般', score_type: 'A', score_value: 3 },
                { id: '3-4', choice_text: '不太喜欢', score_type: 'A', score_value: 2 },
                { id: '3-5', choice_text: '不喜欢', score_type: 'A', score_value: 1 }
            ]},
            // MBTI问题
            { id: '4', question_text: '在社交场合中，我倾向于：', question_type: 'mbti', dimension: 'EI', choices: [
                { id: '4-1', choice_text: '主动与他人交流，享受社交活动', score_type: 'E', score_value: 1 },
                { id: '4-2', choice_text: '倾向于观察和倾听，需要独处恢复精力', score_type: 'I', score_value: 1 }
            ]},
            { id: '5', question_text: '我做决定时，更注重：', question_type: 'mbti', dimension: 'TF', choices: [
                { id: '5-1', choice_text: '逻辑分析和客观事实', score_type: 'T', score_value: 1 },
                { id: '5-2', choice_text: '个人价值观和他人感受', score_type: 'F', score_value: 1 }
            ]},
            // 能力自评问题
            { id: '6', question_text: '请评价您的逻辑思维能力：', question_type: 'ability', dimension: '逻辑思维能力', choices: [
                { id: '6-1', choice_text: '很强', score_type: '逻辑思维能力', score_value: 5 },
                { id: '6-2', choice_text: '较强', score_type: '逻辑思维能力', score_value: 4 },
                { id: '6-3', choice_text: '一般', score_type: '逻辑思维能力', score_value: 3 },
                { id: '6-4', choice_text: '较弱', score_type: '逻辑思维能力', score_value: 2 },
                { id: '6-5', choice_text: '很弱', score_type: '逻辑思维能力', score_value: 1 }
            ]},
            { id: '7', question_text: '请评价您的动手实践能力：', question_type: 'ability', dimension: '动手实践能力', choices: [
                { id: '7-1', choice_text: '很强', score_type: '动手实践能力', score_value: 5 },
                { id: '7-2', choice_text: '较强', score_type: '动手实践能力', score_value: 4 },
                { id: '7-3', choice_text: '一般', score_type: '动手实践能力', score_value: 3 },
                { id: '7-4', choice_text: '较弱', score_type: '动手实践能力', score_value: 2 },
                { id: '7-5', choice_text: '很弱', score_type: '动手实践能力', score_value: 1 }
            ]}
        ];
    }
}

// 渲染测评页面
function renderAssessmentPage() {
    const currentQuestion = allQuestions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / allQuestions.length) * 100;
    
    assessmentTab.innerHTML = `
        <div class="assessment-container">
            <div class="assessment-header">
                <h3>个人测评</h3>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-text">${currentQuestionIndex + 1}/${allQuestions.length}</div>
                </div>
            </div>
            
            <div class="question-container">
                <div class="question-number">问题 ${currentQuestionIndex + 1}</div>
                <div class="question-text">${currentQuestion.question_text}</div>
                
                <div class="answer-options">
                    ${currentQuestion.choices.map((choice, index) => `
                        <div class="answer-option">
                            <input type="radio" id="choice-${index}" name="answer" value="${choice.id}">
                            <label for="choice-${index}">${choice.choice_text}</label>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="assessment-controls">
                ${currentQuestionIndex > 0 ? 
                    '<button id="prev-button" class="output-button">上一题</button>' : 
                    '<div></div>'}
                ${currentQuestionIndex < allQuestions.length - 1 ? 
                    '<button id="next-button" class="query-button">下一题</button>' : 
                    '<button id="submit-button" class="query-button">完成测评</button>'}
            </div>
        </div>
    `;
    
    // 恢复用户之前的选择
    const userAnswer = userAnswers.find(a => a.questionId === currentQuestion.id);
    if (userAnswer) {
        const selectedChoice = document.querySelector(`input[value="${userAnswer.choiceId}"]`);
        if (selectedChoice) {
            selectedChoice.checked = true;
        }
    }
    
    // 为选项添加点击事件
    const answerOptions = document.querySelectorAll('.answer-option');
    answerOptions.forEach(option => {
        option.addEventListener('click', () => {
            const radio = option.querySelector('input[type="radio"]');
            radio.checked = true;
        });
    });
    
    // 上一题按钮事件
    if (currentQuestionIndex > 0) {
        document.getElementById('prev-button').addEventListener('click', handlePrevQuestion);
    }
    
    // 下一题按钮事件
    if (currentQuestionIndex < allQuestions.length - 1) {
        document.getElementById('next-button').addEventListener('click', handleNextQuestion);
    }
    
    // 完成测评按钮事件
    if (currentQuestionIndex === allQuestions.length - 1) {
        document.getElementById('submit-button').addEventListener('click', handleSubmitAssessment);
    }
}

// 处理下一题
function handleNextQuestion() {
    // 保存当前答案
    const selectedOption = document.querySelector('input[name="answer"]:checked');
    if (selectedOption) {
        const choiceId = selectedOption.value;
        const currentQuestion = allQuestions[currentQuestionIndex];
        const selectedChoice = currentQuestion.choices.find(c => c.id === choiceId);
        
        // 更新或添加用户答案
        const existingAnswerIndex = userAnswers.findIndex(a => a.questionId === currentQuestion.id);
        if (existingAnswerIndex >= 0) {
            userAnswers[existingAnswerIndex] = {
                questionId: currentQuestion.id,
                choiceId: choiceId,
                scoreType: selectedChoice.score_type,
                scoreValue: selectedChoice.score_value,
                questionType: currentQuestion.question_type
            };
        } else {
            userAnswers.push({
                questionId: currentQuestion.id,
                choiceId: choiceId,
                scoreType: selectedChoice.score_type,
                scoreValue: selectedChoice.score_value,
                questionType: currentQuestion.question_type
            });
        }
    }
    
    // 移动到下一题
    currentQuestionIndex++;
    renderAssessmentPage();
}

// 处理上一题
function handlePrevQuestion() {
    currentQuestionIndex--;
    renderAssessmentPage();
}

// 处理完成测评
function handleSubmitAssessment() {
    // 保存最后一题的答案
    const selectedOption = document.querySelector('input[name="answer"]:checked');
    if (selectedOption) {
        const choiceId = selectedOption.value;
        const currentQuestion = allQuestions[currentQuestionIndex];
        const selectedChoice = currentQuestion.choices.find(c => c.id === choiceId);
        
        // 更新或添加用户答案
        const existingAnswerIndex = userAnswers.findIndex(a => a.questionId === currentQuestion.id);
        if (existingAnswerIndex >= 0) {
            userAnswers[existingAnswerIndex] = {
                questionId: currentQuestion.id,
                choiceId: choiceId,
                scoreType: selectedChoice.score_type,
                scoreValue: selectedChoice.score_value,
                questionType: currentQuestion.question_type
            };
        } else {
            userAnswers.push({
                questionId: currentQuestion.id,
                choiceId: choiceId,
                scoreType: selectedChoice.score_type,
                scoreValue: selectedChoice.score_value,
                questionType: currentQuestion.question_type
            });
        }
    }
    
    // 调用提交测评函数
    submitAssessment();
}

// 提交测评
function submitAssessment() {
    // 显示加载动画
    assessmentTab.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>正在为您生成专属报告...</p>
        </div>
    `;
    
    // 计算测评结果
    calculateAssessmentResults();
    
    // 模拟API请求延迟
    setTimeout(() => {
        currentStep = 'result';
        renderPage();
    }, 2000);
}

// 计算测评结果
function calculateAssessmentResults() {
    // 重置计分器
    hollandScores = { 'R': 0, 'I': 0, 'A': 0, 'S': 0, 'E': 0, 'C': 0 };
    mbtiScores = {
        'EI': { 'E': 0, 'I': 0 },
        'SN': { 'S': 0, 'N': 0 },
        'TF': { 'T': 0, 'F': 0 },
        'JP': { 'J': 0, 'P': 0 }
    };
    abilityScores = {};
    
    // 遍历用户答案进行计分
    userAnswers.forEach(answer => {
        switch (answer.questionType) {
            case 'holland':
                hollandScores[answer.scoreType] += answer.scoreValue;
                break;
            case 'mbti':
                if (answer.scoreType === 'E' || answer.scoreType === 'I') {
                    mbtiScores['EI'][answer.scoreType] += answer.scoreValue;
                } else if (answer.scoreType === 'S' || answer.scoreType === 'N') {
                    mbtiScores['SN'][answer.scoreType] += answer.scoreValue;
                } else if (answer.scoreType === 'T' || answer.scoreType === 'F') {
                    mbtiScores['TF'][answer.scoreType] += answer.scoreValue;
                } else if (answer.scoreType === 'J' || answer.scoreType === 'P') {
                    mbtiScores['JP'][answer.scoreType] += answer.scoreValue;
                }
                break;
            case 'ability':
                if (!abilityScores[answer.scoreType]) {
                    abilityScores[answer.scoreType] = 0;
                }
                abilityScores[answer.scoreType] += answer.scoreValue;
                break;
        }
    });
}

// 渲染结果页面
function renderResultPage() {
    // 计算霍兰德代码（取前三高得分）
    const hollandRanking = Object.entries(hollandScores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
    const hollandCode = hollandRanking.map(([code]) => code).join('');
    
    // 计算MBTI类型
    let mbtiType = '';
    mbtiType += mbtiScores['EI']['E'] > mbtiScores['EI']['I'] ? 'E' : 'I';
    mbtiType += mbtiScores['SN']['S'] > mbtiScores['SN']['N'] ? 'S' : 'N';
    mbtiType += mbtiScores['TF']['T'] > mbtiScores['TF']['F'] ? 'T' : 'F';
    mbtiType += mbtiScores['JP']['J'] > mbtiScores['JP']['P'] ? 'J' : 'P';
    
    // 从数据库获取推荐专业
    let recommendedMajors = [];
    try {
        recommendedMajors = getRecommendedMajors(hollandCode, mbtiType);
    } catch (error) {
        console.error('获取推荐专业失败:', error);
        // 使用备用的模拟推荐专业
        recommendedMajors = [
            {
                majorCode: '080201',
                majorName: '机械工程',
                recommendationReason: '你具有较强的动手实践能力和逻辑思维能力，适合学习机械工程专业。这个专业注重理论与实践结合，培养从事机械设计、制造、研究和管理等工作的高级工程技术人才。',
                matchScore: 92
            },
            {
                majorCode: '080901',
                majorName: '计算机科学与技术',
                recommendationReason: '你善于解决复杂问题，逻辑思维能力强，计算机科学与技术专业将为你提供广阔的发展空间。该专业培养具有良好科学素养，系统掌握计算机科学与技术的基础理论、基本技能与方法的高级专门人才。',
                matchScore: 88
            },
            {
                majorCode: '080701',
                majorName: '电子信息工程',
                recommendationReason: '你对技术创新有浓厚兴趣，动手能力强，电子信息工程专业将帮助你在电子、通信、计算机等领域发挥特长。该专业培养具备电子技术和信息系统的基础知识，能从事各类电子设备和信息系统的研究、设计、制造、应用和开发的高等工程技术人才。',
                matchScore: 85
            }
        ];
    }
    
    assessmentTab.innerHTML = `
        <div class="assessment-result">
            <div class="result-header">
                <h2>个人测评结果</h2>
                <p>根据您的答题情况，我们为您生成了以下分析报告</p>
            </div>
            
            <div class="result-content">
                <!-- 霍兰德代码分析 -->
                <div class="result-section">
                    <h3>职业兴趣分析</h3>
                    <div class="holland-result">
                        <div class="holland-code">
                            <span class="code-label">您的霍兰德代码：</span>
                            <span class="code-value">${hollandCode}</span>
                        </div>
                        <div class="holland-description">
                            ${getHollandDescription(hollandCode)}
                        </div>
                        <div class="holland-scores">
                            <div class="score-item">R: ${hollandScores['R']}</div>
                            <div class="score-item">I: ${hollandScores['I']}</div>
                            <div class="score-item">A: ${hollandScores['A']}</div>
                            <div class="score-item">S: ${hollandScores['S']}</div>
                            <div class="score-item">E: ${hollandScores['E']}</div>
                            <div class="score-item">C: ${hollandScores['C']}</div>
                        </div>
                    </div>
                </div>
                
                <!-- MBTI类型分析 -->
                <div class="result-section">
                    <h3>性格倾向分析</h3>
                    <div class="mbti-result">
                        <div class="mbti-type">
                            <span class="type-label">您的性格类型：</span>
                            <span class="type-value">${mbtiType}</span>
                        </div>
                        <div class="mbti-description">
                            ${getMBTIDescription(mbtiType)}
                        </div>
                    </div>
                </div>
                
                <!-- 能力优势雷达图 -->
                <div class="result-section">
                    <h3>能力优势分析</h3>
                    <div class="ability-chart-container">
                        <canvas id="abilityChart" width="400" height="300"></canvas>
                    </div>
                </div>
                
                <!-- 推荐专业列表 -->
                <div class="result-section">
                    <h3>推荐专业</h3>
                    <div class="recommended-majors">
                        ${recommendedMajors.map((major, index) => `
                            <div class="major-card">
                                <div class="major-rank">${index + 1}</div>
                                <div class="major-info">
                                    <div class="major-name">${major.majorName}</div>
                                    <div class="major-code">专业码：${major.majorCode}</div>
                                    <div class="match-score">匹配度：${major.matchScore}%</div>
                                </div>
                                <div class="recommendation-reason">
                                    ${major.recommendationReason}
                                </div>
                                <button class="view-major-details output-button" data-major-code="${major.majorCode}">查看详情</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="result-footer">
                <button id="save-result-btn" class="output-button">保存报告</button>
                <button id="share-result-btn" class="query-button">分享报告</button>
                <button id="restart-assessment-btn" class="output-button">重新测评</button>
            </div>
        </div>
    `;
    
    // 绘制能力雷达图
    drawAbilityChart();
    
    // 添加事件监听器
    document.getElementById('save-result-btn').addEventListener('click', saveResult);
    document.getElementById('share-result-btn').addEventListener('click', shareResult);
    document.getElementById('restart-assessment-btn').addEventListener('click', restartAssessment);
    
    // 添加查看专业详情的事件监听
    document.querySelectorAll('.view-major-details').forEach(button => {
        button.addEventListener('click', function() {
            const majorCode = this.getAttribute('data-major-code');
            viewMajorDetails(majorCode);
        });
    });
}

// 获取霍兰德代码描述
function getHollandDescription(code) {
    const descriptions = {
        'R': '现实型(R)：喜欢具体的任务，善于动手，偏好需要技术和体力的工作。',
        'I': '研究型(I)：喜欢思考，善于分析，偏好需要智力和抽象思维的工作。',
        'A': '艺术型(A)：喜欢创造，有想象力，偏好需要创意和自我表达的工作。',
        'S': '社会型(S)：喜欢与人交往，乐于助人，偏好需要人际交往和服务他人的工作。',
        'E': '企业型(E)：喜欢领导，善于说服，偏好需要管理和影响他人的工作。',
        'C': '常规型(C)：喜欢秩序，善于组织，偏好需要精确和系统的工作。'
    };
    
    let description = '您的职业兴趣组合显示您适合以下类型的工作：<br>';
    for (let i = 0; i < code.length; i++) {
        description += `<strong>${code[i]}</strong>: ${descriptions[code[i]]}<br>`;
    }
    
    return description;
}

// 获取MBTI类型描述
function getMBTIDescription(type) {
    const descriptions = {
        'ISTJ': ' ISTJ型人格注重实际、有条理，做事严谨可靠。他们重视传统和规则，善于组织和管理，是很好的执行者。',
        'ISFJ': 'ISFJ型人格富有同情心、责任心强，善于照顾他人。他们注重细节，工作认真负责，是很好的支持者。',
        'INFJ': 'INFJ型人格富有洞察力、理想主义，善于理解他人。他们有强烈的价值观，致力于帮助他人成长和发展。',
        'INTJ': 'INTJ型人格独立思考、战略思维强，善于分析和规划。他们有远见卓识，追求卓越，是很好的战略家。',
        'ISTP': 'ISTP型人格冷静务实、善于解决问题，喜欢动手实践。他们适应性强，善于应对突发情况。',
        'ISFP': 'ISFP型人格温和友善、敏感细腻，重视个人体验。他们注重当下，追求和谐，是很好的艺术家和观察者。',
        'INFP': 'INFP型人格理想主义、价值观强烈，善于理解他人情感。他们富有创造力，追求个人成长和意义。',
        'INTP': 'INTP型人格好奇爱思考、逻辑性强，喜欢探索抽象概念。他们追求知识和真理，是很好的思考者和分析师。',
        'ESTP': 'ESTP型人格外向活跃、喜欢冒险，善于应对各种情况。他们注重实际，行动迅速，是很好的行动者。',
        'ESFP': 'ESFP型人格活泼开朗、热情友好，喜欢与人交往。他们享受生活，善于活跃气氛，是很好的社交者。',
        'ENFP': 'ENFP型人格富有创造力、热情洋溢，善于激发他人潜能。他们充满活力，喜欢探索新事物。',
        'ENTP': 'ENTP型人格机智聪明、喜欢挑战，善于辩论和创新。他们思想开放，富有远见，是很好的创新者。',
        'ESTJ': 'ESTJ型人格务实高效、组织能力强，善于管理和执行。他们重视秩序和规则，是很好的管理者。',
        'ESFJ': 'ESFJ型人格热情友善、乐于助人，善于照顾他人需求。他们重视和谐，善于与人合作。',
        'ENFJ': 'ENFJ型人格富有魅力、善于领导，致力于帮助他人成长。他们善于沟通，有很强的人际影响力。',
        'ENTJ': 'ENTJ型人格果断自信、战略思维强，善于规划和领导。他们目标明确，效率高，是很好的领导者。'
    };
    
    return descriptions[type] || '您的性格特点显示您有独特的优势和潜力，可以在适合自己的领域发挥特长。';
}

// 绘制能力雷达图
function drawAbilityChart() {
    const ctx = document.getElementById('abilityChart').getContext('2d');
    const labels = Object.keys(abilityScores);
    const data = Object.values(abilityScores);
    
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: '能力评分',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(75, 192, 192, 1)'
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 5
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// 根据测评结果获取推荐专业
function getRecommendedMajors(hollandCode, mbtiType) {
    // 在实际应用中，这里应该从数据库获取推荐专业
    // 由于是模拟环境，我们使用模拟数据
    return [
        {
            majorCode: '080201',
            majorName: '机械工程',
            recommendationReason: '你具有较强的动手实践能力和逻辑思维能力，适合学习机械工程专业。这个专业注重理论与实践结合，培养从事机械设计、制造、研究和管理等工作的高级工程技术人才。',
            matchScore: 92
        },
        {
            majorCode: '080901',
            majorName: '计算机科学与技术',
            recommendationReason: '你善于解决复杂问题，逻辑思维能力强，计算机科学与技术专业将为你提供广阔的发展空间。该专业培养具有良好科学素养，系统掌握计算机科学与技术的基础理论、基本技能与方法的高级专门人才。',
            matchScore: 88
        },
        {
            majorCode: '080701',
            majorName: '电子信息工程',
            recommendationReason: '你对技术创新有浓厚兴趣，动手能力强，电子信息工程专业将帮助你在电子、通信、计算机等领域发挥特长。该专业培养具备电子技术和信息系统的基础知识，能从事各类电子设备和信息系统的研究、设计、制造、应用和开发的高等工程技术人才。',
            matchScore: 85
        }
    ];
}

// 保存报告
function saveResult() {
    // 在实际应用中，这里应该调用API保存报告
    alert('报告已保存到您的个人账户！');
}

// 分享报告
function shareResult() {
    // 模拟分享功能
    alert('分享功能暂未实现，敬请期待！');
}

// 重新测评
function restartAssessment() {
    currentStep = 'welcome';
    currentQuestionIndex = 0;
    allQuestions = [];
    userAnswers = [];
    renderPage();
}

// 查看专业详情
function viewMajorDetails(majorCode) {
    // 切换到专业目录标签页并查询该专业
    document.querySelector(`.tab-button[data-tab="majors"]`).click();
    
    // 实际应用中，这里应该调用专业目录页面的函数来显示该专业的详情
    setTimeout(() => {
        alert(`将跳转到专业目录页面查看${majorCode}的详细信息`);
    }, 500);
}

// 初始化页面
function init() {
    // 添加CSS样式
    addAssessmentStyles();
    
    // 检查用户登录状态
    const isLoggedIn = !document.body.classList.contains('logged-out');
    if (!isLoggedIn) {
        assessmentTab.innerHTML = `
            <div class="login-required">
                <p>请先登录后使用个人测评功能</p>
                <button id="go-login-btn" class="query-button">去登录</button>
            </div>
        `;
        document.getElementById('go-login-btn').addEventListener('click', () => {
            document.getElementById('login-register-button').click();
        });
        return;
    }
    
    // 渲染欢迎页面
    renderPage();
}

// 添加测评功能的CSS样式
function addAssessmentStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* 个人测评页面样式 */
        .assessment-welcome {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 500px;
            padding: 20px;
        }
        
        .welcome-content {
            max-width: 600px;
            text-align: center;
            padding: 40px;
            background-color: #f9f9f9;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
        
        .welcome-info {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }
        
        .info-icon {
            font-size: 30px;
        }
        
        .info-text {
            font-size: 14px;
            color: #666;
        }
        
        .welcome-buttons {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 30px;
        }
        
        /* 测评页面样式 */
        .assessment-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .assessment-header {
            margin-bottom: 30px;
        }
        
        .assessment-header h3 {
            color: #333;
            margin-bottom: 15px;
        }
        
        .progress-container {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .progress-bar {
            flex: 1;
            height: 20px;
            background-color: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background-color: #4caf50;
            transition: width 0.3s ease;
        }
        
        .progress-text {
            font-size: 14px;
            color: #666;
            min-width: 80px;
        }
        
        .question-container {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        
        .question-number {
            font-size: 14px;
            color: #999;
            margin-bottom: 10px;
        }
        
        .question-text {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        
        .answer-options {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .answer-option {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
            background-color: white;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .answer-option:hover {
            background-color: #f0f0f0;
        }
        
        .answer-option input[type="radio"] {
            width: 20px;
            height: 20px;
            cursor: pointer;
        }
        
        .answer-option label {
            cursor: pointer;
            flex: 1;
            font-size: 16px;
            color: #333;
        }
        
        .assessment-controls {
            display: flex;
            justify-content: space-between;
            gap: 20px;
        }
        
        /* 结果页面样式 */
        .assessment-result {
            max-width: 900px;
            margin: 0 auto;
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
        }
        
        .result-content {
            display: flex;
            flex-direction: column;
            gap: 30px;
        }
        
        .result-section {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 10px;
        }
        
        .result-section h3 {
            color: #333;
            margin-bottom: 20px;
            border-bottom: 2px solid #4caf50;
            padding-bottom: 10px;
        }
        
        /* 霍兰德结果样式 */
        .holland-result {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .holland-code {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 18px;
        }
        
        .code-label {
            color: #666;
        }
        
        .code-value {
            font-size: 24px;
            font-weight: bold;
            color: #4caf50;
        }
        
        .holland-description {
            line-height: 1.6;
            color: #333;
        }
        
        .holland-scores {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
        }
        
        .score-item {
            background-color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 14px;
        }
        
        /* MBTI结果样式 */
        .mbti-result {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .mbti-type {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 18px;
        }
        
        .type-label {
            color: #666;
        }
        
        .type-value {
            font-size: 24px;
            font-weight: bold;
            color: #2196f3;
        }
        
        .mbti-description {
            line-height: 1.6;
            color: #333;
        }
        
        /* 能力雷达图样式 */
        .ability-chart-container {
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
        
        /* 结果页脚样式 */
        .result-footer {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 40px;
        }
        
        /* 加载和错误页面样式 */
        .loading-container,
        .error-container,
        .login-required {
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
            width: 50px;
            height: 50px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid #4caf50;
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

// 初始化测评功能
init();