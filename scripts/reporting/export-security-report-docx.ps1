$ErrorActionPreference = "Stop"

$root = (Resolve-Path ".").Path
$sourcePath = Join-Path $root "SECURITY_AUDIT_REPORT.md"
$docsDir = Join-Path $root "docs"
$docxPath = Join-Path $docsDir "CampusOS_Security_Audit_Report.docx"
$htmlFallbackPath = Join-Path $docsDir "CampusOS_Security_Audit_Report.html"

if (-not (Test-Path $sourcePath)) {
  throw "Security report source not found: $sourcePath"
}

New-Item -ItemType Directory -Force -Path $docsDir | Out-Null
$markdown = Get-Content -Path $sourcePath -Raw

try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $document = $word.Documents.Add()
  $selection = $word.Selection
  $selection.TypeText($markdown)
  $document.SaveAs([ref]$docxPath, [ref]16)
  $document.Close()
  $word.Quit()
  Write-Host "Exported security report to $docxPath"
} catch {
  $escapedMarkdown = $markdown `
    .Replace("&", "&amp;") `
    .Replace("<", "&lt;") `
    .Replace(">", "&gt;")
  $html = @"
<html>
<head>
  <meta charset="utf-8" />
  <title>CampusOS Security Audit Report</title>
</head>
<body>
<pre>$escapedMarkdown</pre>
</body>
</html>
"@
  $html | Set-Content -Path $htmlFallbackPath -Encoding UTF8
  Write-Host "Microsoft Word COM export is unavailable. Wrote HTML fallback to $htmlFallbackPath"
}
