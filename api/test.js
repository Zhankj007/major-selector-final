// 文件名: api/test.js
export default function handler(request, response) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.status(200).json({ 
        message: "API服务运行正常！可以连接到这里。",
        timestamp: new Date().toISOString() 
    });
}
