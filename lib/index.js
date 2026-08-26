/**
 * dsh-app-updater — host half.
 *
 * Loopback-only control surface:
 *   GET  /api/dsh-update/status    -> probe known repos for a newer release
 *   GET  /api/dsh-update/progress  -> live download progress
 *   POST /api/dsh-update/url-check -> validate & probe a user-supplied URL
 *   POST /api/dsh-update/download  -> download (auto source or custom URL) and open
 *
 * Sources (entry config):
 *   sourceType: 'github' (default) or 'npm'
 *   githubRepo / fallbackRepos: which desktop-build repos to probe
 *   downloadsDir: where installers are saved (default ~/Downloads)
 *   mirrors / downloadMirror: GitHub download proxies for fast CN access
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, basename } from 'node:path'
import { spawn } from 'node:child_process'
import { randomUUID, createHash } from 'node:crypto'
import { lookup } from 'node:dns/promises'

export const name = 'dsh-app-updater'
export const inject = ['webServer']

const APP_PLIST = '/Applications/DeepSeek Harness.app/Contents/Info.plist'
const RUNTIME_PKG = '/Applications/DeepSeek Harness.app/Contents/Resources/runtime/package.json'

const DEFAULT_REPOS = [
  'sdkwork-ai/deepseek-harness-desktop',
  'steven-kid/deepseek-harness-desktop',
  'XinXie-Condex/DeepSeek-Harness-Desktop',
  'CSlawyer1985/dsh-desktop',
  'Skyearn/deepseek-harness-app',
  'deepseek-ai/deepseek-harness',
]

/** GitHub release download mirrors usable from mainland China (third-party proxies). */
const DEFAULT_MIRRORS = [
  'https://ghproxy.net/',
  'https://gh-proxy.com/',
  'https://mirror.ghproxy.com/',
  'https://ghfast.top/',
]

/** Hard cap on installer size we are willing to save (1 GiB). */
const MAX_DOWNLOAD_BYTES = 1024 * 1024 * 1024

/** Live state of the active installer download (exposed via /api/dsh-update/progress). */
let activeDownload = null

/* ---------- version helpers ---------- */

function parseSemver(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(String(v).trim())
  if (!m) return undefined
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre: m[4] ? m[4].split('.') : [] }
}

function compareVersions(a, b) {
  const pa = parseSemver(a)
  const pb = parseSemver(b)
  if (!pa && !pb) return 0
  if (!pa) return -1
  if (!pb) return 1
  for (const k of ['major', 'minor', 'patch']) {
    if (pa[k] !== pb[k]) return pa[k] < pb[k] ? -1 : 1
  }
  if (!pa.pre.length && !pb.pre.length) return 0
  if (!pa.pre.length) return 1
  if (!pb.pre.length) return -1
  for (let i = 0; i < Math.max(pa.pre.length, pb.pre.length); i++) {
    const ra = pa.pre[i]
    const rb = pb.pre[i]
    if (ra === undefined) return -1
    if (rb === undefined) return 1
    if (ra === rb) continue
    const na = /^\d+$/.test(ra)
    const nb = /^\d+$/.test(rb)
    if (na && nb) return Number(ra) < Number(rb) ? -1 : 1
    if (na) return -1
    if (nb) return 1
    return ra < rb ? -1 : 1
  }
  return 0
}

function readAppVersion() {
  try {
    const xml = readFileSync(APP_PLIST, 'utf8')
    const m = /CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/.exec(xml)
    if (m) return m[1].trim()
  } catch { /* not a desktop install */ }
  return undefined
}

function readCliVersion() {
  try {
    const pkg = JSON.parse(readFileSync(RUNTIME_PKG, 'utf8'))
    if (typeof pkg.version === 'string') return pkg.version.trim()
  } catch { /* ignore */ }
  return undefined
}

function writeJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'referrer-policy': 'no-referrer' })
  res.end(JSON.stringify(body))
}

/* ---------- fence: loopback-only ---------- */

function isLoopbackHostname(hostname) {
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1' || hostname === '[::1]' || hostname.endsWith('.localhost')
}

function fence(req) {
  const host = req.headers.host
  if (typeof host !== 'string') return false
  try {
    return isLoopbackHostname(new URL('http://' + host).hostname)
  } catch {
    return false
  }
}

/* ---------- GitHub probing ---------- */

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 dsh-app-updater'
const CACHE_TTL_MS = 5 * 60_000
const repoCache = new Map()

