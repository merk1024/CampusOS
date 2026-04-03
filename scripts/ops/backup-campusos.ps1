param(
  [ValidateSet("sqlite", "postgres")]
  [string]$Mode = "",
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path ".").Path

if (-not $Mode) {
  $Mode = if ($env:DB_CLIENT) { $env:DB_CLIENT } else { "sqlite" }
}

if ($Mode -eq "sqlite") {
  $sqlitePath = if ($env:SQLITE_DB_PATH) { $env:SQLITE_DB_PATH } else { Join-Path $root "backend\database.db" }
  if (-not (Test-Path $sqlitePath)) {
    throw "SQLite database file not found: $sqlitePath"
  }

  if (-not $OutputPath) {
    $OutputPath = Join-Path $root ("backups\campusos-sqlite-{0}.db" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
  Copy-Item -Path $sqlitePath -Destination $OutputPath -Force
  Write-Host "SQLite backup created at $OutputPath"
  exit 0
}

if (-not $OutputPath) {
  $OutputPath = Join-Path $root ("backups\campusos-postgres-{0}.sql" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
  throw "pg_dump is not installed or not available in PATH."
}

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL must be set for postgres backups."
}

& $pgDump.Source --dbname $env:DATABASE_URL --no-owner --no-privileges --file $OutputPath
Write-Host "PostgreSQL backup created at $OutputPath"
