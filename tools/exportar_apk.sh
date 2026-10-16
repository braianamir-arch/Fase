#!/usr/bin/env bash
# Exporta juego/ a un APK firmado. Uso: tools/exportar_apk.sh [salida.apk]
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
SALIDA="$(realpath -m "${1:-$RAIZ/build/zomboid.apk}")"
mkdir -p "$(dirname "$SALIDA")"
G="$HOME/.local/godot/godot"
"$G" --headless --path "$RAIZ/juego" --import >/dev/null 2>&1 || true
"$G" --headless --path "$RAIZ/juego" --export-debug Android "$SALIDA" 2>&1 | grep -vE "JAVA_TOOL_OPTIONS|daemon at tcp" | tail -3
ls -la "$SALIDA"
