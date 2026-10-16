#!/usr/bin/env bash
# Descarga Godot 4.7.2 (Linux, sirve sin pantalla) a ~/.local/godot para correr las pruebas.
set -euo pipefail
V=4.7.2-stable; GD="$HOME/.local/godot"
mkdir -p "$GD"
if [ ! -x "$GD/godot" ]; then
  curl -sSL -o "$GD/godot.zip" "https://github.com/godotengine/godot/releases/download/$V/Godot_v${V}_linux.x86_64.zip"
  unzip -oq "$GD/godot.zip" -d "$GD" && rm "$GD/godot.zip"
  ln -sf "Godot_v${V}_linux.x86_64" "$GD/godot"
fi
"$GD/godot" --version | tail -1
