// GET /api/dict - 获取 dict 表所有数据

/**
 * @openapi
 * /api/dict:
 *   get:
 *     summary: 获取字典数据
 *     description: 获取 dicts 表中的所有字典数据
 *     tags:
 *       - Dict
 *     responses:
 *       200:
 *         description: 成功返回字典数据列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccessResponse'
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */

import type { Env, Dict, ApiSuccessResponse, ApiErrorResponse } from '../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    const stmt = env.DB.prepare(`SELECT * FROM dicts;`);
    const result = await stmt.all<Dict>();
    const tables = result.results ?? [];

    const response: ApiSuccessResponse<Dict> = {
      status: 'success',
      tables
    };

    return Response.json(response);
  } catch (error) {
    console.error('API Error:', error);

    const response: ApiErrorResponse = {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };

    return Response.json(response, { status: 500 });
  }
};
