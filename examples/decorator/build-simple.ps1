# ============================================================
#  简约风 PDF 生成脚本
#  特点：无封面 / 紧凑边距 / 章节不带编号 / 适合电子阅读
#  输出：装饰模式实战精讲-PHP版-简约风.pdf
# ============================================================

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src  = Join-Path $here '装饰模式实战精讲-PHP版.md'
$dst  = Join-Path $here '装饰模式实战精讲-PHP版-简约风.pdf'

if (-not (Get-Command pandoc -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 未检测到 pandoc" -ForegroundColor Red
    pause
    exit 1
}

$engine = $null
foreach ($e in @('xelatex', 'wkhtmltopdf')) {
    if (Get-Command $e -ErrorAction SilentlyContinue) { $engine = $e; break }
}
if (-not $engine) {
    Write-Host "❌ 未检测到 PDF 引擎" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "✅ 引擎: $engine" -ForegroundColor Green

# 准备一个不带封面的临时源（跳过前 27 行）
$tmpSrc = Join-Path $here '.tmp-simple.md'
$content = Get-Content $src -Encoding UTF8
$content | Select-Object -Skip 27 | Set-Content $tmpSrc -Encoding UTF8

pandoc $tmpSrc `
    -o $dst `
    --pdf-engine=$engine `
    -V mainfont="Microsoft YaHei" `
    -V monofont="Consolas" `
    -V geometry:margin=1.8cm `
    -V fontsize=10pt `
    -V linkcolor=teal `
    --toc `
    --toc-depth=2

Remove-Item $tmpSrc -ErrorAction SilentlyContinue

if (Test-Path $dst) {
    Write-Host "`n🎉 简约风 PDF 生成成功！" -ForegroundColor Green
    Write-Host "   📍 $dst" -ForegroundColor White
    Start-Process explorer.exe "/select,$dst"
} else {
    Write-Host "`n❌ 生成失败" -ForegroundColor Red
}
pause
