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

**方式三（完全兜底）**：Scripting 新建空项目 `ikuuu`，把本仓库 4 个 `.tsx` 文件逐一新建同名文件、复制粘贴内容。任何导入异常时用这个。

导入后 Scripting 会记录 `remoteResource`，仓库更新后可在 App 里拉取更新。

## 使用

1. 打开项目运行 **`index.tsx`**（或直接运行 `login.tsx`）→ 点「登录 / 续期 Cookie」→ 在登录页输入账密、完成极验验证码、点登录 → 页面显示"Cookie 已保存，有效期至 …"即完成
   - 可选免输入：在任意脚本里执行 `Storage.set("ikuuu_email","你的邮箱")` 和 `Storage.set("ikuuu_password","你的密码")`（仅存本机），之后登录页自动填表
2. iOS 快捷指令 → 自动化 → **特定时间**（如每天 09:00）→ 添加动作 **Scripting → Run Script**（后台执行无 UI）→ 选择本项目的 **`checkin`** → 关闭「运行前询问」
3. 完成。每天自动签到并通知结果；Cookie 过期时签到通知会提醒你重新跑一次登录续期

## 排障：点了没反应？

1. 确认导入的文件都在**项目根目录**且能看到 `index.tsx`（有些导入失败会只剩空壳 → 用方式三重建）
2. 打开 `index.tsx`，点编辑器里的 **▶** 运行（不是在项目列表里点）
3. 运行无 UI 时看 **控制台/日志面板**：脚本开头会打印 `index starting, env = index`；有报错会显示 `index error: …`
4. 通知不弹：首次运行允许 Scripting 的通知权限
5. 仍不行：删掉项目，用方式三手动重建

## 文件结构

| 文件 | 说明 |
|---|---|
| `index.tsx` | 主入口：菜单（立即签到 / 登录续期），自包含 |
| `checkin.tsx` | 签到入口（快捷指令 Run Script 用，无 UI），自包含 |
| `login.tsx` | 登录续期入口（无 UI，跑完退出），自包含 |
| `script.json` | Scripting 项目清单（`runInApp: true`；导入后 app 自动补 `remoteResource`） |

三个入口文件均不互相 import，单独复制任何一个到别的项目也能用。

## 隐私

- 仓库内**不含任何账号信息**；账密（可选）与 Cookie 仅存在你手机本机的 Scripting `Storage` 中
- Cookie 等价于登录态，请勿泄露；如怀疑泄露，在网站上退出登录即可使其全部失效

## 免责声明

仅供个人学习与自动化个人账号签到使用，请遵守目标网站的服务条款。
