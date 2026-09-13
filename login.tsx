// ikuuu 登录续期（约 7 天一次）：在真实登录页输入账密并完成极验验证码，Cookie 自动入库
// 自包含实现（不 import 其他文件）
import { Script, Notification } from "scripting"

const REQUIRED = ["uid", "email", "key", "ip", "expire_in", "session_version"]

// 可选预填：向本机 Storage 写入 ikuuu_email / ikuuu_password 后，登录页自动填表
function jsStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

async function loginFlow(): Promise<string> {
  const webView = new WebViewController()
  let timer: any = null
  let done = false

  // 登录成功后 6 个 Cookie 就位（getAllCookies 含 HttpOnly）；
  // 校验 expire_in 新鲜度，过滤掉旧会话遗留
  const harvest = async (): Promise<boolean> => {
    if (done) return true
    try {
      const cookies = await webView.getAllCookies()
      const map: Record<string, string> = {}
      for (const c of cookies) {
        if (c.domain && c.domain.includes("ikuuu.top")) map[c.name] = c.value
      }
      if (!REQUIRED.every((n) => map[n] !== undefined)) return false
      if (Number(map.expire_in) * 1000 <= Date.now()) return false
      done = true
      if (timer) clearInterval(timer)
      const cookieStr = REQUIRED.map((n) => `${n}=${map[n]}`).join("; ")
      Storage.set("ikuuu_cookie", cookieStr)
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
  } catch (e) {
    if (timer) clearInterval(timer)
    webView.dispose()
    return "登录页加载失败：" + String(e)
  }

  // 可选预填：登录页表单由 JS 渲染，轮询填写（最多 15 秒）
  const email = Storage.get<string>("ikuuu_email")
  const password = Storage.get<string>("ikuuu_password")
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

async function main() {
  console.log("login starting, env =", Script.env)
  try {
    Script.exit(await loginFlow())
  } catch (e) {
    Script.exit("login error: " + String(e))
  }
}

main()
