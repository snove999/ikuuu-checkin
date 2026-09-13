// 共享逻辑：签到（fetch + Cookie 头）与登录（WebView 抓取 Cookie）
// WebViewController / Storage / fetch 为 Scripting 全局 API，无需 import
import { Notification } from "scripting"

export const COOKIE_KEY = "ikuuu_cookie"
// 可选：向本机 Storage 写入这两项后，登录页会自动填表（不填则在网页里手动输入）
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
  if (!cookie) {
    return { ok: false, message: "尚未保存 Cookie，请先运行「登录 / 续期 Cookie」" }
  }
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
      if (data.ret === 1) return { ok: true, message: `签到成功：${data.msg ?? ""}` }
      if (typeof data.msg === "string" && data.msg.includes("已经签到")) {
        return { ok: true, message: "今日已签过 ✓" }
      }
      return { ok: false, message: `签到异常：${data.msg ?? text.slice(0, 80)}` }
    }
    // Cookie 失效时接口 302 跳到登录页，落在这里的是 HTML
    return { ok: false, message: "Cookie 已过期或失效，请运行「登录 / 续期 Cookie」（约 7 天一次）" }
  } catch (e) {
    return { ok: false, message: `网络错误：${String(e)}` }
  }
}

// 打开真实登录页：账密在页面上输入（或经 Storage 预填），完成极验验证码并点登录后，
// 自动轮询抓取 6 个 Cookie（getAllCookies 含 HttpOnly），存入 Storage 并通知
export async function loginFlow(): Promise<string> {
  const webView = new WebViewController()
  let timer: any = null
  let done = false

  const harvest = async (): Promise<boolean> => {
    if (done) return true
    try {
      const cookies = await webView.getAllCookies()
      const map: Record<string, string> = {}
      for (const c of cookies) {
        if (c.domain && c.domain.includes("ikuuu.top")) map[c.name] = c.value
      }
      if (!REQUIRED.every((n) => map[n] !== undefined)) return false
      // 之前会话遗留的过期 Cookie 不算数
      if (Number(map.expire_in) * 1000 <= Date.now()) return false
      done = true
      if (timer) clearInterval(timer)
      const cookieStr = REQUIRED.map((n) => `${n}=${map[n]}`).join("; ")
      Storage.set(COOKIE_KEY, cookieStr)
      const expireAt = new Date(Number(map.expire_in) * 1000).toLocaleString()
      await Notification.schedule({
        title: "ikuuu Cookie 已更新",
        body: `有效期至 ${expireAt}，期间签到全自动`,
      })
      webView.dismiss()
      return true
    } catch {
      return false
    }
  }

  timer = setInterval(harvest, 1500)

  try {
    await webView.loadURL("https://ikuuu.top/auth/login")
  } catch {
    if (timer) clearInterval(timer)
    webView.dispose()
    return "登录页加载失败，请检查网络后重试"
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
        try {
          const r = await webView.evaluateJavaScript<string>(script)
          if (r === "ok") return
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    })()
  }

  // 你只需要：输入账密（如未预填）→ 完成极验验证码 → 点「登录」
  await webView.present({ navigationTitle: "ikuuu 登录（完成后自动抓取）" })

  if (timer) clearInterval(timer)
  webView.dispose()
  if (!done) return "未捕获到登录 Cookie，请确认登录成功后重试"
  return "Cookie 已保存，每日签到自动进行（约 7 天后需重新登录续期）"
}
