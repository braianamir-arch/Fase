#!/usr/bin/env bash
# Instala Godot 4.7.2 (sin pantalla), sus plantillas de exportación y el SDK de Android
# para poder exportar el APK desde esta máquina. Tarda unos minutos la primera vez.
# Uso: tools/preparar_android.sh   y después:  tools/exportar_apk.sh
set -euo pipefail
V=4.7.2-stable
GD="$HOME/.local/godot"; SDK="$HOME/.local/android/sdk"; KS="$HOME/.local/android/debug.keystore"
TPL="$HOME/.local/share/godot/export_templates/${V/-/.}"
mkdir -p "$GD" "$SDK/cmdline-tools" "$TPL"

if [ ! -x "$GD/godot" ]; then
  curl -sSL -o "$GD/godot.zip" "https://github.com/godotengine/godot/releases/download/$V/Godot_v${V}_linux.x86_64.zip"
  unzip -oq "$GD/godot.zip" -d "$GD" && rm "$GD/godot.zip"
  ln -sf "Godot_v${V}_linux.x86_64" "$GD/godot"
fi
if [ ! -f "$TPL/android_release.apk" ]; then
  T=$(mktemp -d)
  curl -sSL -o "$T/t.tpz" "https://github.com/godotengine/godot/releases/download/$V/Godot_v${V}_export_templates.tpz"
  unzip -oq "$T/t.tpz" -d "$T" && mv "$T"/templates/* "$TPL/" && rm -rf "$T"
fi
if [ ! -x "$SDK/build-tools/35.0.0/apksigner" ]; then
  T=$(mktemp -d)
  curl -sS -o "$T/c.zip" "https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip"
  unzip -oq "$T/c.zip" -d "$T" && rm -rf "$SDK/cmdline-tools/latest" && mv "$T/cmdline-tools" "$SDK/cmdline-tools/latest" && rm -rf "$T"
  yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" "platform-tools" "build-tools;35.0.0" "platforms;android-35" >/dev/null
fi
# Clave para firmar. Si se pierde, el APK nuevo no se instala encima del viejo.
if [ ! -f "$KS" ]; then
  if [ -n "${ZOMBOID_KEYSTORE_B64:-}" ]; then
    echo "$ZOMBOID_KEYSTORE_B64" | base64 -d > "$KS"
  else
    keytool -genkeypair -keystore "$KS" -storepass android -alias androiddebugkey -keypass android \
      -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" >/dev/null 2>&1
    echo "AVISO: se creó una clave nueva en $KS (ver juego/LEEME.md)."
  fi
fi
# Rutas en la configuración del editor de Godot.
"$GD/godot" --headless --editor --quit >/dev/null 2>&1 || true
python3 - "$SDK" "$KS" <<'PY'
import os, re, sys
f = os.path.expanduser("~/.config/godot/editor_settings-4.7.tres")
s = open(f).read()
vals = {"export/android/android_sdk_path": sys.argv[1], "export/android/java_sdk_path": "/usr/lib/jvm/java-21-openjdk-amd64",
        "export/android/debug_keystore": sys.argv[2], "export/android/debug_keystore_user": "androiddebugkey",
        "export/android/debug_keystore_pass": "android"}
for k, v in vals.items():
    s = re.sub(r"^" + re.escape(k) + r" = .*\n", "", s, flags=re.M)
    s = s.rstrip("\n") + f'\n{k} = "{v}"\n'
open(f, "w").write(s)
PY
echo "Listo: $("$GD/godot" --version | tail -1)"