async function fetchJson(url, timeoutMs = 12_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json', 'user-agent': UA } })
    if (!response.ok) {
      const hint = response.status === 403 || response.status === 429 ? ' (GitHub 限流，请稍后再试)' : ''
      throw new Error('HTTP ' + response.status + hint)
    }
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

/** Score an asset as a usable installer for this platform; -1 = not usable. */
function assetScore(name, platform) {
  if (/source code/i.test(name)) return -1
  const isMac = platform === 'darwin'
  let s = -1
  if (/\.dmg$/i.test(name)) s = 100
  else if (/\.pkg$/i.test(name)) s = 90
  else if (/\.zip$/i.test(name)) s = 40
  else if (isMac) return -1
  else if (/\.exe$/i.test(name)) s = 85
  else if (/\.AppImage$/i.test(name)) s = 80
  else return -1
  if (/arm64|aarch64|apple.?silicon/i.test(name)) s += 10
  else if (/x64|amd64|intel/i.test(name)) s += 5
  if (/mac|darwin|osx/i.test(name)) s += 5
  return s
}

function pickInstaller(assets, platform) {
  if (!Array.isArray(assets)) return undefined
  let best
  let bestScore = -1
  for (const asset of assets) {
    if (!asset || typeof asset.browser_download_url !== 'string') continue
    const score = assetScore(String(asset.name ?? ''), platform)
    if (score > bestScore) {
      bestScore = score
      best = asset
    }
  }
  return best
}

async function probeRepo(repo, platform) {
  const cached = repoCache.get(repo)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value
  const release = await fetchJson('https://api.github.com/repos/' + repo + '/releases/latest')
  const value = {
    repo,
    latest: String(release.tag_name ?? '').replace(/^v/, ''),
    notes: typeof release.body === 'string' ? release.body : undefined,
    htmlUrl: typeof release.html_url === 'string' ? release.html_url : undefined,
    asset: pickInstaller(release.assets, platform),
  }
  repoCache.set(repo, { at: Date.now(), value })
  return value
}

function repoList(config) {
  const list = []
  const add = (repo) => { if (typeof repo === 'string' && repo.trim() !== '' && !list.includes(repo)) list.push(repo.trim()) }
  if (config.sourceType === 'github') add(config.githubRepo)
  if (Array.isArray(config.fallbackRepos)) config.fallbackRepos.forEach(add)
  DEFAULT_REPOS.forEach(add)
  return list
}

async function checkStatus(config) {
  const current = readAppVersion() ?? readCliVersion() ?? '0.0.0'
  const cli = readCliVersion() ?? current
  const platform = process.platform
  const repos = repoList(config)
  const errors = []
  let found
  for (const repo of repos) {
    try {
      const info = await probeRepo(repo, platform)
      if (info.asset && compareVersions(info.latest, current) > 0) {
        found = info
        break
      }
      if (!info.asset) errors.push(repo + ': 无安装包资源')
      else errors.push(repo + ': 无更新版本')
    } catch (error) {
      errors.push(repo + ': ' + (error instanceof Error ? error.message : String(error)))
    }
  }
  if (!found) {
    return { ok: true, current, cli, latest: null, outdated: false, downloadUrl: null, notes: null, source: 'github', sourceType: 'github', repos, errors }
  }
  return { ok: true, current, cli, latest: found.latest, outdated: true, downloadUrl: found.asset.browser_download_url, assetName: found.asset.name, notes: found.notes, source: 'github:' + found.repo, sourceType: 'github', repo: found.repo, htmlUrl: found.htmlUrl, repos, errors }
}

/* ---------- private-IP / checksum helpers ---------- */

/** True when a literal host is a private / loopback / reserved address. */
function isPrivateIp(ip) {
  if (!ip) return false
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip)
  if (v4) {
    const a = Number(v4[1]), b = Number(v4[2]), c = Number(v4[3]), d = Number(v4[4])
    if (a > 255 || b > 255 || c > 255 || d > 255) return true
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    return false
  }
  const low = String(ip).toLowerCase()
  if (low === '::' || low === '::1') return true
  return /^(fc|fd|fe[89ab])/.test(low) // fc00::/7 + fe80::/10
}

/** Best-effort: does the host resolve to / literally is a private address? */
async function hostIsPrivate(hostname) {
  const host = String(hostname || '').toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (isPrivateIp(host)) return true
  try {
    const { address } = await lookup(host, { family: 0 })
    return isPrivateIp(address)
  } catch {
    return false
  }
}

function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

