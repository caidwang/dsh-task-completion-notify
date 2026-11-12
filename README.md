# dsh-task-completion-notify

DeepSeek Harness(dsh)Web GUI 的**任务完成通知插件**:当一个会话的智能体完成任务(一个回合结束)时,在界面右下角弹出 toast 并播放一段短提示音。

A task-completion notifier plugin for the DeepSeek Harness Web GUI: pops up a toast and plays a short chime when an agent finishes a task (turn).

## 功能

- 会话任务结束时,右下角弹出通知卡片(带会话标题,6 秒自动消失,点击可提前关闭,最多叠 3 条)
- 播放两音提示音(E5 → A5),由 Web Audio 现场合成,不携带任何音频文件
- 覆盖会话列表中的全部会话:当前会话、后台会话、子代理与会话团队成员
- 中英文界面文案;样式全部使用宿主主题 token,自动适配明暗模式
- 客户端插件(Host 半边为 no-op),不影响会话日志与模型行为

## 安装

用 agent 的 `plugin_manager` 工具(或 Web 端插件管理)安装本目录:

```text
plugin_manager action=install_bundle target=<本目录的绝对路径>
```

安装后当前 profile 的所有会话立即生效,重启后仍然保留。

## 触发条件

会话列表行(`ctx.sessions.list`)的 `running` 状态从 `true` 翻转为 `false`。该状态源已整合 Host 的 `api-session/status` 实时事件与连接基线刷新,因此重连、页面刷新后也能正确工作;首次基线到达不会误报。

## 文件

| 文件 | 作用 |
|---|---|
| `package.json` | 包清单,`dsh.bundle.patch` 与 `dsh.client` 声明 |
| `cordis.patch.yml` | Loader 补丁:插入插件行 |
| `index.js` | Host 半边(no-op) |
| `client.js` | 客户端半边:状态检测、toast 渲染、提示音合成 |
| `locale/*.json` | 插件列表展示元数据(标题/描述) |
| `icon.svg` | 插件图标 |

## 备注

- 在桌面 App(Electron)中提示音可直接播放;在普通浏览器中,自动播放策略可能要求页面先有过一次用户交互。
- 包名为 `@local/task-completion-notify`,以本地目录链接方式安装(`files` 不筛选链接目录)。
