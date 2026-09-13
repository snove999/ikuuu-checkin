# ikuuu-checkin（Scripting App）

[ikuuu.top](https://ikuuu.top) 每日自动签到的 [Scripting](https://scriptingapp.github.io/guide/Quick%20Start) 脚本项目。

## 原理

- **签到**：`POST /user/checkin`，携带本机 `Storage` 里保存的登录 Cookie，解析返回的 `ret`/`msg` 并弹系统通知。
- **登录续期**：ikuuu 登录强制极验 GeeTest v4 人机验证，**账密纯 API 登录不可行**（无验证码实测返回 `captcha_failed`）。所以用脚本内嵌 `WebViewController` 打开真实登录页：你输入账密、完成一次验证码、点登录，脚本自动轮询抓取全部 6 个 Cookie（`getAllCookies()` 含 HttpOnly）存入本机 `Storage`。Cookie 有效期 7 天（服务端不绑 IP，蜂窝/Wi-Fi 均可签到）。

> 人工参与被压缩到 **约每 7 天一次**（跑一次登录续期），其余每天全自动。

## 导入

**方式一**：iPhone 上在浏览器/备忘录里打开下面的链接（需已安装 Scripting）：

```
scripting://import_scripts?urls=https%3A%2F%2Fgithub.com%2Fsnove999%2Fikuuu-checkin
```

**方式二**：Scripting App → 首页右上角 **＋** → **Import** → 粘贴仓库地址：

```
https://github.com/snove999/ikuuu-checkin
```

导入后 Scripting 会记录 `remoteResource`，仓库更新后可在 App 里拉取更新（也可在 `script.json` 的 `autoUpdateInterval` 配置自动更新）。

## 使用

1. 打开项目运行 **`index.tsx`**（或直接运行 `login.tsx`）→ 点「登录 / 续期 Cookie」→ 在登录页输入账密、完成极验验证码、点登录 → 收到「Cookie 已更新」通知即完成
   - 可选免输入：在任意脚本里执行 `Storage.set("ikuuu_email","你的邮箱")` 和 `Storage.set("ikuuu_password","你的密码")`（仅存本机），之后登录页自动填表
2. iOS 快捷指令 → 自动化 → **特定时间**（如每天 09:00）→ 添加动作 **Scripting → Run Script**（后台执行无 UI）→ 选择本项目的 **`checkin`** → 关闭「运行前询问」
3. 完成。每天自动签到并通知结果；Cookie 过期时签到通知会提醒你重新跑一次登录续期

## 文件结构

| 文件 | 说明 |
|---|---|
| `index.tsx` | 主入口：菜单（立即签到 / 登录续期） |
| `checkin.tsx` | 签到入口（快捷指令 Run Script 用，无 UI） |
| `login.tsx` | 登录续期入口（无 UI，跑完退出） |
| `lib.tsx` | 共享逻辑（签到 fetch、WebView 登录抓 Cookie、Storage） |
| `script.json` | Scripting 项目清单（导入后 app 自动补 `remoteResource`） |

## 隐私

- 仓库内**不含任何账号信息**；账密（可选）与 Cookie 仅存在你手机本机的 Scripting `Storage` 中
- Cookie 等价于登录态，请勿泄露；如怀疑泄露，在网站上退出登录即可使其全部失效

## 免责声明

仅供个人学习与自动化个人账号签到使用，请遵守目标网站的服务条款。