/** Locate a SHA256SUMS-style file next to the asset and return the expected hash. */
async function findChecksum(url, filename) {
  let candidates = []
  try {
    const u = new URL(url)
    const slash = u.pathname.lastIndexOf('/')
    const dir = slash >= 0 ? u.pathname.slice(0, slash) : ''
    candidates.push(new URL(dir + '/SHA256SUMS', u.origin).href)
    candidates.push(new URL(dir + '/SHA256SUMS.txt', u.origin).href)
  } catch { /* ignore */ }
  candidates.push(url + '.sha256')
  for (const candidate of candidates) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    try {
      const response = await fetch(candidate, { headers: { 'user-agent': UA }, signal: controller.signal })
      if (!response.ok) continue
      const text = await response.text()
      for (const line of text.split(/\r?\n/)) {
        const m = /^([0-9a-fA-F]{64})\s+[* ]?\s*(.+)$/.exec(line.trim())
        if (m && (m[2] === filename || m[2].endsWith('/' + filename))) {
          return { file: candidate, hash: m[1].toLowerCase() }
        }
      }
    } catch { /* try next */ }
    finally { clearTimeout(timer) }
  }
  return undefined
}

/* ---------- URL analysis & security ---------- */

/** Hosts we consider plausible for a DSH installer download (GitHub + its CDN + configured mirrors). */
function trustedHostFor(config, hostname) {
  const host = String(hostname || '').toLowerCase()
  if (host === 'github.com') return true
  if (host === 'objects.githubusercontent.com' || host === 'release-assets.githubusercontent.com' || host.endsWith('.githubusercontent.com')) return true
  for (const mirror of Array.isArray(config.mirrors) ? config.mirrors : DEFAULT_MIRRORS) {
    try { if (new URL(mirror).hostname === host) return true } catch { /* ignore */ }
  }
  return false
}

/** Analyze a user-supplied URL: shape, DSH-likeness, installer type, warnings. */
function analyzeUrl(config, raw) {
  const result = { ok: false, url: raw, warnings: [] }
  let u
  try { u = new URL(String(raw ?? '').trim()) } catch { result.error = '不是合法 URL'; return result }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') result.warnings.push('协议不是 http/https')
  if (u.username || u.password) result.warnings.push('URL 里带了账号密码，已忽略')
  const host = u.hostname.toLowerCase()
  const path = u.pathname
  const filename = basename(path) || ''
  const looksLikeDsh = /dsh|deepseek|harness/i.test(filename + ' ' + path)
  const isInstallerExt = /\.(dmg|pkg|exe|msi|zip|appimage|apk|tar\.gz|tgz)$/i.test(path)
  const trusted = trustedHostFor(config, host)
  if (!trusted) result.warnings.push('主机不在 GitHub/已知镜像列表：' + host)
  if (!looksLikeDsh) result.warnings.push('文件名/路径看不出是 DSH 安装包')
  if (!isInstallerExt) result.warnings.push('不是常见安装包格式（.dmg/.pkg/.exe/.msi/.zip）')
  result.ok = true
  result.privateHost = false
  result.host = host
  result.scheme = u.protocol.replace(':', '')
  result.filename = filename
  result.extension = filename.includes('.') ? filename.split('.').pop().toLowerCase() : ''
  result.looksLikeDsh = looksLikeDsh
  result.isInstallerExt = isInstallerExt
  result.trustedHost = trusted
  return result
}

/** Probe reachability + size of a URL (HEAD first, fall back to small range GET). */
async function probeUrl(url, timeoutMs = 10_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { method: 'HEAD', headers: { 'user-agent': UA }, signal: controller.signal, redirect: 'follow' })
    if (response.ok || response.status === 403 || response.status === 429) {
      const size = Number(response.headers.get('content-length')) || 0
      return { reachable: response.ok, httpStatus: response.status, size, contentType: String(response.headers.get('content-type') || '') }
    }
    return { reachable: false, httpStatus: response.status, size: 0, contentType: '' }
  } catch {
    return { reachable: false, httpStatus: 0, size: 0, contentType: '' }
  } finally {
    clearTimeout(timer)
  }
}

/* ---------- download + open (macOS / Windows / Linux) ---------- */

function candidateUrls(config, url) {
  const list = [url]
  const mirrors = Array.isArray(config.mirrors) && config.mirrors.length > 0 ? config.mirrors : DEFAULT_MIRRORS
  for (const mirror of mirrors) {
    if (typeof mirror !== 'string' || mirror === '') continue
    list.push(mirror + url)
  }
  return list
}

