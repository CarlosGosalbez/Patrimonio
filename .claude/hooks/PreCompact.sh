#!/usr/bin/env bash

# PreCompact.sh - Hook ejecutado antes de compactar contexto
# Purpose: Guardar estado de sesión antes de comprimir

set -e

echo "💾 Saving session state..."

# Crear archivo de estado
STATE_FILE=".claude/CLAUDE.local.md"

cat > "$STATE_FILE" << EOF
# Session State

**Last Updated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Session Info

\`\`\`json
{
  "session": {
    "started": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "status": "active"
  },
  "completed": [],
  "in_progress": [],
  "next": [],
  "decisions": {},
  "blockers": []
}
\`\`\`

## Recent Activity

- Session context being compacted
- State preserved for restoration

---

*This file is auto-generated and gitignored*
EOF

echo "✓ Session state saved to $STATE_FILE"
exit 0
