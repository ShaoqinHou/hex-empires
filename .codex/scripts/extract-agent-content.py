"""
Reusable utility: extract agent-written content blocks from a Codex session
transcript (JSONL) WITHOUT loading that content into the caller's context
window.

When subagents dump inline content after Write denial, that content ends up
only in the parent's conversation transcript. This script reads the transcript
on disk, pulls every ```markdown fenced block that has a Civ VII fact-card
frontmatter, and writes each block to the correct output path.

Only prints counts to stdout — the content itself never touches stdout.

## Usage

    python .codex/scripts/extract-agent-content.py \
        [--transcript PATH] \
        [--output-root PATH] \
        [--protected CATEGORY,CATEGORY,...] \
        [--dry-run]

Defaults:
- transcript: latest .jsonl in ~/.codex/projects/<this-project>/
- output-root: .codex/gdd/content/
- protected: categories with substantive content already (won't overwrite)
- dry-run: false (writes files)

## What qualifies as a fact card

A fenced ```markdown block containing:
- `**Slug:** \`<slug>\``
- `**Category:** \`<category-tag>\``
- optionally `**Age:** \`<age>\`` (for age-partitioned categories)

Category tags map to output directories via CATEGORY_MAP below.

## Exit codes
- 0: success (count printed)
- 1: no transcript found
- 2: malformed args
"""
import argparse
import glob
import json
import os
import re
import sys


# Match GDD templates — every content card uses these field names
CATEGORY_MAP = {
    'civilization': 'civilizations',
    'leader': 'leaders',
    'unit': 'units',
    'building': 'buildings',
    'wonder': 'wonders',
    'tile-improvement': 'tile-improvements',
    'improvement': 'tile-improvements',
    'technology': 'technologies',
    'civic': 'civics',
    'pantheon': 'pantheons',
    'religion': 'religions',
    'government': 'governments',
    'policy': 'policies',
    'resource': 'resources',
    'crisis-card': 'crisis-cards',
    'crisis': 'crisis-cards',
    'narrative-event': 'narrative-events',
    'independent-power': 'independent-powers',
    'terrain-feature': 'terrains-features',
    'terrain': 'terrains-features',
    'memento': 'mementos',
}

# Categories that organize by age subdirectory
AGE_SUBDIRS = {'civilizations', 'units', 'technologies', 'civics', 'crisis-cards'}


def find_big_texts(obj, found):
    """Recursively collect all long string leaves containing fact-card markers."""
    if isinstance(obj, str):
        if len(obj) > 5000 and ('```markdown' in obj or '**Slug:**' in obj):
            found.append(obj)
        return
    if isinstance(obj, dict):
        for v in obj.values():
            find_big_texts(v, found)
    elif isinstance(obj, list):
        for v in obj:
            find_big_texts(v, found)


def default_transcript_path():
    """Find the most recently modified project transcript."""
    home = os.path.expanduser('~')
    # Derive project dir name from current working directory
    cwd = os.getcwd().replace('\\', '/').replace(':', '-').replace('/', '-').replace('--', '-').lstrip('-')
    cwd = 'C--' + cwd if not cwd.startswith('C-') else cwd
    patterns = [
        os.path.join(home, '.codex', 'projects', cwd, '*.jsonl'),
        os.path.join(home, '.codex', 'projects', '*hex-empires*', '*.jsonl'),
    ]
    for pat in patterns:
        matches = glob.glob(pat)
        if matches:
            matches.sort(key=os.path.getmtime, reverse=True)
            return matches[0]
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--transcript', help='Path to JSONL transcript')
    ap.add_argument('--output-root', default='.codex/gdd/content',
                    help='Where to write extracted fact cards')
    ap.add_argument('--protected', default='',
                    help='Comma-separated category slugs to skip if already substantive')
    ap.add_argument('--dry-run', action='store_true',
                    help='Report what would be written; do not write')
    ap.add_argument('--min-existing-size', type=int, default=1500,
                    help='Do not overwrite files larger than this many bytes')
    args = ap.parse_args()

    transcript = args.transcript or default_transcript_path()
    if not transcript or not os.path.exists(transcript):
        print(f'ERROR: no transcript found (tried {transcript})', file=sys.stderr)
        return 1

    protected = set(s.strip() for s in args.protected.split(',') if s.strip())

    print(f'Transcript: {os.path.basename(transcript)} ({os.path.getsize(transcript)//1024} KB)')
    print(f'Output root: {args.output_root}')
    if protected:
        print(f'Protected categories: {sorted(protected)}')
    if args.dry_run:
        print('Mode: DRY RUN (no files written)')

    # Collect all big-text blobs from events
    big_blobs = []
    with open(transcript, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
            except Exception:
                continue
            find_big_texts(ev, big_blobs)

    joined = '\n\n'.join(big_blobs)

    # Find fenced markdown blocks
    fence_re = re.compile(r'```markdown\s*\n(.*?)\n```', re.DOTALL)
    blocks = fence_re.findall(joined)

    # Required frontmatter regexes
    slug_re = re.compile(r'^\*\*Slug:\*\*\s*`([^`]+)`', re.MULTILINE)
    cat_re = re.compile(r'^\*\*Category:\*\*\s*`([^`]+)`', re.MULTILINE)
    age_re = re.compile(r'^\*\*Age:\*\*\s*`([^`]+)`', re.MULTILINE)

    written = {}
    seen = set()
    skipped_protected = 0
    skipped_existing = 0
    malformed = 0

    for block in blocks:
        sm = slug_re.search(block)
        cm = cat_re.search(block)
        if not sm or not cm:
            malformed += 1
            continue
        slug = sm.group(1).strip()
        cat_tag = cm.group(1).strip()
        target_dir = CATEGORY_MAP.get(cat_tag)
        if not target_dir:
            malformed += 1
            continue
        if target_dir in protected:
            skipped_protected += 1
            continue
        am = age_re.search(block)
        age = am.group(1).strip() if am else None
        if target_dir in AGE_SUBDIRS and age in ('antiquity', 'exploration', 'modern'):
            rel = os.path.join(age, slug + '.md')
        else:
            rel = slug + '.md'
        target = os.path.join(args.output_root, target_dir, rel)
        if target in seen:
            continue
        seen.add(target)

        if os.path.exists(target) and os.path.getsize(target) > args.min_existing_size:
            skipped_existing += 1
            continue

        if not args.dry_run:
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, 'w', encoding='utf-8') as f:
                f.write(block.rstrip() + '\n')

        written[target_dir] = written.get(target_dir, 0) + 1

    total = sum(written.values())
    print(f'\n=== Extraction: {total} blocks {"would be " if args.dry_run else ""}written ===')
    for cat in sorted(written):
        print(f'  {cat}: {written[cat]}')
    print(f'\nSkipped (protected): {skipped_protected}')
    print(f'Skipped (existing larger than min size): {skipped_existing}')
    print(f'Malformed (no slug/category): {malformed}')
    print(f'Total fenced blocks found: {len(blocks)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
