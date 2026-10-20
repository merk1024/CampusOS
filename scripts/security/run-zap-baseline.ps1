param(
  [string]$TargetUrl = "",
  [string]$ReportDirectory = ""
)

$ErrorActionPreference = "Stop"

if (-not $TargetUrl) {
  $TargetUrl = if ($env:ZAP_TARGET_URL) { $env:ZAP_TARGET_URL } else { "http://host.docker.internal:5000/" }
}

$targetUri = $null
if (-not [Uri]::TryCreate($TargetUrl, [UriKind]::Absolute, [ref]$targetUri) -or
    $targetUri.Scheme -notin @('http', 'https') -or $targetUri.UserInfo) {
  throw 'TargetUrl must be an absolute HTTP(S) URL without embedded credentials.'
}
# The scanner runs inside Docker: host loopback must be reached through its gateway.
if ($targetUri.IsLoopback) {
  $targetBuilder = New-Object System.UriBuilder($targetUri)
  $targetBuilder.Host = 'host.docker.internal'
  $TargetUrl = $targetBuilder.Uri.AbsoluteUri
}

if (-not $ReportDirectory) {
  $ReportDirectory = Join-Path (Resolve-Path ".").Path "security-reports\zap"
}

function Invoke-NativeProcess {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $FilePath
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.Arguments = (($Arguments | ForEach-Object {
    if ($_ -match '[\s"]') {
      '"' + ($_ -replace '"', '\"') + '"'
    } else {
      $_
    }
  }) -join ' ')

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $startInfo

  [void]$process.Start()
  $stdOutTask = $process.StandardOutput.ReadToEndAsync()
  $stdErrTask = $process.StandardError.ReadToEndAsync()
  $process.WaitForExit()

  return [PSCustomObject]@{
    ExitCode = $process.ExitCode
    StdOut = $stdOutTask.Result
    StdErr = $stdErrTask.Result
  }
}

function Write-SkipReport([string]$Reason) {
  @(
    "# CampusOS ZAP Baseline"
    ""
    "Generated: $(Get-Date -Format o)"
    ""
    "Skipped: $Reason"
    "Expected target: $TargetUrl"
  ) | Set-Content -Path $mdReport -Encoding UTF8

  Write-Host $Reason
}

New-Item -ItemType Directory -Force -Path $ReportDirectory | Out-Null
$ReportDirectory = (Resolve-Path -LiteralPath $ReportDirectory).Path

$htmlReport = Join-Path $ReportDirectory "zap-baseline.html"
$jsonReport = Join-Path $ReportDirectory "zap-baseline.json"
$mdReport = Join-Path $ReportDirectory "zap-baseline.md"

# Remove only this runner's fixed report filenames inside the resolved output folder.
# A skipped/failed run must never leave an earlier successful HTML/JSON result.
foreach ($reportFile in @($htmlReport, $jsonReport, $mdReport)) {
  if (Test-Path -LiteralPath $reportFile) { Remove-Item -LiteralPath $reportFile -Force }
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  Write-SkipReport "Docker is not available on this machine, so OWASP ZAP baseline was not executed."
  exit 3
}

$dockerInfo = Invoke-NativeProcess -FilePath $docker.Source -Arguments @("info")
if ($dockerInfo.ExitCode -ne 0) {
  Write-SkipReport "Docker is installed, but the Docker daemon is not available, so OWASP ZAP baseline was not executed."
  exit 3
}

$zapRun = Invoke-NativeProcess -FilePath $docker.Source -Arguments @(
  "run",
  "--rm",
  "--add-host",
  "host.docker.internal:host-gateway",
  "-v",
  "${ReportDirectory}:/zap/wrk/:rw",
  "ghcr.io/zaproxy/zaproxy:stable",
  "zap-baseline.py",
  "-t",
  $TargetUrl,
  "-r",
  (Split-Path -Leaf $htmlReport),
  "-J",
  (Split-Path -Leaf $jsonReport),
  "-w",
  (Split-Path -Leaf $mdReport)
)

if ($zapRun.ExitCode -ne 0) {
  if (-not (Test-Path -LiteralPath $mdReport)) {
    "ZAP did not complete successfully. Exit code: $($zapRun.ExitCode). Target: $TargetUrl" |
      Set-Content -LiteralPath $mdReport -Encoding UTF8
  }
  Write-Host $zapRun.StdOut
  Write-Host $zapRun.StdErr
  Write-Host "ZAP returned $($zapRun.ExitCode): 1 = failed checks, 2 = warnings, 3 = execution error."
  exit $zapRun.ExitCode
}

Write-Host "OWASP ZAP baseline finished. Reports saved to $ReportDirectory"
exit 0
