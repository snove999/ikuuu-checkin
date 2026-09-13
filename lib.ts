// 共享逻辑（无 JSX）：签到、WebView 登录抓 Cookie、状态读取
// WebViewController / Storage / fetch 为 Scripting 全局 API，无需 import
import { Notification } from "scripting"

export const COOKIE_KEY = "ikuuu_cookie"
export const LAST_RESULT_KEY = "ikuuu_last_result"
// 可选预填：向本机 Storage 写入这两项后，登录页自动填表（不填则在网页里手动输入）
export const EMAIL_KEY = "ikuuu_email"
export const PASSWORD_KEY = "ikuuu_password"

const REQUIRED = ["uid", "email", "key", "ip", "expire_in", "session_version"]

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1"

function jsStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

export type CheckinResult = { ok: boolean; message: string }

// POST /user/checkin：返回 JSON 但 Content-Type 是 text/html，固定 text() 后再解析
export async function checkin(): Promise<CheckinResult> {
  const cookie = Storage.get<string>(COOKIE_KEY)
  let r: CheckinResult
  if (!cookie) {
    r = { ok: false, message: "尚未保存 Cookie，请先运行「登录 / 续期 Cookie」" }
  } else {
    try {
      const resp = await fetch("https://ikuuu.top/user/checkin", {
        method: "POST",
        headers: {
          "Cookie": cookie,
          "User-Agent": UA,
          "Referer": "https://ikuuu.top/user",
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json, text/javascript, */*; q=0.01",
        },
      })
      const text = await resp.text()
      let data: { ret?: number; msg?: string } | null = null
      try {
        data = JSON.parse(text)
      } catch {}
      if (data && typeof data.ret === "number") {
        if (data.ret === 1) {
          r = { ok: true, message: `签到成功：${data.msg ?? ""}` }
        } else if (typeof data.msg === "string" && data.msg.includes("已经签到")) {
          r = { ok: true, message: "今日已签过 ✓" }
        } else {
          r = { ok: false, message: `签到异常：${data.msg ?? text.slice(0, 80)}` }
        }
      } else {
        // Cookie 失效时接口 302 跳到登录页，落在这里的是 HTML
        r = { ok: false, message: "Cookie 已过期或失效，请运行「登录 / 续期 Cookie」（约 7 天一次）" }
      }
    } catch (e) {
      r = { ok: false, message: `网络错误：${String(e)}` }
    }
  }
  // 记录最近一次结果（给小组件 / 排障用）
  try {
    Storage.set(LAST_RESULT_KEY, {
      ok: r.ok,
      message: r.message,
      time: new Date().toLocaleString(),
    })
  } catch {}
  return r
}

// 打开真实登录页：账密在页面上输入（或经 Storage 预填），完成极验验证码并点登录后，
// 自动轮询抓取 6 个 Cookie（getAllCookies 含 HttpOnly），存入 Storage 并通知
export async function loginFlow(): Promise<string> {
  const webView = new WebViewController()
  let timer: any = null
  let stopped = false
  let result: string | null = null

  const harvest = async (): Promise<void> => {
    if (stopped || result !== null) return
    try {
      const cookies = await webView.getAllCookies()
      const map: Record<string, string> = {}
      for (const c of cookies) {
        if (c.domain && c.domain.includes("ikuuu.top")) map[c.name] = c.value
      }
      const ready = REQUIRED.every((n) => map[n] !== undefined)
      const fresh = ready && Number(map.expire_in) * 1000 > Date.now()
      if (ready && fresh) {
        const cookieStr = REQUIRED.map((n) => `${n}=${map[n]}`).join("; ")
        Storage.set(COOKIE_KEY, cookieStr)
        const expireAt = new Date(Number(map.expire_in) * 1000).toLocaleString()
        result = `Cookie 已保存，有效期至 ${expireAt}`
        await Notification.schedule({
          title: "ikuuu Cookie 已更新",
          body: `有效期至 ${expireAt}，期间签到全自动`,
        })
        webView.dismiss()
      }
    } catch {}
  }

  // 递归 setTimeout 模拟轮询（Scripting 全局类型没有 setInterval）
  const scheduleNext = () => {
    if (stopped || result !== null) return
    timer = setTimeout(() => {
      harvest().then(scheduleNext)
    }, 1500)
  }
  scheduleNext()

  try {
    await webView.loadURL("https://ikuuu.top/auth/login")
  } catch (e) {
    stopped = true
    if (timer) clearTimeout(timer)
    webView.dispose()
    return "登录页加载失败：" + String(e)
  }

  // 可选预填：登录页表单由 JS 渲染，轮询填写（最多 15 秒）
  const email = Storage.get<string>(EMAIL_KEY)
  const password = Storage.get<string>(PASSWORD_KEY)
  if (email && password) {
    const script = `(function(){
      var e = document.querySelector('#email');
      var p = document.querySelector('#password');
      if (e && !e.value) e.value = '${jsStr(email)}';
      if (p && !p.value) p.value = '${jsStr(password)}';
      var r = document.querySelector('#remember-me');
      if (r && !r.checked) r.click();
      return 'ok';
    })()`
    ;(async () => {
      for (let i = 0; i < 15; i++) {
        if (stopped || result !== null) return
        try {
          const r = await webView.evaluateJavaScript<string>(script)
          if (r === "ok") return
        } catch {}
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 1000)
        })
      }
    })()
  }

  await webView.present({ navigationTitle: "ikuuu 登录（完成后自动返回）" })

  stopped = true
  if (timer) clearTimeout(timer)
  webView.dispose()
  return result ?? "未捕获到登录 Cookie，请确认登录成功后重试"
}

// 从已存 Cookie 里解析有效期（cookie 字符串本身含 expire_in=秒级时间戳）
export function cookieExpiryText(): string | null {
  const cookie = Storage.get<string>(COOKIE_KEY)
  if (!cookie) return null
  const m = cookie.match(/expire_in=(\d+)/)
  if (!m) return null
  const ts = Number(m[1]) * 1000
  if (ts <= Date.now()) return "已过期"
  return new Date(ts).toLocaleString()
}

// 最近一次签到结果（checkin() 记录）
export type LastStatus = { ok: boolean; message: string; time: string } | null

export function lastStatus(): LastStatus {
  try {
    return Storage.get<LastStatus>(LAST_RESULT_KEY)
  } catch {
    return null
  }
}
