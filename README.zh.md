# dsh-task-completion-notify

[English](README.md) | 中文

DeepSeek Harness(dsh)Web GUI 的**任务完成通知插件**:当某个会话的智能体完成任务(一个回合结束)时,在界面右下角弹出 toast 并播放一段短提示音。

## 功能

- **完成弹窗** — 右下角通知卡片,显示会话标题;6 秒自动消失,点击可提前关闭,最多叠 3 条
- **提示音** — 两音短提示(E5 → A5),由 Web Audio 现场合成,包内不携带任何音频文件
- **覆盖全部会话** — 当前会话、后台会话、子代理会话与会话团队成员会话
- **本地化** — 中英文界面文案;样式全部使用宿主主题 token,自动适配明暗模式
- **纯客户端插件** — Host 半边为 no-op,不修改会话日志与模型行为

## 安装

**从 npm 安装** — 已发布为 [`@xconekade/task-completion-notify`](https://www.npmjs.com/package/@xconekade/task-completion-notify):

```text
plugin_manager action=install_bundle target="@xconekade/task-completion-notify"
```

**从本地检出安装**(本目录):

```text
plugin_manager action=install_bundle target=<本目录的绝对路径>
```

通过 agent 的 `plugin_manager` 工具或 Web 端插件管理界面执行。安装后,当前 profile 的所有会话立即生效,重启后仍然保留。

## 触发条件

会话列表行的 `running` 状态从 `true` 翻转为 `false` 时触发。该状态源已整合 Host 的实时 `api-session/status` 事件与连接基线刷新,因此重连、页面刷新后依然正确;首次基线到达不会误报。

## 文件

| 文件 | 作用 |
|---|---|
| `package.json` | 包清单:`dsh.bundle.patch` 与 `dsh.client` 声明 |
| `cordis.patch.yml` | Loader 补丁:插入插件行 |
| `index.js` | Host 半边(no-op) |
| `client.js` | 客户端半边:状态检测、toast 渲染、提示音合成 |
| `locale/*.json` | 插件列表展示元数据(标题/描述) |
| `icon.svg` | 插件图标 |

## 备注

- 桌面 App(Electron)中提示音可直接播放;在普通浏览器中,自动播放策略可能要求页面先有过一次用户交互。
- 本地检出以目录链接方式安装;`files` 不筛选链接目录。
