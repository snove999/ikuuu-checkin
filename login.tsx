// 登录续期（约 7 天一次）：在真实登录页输入账密并完成极验验证码，Cookie 自动入库
import { Script } from "scripting"
import { loginFlow } from "./lib"

async function main() {
  console.log("login starting, env=" + Script.env)
  try {
    Script.exit(await loginFlow())
  } catch (e) {
    Script.exit("login error: " + String(e))
  }
}

main()
