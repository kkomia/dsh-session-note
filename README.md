# dsh-session-note

**DSH 会话便签** —— 把一段文本钉在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的会话窗口上：聊天记录怎么滚，它都待在原地不动。

![type](https://img.shields.io/badge/type-dsh%20client%20plugin-blue) ![license](https://img.shields.io/badge/license-MIT-green)

## 功能

- **钉住不滚**：便签是窗口上的浮层（`shell.overlay`），不随对话滚动。
- **可拖动**：拖标题栏可以放到窗口任意位置；位置自动记住，窗口缩放时自动收进可视区。
- **可调整大小**：拖右下角调整宽高，尺寸自动记住；窗口变小时自动收回来，不会跑出屏幕。
- **可最小化**：点标题栏右侧按钮收起成一条标题栏，再点展开；状态自动记住。
- **跟随会话**：每个会话一份便签，切会话自动换成对应内容；文本按会话保存，刷新页面还在。
- **键盘微调**：聚焦标题栏后方向键移动，按住 Shift 步长更大。
- **主题适配**：沿用 DSW 设计变量，亮色/暗色主题自动匹配。
- **干净卸载**：卸载插件时卡片和样式一起移除。

## 安装

```bash
git clone https://github.com/kkomia/dsh-session-note.git
dsh plugin --profile web add ./dsh-session-note
```

路径要包含 `package.json`。装好后刷新页面，打开任意会话，窗口右侧会出现便签卡片。

> 其它 profile（如 `desktop`）把命令里的 `web` 换成对应 profile 名即可。

## 使用

- 拖动顶部标题栏移动便签。
- 拖右下角调整大小；聚焦调整角后方向键也能微调，按住 Shift 步长更大。
- 点标题栏右侧的「–」最小化，只剩标题栏；再点箭头展开。
- 点击正文输入或粘贴文本，改动即时自动保存到当前会话。
- 清空正文即删除该会话的便签内容。
- 打开设置、文件等其它面板时便签自动隐藏，回到会话再出现。

## 数据存放

只存在浏览器 `localStorage`，不上传：

| 键 | 内容 |
| --- | --- |
| `dsh.session-note.v1.text.<sessionId>` | 该会话的便签正文 |
| `dsh.session-note.v1.position` | 便签在窗口中的位置 |
| `dsh.session-note.v1.size` | 便签宽高 |
| `dsh.session-note.v1.minimized` | 便签是否处于最小化状态 |

## 卸载

在 Plugins 页面停用或移除本插件即可；已保存的便签文本仍留在浏览器里，重新启用后还在。

## English

A draggable, resizable, collapsible sticky note for the DeepSeek Harness Web UI: it sits on the window as an overlay beside the conversation, stays put while the transcript scrolls, and saves its text, size, and collapsed state per session in `localStorage`. Install with `dsh plugin --profile web add <this-repo-directory>`.

## License

[MIT](./LICENSE)
