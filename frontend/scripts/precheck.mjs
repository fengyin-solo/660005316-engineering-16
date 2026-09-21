#!/usr/bin/env node
/**
 * 前端本地开发/构建前置检查（仅依赖 Node 内置模块，可重复执行）。
 *
 *   node scripts/precheck.mjs dev    # dev/preview 前：配置、依赖、端口、后端可达性
 *   node scripts/precheck.mjs build  # 构建前：仅检查配置与依赖
 *
 * 退出码：0 就绪；1 环境错误；2 依赖缺失/安装失败；3 端口被占用。
 */
import { existsSync, copyFileSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mode = process.argv[2] === 'build' ? 'build' : 'dev'

const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', RESET = '\x1b[0m'
const info = (m) => console.log(`${CYAN}[frontend]${RESET} ${m}`)
const ok = (m) => console.log(`${GREEN}[frontend] ✓${RESET} ${m}`)
const warn = (m) => console.log(`${YELLOW}[frontend] !${RESET} ${m}`)
const fail = (m, code = 1, hint) => {
  console.log(`${RED}[frontend] ✗ ${m}${RESET}`)
  if (hint) console.log(`           提示: ${hint}`)
  process.exit(code)
}

// 1) Node 版本
const major = Number(process.versions.node.split('.')[0])
if (Number.isNaN(major) || major < 16) fail(`Node 版本过低: 当前 ${process.versions.node}，需要 >= 16`, 1)
ok(`Node ${process.versions.node}`)

// 2) 配置文件：缺失则从示例复制，保证首次 clone 后流程可重复
const envPath = path.join(ROOT, '.env')
const envExamplePath = path.join(ROOT, '.env.example')
if (!existsSync(envPath)) {
  if (!existsSync(envExamplePath)) fail('缺少 .env 与 .env.example，无法加载联调配置', 1)
  copyFileSync(envExamplePath, envPath)
  info('未发现 .env，已从 .env.example 复制一份（可按需修改端口/代理）')
} else {
  ok('配置文件 .env 已存在')
}

const parseEnv = (file) =>
  existsSync(file)
    ? Object.fromEntries(
        readFileSync(file, 'utf8')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#') && l.includes('='))
          .map((l) => {
            const i = l.indexOf('=')
            return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
          }),
      )
    : {}
const envFile = parseEnv(envPath)
const env = { ...envFile, ...process.env }
const devPort = Number(env.DEV_SERVER_PORT || 3000)
const backendHost = env.VITE_BACKEND_HOST || '127.0.0.1'
const backendPort = Number(env.VITE_BACKEND_PORT || 8000)

// 3) 依赖：关键包不可导入时自动 npm install，绝不静默用一个残缺 node_modules 启动
const requireFromRoot = createRequire(path.join(ROOT, 'package.json'))
let depsOk = true
for (const pkg of ['vite', 'vue', 'typescript']) {
  try {
    requireFromRoot.resolve(pkg)
  } catch {
    depsOk = false
  }
}
if (!depsOk) {
  info('依赖不完整（缺少 node_modules 或关键包），执行 npm install ...')
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const r = spawnSync(npm, ['install', '--no-audit', '--no-fund'], { cwd: ROOT, stdio: 'inherit' })
  if (r.status !== 0) fail('依赖安装失败', 2, '检查网络后重试: npm install')
}
ok('依赖检查通过 (node_modules / vite / vue / typescript)')

const portFree = (port) =>
  new Promise((resolve) => {
    const srv = net.createServer()
    srv.once('error', (err) => resolve(err.code === 'EADDRINUSE' ? false : false))
    srv.once('listening', () => srv.close(() => resolve(true)))
    srv.listen(port, '127.0.0.1')
  })

const tcpReachable = (host, port) =>
  new Promise((resolve) => {
    const sock = net.createConnection({ host, port })
    sock.once('connect', () => { sock.end(); resolve(true) })
    sock.once('error', () => resolve(false))
    sock.setTimeout(2000, () => { sock.destroy(); resolve(false) })
  })

;(async () => {
  if (mode === 'dev') {
    // 4) 自身 dev server 端口：被占用直接失败（vite strictPort 同样会退出，这里提前给出人话提示）
    if (!(await portFree(devPort))) {
      fail(`端口 ${devPort} 已被占用，Vite dev server 无法启动`, 3,
        `释放该端口，或修改 frontend/.env 的 DEV_SERVER_PORT`)
    }
    ok(`dev server 端口 ${devPort} 可用`)

    // 5) 后端可达性：只警告不阻断（可能先后端后前端的启动顺序），但提示必须明确
    if (!(await tcpReachable(backendHost, backendPort))) {
      warn(`后端 ${backendHost}:${backendPort} 当前不可达，/api 与 /ws 代理将无法连通`)
      warn(`请先在 backend/ 下执行: sh scripts/dev.sh（端口以 backend/.env 的 BACKEND_PORT 为准）`)
    } else {
      ok(`后端 ${backendHost}:${backendPort} 可达，代理目标就绪`)
    }
  }
})()
