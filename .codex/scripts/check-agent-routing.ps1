param()

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $ScriptDir "..\..")
Set-Location $Root

$failures = New-Object System.Collections.Generic.List[string]

function Fail {
  param([string]$Message)
  $failures.Add($Message)
}

$agentRoutingPath = ".codex/workflow/agent-routing.md"
if (-not (Test-Path $agentRoutingPath)) {
  Fail "missing path: $agentRoutingPath"
} else {
  $text = Get-Content -Raw $agentRoutingPath

  if ($text -notmatch "(?i)gpt-5\.3[- ]?codex[- ]?spark") {
    Fail "agent-routing must mention GPT-5.3-Codex-Spark/gpt-5.3-codex-spark"
  }
  if ($text -notmatch "(?i)\blead[- ]?owned review gate\b|\blead review gate\b") {
    Fail "agent-routing must include a lead-owned review gate"
  }
  if ($text -notmatch "(?i)\bbounded\b") {
    Fail "agent-routing must include bounded worker prompts/tasks"
  }
  if ($text -notmatch "(?i)disjoint write") {
    Fail "agent-routing must include disjoint write scope language"
  }
  if ($text -notmatch "(?i)escalat|takeover") {
    Fail "agent-routing must include escalation/takeover rules"
  }
  if ($text -notmatch "(?i)deterministic") {
    Fail "agent-routing must describe deterministic checks"
  }
  if ($text -notmatch "(?i)do not.*automatically.*(call|spawn).*(spark|model)") {
    Fail "agent-routing must state deterministic scripts do not spawn models automatically"
  }
}

$retiredAlias = "G" + "LM"
$activePathsPattern = "(?i)\b" + $retiredAlias + "\b.*\b(routing|routed|route|agent|model|worker)|\b(routing|routed|route|agent|model|worker).*?\b" + $retiredAlias + "\b"
$activeWorkflowFiles = @(
  "AGENTS.md"
) + @(
  Get-ChildItem ".codex/workflow" -Filter "*.md" -File |
    Where-Object { $_.Name -ne "validation-2026-05-01.md" } |
    ForEach-Object { $_.FullName }
)
$retiredRoutingDocs = New-Object System.Collections.Generic.List[string]
foreach ($path in $activeWorkflowFiles) {
  if (-not (Test-Path $path)) {
    continue
  }
  $hit = Select-String -Path $path -Pattern $activePathsPattern -SimpleMatch:$false -ErrorAction SilentlyContinue
  if ($hit) {
    $retiredRoutingDocs.Add($path)
  }
}
if ($retiredRoutingDocs.Count -gt 0) {
  Fail "active workflow docs reference a legacy model-routing alias in routing context: $($retiredRoutingDocs -join ', ')"
}

if ($failures.Count -gt 0) {
  Write-Output "Agent routing check: FAIL"
  foreach ($failure in $failures) {
    Write-Output "FAIL: $failure"
  }
  exit 1
}

Write-Output "Agent routing check: PASS"
