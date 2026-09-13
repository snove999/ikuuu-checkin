// 主入口：菜单（项目里点 ▶ 运行的就是本文件，Script.env === "index"）
// 自包含实现（不 import 其他文件）
import { Navigation, NavigationStack, Script, Text, Button, VStack, useState } from "scripting"

const REQUIRED = ["uid", "email", "key", "ip", "expire_in", "session_version"]

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1"

async function checkin(): Promise<string> {
  const cookie = Storage.get<string>("ikuuu_cookie")
  if (!cookie) return "尚未保存 Cookie，请先点「登录 / 续期 Cookie」"
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
      if (data.ret === 1) return `签到成功：${data.msg ?? ""}`
      if (typeof data.msg === "string" && data.msg.includes("已经签到")) {
        return "今日已签过 ✓"
      }
      return `签到异常：${data.msg ?? text.slice(0, 80)}`
    }
    return "Cookie 已过期或失效，请点「登录 / 续期 Cookie」"
  } catch (e) {
    return `网络错误：${String(e)}`
  }
}

function jsStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

async function loginFlow(): Promise<string> {
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
      if (Number(map.expire_in) * 1000 <= Date.now()) return false
      done = true
      if (timer) clearInterval(timer)
      const cookieStr = REQUIRED.map((n) => `${n}=${map[n]}`).join("; ")
      Storage.set("ikuuu_cookie", cookieStr)
      const expireAt = new Date(Number(map.expire_in) * 1000).toLocaleString()
      webView.dismiss()
      return `Cookie 已保存，有效期至 ${expireAt}`
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

  await webView.present({ navigationTitle: "ikuuu 登录（完成后自动返回）" })

  if (timer) clearInterval(timer)
  webView.dispose()
  if (!done) return "未捕获到登录 Cookie，请确认登录成功后重试"
  return "Cookie 已保存，每日签到自动进行（约 7 天后需重新登录续期）"
}

function Menu() {
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <NavigationStack>
      <VStack navigationTitle={"ikuuu 每日签到"} spacing={12} padding={20}>
        <Button
          title="立即签到"
          action={async () => {
            setBusy(true)
            try {
              setMsg(await checkin())
            } finally {
              setBusy(false)
            }
          }}
        />
        <Button
          title="登录 / 续期 Cookie（约 7 天一次）"
          action={async () => {
            setBusy(true)
            try {
              setMsg(await loginFlow())
            } finally {
              setBusy(false)
            }
          }}
        />
        {busy ? <Text>处理中…</Text> : null}
        {msg ? <Text>{msg}</Text> : null}
      </VStack>
    </NavigationStack>
  )
}

async function main() {
  console.log("index starting, env =", Script.env)
  try {
    await Navigation.present({ element: <Menu /> })
  } catch (e) {
    console.error("index error:", String(e))
  }
  Script.exit()
}

main()
