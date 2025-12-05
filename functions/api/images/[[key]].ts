// GET /api/images/* - 从 R2 获取图片

/**
 * @openapi
 * /api/images/{key}:
 *   get:
 *     summary: 获取图片
 *     description: 从 R2 存储中获取指定路径的图片资源
 *     tags:
 *       - Images
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         description: 图片路径（支持多级路径，如 folder/image.png）
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功返回图片
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: 缺少图片路径参数
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Missing image key
 *       404:
 *         description: 图片不存在
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Image not found
 *                 key:
 *                   type: string
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */

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
