# overview_yaml.py — minimal, zero-dependency parser for overview.yaml's documented shape
# (agents/planner.md § Write overview.yaml / § Field rules). Not a general YAML parser: it only
# understands the constrained subset overview.yaml is specified to use — top-level scalars, a
# flow list (`key: []` / `key: [a, b]`), a block list (`key:` then `  - item` lines), a block
# scalar (`key: |` literal or `key: >` folded, then indented prose — seen in the wild on
# `description:`/`files:` for long free-text values), and one `phases:` block whose entries are
# `- id: <x>` followed by 4-space-indented `key: value` (or nested block) fields. Shared by
# check-overview.sh's schema and graph modes so both use exactly the same parse.
import re


def _strip_comment(s):
    idx = s.find(" #")
    return s[:idx] if idx != -1 else s


def _unquote(s):
    s = s.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "\"'":
        return s[1:-1]
    return s


def _parse_flow_list(val):
    inner = val[1:-1].strip()
    if not inner:
        return []
    return [_unquote(x.strip()) for x in inner.split(",")]


def _parse_scalar_or_flowlist(val):
    val = val.strip()
    if val.startswith("[") and val.endswith("]"):
        return _parse_flow_list(val)
    return _unquote(val)


# Fields the schema documents as list-typed (agents/planner.md § Field rules) but that a
# malformed overview.yaml might write without brackets (`depends_on: db` instead of `[db]`).
# Coerced to a list either way so a consumer iterating "for x in field" never silently walks a
# string character-by-character — `files` is the only one the spec itself allows bare (comma-
# separated string OR list); the rest are coerced defensively, not because bare is valid for them.
LIST_FIELDS_TOP = {"related_tasks"}
LIST_FIELDS_PHASE = {"files", "depends_on", "skills_hint", "blocks_deploy_of"}


def _parse_list_field(val):
    val = val.strip()
    if val.startswith("[") and val.endswith("]"):
        return _parse_flow_list(val)
    return [_unquote(x.strip()) for x in val.split(",")] if val else []


_BLOCK_SCALAR_RE = re.compile(r"^([|>])[+-]?\d*$")


def _collect_block_scalar(lines, i, base_indent, folded):
    """`key: |` (literal) or `key: >` (folded) — the value is every subsequent line indented
    deeper than the key, joined with '\\n' (literal) or ' ' (folded, blank lines become '\\n').
    Chomping indicators (-/+) and explicit indent digits are accepted in the indicator but not
    otherwise honored — this parser only needs the joined text, not exact YAML round-tripping."""
    content = []
    n = len(lines)
    while i < n:
        line = lines[i]
        if not line.strip():
            content.append("")
            i += 1
            continue
        indent = len(line) - len(line.lstrip(" "))
        if indent <= base_indent:
            break
        content.append(line.strip())
        i += 1
    while content and content[-1] == "":
        content.pop()
    joined = " ".join(content) if folded else "\n".join(content)
    return joined, i


def parse_overview(text):
    """Returns (top: dict, phases: list[dict]). Malformed/unrecognized lines are skipped, not
    fatal — callers should treat missing expected keys as their own validation findings."""
    lines = text.split("\n")
    top = {}
    phases = []
    i, n = 0, len(lines)
    while i < n:
        line = lines[i]
        if not line.strip() or line.lstrip().startswith("#"):
            i += 1
            continue
        indent = len(line) - len(line.lstrip(" "))
        if indent != 0:
            i += 1
            continue
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$", line)
        if not m:
            i += 1
            continue
        key, val = m.group(1), _strip_comment(m.group(2)).strip()
        if key == "phases":
            phases, i = _parse_phases(lines, i + 1)
            continue
        bsm = _BLOCK_SCALAR_RE.match(val)
        if val == "":
            items, i = _collect_block_list(lines, i + 1, base_indent=0)
            top[key] = items
        elif bsm:
            text, i = _collect_block_scalar(lines, i + 1, base_indent=0, folded=bsm.group(1) == ">")
            top[key] = _parse_list_field(text) if key in LIST_FIELDS_TOP else text
        elif key in LIST_FIELDS_TOP:
            top[key] = _parse_list_field(val)
            i += 1
        else:
            top[key] = _parse_scalar_or_flowlist(val)
            i += 1
    return top, phases


def _collect_block_list(lines, i, base_indent):
    items = []
    n = len(lines)
    while i < n:
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        indent = len(line) - len(line.lstrip(" "))
        if indent <= base_indent or not line.lstrip().startswith("- "):
            break
        items.append(_unquote(_strip_comment(line.lstrip()[2:]).strip()))
        i += 1
    return items, i


def _parse_phases(lines, i):
    n = len(lines)
    phases = []
    cur = None
    while i < n:
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        indent = len(line) - len(line.lstrip(" "))
        if indent == 0:
            break
        stripped = line.strip()
        if stripped.startswith("- id:"):
            if cur is not None:
                phases.append(cur)
            cur = {"id": _unquote(_strip_comment(stripped[len("- id:"):]).strip())}
            i += 1
            continue
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$", stripped)
        if m and cur is not None:
            key, val = m.group(1), _strip_comment(m.group(2)).strip()
            bsm = _BLOCK_SCALAR_RE.match(val)
            if val == "":
                field_indent = indent
                items, i = _collect_block_list(lines, i + 1, base_indent=field_indent)
                cur[key] = items
            elif bsm:
                text, i = _collect_block_scalar(lines, i + 1, base_indent=indent, folded=bsm.group(1) == ">")
                cur[key] = _parse_list_field(text) if key in LIST_FIELDS_PHASE else text
            else:
                if key in LIST_FIELDS_PHASE:
                    cur[key] = _parse_list_field(val)
                else:
                    cur[key] = _parse_scalar_or_flowlist(val)
                i += 1
            continue
        i += 1
    if cur is not None:
        phases.append(cur)
    return phases, i
