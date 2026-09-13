// 主入口：菜单（在 Scripting 里直接运行本文件）
import { Navigation, VStack, Text, Button, Script, useState } from "scripting"
import { checkin, loginFlow } from "./lib"

function Menu() {
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <VStack>
      <Text>ikuuu 每日签到</Text>
      <Button
        title="立即签到"
        action={async () => setMsg((await checkin()).message)}
      />
      <Button
        title="登录 / 续期 Cookie（约 7 天一次）"
        action={async () => setMsg(await loginFlow())}
      />
      {msg ? <Text>{msg}</Text> : null}
    </VStack>
  )
}

async function main() {
  await Navigation.present({ element: <Menu /> })
  Script.exit()
}

main()
