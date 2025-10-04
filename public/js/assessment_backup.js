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
            // 更新为正确的能力维度名称
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

    // 渲染测评页面 - 实现左侧70%答题区域，右侧30%结果报告页布局
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

    // 计算分数
    function calculateScores(choice) {
        const { score_type, score_value } = choice;
        
        // 根据题目类型计算不同的分数
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

    // 显示加载动画
    function showLoadingAnimation() {
        assessmentTab.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <h3>正在分析您的测评结果...</h3>
                <p>请稍等，我们正在为您生成专属的专业推荐报告</p>
            </div>
        `;
    }

    // 渲染结果页面
    async function renderResultPage() {
        try {
            const hollandCode = generateHollandCode();
            const mbtiType = generateMBTIType();
            
            console.log('生成结果代码:', { hollandCode, mbtiType });
            
            // 使用专业匹配算法获取推荐专业
            recommendedMajors = await generateRecommendedMajors(hollandCode, mbtiType);
            window.recommendedMajors = recommendedMajors;
            
            // 设置全局assessmentResult对象
            window.assessmentResult = {
                timestamp: new Date().toISOString(),
                hollandCode: hollandCode,
                mbtiType: mbtiType,
                recommendedMajors: recommendedMajors,
                abilityScores: abilityScores,
                hollandScores: hollandScores,
                mbtiScores: mbtiScores
            };
            
            assessmentTab.innerHTML = `
                <div class="result-page">
                    <div class="result-header">
                        <h2>您的个人测评报告</h2>
                        <p>根据您的回答，我们为您生成了专属的专业推荐</p>
                        <div class="report-meta">
                            <span>生成时间：${new Date().toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="result-layout">
                        <!-- 左侧显示测评结果 -->
                        <div class="result-left-panel">
                            <div class="result-section">
                                <h3>霍兰德职业兴趣代码</h3>
                                <div class="holland-result">
                                    <div class="code-display">
                                        <span class="code-label">您的兴趣代码：</span>
                                        <span class="code-value">${hollandCode}</span>
                                    </div>
                                    <div class="holland-description">
                                        <p>${getHollandDescription(hollandCode)}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="result-section">
                                <h3>MBTI性格类型</h3>
                                <div class="mbti-result">
                                    <div class="code-display">
                                        <span class="code-label">您的MBTI类型：</span>
                                        <span class="code-value">${mbtiType}</span>
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
                                    ${recommendedMajors && recommendedMajors.length > 0 ? 
                                        recommendedMajors.map((major, index) => `
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
                                                        </div>
                                                    </div>
                                                    <button class="view-major-details" data-major-code="${major.code || ''}">查看详情</button>
                                                </div>
                                                <div class="recommendation-reason">
                                                    <p>${major.reason || '该专业与您的个人特质和能力相匹配。'}</p>
                                                </div>
                                            </div>
                                        `).join('') :
                                        `<div class="no-majors-message">
                                            <p>抱歉，目前没有找到与您的个人特质完全匹配的专业。</p>
                                            <p>建议您重新进行测评或联系专业顾问。</p>
                                        </div>`
                                    }
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
            document.getElementById('save-report-btn').addEventListener('click', function() {
                alert('报告保存功能即将上线！');
            });
            
            // 为专业详情按钮添加事件监听器
            document.querySelectorAll('.view-major-details').forEach(button => {
                button.addEventListener('click', function() {
                    const majorCode = this.getAttribute('data-major-code');
                    viewMajorDetails(majorCode);
                });
            });
            
        } catch (error) {
            console.error('渲染结果页面时出错:', error);
            assessmentTab.innerHTML = `
                <div class="error-container">
                    <div class="error-icon">⚠️</div>
                    <h2>生成报告失败</h2>
                    <p>抱歉，生成您的专属报告时遇到了问题。请稍后再试。</p>
                    <button onclick="restartAssessment()" class="primary-button">重新开始</button>
                </div>
            `;
        }
    }

    // 生成霍兰德代码
    function generateHollandCode() {
        // 找出得分最高的三个类型
        const sortedTypes = Object.entries(hollandScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        return sortedTypes.map(([type, score]) => type).join('');
    }

    // 生成MBTI类型
    function generateMBTIType() {
        let mbtiType = '';
        
        // E vs I
        mbtiType += mbtiScores['EI']['E'] > mbtiScores['EI']['I'] ? 'E' : 'I';
        
        // S vs N
        mbtiType += mbtiScores['SN']['S'] > mbtiScores['SN']['N'] ? 'S' : 'N';
        
        // T vs F
        mbtiType += mbtiScores['TF']['T'] > mbtiScores['TF']['F'] ? 'T' : 'F';
        
        // J vs P
        mbtiType += mbtiScores['JP']['J'] > mbtiScores['JP']['P'] ? 'J' : 'P';
        
        return mbtiType;
    }

    // 获取霍兰德代码描述
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
        return `您的主要兴趣类型是：${types}。这表明您适合结合这些特质的专业和职业发展方向。`;
    }

    // 获取MBTI类型描述
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
        
        return descriptions[type] || `您的MBTI类型是${type}，具有独特的个性特征。`;
    }

    // 绘制能力雷达图
    function drawAbilityRadar() {
        const canvas = document.getElementById('abilityChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 50;
        
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 能力名称（简化显示）
        const abilityNames = [
            '逻辑思维', '创新思维', '数据分析', '组织协调', '沟通表达',
            '动手实践', '共情同理', '艺术审美', '耐心专注', '空间想象'
        ];
        
        const abilityCount = abilityNames.length;
        const angleStep = (2 * Math.PI) / abilityCount;
        
        // 绘制背景网格
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, (radius * i) / 5, 0, 2 * Math.PI);
            ctx.stroke();
        }
        
        // 绘制轴线
        for (let i = 0; i < abilityCount; i++) {
            const angle = i * angleStep - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius
            );
            ctx.stroke();
        }
        
        // 绘制能力标签
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        for (let i = 0; i < abilityCount; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const labelX = centerX + Math.cos(angle) * (radius + 20);
            const labelY = centerY + Math.sin(angle) * (radius + 20);
            ctx.fillText(abilityNames[i], labelX, labelY);
        }
        
        // 绘制能力数据
        ctx.strokeStyle = '#2196f3';
        ctx.fillStyle = 'rgba(33, 150, 243, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const fullAbilityNames = [
            '逻辑思维能力', '创新思维能力', '数据分析能力', '组织协调能力', '沟通表达能力',
            '动手实践能力', '共情与同理心', '艺术审美能力', '耐心与专注力', '空间想象能力'
        ];
        
        for (let i = 0; i < abilityCount; i++) {
            const abilityName = fullAbilityNames[i];
            const abilityData = abilityScores[abilityName];
            const score = abilityData ? (abilityData.sum / abilityData.count) : 3; // 默认值3
            const normalizedScore = (score / 5) * radius; // 将1-5分转换为雷达图半径
            
            const angle = i * angleStep - Math.PI / 2;
            const x = centerX + Math.cos(angle) * normalizedScore;
            const y = centerY + Math.sin(angle) * normalizedScore;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // 专业匹配算法
    async function generateRecommendedMajors(hollandCode, mbtiType) {
        try {
            console.log('开始生成推荐专业，霍兰德代码:', hollandCode, 'MBTI类型:', mbtiType);
            
            if (!window.supabaseClient) {
                throw new Error('系统错误：无法连接到数据库服务，请检查网络连接或稍后再试。');
            }
            
            // 第一阶段：初步筛选 - 完全匹配
            const { data: majorRules, error: rulesError } = await window.supabaseClient
                .from('major_rules')
                .select('*')
                .eq('匹配的霍兰德代码组合', hollandCode)
                .eq('匹配的MBTI类型', mbtiType);
                
            if (rulesError) {
                console.error('查询专业规则失败:', rulesError.message);
                throw new Error('数据查询错误：无法获取专业匹配规则，请稍后再试');
            }
            
            if (!majorRules || majorRules.length === 0) {
                console.warn('没有找到完全匹配的专业，使用扩大搜索范围');
                
                // 第二阶段：部分匹配
                const { data: fallbackRules, error: fallbackError } = await window.supabaseClient
                    .from('major_rules')
                    .select('*')
                    .or(`匹配的霍兰德代码组合.eq.${hollandCode},匹配的MBTI类型.eq.${mbtiType}`);
                    
                if (fallbackError) {
                    throw new Error('数据查询错误：扩大搜索范围失败，请稍后再试');
                }
                
                if (!fallbackRules || fallbackRules.length === 0) {
                    // 第三阶段：基于能力的通用推荐
                    const { data: allMajors, error: allMajorsError } = await window.supabaseClient
                        .from('major_rules')
                        .select('*')
                        .limit(50);
                         
                    if (allMajorsError) {
                        throw new Error('数据查询错误：无法获取专业数据，请稍后再试');
                    }
                         
                    if (!allMajors || allMajors.length === 0) {
                        return [];
                    }
                         
                    return processMajorsWithScores(allMajors, hollandCode, mbtiType);
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
        
        // 匹配度权重配置
        const matchWeights = {
            holland: 0.4,  // 霍兰德兴趣权重40%
            mbti: 0.3,     // MBTI性格权重30%
            ability: 0.3   // 能力权重30%
        };

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
        
        const majorsWithScores = majorRules.map(majorRule => {
            // 1. 计算霍兰德匹配度
            let hollandMatchScore = 0;
            const majorHollandCodes = majorRule['匹配的霍兰德代码组合'];
            if (majorHollandCodes) {
                let codes = [];
                if (typeof majorHollandCodes === 'string') {
                    codes = majorHollandCodes.split(',').map(c => c.trim()).filter(c => c.length > 0);
                } else if (Array.isArray(majorHollandCodes)) {
                    codes = majorHollandCodes;
                }
                hollandMatchScore = calculateHollandSimilarity(hollandCode, codes) * 100;
            }
            
            // 2. 计算MBTI匹配度
            let mbtiMatchScore = 0;
            const majorMbtiTypes = majorRule['匹配的MBTI类型'];
            if (majorMbtiTypes) {
                let types = [];
                if (typeof majorMbtiTypes === 'string') {
                    types = majorMbtiTypes.split(',').map(t => t.trim()).filter(t => t.length > 0);
                } else if (Array.isArray(majorMbtiTypes)) {
                    types = majorMbtiTypes;
                }
                mbtiMatchScore = calculateMBTISimilarity(mbtiType, types) * 100;
            }
            
            // 3. 计算能力匹配度
            let abilityMatchScore = 0;
            let totalAbilityWeight = 0;
            let matchedAbilities = 0;
            
            let requiredAbilities = [];
            const abilityData = majorRule['所需核心能力'];
            if (Array.isArray(abilityData)) {
                requiredAbilities = abilityData;
            } else if (typeof abilityData === 'string' && abilityData.trim()) {
                let abilityStr = abilityData.trim();
                if (abilityStr.startsWith('{') && abilityStr.endsWith('}')) {
                    abilityStr = abilityStr.substring(1, abilityStr.length - 1);
                    requiredAbilities = abilityStr.split(',').map(ability => ability.trim()).filter(ability => ability.length > 0);
                } else if (abilityStr.includes(',')) {
                    requiredAbilities = abilityStr.split(',').map(ability => ability.trim()).filter(ability => ability.length > 0);
                } else {
                    requiredAbilities = [abilityStr];
                }
            }
            
            if (requiredAbilities.length > 0) {
                requiredAbilities.forEach(ability => {
                    const weight = abilityWeights[ability] || 1.0;
                    totalAbilityWeight += weight;
                    
                    if (abilityScores[ability] && abilityScores[ability].count > 0) {
                        const avgScore = abilityScores[ability].sum / abilityScores[ability].count;
                        abilityMatchScore += (avgScore * 20) * weight;
                        matchedAbilities++;
                    } else {
                        abilityMatchScore += 60 * weight;
                    }
                });
                
                if (totalAbilityWeight > 0) {
                    abilityMatchScore = Math.round(abilityMatchScore / totalAbilityWeight);
                } else {
                    abilityMatchScore = 65;
                }
            } else {
                abilityMatchScore = 75;
            }
            
            // 4. 计算综合匹配度
            const comprehensiveScore = Math.round(
                hollandMatchScore * matchWeights.holland +
                mbtiMatchScore * matchWeights.mbti +
                abilityMatchScore * matchWeights.ability
            );
            
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
        
        return majorsWithScores.slice(0, 10);
    }

    // 计算霍兰德代码相似度
    function calculateHollandSimilarity(userCode, majorCodes) {
        if (!majorCodes || majorCodes.length === 0) return 0;
        
        let maxSimilarity = 0;
        const codes = Array.isArray(majorCodes) ? majorCodes : [majorCodes];
        
        codes.forEach(majorCode => {
            if (!majorCode || typeof majorCode !== 'string') return;
            
            const positionWeights = [0.5, 0.3, 0.2];
            let similarity = 0;
            
            for (let i = 0; i < Math.min(3, userCode.length, majorCode.length); i++) {
                if (userCode[i] === majorCode[i]) {
                    similarity += positionWeights[i];
                } else if (majorCode.includes(userCode[i])) {
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
            for (let i = 0; i < Math.min(4, userType.length, majorType.length); i++) {
                if (userType[i] === majorType[i]) {
                    similarity += 0.25;
                }
            }
            
            maxSimilarity = Math.max(maxSimilarity, similarity);
        });
        
        return maxSimilarity;
    }

    // 查看专业详情
    async function viewMajorDetails(majorCode) {
        if (!majorCode) {
            alert('专业代码缺失');
            return;
        }
        
        try {
            // 从数据库获取专业详细信息
            const { data: majorData, error } = await window.supabaseClient
                .from('major_rules')
                .select('*')
                .eq('专业码', majorCode)
                .single();
            
            if (error) {
                console.error('获取专业详情失败:', error);
                alert('获取专业详情失败，请稍后再试');
                return;
            }
            
            if (!majorData) {
                alert('未找到该专业的详细信息');
                return;
            }
            
            // 显示专业详情弹窗
            showMajorDetailsModal(majorData);
            
        } catch (error) {
            console.error('查看专业详情时出错:', error);
            alert('系统错误，请稍后再试');
        }
    }

    // 显示专业详情弹窗
    function showMajorDetailsModal(majorData) {
        const modal = document.createElement('div');
        modal.className = 'major-details-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${majorData['专业名'] || '未知专业'}</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="detail-section">
                        <h3>基本信息</h3>
                        <p><strong>专业代码：</strong>${majorData['专业码'] || '未知'}</p>
                        <p><strong>学位类型：</strong>${majorData['学位'] || '未知'}</p>
                        <p><strong>学制：</strong>${majorData['学制'] || '未知'}</p>
                        <p><strong>门类：</strong>${majorData['门类'] || '未知'}</p>
                        <p><strong>专业类：</strong>${majorData['专业类'] || '未知'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h3>培养目标</h3>
                        <p>${majorData['培养目标'] || '暂无信息'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h3>主要课程</h3>
                        <p>${majorData['专业课程'] || '暂无信息'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h3>就业方向</h3>
                        <p>${majorData['就业方向'] || '暂无信息'}</p>
                    </div>
                    
                    <div class="detail-section">
                        <h3>所需核心能力</h3>
                        <p>${majorData['所需核心能力'] || '暂无信息'}</p>
                    </div>
                    
                    ${majorData['指引必选科目'] ? `
                    <div class="detail-section">
                        <h3>指引必选科目</h3>
                        <p>${majorData['指引必选科目']}</p>
                    </div>
                    ` : ''}
                    
                    ${majorData['体检限制'] ? `
                    <div class="detail-section">
                        <h3>体检限制</h3>
                        <p>${majorData['体检限制']}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加关闭事件
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // 初始化CSS样式
    function initializeAssessmentStyles() {
        if (document.getElementById('assessment-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'assessment-styles';
        style.textContent = `
            .assessment-layout {
                display: flex;
                gap: 30px;
                height: calc(100vh - 200px);
                min-height: 600px;
            }

            .assessment-left-panel {
                flex: 0 0 70%;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .assessment-right-panel {
                flex: 0 0 30%;
                background-color: #f8f9fa;
                border-radius: 12px;
                padding: 20px;
                overflow-y: auto;
            }

            .assessment-progress {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 20px;
            }

            .progress-bar {
                flex: 1;
                height: 12px;
                background-color: #e0e0e0;
                border-radius: 6px;
                overflow: hidden;
                position: relative;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #4caf50, #81c784);
                border-radius: 6px;
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
                font-size: 14px;
                font-weight: bold;
                color: #333;
                min-width: 40px;
            }

            .question-content-container {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .question-content {
                width: 100%;
                max-width: 600px;
                background: white;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .question-header {
                margin-bottom: 30px;
            }

            .question-type {
                display: inline-block;
                background: #e3f2fd;
                color: #1976d2;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 15px;
            }

            .question-header h3 {
                margin: 0;
                font-size: 20px;
                color: #333;
                line-height: 1.4;
            }

            .question-options {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .choice-option {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 15px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .choice-option:hover {
                border-color: #2196f3;
                background-color: #f8f9fa;
            }

            .choice-option input[type="radio"]:checked + .choice-text {
                color: #2196f3;
                font-weight: 600;
            }

            .choice-text {
                flex: 1;
                font-size: 16px;
                color: #333;
            }

            .assessment-controls {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
            }

            .primary-button {
                background: linear-gradient(135deg, #2196f3, #1976d2);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .primary-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(33, 150, 243, 0.3);
            }

            .secondary-button {
                background: #6c757d;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .secondary-button:hover {
                background: #5a6268;
            }

            .secondary-button:disabled {
                background: #adb5bd;
                cursor: not-allowed;
            }

            .result-preview {
                text-align: center;
            }

            .result-preview h3 {
                color: #333;
                margin-bottom: 15px;
            }

            .result-preview ul {
                text-align: left;
                color: #666;
                line-height: 1.6;
            }

            .preview-tips {
                margin-top: 20px;
                padding: 15px;
                background: #e8f5e9;
                border-radius: 8px;
                text-align: left;
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
                border: 4px solid #e0e0e0;
                border-top: 4px solid #2196f3;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .result-page {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }

            .result-header {
                text-align: center;
                margin-bottom: 30px;
                padding: 30px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 15px;
                color: white;
            }

            .result-header h2 {
                margin: 0 0 10px 0;
                font-size: 28px;
            }

            .result-layout {
                display: flex;
                gap: 30px;
            }

            .result-left-panel {
                flex: 0 0 65%;
                display: flex;
                flex-direction: column;
                gap: 25px;
            }

            .result-right-panel {
                flex: 0 0 35%;
            }

            .result-section {
                background: white;
                border-radius: 12px;
                padding: 25px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .result-section h3 {
                margin: 0 0 20px 0;
                color: #333;
                font-size: 20px;
                border-bottom: 2px solid #e0e0e0;
                padding-bottom: 10px;
            }

            .code-display {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
            }

            .code-label {
                font-weight: 600;
                color: #666;
            }

            .code-value {
                font-size: 24px;
                font-weight: bold;
                color: #2196f3;
                background: #e3f2fd;
                padding: 8px 16px;
                border-radius: 8px;
            }

            .holland-description, .mbti-description {
                color: #555;
                line-height: 1.6;
            }

            .ability-radar {
                text-align: center;
                padding: 20px;
            }

            .recommended-majors {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .major-card {
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .major-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            }

            .major-header {
                display: flex;
                gap: 15px;
                align-items: flex-start;
                margin-bottom: 15px;
            }

            .major-rank {
                background: linear-gradient(135deg, #4caf50, #45a049);
                color: white;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-weight: bold;
                flex-shrink: 0;
            }

            .major-info {
                flex: 1;
            }

            .major-name {
                margin: 0 0 8px 0;
                font-size: 18px;
                font-weight: 600;
                color: #333;
            }

            .major-meta {
                display: flex;
                gap: 20px;
                margin-bottom: 10px;
                font-size: 13px;
                color: #666;
            }

            .match-score.comprehensive {
                color: #28a745;
                font-weight: 600;
            }

            .detailed-scores {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }

            .score-item {
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }

            .score-item.holland {
                background: #e3f2fd;
                color: #1976d2;
            }

            .score-item.mbti {
                background: #f3e5f5;
                color: #7b1fa2;
            }

            .score-item.ability {
                background: #e8f5e9;
                color: #388e3c;
            }

            .view-major-details {
                background: #4caf50;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.3s;
            }

            .view-major-details:hover {
                background: #45a049;
            }

            .recommendation-reason {
                background: #f8f9fa;
                padding: 12px;
                border-radius: 6px;
                font-size: 14px;
                color: #666;
                line-height: 1.4;
            }

            .recommendation-reason p {
                margin: 0;
            }

            .result-footer {
                text-align: center;
                margin-top: 30px;
                padding: 20px;
            }

            .result-footer button {
                margin: 0 10px;
            }

            .no-majors-message {
                text-align: center;
                padding: 40px;
                color: #666;
            }

            .error-container {
                text-align: center;
                padding: 40px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .error-icon {
                font-size: 48px;
                margin-bottom: 20px;
            }

            .major-details-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }

            .modal-content {
                background: white;
                border-radius: 12px;
                padding: 0;
                max-width: 800px;
                max-height: 80vh;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }

            .modal-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .modal-header h2 {
                margin: 0;
                font-size: 24px;
            }

            .close-modal {
                font-size: 24px;
                cursor: pointer;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.3s;
            }

            .close-modal:hover {
                background: rgba(255,255,255,0.2);
            }

            .modal-body {
                padding: 20px;
                overflow-y: auto;
                max-height: calc(80vh - 80px);
            }

            .detail-section {
                margin-bottom: 20px;
            }

            .detail-section h3 {
                color: #333;
                margin: 0 0 10px 0;
                font-size: 18px;
                border-bottom: 1px solid #e0e0e0;
                padding-bottom: 5px;
            }

            .detail-section p {
                margin: 0;
                line-height: 1.6;
                color: #555;
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                .assessment-layout, .result-layout {
                    flex-direction: column;
                }
                
                .assessment-left-panel, .result-left-panel {
                    flex: none;
                }
                
                .assessment-right-panel, .result-right-panel {
                    flex: none;
                }
                
                .major-header {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .major-meta {
                    flex-direction: column;
                    gap: 5px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // 在模块初始化时添加样式
    initializeAssessmentStyles();

    // 主要初始化函数
    function initializeAssessmentTab() {
        const assessmentTab = document.getElementById('assessment-tab');
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
        
        // 渲染欢迎页面
        renderPage();
    }

    // 导出公共函数到全局
    window.initializeAssessmentTab = initializeAssessmentTab;
    window.restartAssessment = restartAssessment;
    window.viewMajorDetails = viewMajorDetails;

})();
    
    // 渲染快速测试页面
    function renderQuickTestPage() {
        assessmentTab.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto; padding: 20px; max-height: 90vh; overflow-y: auto;">
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
                    <h2>🛠️ 快速测评模式</h2>
                    <p>跳过100道题，直接设置参数生成测评结果</p>
                    <button onclick="currentStep='welcome'; renderPage();" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 20px; cursor: pointer;">返回首页</button>
                </div>
                
                <div style="display: grid; gap: 25px;">
                    <!-- 霍兰德代码选择 -->
                    <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">霍兰德兴趣代码</h3>
                        <div style="display: grid; gap: 15px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">第一位（主导）：</label>
                                <select id="holland1" style="flex: 1; padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;">
                                    <option value="R">实用型 (R) - 喜欢动手操作</option>
                                    <option value="I">研究型 (I) - 喜欢分析研究</option>
                                    <option value="A">艺术型 (A) - 喜欢创造表达</option>
                                    <option value="S">社会型 (S) - 喜欢帮助他人</option>
                                    <option value="E">企业型 (E) - 喜欢领导管理</option>
                                    <option value="C" selected>常规型 (C) - 喜欢有序规则</option>
                                </select>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">第二位：</label>
                                <select id="holland2" style="flex: 1; padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;">
                                    <option value="R" selected>实用型 (R)</option>
                                    <option value="I">研究型 (I)</option>
                                    <option value="A">艺术型 (A)</option>
                                    <option value="S">社会型 (S)</option>
                                    <option value="E">企业型 (E)</option>
                                    <option value="C">常规型 (C)</option>
                                </select>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">第三位：</label>
                                <select id="holland3" style="flex: 1; padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;">
                                    <option value="R">实用型 (R)</option>
                                    <option value="I" selected>研究型 (I)</option>
                                    <option value="A">艺术型 (A)</option>
                                    <option value="S">社会型 (S)</option>
                                    <option value="E">企业型 (E)</option>
                                    <option value="C">常规型 (C)</option>
                                </select>
                            </div>
                            <div style="text-align: center; margin-top: 15px; padding: 12px; background: #f0f8ff; border-radius: 8px; font-size: 18px; font-weight: bold; color: #2196f3;">
                                预览：<span id="hollandPreview">CRI</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- MBTI类型选择 -->
                    <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">MBTI性格类型</h3>
                        <div style="display: grid; gap: 15px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">精力来源：</label>
                                <select id="mbti1" style="flex: 1; padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;">
                                    <option value="E">外倾 (E) - 外向交际</option>
                                    <option value="I" selected>内倾 (I) - 内向思考</option>
                                </select>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">信息获取：</label>
                                <select id="mbti2" style="flex: 1; padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;">
                                    <option value="S" selected>感觉 (S) - 关注细节</option>
                                    <option value="N">直觉 (N) - 关注概念</option>
                                </select>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">决策方式：</label>
                                <select id="mbti3" style="flex: 1; padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;">
                                    <option value="T" selected>思考 (T) - 逻辑分析</option>
                                    <option value="F">情感 (F) - 价值关怀</option>
                                </select>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">生活方式：</label>
                                <select id="mbti4" style="flex: 1; padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;">
                                    <option value="J" selected>判断 (J) - 有计划</option>
                                    <option value="P">感知 (P) - 灵活开放</option>
                                </select>
                            </div>
                            <div style="text-align: center; margin-top: 15px; padding: 12px; background: #f0f8ff; border-radius: 8px; font-size: 18px; font-weight: bold; color: #2196f3;">
                                预览：<span id="mbtiPreview">ISTJ</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 十项能力评估 -->
                    <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">十项能力自评</h3>
                        <div style="display: grid; gap: 15px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">逻辑思维能力：</label>
                                <input type="range" id="ability1" min="1" max="5" value="3" style="flex: 1;" oninput="updateAbilityDisplay(this, 'abilityValue1')">
                                <span id="abilityValue1" style="min-width: 40px; text-align: center; font-weight: bold; color: #007bff;">3</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">动手实践能力：</label>
                                <input type="range" id="ability2" min="1" max="5" value="3" style="flex: 1;" oninput="updateAbilityDisplay(this, 'abilityValue2')">
                                <span id="abilityValue2" style="min-width: 40px; text-align: center; font-weight: bold; color: #007bff;">3</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">沟通表达能力：</label>
                                <input type="range" id="ability3" min="1" max="5" value="3" style="flex: 1;" oninput="updateAbilityDisplay(this, 'abilityValue3')">
                                <span id="abilityValue3" style="min-width: 40px; text-align: center; font-weight: bold; color: #007bff;">3</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">创新思维能力：</label>
                                <input type="range" id="ability4" min="1" max="5" value="3" style="flex: 1;" oninput="updateAbilityDisplay(this, 'abilityValue4')">
                                <span id="abilityValue4" style="min-width: 40px; text-align: center; font-weight: bold; color: #007bff;">3</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">组织协调能力：</label>
                                <input type="range" id="ability5" min="1" max="5" value="3" style="flex: 1;" oninput="updateAbilityDisplay(this, 'abilityValue5')">
                                <span id="abilityValue5" style="min-width: 40px; text-align: center; font-weight: bold; color: #007bff;">3</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">共情与同理心：</label>
                                <input type="range" id="ability6" min="1" max="5" value="3" style="flex: 1;" oninput="updateAbilityDisplay(this, 'abilityValue6')">
                                <span id="abilityValue6" style="min-width: 40px; text-align: center; font-weight: bold; color: #007bff;">3</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">艺术审美能力：</label>
                                <input type="range" id="ability7" min="1" max="5" value="3" style="flex: 1;" oninput="updateAbilityDisplay(this, 'abilityValue7')">
                                <span id="abilityValue7" style="min-width: 40px; text-align: center; font-weight: bold; color: #007bff;">3</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">数据分析能力：</label>
                                <input type="range" id="ability8" min="1" max="5" value="3" style="flex: 1;" oninput="updateAbilityDisplay(this, 'abilityValue8')">
                                <span id="abilityValue8" style="min-width: 40px; text-align: center; font-weight: bold; color: #007bff;">3</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">耐心与专注力：</label>
                                <input type="range" id="ability9" min="1" max="5" value="3" style="flex: 1;" oninput="updateAbilityDisplay(this, 'abilityValue9')">
                                <span id="abilityValue9" style="min-width: 40px; text-align: center; font-weight: bold; color: #007bff;">3</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <label style="min-width: 120px; font-weight: 600; color: #555;">空间想象能力：</label>
                                <input type="range" id="ability10" min="1" max="5" value="3" style="flex: 1;" oninput="updateAbilityDisplay(this, 'abilityValue10')">
                                <span id="abilityValue10" style="min-width: 40px; text-align: center; font-weight: bold; color: #007bff;">3</span>
                            </div>
                            <div style="text-align: center; margin-top: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px; color: #666; font-size: 14px;">
                                💡 拖动滑块调整能力评分（1-差，2-一般，3-中等，4-良好，5-优秀）
                            </div>
                        </div>
                    </div>
                    
                    <!-- 快速预设 -->
                    <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">快速预设</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                            <button onclick="applyPreset('engineering')" style="padding: 12px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">工科生 (RIC + 高逻辑)</button>
                            <button onclick="applyPreset('business')" style="padding: 12px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">商科生 (ECS + 高沟通)</button>
                            <button onclick="applyPreset('liberal')" style="padding: 12px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">文科生 (SAI + 高情感)</button>
                            <button onclick="applyPreset('research')" style="padding: 12px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">研究型 (IAE + 高创新)</button>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <button onclick="generateResult()" style="
                            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                            color: white;
                            border: none;
                            padding: 15px 40px;
                            border-radius: 25px;
                            font-size: 18px;
                            font-weight: 700;
                            cursor: pointer;
                            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
                        ">生成测评结果</button>
                    </div>
                </div>
            </div>
        `;
        
        // 绑定事件
        bindQuickTestEvents();
    }
    
    // 绑定快速测试事件
    function bindQuickTestEvents() {
        const updateHollandPreview = () => {
            const h1 = document.getElementById('holland1').value;
            const h2 = document.getElementById('holland2').value;
            const h3 = document.getElementById('holland3').value;
            document.getElementById('hollandPreview').textContent = h1 + h2 + h3;
        };
        
        const updateMBTIPreview = () => {
            const m1 = document.getElementById('mbti1').value;
            const m2 = document.getElementById('mbti2').value;
            const m3 = document.getElementById('mbti3').value;
            const m4 = document.getElementById('mbti4').value;
            document.getElementById('mbtiPreview').textContent = m1 + m2 + m3 + m4;
        };
        
        document.getElementById('holland1').addEventListener('change', updateHollandPreview);
        document.getElementById('holland2').addEventListener('change', updateHollandPreview);
        document.getElementById('holland3').addEventListener('change', updateHollandPreview);
        
        document.getElementById('mbti1').addEventListener('change', updateMBTIPreview);
        document.getElementById('mbti2').addEventListener('change', updateMBTIPreview);
        document.getElementById('mbti3').addEventListener('change', updateMBTIPreview);
        document.getElementById('mbti4').addEventListener('change', updateMBTIPreview);
    }
    
    // 更新能力值显示
    window.updateAbilityDisplay = function(slider, displayId) {
        document.getElementById(displayId).textContent = slider.value;
    };
    
    // 应用预设
    window.applyPreset = function(type) {
        const presets = {
            'engineering': { 
                holland: ['R', 'I', 'C'], 
                mbti: ['I', 'S', 'T', 'J'],
                abilities: [5, 4, 3, 4, 3, 3, 2, 5, 4, 4] // 逻辑思维5, 动手实践4, 沟通表达3, 创新思维4, 组织协调3, 共情同理3, 艺术审美2, 数据分析5, 耐心专注4, 空间想象4
            },
            'business': { 
                holland: ['E', 'C', 'S'], 
                mbti: ['E', 'S', 'T', 'J'],
                abilities: [4, 3, 5, 4, 5, 4, 3, 4, 4, 3] // 逻辑思维4, 动手实践3, 沟通表达5, 创新思维4, 组织协调5, 共情同理4, 艺术审美3, 数据分析4, 耐心专注4, 空间想象3
            },
            'liberal': { 
                holland: ['S', 'A', 'I'], 
                mbti: ['I', 'N', 'F', 'P'],
                abilities: [3, 2, 5, 5, 4, 5, 5, 3, 4, 3] // 逻辑思维3, 动手实践2, 沟通表达5, 创新思维5, 组织协调4, 共情同理5, 艺术审美5, 数据分析3, 耐心专注4, 空间想象3
            },
            'research': { 
                holland: ['I', 'A', 'E'], 
                mbti: ['I', 'N', 'T', 'P'],
                abilities: [5, 3, 3, 5, 3, 3, 4, 5, 5, 4] // 逻辑思维5, 动手实践3, 沟通表达3, 创新思维5, 组织协调3, 共情同理3, 艺术审美4, 数据分析5, 耐心专注5, 空间想象4
            }
        };
        
        const preset = presets[type];
        if (!preset) return;
        
        document.getElementById('holland1').value = preset.holland[0];
        document.getElementById('holland2').value = preset.holland[1];
        document.getElementById('holland3').value = preset.holland[2];
        
        document.getElementById('mbti1').value = preset.mbti[0];
        document.getElementById('mbti2').value = preset.mbti[1];
        document.getElementById('mbti3').value = preset.mbti[2];
        document.getElementById('mbti4').value = preset.mbti[3];
        
        // 设置能力值
        for (let i = 1; i <= 10; i++) {
            const slider = document.getElementById(`ability${i}`);
            const display = document.getElementById(`abilityValue${i}`);
            if (slider && display) {
                slider.value = preset.abilities[i-1];
                display.textContent = preset.abilities[i-1];
            }
        }
        
        document.getElementById('hollandPreview').textContent = preset.holland.join('');
        document.getElementById('mbtiPreview').textContent = preset.mbti.join('');
    };
    
    // 生成结果
    window.generateResult = function() {
        const hollandCode = document.getElementById('hollandPreview').textContent;
        const mbtiType = document.getElementById('mbtiPreview').textContent;
        
        // 收集能力值
        const abilities = [];
        for (let i = 1; i <= 10; i++) {
            const slider = document.getElementById(`ability${i}`);
            abilities.push(slider ? parseInt(slider.value) : 3);
        }
        
        // 设置全局结果数据
        window.testResult = { hollandCode, mbtiType, abilities };
        
        currentStep = 'result';
        renderPage();
    };
    
    // 渲染结果页面
    function renderResultPage() {
        const result = window.testResult || { 
            hollandCode: 'CRI', 
            mbtiType: 'ISTJ',
            abilities: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
        };
        
        // 模拟专业推荐
        const majorRecommendations = getMockRecommendations(result.hollandCode);
        
        assessmentTab.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 12px; color: white;">
                    <h2>🎯 您的测评结果</h2>
                    <p>基于您选择的参数生成的专业推荐</p>
                </div>
                
                <div style="display: grid; gap: 25px;">
                    <!-- 测评结果概览 -->
                    <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 20px 0; color: #333;">测评结果概览</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                            <div style="text-align: center; padding: 20px; background: #f0f8ff; border-radius: 8px;">
                                <h4 style="margin: 0 0 10px 0; color: #007bff;">霍兰德兴趣代码</h4>
                                <div style="font-size: 24px; font-weight: bold; color: #007bff;">${result.hollandCode}</div>
                                <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">${getHollandDescription(result.hollandCode)}</p>
                            </div>
                            <div style="text-align: center; padding: 20px; background: #f0fff0; border-radius: 8px;">
                                <h4 style="margin: 0 0 10px 0; color: #28a745;">MBTI性格类型</h4>
                                <div style="font-size: 24px; font-weight: bold; color: #28a745;">${result.mbtiType}</div>
                                <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">${getMBTIDescription(result.mbtiType)}</p>
                            </div>
                            <div style="text-align: center; padding: 20px; background: #fff0f5; border-radius: 8px;">
                                <h4 style="margin: 0 0 10px 0; color: #dc3545;">能力均值</h4>
                                <div style="font-size: 24px; font-weight: bold; color: #dc3545;">${(result.abilities.reduce((a, b) => a + b, 0) / 10).toFixed(1)}</div>
                                <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">十项能力平均分</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 能力雷达图 -->
                    <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 20px 0; color: #333;">能力分析</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            ${getAbilityBars(result.abilities)}
                        </div>
                    </div>
                    
                    <!-- 专业推荐 -->
                    <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 20px 0; color: #333;">推荐专业</h3>
                        <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px;">
                            <div style="display: grid; gap: 15px;">
                                ${majorRecommendations.map((major, index) => `
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
                                        <div>
                                            <div style="font-weight: bold; color: #333; margin-bottom: 5px;">${index + 1}. ${major.name}</div>
                                            <div style="color: #666; font-size: 14px;">学科门类: ${major.category}</div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="background: #007bff; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: bold;">
                                                ${major.match}% 匹配
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                            <p style="margin: 0; color: #856404; font-size: 14px;">
                                <strong>💡 说明：</strong> 以上推荐基于您选择的霍兰德代码 <strong>${result.hollandCode}</strong> 和 MBTI 类型 <strong>${result.mbtiType}</strong> 生成。
                                实际的专业选择还需要考虑个人兴趣、学习能力、家庭背景等多种因素。
                            </p>
                        </div>
                    </div>
                    
                    <!-- 操作按钮 -->
                    <div style="text-align: center; margin: 30px 0;">
                        <button onclick="currentStep='welcome'; renderPage();" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 12px 30px;
                            border-radius: 20px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            margin: 0 10px;
                        ">重新测评</button>
                        
                        <button onclick="currentStep='quickTest'; renderPage();" style="
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border: none;
                            padding: 12px 30px;
                            border-radius: 20px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            margin: 0 10px;
                        ">调整参数</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 获取模拟专业推荐
    function getMockRecommendations(hollandCode) {
        const majorDatabase = {
            'R': [
                { name: '机械工程', category: '工学', match: 95 },
                { name: '土木工程', category: '工学', match: 92 },
                { name: '电气工程及其自动化', category: '工学', match: 90 },
                { name: '建筑学', category: '工学', match: 88 },
                { name: '材料科学与工程', category: '工学', match: 85 },
                { name: '车辆工程', category: '工学', match: 83 },
                { name: '测控技术与仪器', category: '工学', match: 80 }
            ],
            'I': [
                { name: '数学与应用数学', category: '理学', match: 95 },
                { name: '物理学', category: '理学', match: 92 },
                { name: '计算机科学与技术', category: '工学', match: 90 },
                { name: '生物科学', category: '理学', match: 88 },
                { name: '化学', category: '理学', match: 85 },
                { name: '统计学', category: '理学', match: 83 },
                { name: '天文学', category: '理学', match: 80 }
            ],
            'A': [
                { name: '视觉传达设计', category: '艺术学', match: 95 },
                { name: '音乐学', category: '艺术学', match: 92 },
                { name: '美术学', category: '艺术学', match: 90 },
                { name: '动画', category: '艺术学', match: 88 },
                { name: '广播电视编导', category: '艺术学', match: 85 },
                { name: '戏剧影视文学', category: '艺术学', match: 83 },
                { name: '产品设计', category: '艺术学', match: 80 }
            ],
            'S': [
                { name: '心理学', category: '理学', match: 95 },
                { name: '社会工作', category: '法学', match: 92 },
                { name: '学前教育', category: '教育学', match: 90 },
                { name: '护理学', category: '医学', match: 88 },
                { name: '汉语言文学', category: '文学', match: 85 },
                { name: '思想政治教育', category: '法学', match: 83 },
                { name: '社会学', category: '法学', match: 80 }
            ],
            'E': [
                { name: '工商管理', category: '管理学', match: 95 },
                { name: '市场营销', category: '管理学', match: 92 },
                { name: '人力资源管理', category: '管理学', match: 90 },
                { name: '国际经济与贸易', category: '经济学', match: 88 },
                { name: '法学', category: '法学', match: 85 },
                { name: '公共事业管理', category: '管理学', match: 83 },
                { name: '经济学', category: '经济学', match: 80 }
            ],
            'C': [
                { name: '会计学', category: '管理学', match: 95 },
                { name: '财务管理', category: '管理学', match: 92 },
                { name: '审计学', category: '管理学', match: 90 },
                { name: '信息管理与信息系统', category: '管理学', match: 88 },
                { name: '图书馆学', category: '管理学', match: 85 },
                { name: '档案学', category: '管理学', match: 83 },
                { name: '保险学', category: '经济学', match: 80 }
            ]
        };
        
        const primaryType = hollandCode[0];
        return majorDatabase[primaryType] || majorDatabase['I'];
    }
    
    // 生成能力条形图
    function getAbilityBars(abilities) {
        const abilityNames = [
            '逻辑思维能力', '动手实践能力', '沟通表达能力', '创新思维能力', '组织协调能力',
            '共情与同理心', '艺术审美能力', '数据分析能力', '耐心与专注力', '空间想象能力'
        ];
        
        return abilities.map((score, index) => {
            const percentage = (score / 5) * 100;
            const color = score >= 4 ? '#28a745' : score >= 3 ? '#ffc107' : '#dc3545';
            
            return `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 600; color: #333; font-size: 14px;">${abilityNames[index]}</span>
                        <span style="font-weight: bold; color: ${color};">${score}</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${percentage}%; height: 100%; background: ${color}; transition: width 0.3s ease;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // 获取霍兰德描述
    function getHollandDescription(code) {
        const descriptions = {
            'R': '实用型 - 喜欢动手操作和具体工作',
            'I': '研究型 - 喜欢分析问题和理论研究',
            'A': '艺术型 - 富有创造力和艺术表达',
            'S': '社会型 - 善于沟通和帮助他人',
            'E': '企业型 - 具有领导力和商业头脑',
            'C': '常规型 - 注重细节和规则秩序'
        };
        return code.split('').map(c => descriptions[c] || '').join('、');
    }

    // 在模块初始化时添加样式
    initializeAssessmentStyles();

    // 主要初始化函数
    function initializeAssessmentTab() {
        const assessmentTab = document.getElementById('assessment-tab');
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
    }

    // 导出公共函数到全局
    window.initializeAssessmentTab = initializeAssessmentTab;
    window.restartAssessment = restartAssessment;
    window.viewMajorDetails = viewMajorDetails;

    console.log('个人测评模块已加载');

})();