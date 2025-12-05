/**
 * 路由收集脚本
 * 扫描 Cloudflare Pages Functions 目录，自动生成 API 路由清单
 *
 * 用法: node scripts/collect-routes.mjs
 * 输出: api.routes.json, api.routes.md
 */

import fg from 'fast-glob';
import fs from 'node:fs/promises';
import path from 'node:path';

const FUNCTIONS_ROOT = 'functions';
const OUT_JSON = 'api.routes.json';
const OUT_MD = 'api.routes.md';

/**
 * 从源代码中提取支持的 HTTP 方法
 */
function extractHttpMethods(source) {
  const methods = new Set();

  // 匹配 onRequestGet, onRequestPost 等
  const namedRe = /export\s+(?:const|function)\s+onRequest(Get|Post|Put|Delete|Patch|Head|Options)\b/gi;
  let match;
  while ((match = namedRe.exec(source))) {
    methods.add(match[1].toUpperCase());
  }

  // 匹配通用 onRequest（支持所有方法）
  if (/export\s+(?:const|function)\s+onRequest\s*[=:]/i.test(source)) {
    ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].forEach(m => methods.add(m));
  }

  return Array.from(methods).sort();
}

/**
 * 将文件路径转换为 API 路由路径
 */
function fileToRoute(file) {
  let rel = path.relative(FUNCTIONS_ROOT, file).replace(/\\/g, '/');

  // 移除扩展名
  rel = rel.replace(/\.(ts|js)$/i, '');

  // 处理 index 文件
  if (rel.endsWith('/index')) {
    rel = rel.slice(0, -'/index'.length) || '';
  }
  if (rel === 'index') {
    rel = '';
  }

  // 处理动态路由 [id] -> :id
  rel = rel.replace(/\[([^\]]+)\]/g, ':$1');

  // 处理通配符路由 [[key]] -> :key*
  rel = rel.replace(/::\[([^\]]+)\]/g, ':$1*');
  rel = rel.replace(/:\[([^\]]+)\]/g, ':$1');

  // 确保以 / 开头
  return '/' + rel;
}

/**
 * 从源代码提取描述注释
 */
function extractDescription(source) {
  const match = source.match(/^\/\/\s*(.+?)\s*(?:\r?\n|$)/m);
  if (match && !match[1].includes('filepath:')) {
    return match[1];
  }

  const descMatch = source.match(/\/\/\s*(?:GET|POST|PUT|DELETE|PATCH)\s+\S+\s*-\s*(.+)/i);
  return descMatch ? descMatch[1].trim() : '';
}

async function main() {
  console.log('🔍 扫描 API 路由...\n');

  const files = await fg(`${FUNCTIONS_ROOT}/**/*.{ts,js}`, {
    ignore: ['**/_*.*', '**/*.d.ts', '**/node_modules/**', '**/.*/**', '**/types/**'],
    onlyFiles: true,
  });

  const routes = [];

  for (const file of files) {
    const source = await fs.readFile(file, 'utf8');
    const methods = extractHttpMethods(source);

    if (methods.length === 0) continue;

    const route = {
      path: fileToRoute(file),
      methods,
      file: file.replace(/\\/g, '/'),
      description: extractDescription(source),
    };

    routes.push(route);
    console.log(`  ✅ ${route.path} [${route.methods.join(', ')}]`);
  }

  routes.sort((a, b) => a.path.localeCompare(b.path));

  // 输出 JSON
  await fs.writeFile(OUT_JSON, JSON.stringify(routes, null, 2), 'utf8');

  // 输出 Markdown
  const mdContent = [
    '# API 路由清单',
    '',
    `> 自动生成于 ${new Date().toLocaleString('zh-CN')}`,
    '',
    '## 接口列表',
    '',
    '| 路径 | 方法 | 描述 | 文件 |',
    '| --- | --- | --- | --- |',
    ...routes.map(r =>
      `| \`${r.path}\` | ${r.methods.join(', ')} | ${r.description} | \`${r.file}\` |`
    ),
    '',
    '## 详细说明',
    '',
    ...routes.map(r => [
      `### ${r.methods.join('/')} \`${r.path}\``,
      '',
      r.description ? `${r.description}` : '_暂无描述_',
      '',
      `- **文件**: \`${r.file}\``,
      '',
    ].join('\n')),
  ].join('\n');

  await fs.writeFile(OUT_MD, mdContent, 'utf8');

  console.log(`\n📄 已生成 ${OUT_JSON}`);
  console.log(`📄 已生成 ${OUT_MD}`);
  console.log(`\n共计 ${routes.length} 个 API 端点`);
}

main().catch(console.error);

