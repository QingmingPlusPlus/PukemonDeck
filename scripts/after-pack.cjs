/* eslint-disable @typescript-eslint/no-require-imports */
const { copyFileSync, existsSync, mkdirSync, statSync } = require('fs')
const { join } = require('path')

/**
 * electron-builder afterPack 钩子。
 *
 * 卡牌库属于外部数据，不纳入 git，也不打进 app.asar：
 * better-sqlite3 是原生模块，无法读取 asar 内的文件。
 * 这里在应用目录打包完成后，把 data/deck.db 拷贝到：
 *   Windows / Linux: <appOutDir>/resources/db/deck.db
 *   macOS:           <appOutDir>/<ProductName>.app/Contents/Resources/db/deck.db
 *
 * 之后生成的安装包会包含该文件；安装后也可以直接替换它来更新卡牌数据。
 * 若源文件不存在则不报错，安装包将不含卡牌数据；应用启动后显示导入页，
 * 用户可以手动导入数据库。
 */
module.exports = async function afterPack(context) {
  const source = join(context.packager.projectDir, 'data', 'deck.db')
  if (!existsSync(source)) {
    // 卡牌库不随代码走，允许缺失（例如他人 clone 后直接打包）。
    // 应用启动时会显示导入页，用户可以手动导入卡牌数据。
    console.warn(`  • card database  MISSING: ${source}（安装包将不含卡牌数据）`)
    return
  }

  const resourcesDir =
    context.electronPlatformName === 'darwin'
      ? join(
          context.appOutDir,
          `${context.packager.appInfo.productFilename}.app`,
          'Contents',
          'Resources'
        )
      : join(context.appOutDir, 'resources')

  const targetDir = join(resourcesDir, 'db')
  const target = join(targetDir, 'deck.db')

  mkdirSync(targetDir, { recursive: true })
  copyFileSync(source, target)

  const size = (statSync(target).size / 1024 / 1024).toFixed(1)
  console.log(`  • card database  ${target} (${size} MB)`)
}
