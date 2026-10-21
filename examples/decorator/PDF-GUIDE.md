# PDF 生成指南

> 把本目录的内容转成 PDF 的 **3 种最实用方案**（从"零安装"到"专业排版"）。

---

## 📂 目录结构

```
examples/decorator/
├── 装饰模式实战精讲-PHP版.html        ← 🆕 单文件 HTML（浏览器直接打印）
├── 装饰模式实战精讲-PHP版-通用版.md   ← 🆕 纯 Markdown（去 LaTeX 化）
├── 装饰模式实战精讲-PHP版.md          ← 原版（带 pandoc/YAML/LaTeX 块）
├── 装饰模式实战精讲-PHP版.pdf         ← 生成结果（运行脚本后产生）
├── build-pdf.ps1                      ← 一键脚本（默认主题）
├── build-academic.ps1                 ← 学术风（衬线字体 + 章节编号）
├── build-simple.ps1                   ← 简约风（无封面 / 紧凑边距）
├── build-dark.ps1                     ← 暗色风（深色背景）
├── PDF-GUIDE.md                       ← 本文件
└── from-python/                       ← 所有可运行 PHP 示例
```

---

## 🎯 三种方案速选

| 方案 | 安装成本 | 排版效果 | 适用场景 |
| --- | --- | --- | --- |
| **A. 浏览器打印** | ⭐ 零安装 | ⭐⭐⭐ 良好 | 临时打印、没装任何工具 |
| **B. VS Code Markdown PDF 插件** | ⭐⭐ 装一个插件 | ⭐⭐⭐ 良好 | 经常写 Markdown |
| **C. Pandoc + xelatex** | ⭐⭐⭐ 装两个 | ⭐⭐⭐⭐⭐ 专业 | 最终发布、出版、培训 |

---

## 🅰️ 方案 A：浏览器打印（最快，零安装）

**前提**：任意电脑（Windows / macOS / Linux）都有浏览器。

### 步骤

1. 打开 `装饰模式实战精讲-PHP版.html`
   - 文件资源管理器双击 → 用 Chrome / Edge / Firefox 打开
2. `Ctrl + P`（macOS 是 `Cmd + P`）
3. 设置：
   - **目标**：另存为 PDF
   - **纸张**：A4
   - **边距**：默认即可（HTML 已做打印优化）
   - **背景图形**：✅ 勾选（让代码块深色背景显示出来）
4. 保存 → 完成 ✅

> 💡 HTML 已对打印做了完整优化：A4 纸张、自动分页、隐藏打印按钮、UML 图框。打印效果接近专业排版。

### 优点 / 缺点

| ✅ 优点 | ❌ 缺点 |
| --- | --- |
| 无需任何安装 | 不同浏览器边距略不同 |
| macOS / Windows / Linux 通吃 | 无法选 xelatex 的精细字体 |
| 支持中文字体回退 |  |

---

## 🅱️ 方案 B：VS Code Markdown PDF 插件（开发者首选）

### 步骤

