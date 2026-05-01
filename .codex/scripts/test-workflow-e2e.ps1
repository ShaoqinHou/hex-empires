param(
  [switch]$SkipAggregateCheck
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $ScriptDir "..\..")
Set-Location $Root

$failures = New-Object System.Collections.Generic.List[string]

function Fail {
  param([string]$Message)
  $failures.Add($Message)
}

function Run-Step {
  param(
    [string]$Name,
    [scriptblock]$Block
  )
  Write-Output "== $Name =="
  try {
    & $Block
  } catch {
    Fail "$Name failed: $($_.Exception.Message)"
  }
}

Run-Step "git-root" {
  $top = (& git rev-parse --show-toplevel).Trim()
  $rootNorm = ((Resolve-Path $Root).Path -replace "\\", "/").TrimEnd("/")
  $topNorm = ($top -replace "\\", "/").TrimEnd("/")
  if ($rootNorm.ToLowerInvariant() -ne $topNorm.ToLowerInvariant()) {
    throw "expected $rootNorm, got $topNorm"
  }
  Write-Output "root: $top"
}

Run-Step "native-paths" {
  if (Test-Path ".claude") {
    throw "live .claude directory exists"
  }
  if (Test-Path "CLAUDE.md") {
    throw "live CLAUDE.md exists"
  }
  foreach ($path in @(
    "AGENTS.md",
    ".codex/gdd",
    ".codex/rules",
    ".codex/skills",
    ".codex/scripts",
    ".codex/workflow/e2e-standards.md"
  )) {
    if (-not (Test-Path $path)) {
      throw "missing native path: $path"
    }
  }
  Write-Output "native paths present"
}

Run-Step "workflow-framing" {
  $activeFiles = @("AGENTS.md") + @(
    Get-ChildItem ".codex/workflow" -Filter "*.md" -File |
      Where-Object { $_.Name -ne "validation-2026-05-01.md" } |
      ForEach-Object { $_.FullName }
  )
  $bad = New-Object System.Collections.Generic.List[string]
  foreach ($file in $activeFiles) {
    $text = Get-Content -Raw $file
    if ($text -match "(?i)adapter" -or $text -match "\.claude" -or $text -match "CLAUDE\.md") {
      $bad.Add($file)
    }
  }
  if ($bad.Count -gt 0) {
    throw "legacy framing in active docs: $($bad -join ', ')"
  }
  Write-Output "active workflow docs are native"
}

Run-Step "workflow-check-strict" {
  powershell -NoProfile -ExecutionPolicy Bypass -File ".codex/scripts/check-workflow.ps1" -Mode strict
}

if (-not $SkipAggregateCheck) {
  Run-Step "aggregate-check" {
    python ".codex/scripts/aggregate-audits.py" --check
  }
}

Run-Step "script-compile" {
  python -m py_compile ".codex/scripts/aggregate-audits.py"
}

Run-Step "audit-history" {
  $tracker = Get-Content -Raw ".codex/gdd/convergence-tracker.md"
  if ($tracker -notmatch "Audits completed:\*\*\s+26 / 26") {
    throw "tracker does not show 26 / 26 audits"
  }
  if ($tracker -notmatch "\*\*Total findings\*\*.+\*\*266\*\*") {
    throw "tracker total findings is not 266"
  }
  $blank = Select-String -Path ".codex/gdd/systems/*.md" -Pattern "Populated during implementation"
  if ($blank) {
    throw "blank mapping sections remain"
  }
  Write-Output "audit tracker and mappings are populated"
}

Run-Step "git-history" {
  $current = (& git rev-parse --short HEAD).Trim()
  $previous = (& git rev-parse --short HEAD~1).Trim()
  Write-Output "HEAD: $current"
  Write-Output "previous: $previous"
  $renames = @(& git status --short | Where-Object { $_ -match "^R" })
  Write-Output "pending renames: $($renames.Count)"
}

if ($failures.Count -gt 0) {
  Write-Output "Workflow E2E result: FAIL"
  foreach ($failure in $failures) {
    Write-Output "FAIL: $failure"
  }
  exit 1
}

Write-Output "Workflow E2E result: PASS"