async function probeSpeed(url, timeoutMs = 6000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const start = Date.now()
  try {
    const response = await fetch(url, { headers: { 'user-agent': UA, range: 'bytes=0-1048575' }, signal: controller.signal })
    if (!response.ok && response.status !== 206) return undefined
    const reader = response.body?.getReader()
    if (reader) await reader.read().catch(() => undefined)
    return Date.now() - start
  } catch {
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

async function pickSource(config, url) {
  if (typeof config.downloadMirror === 'string' && config.downloadMirror !== '') return config.downloadMirror + url
  const candidates = candidateUrls(config, url)
  const results = await Promise.all(candidates.map(async (candidate) => ({ candidate, ms: await probeSpeed(candidate) })))
  const reachable = results.filter((item) => item.ms !== undefined).sort((a, b) => a.ms - b.ms)
  return (reachable[0]?.candidate) ?? url
}

/** macOS quarantine so Gatekeeper prompts on first launch. */
function addQuarantine(file, url) {
  if (process.platform !== 'darwin') return
  try {
    const value = '0083;' + randomUUID().replace(/-/g, '') + ';' + url
    const child = spawn('xattr', ['-w', 'com.apple.quarantine', value, file], { stdio: 'ignore' })
    child.on('error', () => {})
  } catch { /* ignore */ }
}

/** Windows Mark-of-the-Web (Zone.Identifier) so SmartScreen prompts. */
function addMotw(file, url) {
  if (process.platform !== 'win32') return
  try {
    const ps = 'Set-Content -LiteralPath ' + JSON.stringify(file) + ' -Stream Zone.Identifier -Value @("[ZoneTransfer]", "ZoneId=3", "ReferrerUrl=' + url + '", "HostUrl=' + url + '")'
    const child = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'ignore', windowsHide: true })
    child.on('error', () => {})
  } catch { /* ignore */ }
}

/** Open the installer with the platform default handler. */
function openInstaller(file) {
  if (process.platform === 'darwin') return spawn('open', [file], { stdio: 'ignore' })
  if (process.platform === 'win32') return spawn('cmd', ['/c', 'start', '', file], { stdio: 'ignore', windowsHide: true })
  return spawn('xdg-open', [file], { stdio: 'ignore' })
}

async function downloadAndOpen(config, url, name) {
  const source = await pickSource(config, url)
  const response = await fetch(source, { headers: { 'user-agent': UA } })
  if (!response.ok) throw new Error('download failed: HTTP ' + response.status + (response.status === 403 ? '（GitHub 拒绝访问或限流）' : ''))
  const total = Number(response.headers.get('content-length')) || 0
  if (total > MAX_DOWNLOAD_BYTES) throw new Error('文件过大（>1 GiB），已拒绝下载')
  const reader = typeof response.body !== 'undefined' && response.body !== null ? response.body.getReader() : undefined
  const chunks = []
  let done = 0
  activeDownload = { phase: 'downloading', done: 0, total, fileName: name ?? null }
  if (reader !== undefined) {
    for (;;) {
      const step = await reader.read()
      if (step.done) break
      chunks.push(step.value)
      done += step.value.length
      if (done > MAX_DOWNLOAD_BYTES) throw new Error('文件过大（>1 GiB），已中止下载')
      activeDownload.done = done
    }
  } else {
    const whole = Buffer.from(await response.arrayBuffer())
    chunks.push(whole)
    done = whole.length
    activeDownload.done = done
  }
  const buffer = Buffer.concat(chunks)
  const sha256 = sha256Hex(buffer)
  let checksumVerified = null
  let fileName = name
  if (!fileName || !/\.[A-Za-z0-9]+$/.test(fileName)) {
    try { fileName = basename(new URL(url).pathname) } catch { fileName = '' }
  }
  if (!fileName || !/\.[A-Za-z0-9]+$/.test(fileName)) fileName = 'dsh-update-installer'
  const dir = typeof config.downloadsDir === 'string' && config.downloadsDir !== '' ? config.downloadsDir : join(homedir(), 'Downloads')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, fileName)
  const expected = await findChecksum(url, fileName)
  if (expected) {
    if (expected.hash === sha256) { checksumVerified = true }
    else {
      activeDownload = { phase: 'failed', done, total, fileName, error: 'checksum-mismatch' }
      throw new Error('校验和不匹配，已拒绝下载：预期 ' + expected.hash + '，实际 ' + sha256)
    }
  }
  activeDownload = { phase: 'saving', done, total, fileName }
  writeFileSync(file, buffer)
  addQuarantine(file, source)
  addMotw(file, source)
  let opened = false
  await new Promise((resolve, reject) => {
    const child = openInstaller(file)
    child.on('error', (error) => { if (process.platform !== 'darwin') reject(error) })
    child.on('close', (code) => {
      if (process.platform === 'darwin') { if (code === 0) { opened = true; resolve() } else reject(new Error('open exited ' + String(code))) }
      else { opened = true; resolve() }
    })
  })
  activeDownload = { phase: 'done', done, total, fileName, file, opened }
  return { file, bytes: done, opened, sha256, checksumVerified }
}

