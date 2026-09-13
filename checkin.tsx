// 每日签到（无 UI）：供快捷指令「Run Script」后台定时执行，也可手动运行
import { Script, Notification } from "scripting"
import { checkin } from "./lib"

async function main() {
  console.log("checkin starting, env=" + Script.env)
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
