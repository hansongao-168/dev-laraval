# ============================================================
#  暗色风 PDF 生成脚本
#  特点：深灰背景 / 浅色文字 / 适合屏幕阅读
#  输出：装饰模式实战精讲-PHP版-暗色风.pdf
#  注意：仅 wkhtmltopdf 引擎支持自定义背景色
# ============================================================

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src  = Join-Path $here '装饰模式实战精讲-PHP版.md'
$dst  = Join-Path $here '装饰模式实战精讲-PHP版-暗色风.pdf'

if (-not (Get-Command pandoc -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 未检测到 pandoc" -ForegroundColor Red
    pause
    exit 1
}

# 暗色风优先用 wkhtmltopdf（通过 HTML+CSS 实现）
$engine = $null
foreach ($e in @('wkhtmltopdf', 'xelatex')) {
    if (Get-Command $e -ErrorAction SilentlyContinue) { $engine = $e; break }
}
if (-not $engine) {
    Write-Host "❌ 未检测到 PDF 引擎" -ForegroundColor Red
    pause
    exit 1
}

# 准备 HTML 中间文件
$html = Join-Path $here '.tmp-dark.html'
$css  = Join-Path $here 'dark-style.css'

@'
body {
    background-color: #1e1e1e;
    color: #d4d4d4;
    font-family: "Microsoft YaHei", "Consolas", monospace;
    max-width: 800px;
    margin: 2cm auto;
    line-height: 1.7;
}
h1, h2, h3, h4, h5, h6 {
    color: #569cd6;
    border-bottom: 1px solid #333;
    padding-bottom: 0.3em;
}
h1 { color: #4ec9b0; font-size: 1.8em; }
h2 { color: #9cdcfe; font-size: 1.4em; }
a { color: #569cd6; text-decoration: none; }
code {
    background-color: #2d2d2d;
    color: #ce9178;
    padding: 0.1em 0.3em;
    border-radius: 3px;
    font-family: "Consolas", monospace;
}
pre {
    background-color: #0e0e0e;
    border: 1px solid #333;
    border-radius: 5px;
    padding: 1em;
    overflow-x: auto;
}
pre code { background: transparent; color: #d4d4d4; }
table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
}
th, td {
    border: 1px solid #444;
    padding: 0.5em;
    text-align: left;
}
th { background-color: #2d2d2d; color: #4ec9b0; }
tr:nth-child(even) { background-color: #252525; }
blockquote {
    border-left: 4px solid #569cd6;
    background-color: #252525;
    margin: 1em 0;
    padding: 0.5em 1em;
    color: #9cdcfe;
}
hr { border: 0; border-top: 1px solid #333; }
#TOC { background-color: #252525; padding: 1em; border-radius: 5px; }
#TOC a { color: #9cdcfe; }
'@ | Set-Content $css -Encoding UTF8

pandoc $src -o $html --standalone --self-contained -c $css

if ($engine -eq 'wkhtmltopdf') {
    & wkhtmltopdf $html $dst
} else {
    # xelatex 退化为普通主题
    Write-Host "⚠️  xelatex 不支持自定义背景色，已改为普通主题" -ForegroundColor Yellow
    pandoc $src -o $dst --pdf-engine=$engine -V CJKmainfont="Microsoft YaHei" --toc
    Remove-Item $html -ErrorAction SilentlyContinue
    if (Test-Path $dst) {
        Start-Process explorer.exe "/select,$dst"
    }
    pause
    exit 0
}

Remove-Item $html, $css -ErrorAction SilentlyContinue

if (Test-Path $dst) {
    Write-Host "`n🎉 暗色风 PDF 生成成功！" -ForegroundColor Green
    Write-Host "   📍 $dst" -ForegroundColor White
    Start-Process explorer.exe "/select,$dst"
} else {
    Write-Host "`n❌ 生成失败" -ForegroundColor Red
}
pause
