// 每日签到入口：供快捷指令「Run Script」后台定时执行，也可在 App 里直接运行
import { Script, Notification } from "scripting"
import { checkin } from "./lib"

async function main() {
  const r = await checkin()
  await Notification.schedule({
    title: r.ok ? "ikuuu 签到" : "ikuuu 签到失败",
    body: r.message,
  })
  Script.exit(r.message)
}

main()
