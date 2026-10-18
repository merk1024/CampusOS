param(
  [string]$TargetUrl = "",
  [string]$ReportDirectory = ""
)

$ErrorActionPreference = "Stop"
if ($TargetUrl -or $ReportDirectory) {
  throw "Target and directory overrides are no longer supported. Use the disposable npm run scan:zap runner."
}
$runner = Join-Path $PSScriptRoot "run-zap.js"
& node $runner
exit $LASTEXITCODE
