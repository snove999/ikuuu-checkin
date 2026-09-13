// 快捷指令 / 分享面板入口（Script.env === "intent"）：
// 无界面执行签到，结果通过 Script.exit(Intent.text(...)) 返回给快捷指令
// 本文件是项目出现在快捷指令「Run Script」动作里的关键（配合 script.json 的 intentInputTypes）
import { Intent, Script, Notification } from "scripting"
import { checkin } from "./lib"

async function main() {
  console.log("intent starting, env=" + Script.env)
  try {
    const r = await checkin()
    await Notification.schedule({
      title: r.ok ? "ikuuu 签到" : "ikuuu 签到失败",
      body: r.message,
    })
    Script.exit(Intent.text(r.message))
  } catch (e) {
    Script.exit(Intent.text("ikuuu 签到出错：" + String(e)))
  }
}

main()
