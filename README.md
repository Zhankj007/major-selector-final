## 詹老师的高考志愿工具箱

### 项目概况
本工具网站，系詹老师业余时间打理，边学边做，仅供练手。<br><br>
网站是标准三层架构的 Web 应用，页面采取标签页模式，一个标签页代表一种功能查询，目前已搭建高校库、专业目录、2025浙江高考招生计划、后台管理等4个标签页，每个标签页一个前端文件，互相之间不干扰。<br><br>
网站提供用户管理系统，并集成权限管理，权限以标签页为单位，游客默认提供高校库、专业目录两项功能，用户注册后，可由系统管理员在后台管理中添加权限。系统管理员额外多一个后台管理功能，可查阅每个用户的注册信息及登录情况，同时也提供权限及使用日期管理。<br><br>

### 模块功能
:blue_heart:**高校库** <br>直接在前端服务器上 _data 目录下建立数据源 universities.csv 文件，将全国截止2025年7月的高校名单信息纳入。页面左侧，按省份、主管部门等两种架构进行树状结构查询，同时建立了院校水平、院校类型、城市评级、办学性质、办学层次等五个维度的筛选器，并提供院校名称的关键字查询。页面右侧，上方提供院校详情的查看，只要在左侧院校名上悬停或点击，右侧自动出现该院校的详情信息；下方提供意向院校的收藏，只要将左侧院校名前面的方框勾选，自动将该院校纳入意向院校清单，并提供复制和清空按钮。<br>

:blue_heart:**专业目录** <br>在 Google Sheet 上分别建立本专科专业目录数据源，也是采取csv格式。页面左侧提供本/专科切换按钮，将专业目录按门类—专业类—专业三级树状结构展开，并提供专业名称关键字查询。页面右侧，上方提供专业详情的查看，下方提供所选专业的收藏，其它功能与高校库类似。<br>

:blue_heart:**2025浙江高考招生计划** <br>由于招生计划数据量较大，故数据源搭建在Supabase数据库上。页面左侧提供7个筛选器，分别是科类、城市、选科、水平、性质、层次、范围，其中选科按钮是先分文理科类再分具体选科，水平是按院校水平层次进行划分，层次是本专科区别，范围则是提供分数和位次两个维度，输入上下区间进行筛选。除筛选器外，还提供院校名称关键字、专业名词关键字的查询。尤其是专业名称关键字，可以从第二张标签页的所选专业中直接复制，系统按每个专业名称自动去计划库中去匹配相关专业。上述筛选器或关键字确认后，点击查询按钮可选出符合条件的记录，系统暂定每次查询结果最多不超过500条，筛选结果通过树状和列表两种方式展示。与前面两张表类似，页面右侧也提供计划详情和院校专业图表的展示，当在筛选结果中点击院校名称时，右侧图表展示区出现该院校2025年在浙江招生的所有符合左侧筛选条件的专业投档分数线柱形图；当在筛选结果中鼠标悬停在专业名称上时，右侧计划详情区显示该计划的具体信息，而点击该计划时，图表展示区会出现该计划历年分数线/平均分、位次号、计划数等3个并排展示的柱形图、点线图或条形图，让用户对该招生计划的历年趋势有一个直观的了解。右侧页面最下方，有两个结果输出区，左边是意向城市，当用户在左侧“城市”筛选器中勾选城市时，这里就出现该城市的名称；右侧是意向计划，当用户在左侧计划筛选结果中勾选某计划时，这里就将该计划纳入收藏区。同时该区域也提供复制和清空按钮。<br>

:heart:**后台管理** <br>该标签页仅对系统管理员开放，管理员可在这里查看所有的普通注册用户（不含管理员用户），列表展示了用户的注册邮箱、昵称、手机、工作单位、注册时间、最后登录时间、登录次数等信息，还提供了编辑的功能，管理员可在该页面下给普通注册用户增删权限，改动权限截止日期等，还可以删除用户。<br><br>

### 备注
1.系统不提供邮箱验证、找回密码、修改密码的功能，请在注册时牢记密码。<br>
2.文件夹 PATH 列表<br>
major-selector-final/<br>
|&nbsp;&nbsp;&nbsp; package.json<br>
|&nbsp;&nbsp;&nbsp; README.md<br>
|<br>
+---api<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;       counter.js<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;       delete-user.js<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;       getMajors.js<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;       getPlanFilterOptions.js<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;       getPlans.js<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;       getUniversities.js<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;       login.js<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;       register.js<br>
|<br>
+---public<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;   |&nbsp;&nbsp;&nbsp;   favicon.ico<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;   |&nbsp;&nbsp;&nbsp;   index.html<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;   |&nbsp;&nbsp;&nbsp;   style.css<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;   |<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;   \---js<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;           admin.js<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;           main.js<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;           majors.js<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;           plans.js<br>
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;           universities.js<br>
|<br>
\---_data<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;        universities.csv<br>
