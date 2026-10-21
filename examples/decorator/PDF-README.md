# 装饰模式实战精讲 · PDF 资源索引

> 同一份内容，**三种格式**，按你的工具链挑一个用。

---

## 📚 三种格式速查

| 格式 | 文件 | 适合谁 | 怎么用 |
| --- | --- | --- | --- |
| **HTML 单文件** | [装饰模式实战精讲-PHP版.html](装饰模式实战精讲-PHP版.html) | 所有人（零安装） | 双击打开 → Ctrl+P → 另存为 PDF |
| **通用 Markdown** | [装饰模式实战精讲-PHP版-通用版.md](装饰模式实战精讲-PHP版-通用版.md) | 写作者 / VS Code 用户 | 用任意 Markdown 工具导出 |
| **Pandoc 专用 Markdown** | [装饰模式实战精讲-PHP版.md](装饰模式实战精讲-PHP版.md) | 需要专业排版 / 出版 | 双击 `build-pdf.ps1` |

---

## ⚡ 一句话：怎么得到 PDF？

### 🅰️ 我什么都不想装（30 秒）

```powershell
# 1. 双击打开 装饰模式实战精讲-PHP版.html
# 2. Ctrl + P
# 3. 目标选 "另存为 PDF"
# 4. 勾选 "背景图形"（让代码块变深色）
# 5. 保存 ✅
```

### 🅱️ 我用 VS Code（2 分钟）

```powershell
# 1. VS Code 装插件 "Markdown PDF"
# 2. 打开 装饰模式实战精讲-PHP版-通用版.md
# 3. Ctrl+Shift+P → "Markdown PDF: Export (pdf)"
```

### 🅲️ 我要专业排版（30 分钟首次，之后一键）

```powershell
# 1. winget install --id JohnMacFarlane.Pandoc
# 2. winget install --id ChristianSchenk.MiKTeX
# 3. 双击 build-pdf.ps1
```

---

## 📂 完整文件树

```
examples/decorator/
│
├── 📘 装饰模式实战精讲-PHP版.html        ← 🆕 浏览器直接打印
├── 📝 装饰模式实战精讲-PHP版-通用版.md   ← 🆕 VS Code 通用
├── 📄 装饰模式实战精讲-PHP版.md          ← Pandoc 专用
│
├── 🚀 build-pdf.ps1                      ← 默认主题（一键）
├── 🎓 build-academic.ps1                 ← 学术风
├── 📱 build-simple.ps1                   ← 简约风
├── 🌙 build-dark.ps1                     ← 暗色风
│
├── 📖 PDF-GUIDE.md                       ← PDF 完整生成指南
├── 📖 PDF-README.md                      ← 本文件
├── 📖 README.md                          ← 装饰模式原文档
│
└── 💻 from-python/                       ← 13 个可运行 PHP 示例
    ├── 01-function-wrapper.php
    ├── 02-class-decorator.php
    ├── 03-decorator-factory.php
    ├── 04-preserve-metadata.php
    ├── 05-stacked-decorators.php
    ├── 06-method-decorator.php
    ├── 07-php-attribute.php
    ├── 08-property-decorator.php
    ├── 09-contextmanager.php
    ├── 10-dataclass.php
    ├── 11-memoize.php
    ├── 12-abstractmethod.php
    └── 13-total-ordering.php
```

---

## 🎯 推荐路径

- **只想看内容** → 直接看 [装饰模式实战精讲-PHP版.html](装饰模式实战精讲-PHP版.html)
- **想存成 PDF 离线看** → 双击 HTML → Ctrl+P
- **想发给别人** → 用 HTML 格式发，对方双击就能看
- **要写论文 / 出书** → 用 Pandoc + xelatex 走学术风脚本
- **要改内容** → 编辑 [装饰模式实战精讲-PHP版-通用版.md](装饰模式实战精讲-PHP版-通用版.md)，重新导出

---

## ✅ 子代理探测结论

DSH 沙箱内**无法**生成 PDF：
- ❌ 无 pandoc / xelatex / wkhtmltopdf
- ❌ 无 reportlab / weasyprint / fpdf 等 Python 库
- ❌ 沙箱 `pwsh` 被 ACL 拒绝，无法执行任意命令
- ❌ 会话禁止 `pip install`

**结论**：PDF 必须本地生成。三种方案已覆盖从"零安装"到"专业排版"的所有场景。
