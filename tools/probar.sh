#!/usr/bin/env bash
# Corre todas las pruebas de juego/tests/test_*.gd. Sale con 1 si alguna falla.
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
G="$HOME/.local/godot/godot"
[ -x "$G" ] || "$RAIZ/tools/instalar_godot.sh" >/dev/null
"$G" --headless --path "$RAIZ/juego" --import >/dev/null 2>&1
SALIDA=$("$G" --headless --path "$RAIZ/juego" -s res://tests/correr.gd -- "$@" 2>&1)
CODIGO=$?
# Avisos de limpieza al salir (nodos de prueba sin árbol) no son fallas.
echo "$SALIDA" | grep -vE "^Godot Engine|^$|leaked|still in use|^ +at: (clear|cleanup|_free_rids)"
# Un error de GDScript en medio de una prueba no la corta: también cuenta como falla.
if echo "$SALIDA" | grep -qE "SCRIPT ERROR|Parse Error"; then echo "FALLA: hubo errores de script"; exit 1; fi
exit $CODIGO
