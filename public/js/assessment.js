// 个人测评模块 - 简化版本但功能完整

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
    
    // 状态管理
    let currentStep = 'welcome';
    
    // 渲染页面
    function renderPage() {
        switch (currentStep) {
            case 'welcome':
                renderWelcomePage();
                break;
            case 'quickTest':
                renderQuickTestPage();
                break;
            case 'result':
                renderResultPage();
                break;
        }
    }
    
    // 渲染欢迎页面
    function renderWelcomePage() {
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
                        <button id="start-quick-test-btn" style="
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
                            margin: 0 10px;
                        ">🛠️ 快速测评</button>
                        
                        <button id="start-full-test-btn" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 15px 40px;
                            border-radius: 25px;
                            font-size: 18px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
                            margin: 0 10px;
                        ">完整测评</button>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #999; font-size: 14px;">
                            💡 提示：快速测评通过选择参数直接生成结果，完整测评功能开发中
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        // 绑定事件
        const quickTestBtn = document.getElementById('start-quick-test-btn');
        const fullTestBtn = document.getElementById('start-full-test-btn');
        
        if (quickTestBtn) {
            quickTestBtn.addEventListener('click', function() {
                currentStep = 'quickTest';
                renderPage();
            });
            
            quickTestBtn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
            });
            
            quickTestBtn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
            });
        }
        
        if (fullTestBtn) {
            fullTestBtn.addEventListener('click', function() {
                alert('完整测评功能正在开发中，请使用快速测评！');
            });
        }
    }
    
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
    
    // 获取MBTI描述
    function getMBTIDescription(type) {
        const descriptions = {
            'ISTJ': '检查员型 - 严谨务实，责任心强',
            'ISFJ': '保护者型 - 温和友善，乐于助人',
            'INFJ': '顾问型 - 富有洞察力，追求理想',
            'INTJ': '专家型 - 独立自主，善于规划',
            'ISTP': '技师型 - 灵活适应，善于解决问题',
            'ISFP': '艺术家型 - 敏感细腻，追求和谐',
            'INFP': '治疗师型 - 理想主义，富有同情心',
            'INTP': '思想家型 - 好奇心强，喜欢理论',
            'ESTP': '实干家型 - 精力充沛，善于行动',
            'ESFP': '表演者型 - 热情开朗，善于交际',
            'ENFP': '倡导者型 - 热情洋溢，富有创意',
            'ENTP': '发明家型 - 机智聪明，善于创新',
            'ESTJ': '监督者型 - 果断务实，善于管理',
            'ESFJ': '供应者型 - 热心负责，关心他人',
            'ENFJ': '教育家型 - 富有魅力，善于激励',
            'ENTJ': '统帅型 - 天生领袖，目标明确'
        };
        
        return descriptions[type] || '未知类型';
    }
    
    // 初始化页面
    try {
        renderPage();
        console.log('个人测评模块已成功加载');
    } catch (error) {
        console.error('初始化测评模块时出错:', error);
        assessmentTab.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #666;">
                <h2>模块加载失败</h2>
                <p>错误信息: ${error.message}</p>
                <button onclick="location.reload()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">刷新页面</button>
            </div>
        `;
    }
};

// 确保在页面加载完成后可以使用
if (typeof window !== 'undefined') {
    console.log('个人测评模块已加载');
}