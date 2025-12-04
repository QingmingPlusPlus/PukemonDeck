// Cloudflare Pages Functions API 路由
// 这个文件处理所有 /api/* 的请求

interface Env {
  DB: D1Database;      // D1 数据库绑定
  BUCKET: R2Bucket;    // R2 存储桶绑定
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const path = (params.path as string[]) || [];
  
  // 路由分发
  const route = path.join('/');
  
  try {
    // GET /api/dict - 获取 dict 表所有数据
    if (route === 'dict' && request.method === 'GET') {
      const stmt = env.DB.prepare(`
        SELECT * FROM dicts;
      `);
      const result = await stmt.all();
      const tables = result.results ?? [];
      
      return new Response(JSON.stringify({
        status: 'success',
        tables
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // GET /api/images/* - 从 R2 获取图片
    if (path[0] === 'images' && request.method === 'GET') {
      const key = path.slice(1).join('/');

      if (!key) {
        return new Response(JSON.stringify({
          error: 'Missing image key'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const object = await env.BUCKET.get(key);

      if (!object || !object.body) {
        return new Response(JSON.stringify({
          error: 'Image not found',
          key
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Cache-Control', 'public, max-age=86400');
      headers.set('etag', object.httpEtag);

      return new Response(object.body, { headers });
    }
    
    // 未匹配的路由
    return new Response(JSON.stringify({
      error: 'Route not found',
      path: route,
      availableRoutes: [
        'GET /api/dict',
        'GET /api/images/<key>'
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
