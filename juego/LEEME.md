# Zomboid (copia privada de Project Zomboid para Android)

Proyecto de **Godot 4.7** (probado con 4.7.2). Uso privado: el APK se pasa a mano, no se publica y el
repositorio tiene que seguir **privado**.

## Instalar en el celular

1. Descargá `zomboid.apk` (lo manda Claude en el chat, o lo exportás vos, ver abajo).
2. Pasalo al celular y abrilo. Android pide permiso para instalar apps de fuentes desconocidas: aceptalo.
3. Para tu amigo, el mismo archivo.

Todas las versiones van firmadas con la misma clave (`juego/firma/zomboid.keystore`), así que una
versión nueva se instala **encima** de la anterior sin perder la partida. Si alguna vez Android dice
"conflicto con un paquete existente", **no desinstales**: avisá.

## Exportar el APK

- **Desde una sesión de Claude Code:** `tools/preparar_android.sh` (una vez por sesión) y después
  `tools/exportar_apk.sh` → queda en `build/zomboid.apk`.
- **Desde tu Godot:** abrí `juego/project.godot`, Proyecto → Exportar → Android → Exportar proyecto.
  En Editor → Configuración del editor → Exportar → Android poné como *Debug Keystore* el archivo
  `juego/firma/zomboid.keystore` (usuario `androiddebugkey`, clave `android`) para que firme igual.

## Cómo se juega (etapa 1)

| Acción | Celular | Teclado | Mando |
|---|---|---|---|
| Caminar | joystick izquierdo | W A S D | stick izquierdo |
| Correr | joystick a fondo | Shift | stick a fondo |
| Esprintar | mantener "Correr" | Alt | gatillo izquierdo |
| Agacharse (sigilo) | botón "Agachar" (prende/apaga) | C | — |
| Atacar / empujar / pisar | botón "Atacar" | Espacio | gatillo derecho o A |
| Abrir puertas, ventanas, agarrar, vendar | mantener apretado sobre la casilla | clic largo | — |
| Inventario / Salud | botones arriba a la derecha | | |
| Contador de cuadros | tocar el reloj | | |

Se guarda solo cada minuto y cuando la app pasa a segundo plano. La muerte es permanente.

## Pruebas

`tools/probar.sh` corre todas las pruebas sin pantalla (baja Godot si no está).
Capturas: `xvfb-run -a ~/.local/godot/godot --rendering-driver opengl3 --path juego -s res://tests/capturas.gd -- pelea`.

## Pendiente de la etapa 1

- **Muldraugh real:** el mapa actual es un barrio provisorio (`tools/barrio_provisorio.py`). Hace falta
  copiar la zona de inicio del mapa original con capturas.
- **Números a confirmar:** `datos/VERIFICAR.md`.
