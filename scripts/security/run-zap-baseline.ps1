param(
  [string]$TargetUrl = "",
  [string]$ReportDirectory = ""
)

$ErrorActionPreference = "Stop"

if (-not $TargetUrl) {
  $TargetUrl = if ($env:ZAP_TARGET_URL) { $env:ZAP_TARGET_URL } else { "http://localhost:5000/health" }
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
  $stdOut = $process.StandardOutput.ReadToEnd()
  $stdErr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  return [PSCustomObject]@{
    ExitCode = $process.ExitCode
    StdOut = $stdOut
    StdErr = $stdErr
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

$htmlReport = Join-Path $ReportDirectory "zap-baseline.html"
$jsonReport = Join-Path $ReportDirectory "zap-baseline.json"
$mdReport = Join-Path $ReportDirectory "zap-baseline.md"

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  Write-SkipReport "Docker is not available on this machine, so OWASP ZAP baseline was not executed."
  exit 0
}

$dockerInfo = Invoke-NativeProcess -FilePath $docker.Source -Arguments @("info")
if ($dockerInfo.ExitCode -ne 0) {
  Write-SkipReport "Docker is installed, but the Docker daemon is not available, so OWASP ZAP baseline was not executed."
  exit 0
}

$zapRun = Invoke-NativeProcess -FilePath $docker.Source -Arguments @(
  "run",
  "--rm",
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
  throw "OWASP ZAP baseline failed with exit code $($zapRun.ExitCode). $($zapRun.StdErr.Trim())"
}

Write-Host "OWASP ZAP baseline finished. Reports saved to $ReportDirectory"
