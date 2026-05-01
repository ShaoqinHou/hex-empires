param(
  [ValidateSet("summary", "strict")]
  [string]$Mode = "summary"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $ScriptDir "..\..")
Set-Location $Root

$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Require-Path {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    $failures.Add("missing path: $Path")
  }
}

function Warn {
  param([string]$Message)
  $warnings.Add($Message)
}

$gitTop = (& git rev-parse --show-toplevel 2>$null).Trim()
if (-not $gitTop) {
  $failures.Add("not inside a git worktree")
} else {
  $rootNorm = ((Resolve-Path $Root).Path -replace "\\", "/").TrimEnd("/")
  $gitNorm = ($gitTop -replace "\\", "/").TrimEnd("/")
  if ($rootNorm.ToLowerInvariant() -ne $gitNorm.ToLowerInvariant()) {
    $failures.Add("git toplevel mismatch: expected $rootNorm, got $gitNorm")
  }
}

$branch = (& git branch --show-current 2>$null).Trim()
if (-not $branch) {
  $branch = "(detached)"
}

$nodeModules = if (Test-Path "node_modules") { "ok" } else { "missing" }

$server5174 = "down"
try {
  $client = New-Object System.Net.Sockets.TcpClient
  $async = $client.BeginConnect("127.0.0.1", 5174, $null, $null)
  if ($async.AsyncWaitHandle.WaitOne(500)) {
    $client.EndConnect($async)
    $server5174 = "up"
  }
  $client.Close()
} catch {
  $server5174 = "down"
}

$reviewQueue = 0
$queuePath = ".codex/workflow/scratch/review-queue.txt"
if (Test-Path $queuePath) {
  $reviewQueue = @(
    Get-Content $queuePath |
      Where-Object { $_ -and $_.Trim().Length -gt 0 }
  ).Count
}

$reviewDriver = if (Test-Path ".codex/workflow/scratch/.review.lock") { "running" } else { "idle" }
$autoFixBranches = @(& git branch --list "auto-fix/*" 2>$null | ForEach-Object { $_.Trim().TrimStart("*").Trim() } | Where-Object { $_ })

if (Test-Path ".claude") {
  $failures.Add("live .claude directory exists; workflow must be native under .codex")
}
if (Test-Path "CLAUDE.md") {
  $failures.Add("live CLAUDE.md exists; AGENTS.md is the native entry point")
}

Require-Path "AGENTS.md"
Require-Path ".codex"
Require-Path ".codex/gdd/commitment.md"
Require-Path ".codex/gdd/audits/audit-process.md"
Require-Path ".codex/gdd/convergence-tracker.md"
Require-Path ".codex/rules"
Require-Path ".codex/skills"
Require-Path ".codex/scripts/aggregate-audits.py"
Require-Path ".codex/scripts/check-agent-routing.ps1"
Require-Path ".codex/scripts/check-asset-workflow.ps1"
Require-Path ".codex/scripts/test-workflow-e2e.ps1"
Require-Path ".codex/workflow/README.md"
Require-Path ".codex/workflow/agent-routing.md"
Require-Path ".codex/workflow/asset-generation.md"
Require-Path ".codex/workflow/e2e-standards.md"
Require-Path ".codex/workflow/source-target.md"
Require-Path ".codex/skills/generate-asset/SKILL.md"

$systemFiles = @()
if (Test-Path ".codex/gdd/systems") {
  $systemFiles = @(Get-ChildItem ".codex/gdd/systems" -Filter "*.md" -File)
}

$auditFiles = @()
if (Test-Path ".codex/gdd/audits") {
  $auditFiles = @(Get-ChildItem ".codex/gdd/audits" -Filter "*.md" -File |
    Where-Object { $_.Name -notlike "_*" -and $_.Name -ne "audit-process.md" })
}

if ($systemFiles.Count -lt 26) {
  Warn "expected about 26 GDD system docs, found $($systemFiles.Count)"
}
if ($auditFiles.Count -lt 26) {
  Warn "expected 26 audit docs, found $($auditFiles.Count)"
}

$blankMappings = New-Object System.Collections.Generic.List[string]
foreach ($file in $systemFiles) {
  $text = Get-Content -Raw $file.FullName
  $match = [regex]::Match($text, "(?ms)^## Mapping to hex-empires\s*(.*?)(?=^## |\z)")
  if (-not $match.Success) {
    $blankMappings.Add($file.Name)
    continue
  }
  if ($match.Groups[1].Value -match "Populated during implementation") {
    $blankMappings.Add($file.Name)
  }
}

if ($blankMappings.Count -gt 0) {
  Warn ("blank GDD mapping sections: " + ($blankMappings -join ", "))
}

$commitment = ""
if (Test-Path ".codex/gdd/commitment.md") {
  $commitment = Get-Content -Raw ".codex/gdd/commitment.md"
}
if ($commitment -match "1\.3\.0") {
  Warn "local Civ VII target is 1.3.0; source-target.md records official drift to 1.3.2 notes"
}

$tracker = ""
if (Test-Path ".codex/gdd/convergence-tracker.md") {
  $tracker = Get-Content -Raw ".codex/gdd/convergence-tracker.md"
if ($tracker -notmatch "Audits completed:\*\*\s+26 / 26") {
    Warn "convergence tracker does not report 26 / 26 audits completed"
  }
}

$activeWorkflowFiles = @("AGENTS.md") + @(
  Get-ChildItem ".codex/workflow" -Filter "*.md" -File |
    Where-Object { $_.Name -ne "validation-2026-05-01.md" } |
    ForEach-Object { $_.FullName }
)
$framingMatches = New-Object System.Collections.Generic.List[string]
foreach ($file in $activeWorkflowFiles) {
  $text = Get-Content -Raw $file
  if ($text -match "(?i)adapter" -or $text -match "\.claude" -or $text -match "CLAUDE\.md" -or $text -match "claude -p") {
    $framingMatches.Add($file)
  }
}
if ($framingMatches.Count -gt 0) {
  $failures.Add("legacy adapter/runtime references in active workflow docs: $($framingMatches -join ', ')")
}

Write-Output "Codex workflow check"
Write-Output "root: $Root"
Write-Output "branch: $branch"
Write-Output "node_modules: $nodeModules"
Write-Output "server(5174): $server5174"
Write-Output "review queue: $reviewQueue"
Write-Output "review driver: $reviewDriver"
if ($autoFixBranches.Count -gt 0) {
  Write-Output ("auto-fix branches: " + ($autoFixBranches -join ", "))
}
Write-Output "systems: $($systemFiles.Count)"
Write-Output "audits: $($auditFiles.Count)"
Write-Output "blank mappings: $($blankMappings.Count)"
Write-Output "warnings: $($warnings.Count)"
foreach ($warning in $warnings) {
  Write-Output "WARN: $warning"
}

if ($failures.Count -gt 0) {
  Write-Output "failures: $($failures.Count)"
  foreach ($failure in $failures) {
    Write-Output "FAIL: $failure"
  }
  exit 1
}

if ($Mode -eq "strict" -and $blankMappings.Count -gt 0) {
  Write-Output "FAIL: strict mode requires all GDD mapping sections to be populated"
  exit 1
}

Write-Output "result: PASS"
