// ikuuu 登录续期（约 7 天一次）：在真实登录页输入账密并完成极验验证码，Cookie 自动入库
// 自包含实现；Scripting 全局类型没有 setInterval/clearInterval，用递归 setTimeout 代替
import { Script, Notification } from "scripting"

const REQUIRED = ["uid", "email", "key", "ip", "expire_in", "session_version"]

// 可选预填：向本机 Storage 写入 ikuuu_email / ikuuu_password 后，登录页自动填表
function jsStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

async function loginFlow(): Promise<string> {
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
        Storage.set("ikuuu_cookie", cookieStr)
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

  // 递归 setTimeout 模拟轮询（每 1.5 秒）
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

  // 你只需要：输入账密（如未预填）→ 完成极验验证码 → 点「登录」
  await webView.present({ navigationTitle: "ikuuu 登录（完成后自动抓取）" })

  stopped = true
  if (timer) clearTimeout(timer)
  webView.dispose()
  return result ?? "未捕获到登录 Cookie，请确认登录成功后重试"
}

async function main() {
  console.log("login starting, env=" + Script.env)
  try {
    Script.exit(await loginFlow())
  } catch (e) {
    Script.exit("login error: " + String(e))
  }
}

main()
