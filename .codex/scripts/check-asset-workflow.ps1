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

function Require-Path {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    Fail "missing path: $Path"
  }
}

function Require-Text {
  param(
    [string]$Path,
    [string]$Pattern,
    [string]$Label
  )
  if (-not (Test-Path $Path)) {
    return
  }
  $text = Get-Content -Raw $Path
  if ($text -notmatch $Pattern) {
    Fail "$Path missing $Label"
  }
}

$assetDoc = ".codex/workflow/asset-generation.md"
$assetSkill = ".codex/skills/generate-asset/SKILL.md"

Require-Path $assetDoc
Require-Path $assetSkill
Require-Path ".codex/skills/generate-asset/agents/openai.yaml"

Require-Text $assetDoc "gpt-image-2" "official GPT Image 2 model name"
Require-Text $assetDoc "OpenAI" "OpenAI source rule"
Require-Text $assetDoc "Do not use stock art" "non-OpenAI asset-source ban"
Require-Text $assetDoc "team color mask" "team color mask standard"
Require-Text $assetDoc "8 directions" "unit direction count"
Require-Text $assetDoc "idle villager" "still-pilot example"
Require-Text $assetDoc "Manifest Fields" "asset manifest schema"
Require-Text $assetDoc "Animation Plan" "animation transition plan"
Require-Text $assetDoc "assets:validate" "asset validation command"
Require-Text $assetSkill "asset-generation\.md" "link to asset workflow"
Require-Text $assetSkill "gpt-image-2" "official model in skill"

$legacyNames = @(("G" + "LM"), ("Q" + "wen"))
$legacyPattern = "(?i)\b(" + (($legacyNames | ForEach-Object { [regex]::Escape($_) }) -join "|") + ")\b"
$textExtensions = New-Object System.Collections.Generic.HashSet[string]([StringComparer]::OrdinalIgnoreCase)
@(".md", ".ps1", ".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml", ".txt", ".css") |
  ForEach-Object { [void]$textExtensions.Add($_) }

$scanFiles = @("AGENTS.md") + @(
  Get-ChildItem ".codex" -Recurse -File |
    Where-Object {
      $_.FullName -notlike "*\scripts\check-asset-workflow.ps1" -and
      $textExtensions.Contains($_.Extension)
    } |
    ForEach-Object { $_.FullName }
)

$legacyHits = New-Object System.Collections.Generic.List[string]
foreach ($file in $scanFiles) {
  $hit = Select-String -Path $file -Pattern $legacyPattern -List -ErrorAction SilentlyContinue
  if ($hit) {
    $legacyHits.Add($file)
  }
}

if ($legacyHits.Count -gt 0) {
  Fail "legacy model routing terms remain: $($legacyHits -join ', ')"
}

if ($failures.Count -gt 0) {
  Write-Output "Asset workflow check: FAIL"
  foreach ($failure in $failures) {
    Write-Output "FAIL: $failure"
  }
  exit 1
}

Write-Output "Asset workflow check: PASS"
