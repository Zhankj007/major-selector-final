export default async function handler(request, response) {
    const universitySheetUrl = process.env.SHEET_URL_UNIVERSITIES;

    // 1. 检查环境变量是否存在
    if (!universitySheetUrl) {
        return response.status(500).json({ 
            testStatus: "失败",
            reason: "配置错误",
            details: "在Vercel的环境变量中没有找到'SHEET_URL_UNIVERSITIES'。请检查是否已添加或名称是否有误。",
            solution: "请登录Vercel，在您的项目设置(Settings) -> 环境变量(Environment Variables)中，添加名为'SHEET_URL_UNIVERSITIES'的变量，并将您的高校库Google Sheet CSV链接作为其值。"
        });
    }

    try {
        // 2. 尝试连接链接，并设置一个8秒的超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

        console.log(`Testing connection to: ${universitySheetUrl}`);
        const fetchResponse = await fetch(universitySheetUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        // 3. 检查链接返回的状态
        if (fetchResponse.ok) {
            // 如果状态码是2xx，说明链接有效且可访问
            return response.status(200).json({
                testStatus: "成功",
                reason: "网络连接正常",
                details: `您的服务器已成功连接到Google Sheet链接，并收到了成功的响应 (状态码: ${fetchResponse.status})。`,
                conclusion: "这表明配置和网络均无问题。之前加载失败极有可能是因为3000多条数据量过大，导致程序在下载和处理数据时超出Vercel的10秒运行时间限制而超时。建议采用‘本地数据源方案’。",
                urlTested: universitySheetUrl
            });
        } else {
            // 如果状态码是4xx或5xx，说明链接本身或权限有问题
            return response.status(400).json({
                testStatus: "失败",
                reason: "链接或权限错误",
                details: `服务器虽然连接上了，但Google Sheet链接返回了一个错误状态码: ${fetchResponse.status} ${fetchResponse.statusText}。`,
                solution: "请重点检查您的Google Sheet分享设置：1. 确认您使用的是‘发布到网络(Publish to web)’功能，而不是普通的‘分享(Share)’。 2. 确认发布的格式是 CSV。 3. 确认链接没有被停止发布。",
                urlTested: universitySheetUrl
            });
        }
    } catch (error) {
        // 4. 捕获其他网络错误，如DNS问题或超时
        return response.status(500).json({
            testStatus: "失败",
            reason: "网络连接超时或失败",
            details: `您的服务器在尝试访问Google Sheet链接时发生错误。这可能是因为链接地址不正确、DNS问题，或者网络连接在8秒内没有响应（超时）。错误信息: ${error.message}`,
            solution: "请检查您在Vercel环境变量中设置的URL地址是否拼写正确，是否可以从浏览器直接访问。",
            urlTested: universitySheetUrl
        });
    }
}