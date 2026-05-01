---
name: Write tool may show stale reads after writing
description: After using Write to replace a file, the Read tool may return cached old content; use bash head/cat to verify actual disk state
type: feedback
---

After calling Write to overwrite an existing file, a subsequent Read tool call may
return the OLD (pre-write) contents due to caching. The system reminders that appear
after Write show the file contents at the time of the notification, which can appear
to show a revert but may just be a cache artifact.

**Why:** The Read tool caches file contents. The system reminder notification format
shows file state at time of modification event, which can be confusing.

**How to apply:** Always verify actual file state with `bash head -5 /path/to/file`
after a Write that overwrites existing content. If git status shows `M` (modified),
the write succeeded even if Read shows old content.
