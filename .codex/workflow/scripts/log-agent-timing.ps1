param(
  [ValidateSet("spawn", "complete")]
  [string]$Event = "complete",
  [string]$Phase = "",
  [string]$AgentId = "",
  [string]$Subagent = "",
  [int]$DurationMs = 0,
  [int]$Tokens = 0,
  [string]$Status = "completed",
  [string]$Notes = "",
  [string]$LogFile = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $ScriptDir "..\..\..")
$LogDir = Join-Path $Root ".codex\workflow\scratch"
if ($LogFile.Length -eq 0) {
  $LogFile = Join-Path $LogDir "agent-timing.jsonl"
} else {
  $LogDir = Split-Path -Parent $LogFile
}
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-JsonLine {
  param([hashtable]$Row)

  $line = ($Row | ConvertTo-Json -Compress) + [Environment]::NewLine
  [System.IO.File]::AppendAllText($LogFile, $line, $Utf8NoBom)
}

function Short-AgentId {
  param([string]$Value)
  if ($Value.Length -eq 0) {
    return ""
  }
  return $Value.Substring(0, [Math]::Min(8, $Value.Length))
}

$now = [DateTimeOffset]::UtcNow
$timestamp = $now.ToString("yyyy-MM-ddTHH:mm:ssZ")
$epoch = $now.ToUnixTimeSeconds()

if ($Event -eq "spawn") {
  $row = [ordered]@{
    kind = "spawn"
    timestamp = $timestamp
    ts_epoch = $epoch
    phase = $Phase
    agent_id = $AgentId
    subagent = $Subagent
  }
  Write-JsonLine $row
  [Console]::Error.WriteLine("[agent-timing] SPAWN $Phase / $Subagent / $(Short-AgentId $AgentId) @ $timestamp")
  exit 0
}

$tokensPerMin = 0
if ($DurationMs -gt 0) {
  $tokensPerMin = [int][Math]::Floor($Tokens * 60000 / $DurationMs)
}

if ($Tokens -le 0) {
  $class = "METRICS_UNAVAILABLE"
} elseif ($tokensPerMin -lt 1000 -and $DurationMs -gt 60000) {
  $class = "HANG_SUSPECT"
} elseif ($tokensPerMin -lt 5000 -and $DurationMs -gt 300000) {
  $class = "SLOW"
} else {
  $class = "HEALTHY"
}

$durationMin = [Math]::Round($DurationMs / 60000, 1)
$row = [ordered]@{
  kind = "complete"
  timestamp = $timestamp
  ts_epoch = $epoch
  phase = $Phase
  agent_id = $AgentId
  subagent = $Subagent
  duration_ms = $DurationMs
  duration_min = $durationMin
  total_tokens = $Tokens
  tokens_per_min = $tokensPerMin
  status = $Status
  class = $class
  notes = if ($Notes.Length -gt 0) { $Notes } else { $null }
}
Write-JsonLine $row
[Console]::Error.WriteLine("[agent-timing] COMPLETE $Phase / $Subagent / $(Short-AgentId $AgentId) - ${durationMin}min / $Tokens tokens / $tokensPerMin tpm / $class")
