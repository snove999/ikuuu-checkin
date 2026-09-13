// 桌面小组件（Script.env === "widget"）：显示 Cookie 有效期与最近一次签到状态
// 规则（照抄官方实践）：任何情况都必须走到 Widget.present，且 present 之后不放代码
import { Widget, VStack, Text } from "scripting"
import { cookieExpiryText, lastStatus } from "./lib"

function WidgetView() {
  let expiry = "未登录"
  let lastLine = "尚未签到"
  try {
    expiry = cookieExpiryText() ?? "未登录"
    const last = lastStatus()
    if (last) lastLine = `${last.message}（${last.time}）`
  } catch {}
  return (
    <VStack alignment={"leading"}>
      <Text>ikuuu 签到</Text>
      <Text>Cookie：{expiry}</Text>
      <Text>{lastLine}</Text>
    </VStack>
  )
}

try {
  Widget.present(<WidgetView />)
} catch (e) {
  console.error("widget error: " + String(e))
}
