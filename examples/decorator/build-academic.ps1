# ============================================================
#  学术风 PDF 生成脚本
#  特点：衬线字体（SimSun）+ 章号（1.1 / 1.2）+ 蓝色超链接
#  输出：装饰模式实战精讲-PHP版-学术风.pdf
# ============================================================

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src  = Join-Path $here '装饰模式实战精讲-PHP版.md'
$dst  = Join-Path $here '装饰模式实战精讲-PHP版-学术风.pdf'

if (-not (Get-Command pandoc -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 未检测到 pandoc，请先安装" -ForegroundColor Red
    pause
    exit 1
}

$engine = $null
foreach ($e in @('xelatex', 'wkhtmltopdf')) {
    if (Get-Command $e -ErrorAction SilentlyContinue) { $engine = $e; break }
}
if (-not $engine) {
    Write-Host "❌ 未检测到 PDF 引擎（xelatex / wkhtmltopdf）" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "✅ 引擎: $engine" -ForegroundColor Green
Write-Host "📄 源:   $src" -ForegroundColor Cyan
Write-Host "📦 目标: $dst" -ForegroundColor Cyan

pandoc $src `
    -o $dst `
    --pdf-engine=$engine `
    -V mainfont="Times New Roman" `
    -V CJKmainfont="SimSun" `
    -V monofont="Consolas" `
    -V geometry:margin=2.8cm `
    -V fontsize=11pt `
    -V linkcolor=blue `
    -V urlcolor=blue `
    --toc `
    --toc-depth=2 `
    -V numbersections `     # 自动加 1.1 / 1.2 章号
    -V documentclass=article

if (Test-Path $dst) {
    Write-Host "`n🎉 生成成功！" -ForegroundColor Green
    Write-Host "   📍 $dst" -ForegroundColor White
    Start-Process explorer.exe "/select,$dst"
} else {
    Write-Host "`n❌ 生成失败" -ForegroundColor Red
}
pause
