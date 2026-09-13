// ikuuu 每日签到（无界面）：快捷指令「Run Script」后台定时执行，也可手动运行
// 自包含实现（不 import 其他文件），避免分布式项目的导入链问题
import { Script, Notification } from "scripting"

const REQUIRED = ["uid", "email", "key", "ip", "expire_in", "session_version"]

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1"

// POST /user/checkin：返回 JSON 但 Content-Type 是 text/html，固定 text() 后再解析
async function checkin(): Promise<{ ok: boolean; message: string }> {
  const cookie = Storage.get<string>("ikuuu_cookie")
  if (!cookie) {
    return { ok: false, message: "尚未保存 Cookie，请先运行 login 登录一次" }
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
    return { ok: false, message: "Cookie 已过期或失效，请运行 login 重新登录（约 7 天一次）" }
  } catch (e) {
    return { ok: false, message: `网络错误：${String(e)}` }
  }
}

async function main() {
  console.log("checkin starting, env =", Script.env)
  try {
    const r = await checkin()
    await Notification.schedule({
      title: r.ok ? "ikuuu 签到" : "ikuuu 签到失败",
      body: r.message,
    })
    Script.exit(r.message)
  } catch (e) {
    Script.exit("checkin error: " + String(e))
  }
}

main()
