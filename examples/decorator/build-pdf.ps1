# ============================================================
#  装饰模式实战精讲（PHP版）PDF 一键生成脚本
#  用法：右键 → "使用 PowerShell 运行"  或  双击
#  输出：D:\www2\dev-laraval\examples\decorator\装饰模式实战精讲-PHP版.pdf
# ============================================================

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src  = Join-Path $here '装饰模式实战精讲-PHP版.md'
$dst  = Join-Path $here '装饰模式实战精讲-PHP版.pdf'

# 1. 检查 pandoc 是否安装
if (-not (Get-Command pandoc -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 未检测到 pandoc，请先安装：" -ForegroundColor Red
    Write-Host "   winget install --id JohnMacFarlane.Pandoc" -ForegroundColor Yellow
    Write-Host "   或下载: https://pandoc.org/installing.html" -ForegroundColor Yellow
    pause
    exit 1
}

# 2. 优先尝试 xelatex（效果最好），失败则降级到 wkhtmltopdf
$engine = $null
foreach ($e in @('xelatex', 'wkhtmltopdf')) {
    if (Get-Command $e -ErrorAction SilentlyContinue) { $engine = $e; break }
}
if (-not $engine) {
    Write-Host "❌ 未检测到 PDF 引擎（需要 xelatex 或 wkhtmltopdf）" -ForegroundColor Red
    Write-Host "   推荐安装 MiKTeX: https://miktex.org/download" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✅ 使用引擎: $engine" -ForegroundColor Green
Write-Host "📄 源文件: $src" -ForegroundColor Cyan
Write-Host "📦 目标:  $dst" -ForegroundColor Cyan

# 3. 执行转换
pandoc $src -o $dst --pdf-engine=$engine -V CJKmainfont="Microsoft YaHei"

if (Test-Path $dst) {
    Write-Host "`n🎉 生成成功！" -ForegroundColor Green
    Write-Host "   📍 $dst" -ForegroundColor White
    Start-Process explorer.exe "/select,$dst"
} else {
    Write-Host "`n❌ 生成失败，请检查上方报错" -ForegroundColor Red
}

pause
