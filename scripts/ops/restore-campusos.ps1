param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,
  [ValidateSet("sqlite", "postgres")]
  [string]$Mode = ""
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path ".").Path

if (-not $Mode) {
  $Mode = if ($env:DB_CLIENT) { $env:DB_CLIENT } else { "sqlite" }
}

if (-not (Test-Path $InputPath)) {
  throw "Backup file not found: $InputPath"
}

if ($Mode -eq "sqlite") {
  $sqlitePath = if ($env:SQLITE_DB_PATH) { $env:SQLITE_DB_PATH } else { Join-Path $root "backend\database.db" }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $sqlitePath) | Out-Null
  Copy-Item -Path $InputPath -Destination $sqlitePath -Force
  Write-Host "SQLite database restored from $InputPath"
  exit 0
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  throw "psql is not installed or not available in PATH."
}

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL must be set for postgres restores."
}

& $psql.Source --dbname $env:DATABASE_URL --file $InputPath
Write-Host "PostgreSQL database restored from $InputPath"
