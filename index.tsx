// 主入口：菜单（项目里点 ▶ 运行的就是本文件，Script.env === "index"）
import { Navigation, NavigationStack, Script, Text, Button, VStack, useState } from "scripting"
import { checkin, loginFlow, cookieExpiryText, lastStatus } from "./lib"

function Menu() {
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const expiry = cookieExpiryText() ?? "未登录"
  const last = lastStatus()
  return (
    <NavigationStack>
      <VStack navigationTitle={"ikuuu 每日签到"} spacing={12} padding={20}>
        <Text>Cookie 有效期：{expiry}</Text>
        {last ? <Text>上次签到：{last.message}（{last.time}）</Text> : null}
        <Button
          title="立即签到"
          action={async () => {
            setBusy(true)
            try {
              setMsg((await checkin()).message)
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
  console.log("index starting, env=" + Script.env)
  try {
    await Navigation.present({ element: <Menu /> })
  } catch (e) {
    console.error("index error: " + String(e))
  }
  Script.exit()
}

main()
