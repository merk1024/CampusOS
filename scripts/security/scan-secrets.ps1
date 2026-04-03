param(
  [string]$RootPath = "",
  [string]$ReportPath = ""
)

$ErrorActionPreference = "Stop"

if (-not $RootPath) {
  $RootPath = (Resolve-Path ".").Path
}

if (-not $ReportPath) {
  $ReportPath = Join-Path $RootPath "security-reports\secrets\scan-secrets.md"
}

$excludeSegments = @("\node_modules\", "\dist\", "\.git\", "\security-reports\", "\backups\", "\tests\")
$includePatterns = @("*.js", "*.jsx", "*.json", "*.ps1", "*.sql", "*.yaml", "*.yml", "*.env*")
$quotedSecretRegex = [regex]'(?i)\b(jwt[_-]?secret|api[_-]?key|secret|token|password)\b\s*[:=]\s*["'']([^"'']{12,})["'']'
$dotenvSecretRegex = [regex]'(?i)^\s*([A-Z0-9_]*(SECRET|TOKEN|PASSWORD|API_KEY))\s*=\s*([^\s#]{12,})\s*$'
$placeholderRegex = [regex]'(?i)(change[_-]?me|replace_with|your_|example|password_here|localhost|campusos-test|dummy|placeholder|test-secret|your_app_password|your_jwt_secret_key)'

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath) | Out-Null

$findings = @()
$files = Get-ChildItem -Path $RootPath -Recurse -File -Include $includePatterns |
  Where-Object {
    $fullName = $_.FullName
    -not ($excludeSegments | Where-Object { $fullName -like "*$_*" })
  }

foreach ($file in $files) {
  $lineNumber = 0
  foreach ($line in Get-Content -Path $file.FullName) {
    $lineNumber += 1
    $matches = @()
    $quotedMatch = $quotedSecretRegex.Match($line)
    if ($quotedMatch.Success) {
      $matches += $quotedMatch.Groups[2].Value
    }

    $dotenvMatch = $dotenvSecretRegex.Match($line)
    if ($dotenvMatch.Success) {
      $matches += $dotenvMatch.Groups[3].Value
    }

    if ($matches.Count -eq 0) { continue }

    $shouldSkip = $false
    foreach ($candidate in $matches) {
      if ($placeholderRegex.IsMatch($candidate)) {
        $shouldSkip = $true
      }
    }

    if ($shouldSkip) { continue }

    $findings += [PSCustomObject]@{
      File = $file.FullName.Replace($RootPath, ".")
      Line = $lineNumber
      Snippet = $line.Trim()
    }
  }
}

$report = @()
$report += "# CampusOS Secret Scan"
$report += ""
$report += "Generated: $(Get-Date -Format o)"
$report += ""

if ($findings.Count -eq 0) {
  $report += "No obvious hardcoded secrets or weak defaults were found."
  $report | Set-Content -Path $ReportPath -Encoding UTF8
  Write-Host "No obvious hardcoded secrets or weak defaults were found."
  exit 0
}

$report += "Potential findings:"
$report += ""
foreach ($finding in $findings) {
  $report += "- $($finding.File):$($finding.Line) - ``$($finding.Snippet.Replace('`', ''))``"
}

$report | Set-Content -Path $ReportPath -Encoding UTF8
Write-Host "Potential secrets were detected. Review $ReportPath"
exit 1
