/**
 * OpenAPI 文档生成脚本
 * 扫描带有 @openapi 注释的 API 文件，生成 OpenAPI 3.0 规范文档
 *
 * 用法: node scripts/gen-openapi.mjs
 * 输出: public/openapi.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'PukemonDeck API',
      version: '1.0.0',
      description: 'PukemonDeck 项目 API 接口文档',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: '/',
        description: '当前服务器',
      },
    ],
    tags: [
      {
        name: 'Dict',
        description: '字典数据接口',
      },
      {
        name: 'Images',
        description: '图片资源接口',
      },
    ],
    components: {
      schemas: {
        Dict: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: '主键 ID' },
            raw_id: { type: 'integer', description: '原始 ID' },
            typeCode: { type: 'string', description: '类型代码' },
            dictCode: { type: 'string', description: '字典代码' },
            dictValue: { type: 'string', description: '字典值' },
            dictSort: { type: 'integer', description: '排序' },
            status: { type: 'integer', description: '状态' },
          },
        },
        ApiSuccessResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            tables: { type: 'array', items: { $ref: '#/components/schemas/Dict' } },
          },
        },
        ApiErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', description: '错误类型' },
            message: { type: 'string', description: '错误信息' },
          },
        },
      },
    },
  },
  // 扫描的文件路径
  apis: ['functions/**/*.ts', 'functions/**/*.js'],
};

async function main() {
  console.log('📝 生成 OpenAPI 文档...\n');

  const spec = swaggerJSDoc(options);

  const outDir = 'public';
  const outFile = path.join(outDir, 'openapi.json');

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(spec, null, 2), 'utf8');

  console.log(`✅ 已生成 ${outFile}`);
  console.log(`\n📊 文档统计:`);
  console.log(`   - 路径数: ${Object.keys(spec.paths || {}).length}`);
  console.log(`   - 标签数: ${spec.tags?.length || 0}`);
  console.log(`   - Schema数: ${Object.keys(spec.components?.schemas || {}).length}`);
}

main().catch(console.error);

