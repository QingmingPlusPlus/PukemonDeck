// Cloudflare Pages Functions API 路由
// 这个文件处理所有 /api/* 的请求

interface Env {
  DB: D1Database;      // D1 数据库绑定
  BUCKET: R2Bucket;    // R2 存储桶绑定
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = (params.path as string[]) || [];
  
  // 路由分发
  const route = path.join('/');
  
  try {
    // 示例路由：GET /api/health - 健康检查
    if (route === 'health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        message: 'API is running',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 示例路由：GET /api/db/test - 测试 D1 数据库连接
    if (route === 'db/test' && request.method === 'GET') {
      // 执行简单的 SQL 查询
      const result = await env.DB.prepare('SELECT 1 as test').first();
      
      return new Response(JSON.stringify({
        status: 'success',
        message: 'D1 database connected',
        data: result
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 示例路由：POST /api/r2/upload - 测试 R2 上传
    if (route === 'r2/upload' && request.method === 'POST') {
      const formData = await request.formData();
      const file = formData.get('file') as unknown as File;
      
      if (!file) {
        return new Response(JSON.stringify({
          error: 'No file provided'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 上传到 R2
      const key = `uploads/${Date.now()}-${file.name}`;
      await env.BUCKET.put(key, file.stream());
      
      return new Response(JSON.stringify({
        status: 'success',
        message: 'File uploaded to R2',
        key: key
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 示例路由：GET /api/r2/list - 列出 R2 中的文件
    if (route === 'r2/list' && request.method === 'GET') {
      const objects = await env.BUCKET.list({ limit: 10 });
      
      return new Response(JSON.stringify({
        status: 'success',
        files: objects.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded
        }))
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 未匹配的路由
    return new Response(JSON.stringify({
      error: 'Route not found',
      path: route,
      availableRoutes: [
        'GET /api/health',
        'GET /api/db/test',
        'POST /api/r2/upload',
        'GET /api/r2/list'
      ]
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