1. 装 [VS Code](https://code.visualstudio.com/)
2. 装扩展 `Markdown PDF`（作者 yzane）
3. 打开 `装饰模式实战精讲-PHP版-通用版.md`
4. `Ctrl+Shift+P` → 输入 `Markdown PDF: Export (pdf)`
5. PDF 直接生成在同目录 ✅

### 优点

- ✅ 写 Markdown 和导出 PDF 一个工具搞定
- ✅ 自动代码高亮
- ✅ 支持 GitHub / GitLab / Academic 三种主题

### 备选插件

- `Markdown Preview Enhanced`（预览时浏览器打开 → 手动打印）
- `Pandoc Companion`（包装 Pandoc）

---

## 🅲 方案 C：Pandoc + xelatex（最专业）

> 适合需要出版级排版的场景。所有 build-*.ps1 脚本都用这个方案。

### 步骤 1：安装 Pandoc

```powershell
winget install --id JohnMacFarlane.Pandoc
```

### 步骤 2：安装 PDF 引擎（xelatex）

```powershell
# 方案 A：MiKTeX（推荐，中文效果最好）
winget install --id ChristianSchenk.MiKTeX

# 方案 B：TeX Live（更全面，体积大）
# https://tug.org/texlive/

# 方案 C：wkhtmltopdf（轻量，免 LaTeX）
winget install --id wkhtmltopdf.wkhtmltopdf
```

### 步骤 3：双击脚本

进入 `D:\www2\dev-laraval\examples\decorator\`，**双击你想要的主题脚本**：

| 脚本 | 输出 PDF 名 | 特点 |
| --- | --- | --- |
| `build-pdf.ps1` | `装饰模式实战精讲-PHP版.pdf` | 微软雅黑 + 自动目录（推荐） |
| `build-academic.ps1` | `...学术风.pdf` | 宋体 + 章节编号 1.1 / 1.2 |
| `build-simple.ps1` | `...简约风.pdf` | 无封面、紧凑边距 |
| `build-dark.ps1` | `...暗色风.pdf` | 深色背景（需 wkhtmltopdf） |

### 步骤 4：手动命令（如果不想用脚本）

```powershell
cd D:\www2\dev-laraval\examples\decorator

pandoc "装饰模式实战精讲-PHP版.md" `
  -o "装饰模式实战精讲-PHP版.pdf" `
  --pdf-engine=xelatex `
  -V CJKmainfont="Microsoft YaHei" `
  -V mainfont="Microsoft YaHei" `
  --toc `
  --toc-depth=2
```

> ⚠️ 原版 `装饰模式实战精讲-PHP版.md` 是 **pandoc 专用格式**（带 YAML 头 + LaTeX 块），必须用 Pandoc 渲染。
> 如果想用其他工具，改用 `装饰模式实战精讲-PHP版-通用版.md`（已去除 pandoc 专属语法）。

---

## 🆚 三种方案对比

| 维度 | A 浏览器打印 | B VS Code 插件 | C Pandoc + xelatex |
| --- | --- | --- | --- |
| 安装时间 | 0 分钟 | 5 分钟 | 20-60 分钟（要下 LaTeX） |
| PDF 大小 | ~3 MB | ~2 MB | ~1 MB |
| 中文字体 | 系统默认 | 微软雅黑 | 任意可配 |
| 目录 | 手写 | 自动 | 自动 + 可点击 |
| 学术排版 | ❌ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 推荐度 | 临时用 | 日常 | 出版/培训 |

---

## 🔧 常见问题

### Q1：中文显示为方块 / 乱码？

**A**：PDF 引擎找不到中文字体。改用 xelatex 并显式指定：

```powershell
pandoc 装饰模式实战精讲-PHP版.md -o out.pdf `
  --pdf-engine=xelatex `
  -V CJKmainfont="SimSun"      # 宋体
  -V CJKmainfont="Microsoft YaHei"  # 微软雅黑
```

### Q2：报错 `LaTeX Error: File 'xxx.sty' not found`？

**A**：MiKTeX 首次运行会提示"按需安装宏包"，点"安装"即可。或：

```powershell
mpm --install=all
```

### Q3：生成的 PDF 没有封面 / 目录？

**A**：必须用 `装饰模式实战精讲-PHP版.md`（带 pandoc 专属语法），
而不是 `-通用版.md`（后者是纯 Markdown，没有自动封面）。

### Q4：如何自定义颜色 / 字体？

编辑 `装饰模式实战精讲-PHP版.md` 顶部的 YAML 头：

```yaml
linkcolor: "blue"        # 链接颜色
urlcolor: "red"          # URL 颜色
geometry: margin=2cm     # 页边距
fontsize: 10pt           # 字号
mainfont: "KaiTi"        # 主字体（楷体）
```

### Q5：HTML 版打印出来没有深色代码块？

**A**：打印对话框里要勾选 **"背景图形"**（Chrome / Edge 都在"更多设置"里）。

---

## 📐 自定义封面

封面在 `装饰模式实战精讲-PHP版.md` 最上方的 `{=latex}` 代码块中。改这段即可：

```latex
\thispagestyle{empty}
\begin{center}
\vspace*{3cm}

{\Huge\bfseries 你的标题}\\[1em]
{\Large 副标题}\\[4em]

{\large 作者}\\[0.5em]
{\large 日期}
\end{center}
\newpage
```

---

## 📚 参考

- Pandoc 官方文档：https://pandoc.org/MANUAL.html
- Pandoc 中文 LaTeX 模板：搜索 `pandoc ctexart`
- LaTeX 入门：https://www.overleaf.com/learn
- 浏览器打印 PDF 教程：https://support.google.com/chrome/answer/1069693
