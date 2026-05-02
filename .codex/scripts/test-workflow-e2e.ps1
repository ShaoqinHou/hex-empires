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
    $global:LASTEXITCODE = 0
    & $Block
    if ($LASTEXITCODE -ne 0) {
      throw "$Name exited with code $LASTEXITCODE"
    }
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

Run-Step "agent-routing-check" {
  powershell -NoProfile -ExecutionPolicy Bypass -File ".codex/scripts/check-agent-routing.ps1"
}

Run-Step "shell-script-eol" {
  $bad = @()
  Get-ChildItem ".codex" -Recurse -Filter "*.sh" | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    if ([Array]::IndexOf($bytes, [byte]13) -ge 0) {
      $bad += $_.FullName
    }
  }
  if ($bad.Count -gt 0) {
    throw "shell scripts must use LF endings: $($bad -join ', ')"
  }
  Write-Output "shell scripts use LF endings"
}

Run-Step "agent-timing-powershell" {
  $tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("hex-empires-agent-timing-" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
  $tmpLog = Join-Path $tmpDir "agent-timing.jsonl"
  try {
    powershell -NoProfile -ExecutionPolicy Bypass -File ".codex/workflow/scripts/log-agent-timing.ps1" `
      -Event spawn -Phase "workflow-e2e" -AgentId "test-agent" -Subagent "tester" -LogFile $tmpLog | Out-Null
    powershell -NoProfile -ExecutionPolicy Bypass -File ".codex/workflow/scripts/log-agent-timing.ps1" `
      -Event complete -Phase "workflow-e2e" -AgentId "test-agent" -Subagent "tester" `
      -DurationMs 1000 -Tokens 100 -Status completed -Notes "e2e" -LogFile $tmpLog | Out-Null
    powershell -NoProfile -ExecutionPolicy Bypass -File ".codex/workflow/scripts/log-agent-timing.ps1" `
      -Event complete -Phase "workflow-e2e-no-metrics" -AgentId "test-agent-2" -Subagent "tester" `
      -DurationMs 150000 -Tokens 0 -Status completed -Notes "metrics unavailable" -LogFile $tmpLog | Out-Null

    $rows = Get-Content $tmpLog | ForEach-Object { $_ | ConvertFrom-Json }
    if ($rows.Count -ne 3 -or $rows[0].kind -ne "spawn" -or $rows[1].kind -ne "complete" -or $rows[2].kind -ne "complete") {
      throw "unexpected timing rows"
    }
    if ($rows[2].class -ne "METRICS_UNAVAILABLE") {
      throw "token-unavailable timing row misclassified as $($rows[2].class)"
    }
  } finally {
    Remove-Item -LiteralPath $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
  }
  Write-Output "agent timing PowerShell logger works"
}

Run-Step "spawn-worktree-safety-doc" {
  $skill = Get-Content -Raw ".codex/skills/spawn-worktree/SKILL.md"
  if ($skill -match 'WORKTREE_DIR="\s*\.codex/worktrees/' -or $skill -match "WORKTREE_DIR='\s*\.codex/worktrees/") {
    throw "spawn-worktree skill still instructs nested .codex/worktrees creation"
  }
  foreach ($required in @(
    "outside the current repo",
    "Do not place agent worktrees under this repository",
    "git rev-parse --show-toplevel",
    "Unsafe worktree",
    "isolated clone fallback",
    "agent-clones",
    "git clone --branch",
    "Unsafe clone"
  )) {
    if ($skill -notmatch [regex]::Escape($required)) {
      throw "spawn-worktree skill missing safety guidance: $required"
    }
  }
  Write-Output "spawn-worktree safety documented"
}

Run-Step "asset-workflow-check" {
  powershell -NoProfile -ExecutionPolicy Bypass -File ".codex/scripts/check-asset-workflow.ps1"
}

Run-Step "browser-e2e-build-order" {
  $e2eStandards = Get-Content -Raw ".codex/workflow/e2e-standards.md"
  $processChecklist = Get-Content -Raw ".codex/workflow/process-checklist.md"
  foreach ($doc in @(
    @{ Name = "e2e-standards"; Text = $e2eStandards },
    @{ Name = "process-checklist"; Text = $processChecklist }
  )) {
    if ($doc.Text -notmatch "build:deploy" -or $doc.Text -notmatch "(?is)before\s+Playwright") {
      throw "$($doc.Name) does not document deploy build before Playwright"
    }
  }
  Write-Output "browser e2e build order documented"
}

if (-not $SkipAggregateCheck) {
  Run-Step "aggregate-check" {
    python ".codex/scripts/aggregate-audits.py" --check
  }
}

Run-Step "script-compile" {
  python -B -m py_compile ".codex/scripts/aggregate-audits.py"
  Remove-Item -LiteralPath ".codex/scripts/__pycache__" -Recurse -Force -ErrorAction SilentlyContinue
}

Run-Step "audit-history" {
  $tracker = Get-Content -Raw ".codex/gdd/convergence-tracker.md"
  if ($tracker -notmatch "Audits completed:\*\*\s+26 / 26") {
    throw "tracker does not show 26 / 26 audits"
  }
  $totalMatch = [regex]::Match($tracker, "\| \*\*Total findings\*\* \| \*\*(\d+)\*\* \|")
  if (-not $totalMatch.Success) {
    throw "tracker total findings row missing"
  }
  $totalFindings = [int]$totalMatch.Groups[1].Value
  if ($totalFindings -le 0) {
    throw "tracker total findings is not positive"
  }
  $rowPattern = "^\| [^|]+ \| ``\.codex/gdd/audits/[^``]+`` \| (\d+) \|"
  $rows = [regex]::Matches($tracker, $rowPattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)
  $sum = 0
  foreach ($row in $rows) {
    $sum += [int]$row.Groups[1].Value
  }
  if ($sum -ne $totalFindings) {
    throw "tracker total findings $totalFindings does not match audit row sum $sum"
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
