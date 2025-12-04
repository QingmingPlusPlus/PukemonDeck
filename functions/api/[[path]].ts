// Cloudflare Pages Functions API 路由
// 这个文件处理所有 /api/* 的请求

interface Env {
  DB: D1Database;      // D1 数据库绑定
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const path = (params.path as string[]) || [];
  
  // 路由分发
  const route = path.join('/');
  
  try {
    // GET /api/dict - 获取 dict 表所有数据
    if (route === 'dict' && request.method === 'GET') {
      const result = await env.DB.prepare('SELECT * FROM dict').all();
      
      return new Response(JSON.stringify({
        status: 'success',
        data: result.results
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 未匹配的路由
    return new Response(JSON.stringify({
      error: 'Route not found',
      path: route,
      availableRoutes: [
        'GET /api/dict'
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
