// GET /api/images/* - 从 R2 获取图片

interface Env {
  BUCKET: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const keyParts = params.key as string[];
  const key = keyParts?.join('/');

  try {
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
