#!/usr/bin/env bash

# PostToolUse.sh - Hook ejecutado después de usar herramientas
# Purpose: Validación post-acción y cleanup

set -e

TOOL_NAME="${1:-unknown}"
TOOL_STATUS="${2:-unknown}"

# Solo validar en tools críticos
case "$TOOL_NAME" in
  "create_file"|"replace_string_in_file"|"multi_replace_string_in_file")
    # Verificar sintaxis TypeScript si modificamos .ts/.tsx
    if [ "$TOOL_STATUS" = "success" ]; then
      echo "✓ File operation completed"
      
      # TypeScript check (opcional, no bloquea)
      if [ -f "tsconfig.json" ] && command -v tsc &> /dev/null; then
        if ! tsc --noEmit &> /dev/null; then
          echo "⚠️  TypeScript errors detected (non-blocking)"
        fi
      fi
    fi
    ;;
    
  "run_in_terminal")
    if [ "$TOOL_STATUS" = "success" ]; then
      echo "✓ Command executed successfully"
    fi
    ;;
esac

exit 0