/* ---------- plugin ---------- */

export function apply(ctx, rawConfig = {}) {
  const config = rawConfig ?? {}
  const routes = [
    {
      kind: 'exact',
      path: '/api/dsh-update/status',
      handler: async (req, res) => {
        if (req.method !== 'GET') { res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' }); res.end('method not allowed'); return }
        if (!fence(req)) { writeJson(res, 403, { ok: false, code: 'forbidden' }); return }
        try {
          writeJson(res, 200, await checkStatus(config))
        } catch (error) {
          writeJson(res, 200, { ok: true, current: readAppVersion() ?? readCliVersion() ?? '0.0.0', cli: readCliVersion() ?? '', latest: null, outdated: false, downloadUrl: null, notes: null, source: 'error', sourceType: 'github', error: error instanceof Error ? error.message : String(error) })
        }
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-update/progress',
      handler: async (req, res) => {
        if (req.method !== 'GET') { res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' }); res.end('method not allowed'); return }
        if (!fence(req)) { writeJson(res, 403, { ok: false, code: 'forbidden' }); return }
        writeJson(res, 200, activeDownload ?? { phase: 'idle' })
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-update/url-check',
      handler: async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' }); res.end('method not allowed'); return }
        if (!fence(req)) { writeJson(res, 403, { ok: false, code: 'forbidden' }); return }
        let body
        try {
          let raw = ''
          for await (const chunk of req) { raw += chunk; if (raw.length > 8192) throw new Error('body too large') }
          body = JSON.parse(raw)
        } catch { writeJson(res, 400, { ok: false, error: '请求体无效' }); return }
        const url = typeof body.url === 'string' ? body.url.trim() : ''
        if (url === '') { writeJson(res, 400, { ok: false, error: '缺少 url' }); return }
        const analysis = analyzeUrl(config, url)
        if (!analysis.ok) { writeJson(res, 200, { ok: true, ...analysis }); return }
        const privateHost = await hostIsPrivate(new URL(url).hostname).catch(() => false)
        if (privateHost) analysis.warnings.push('指向本机/内网地址，已禁止下载')
        const probe = await probeUrl(url)
        writeJson(res, 200, { ok: true, ...analysis, privateHost, ...probe })
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-update/download',
      handler: async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' }); res.end('method not allowed'); return }
        if (!fence(req)) { writeJson(res, 403, { ok: false, code: 'forbidden' }); return }
        try {
          // optional custom URL from the client
          let customUrl
          try {
            let raw = ''
            for await (const chunk of req) { raw += chunk; if (raw.length > 8192) throw new Error('too large') }
            if (raw !== '') { const parsed = JSON.parse(raw); if (parsed && typeof parsed.url === 'string' && parsed.url.trim() !== '') customUrl = parsed.url.trim() }
          } catch { /* no/body invalid -> fall back to auto */ }
          if (customUrl) {
            const analysis = analyzeUrl(config, customUrl)
            if (!analysis.ok) { writeJson(res, 400, { ok: false, error: analysis.error || 'URL 无效' }); return }
            const privateHost = await hostIsPrivate(new URL(customUrl).hostname).catch(() => false)
            if (privateHost) { writeJson(res, 400, { ok: false, error: '禁止下载本机/内网地址' }); return }
            if (analysis.warnings.length > 0 && analysis.warnings.some((w) => !/账号密码|协议不是/.test(w))) {
              // do not hard-block; the client shows warnings + confirmation first
            }
            const result = await downloadAndOpen(config, customUrl, analysis.filename || undefined)
            writeJson(res, 200, { ok: true, ...result, url: customUrl })
            return
          }
          const status = await checkStatus(config)
          if (!status.outdated || !status.downloadUrl) { writeJson(res, 409, { ok: false, code: 'nothing-to-download', error: '没有找到可下载的更新安装包' }); return }
          const result = await downloadAndOpen(config, status.downloadUrl, status.assetName)
          writeJson(res, 200, { ok: true, ...result, repo: status.repo })
        } catch (error) {
          writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
        }
      },
    },
  ]
  ctx.effect(() => routes.map(route => ctx.webServer.register(route)), 'dsh-app-updater: routes')
}