# Todo en uno

App web para leer en un solo lugar los resúmenes diarios y mensuales de todo lo tuyo,
**ordenados por prioridad** (alta → media → baja; dentro de cada una, por fecha):

- 🏦 Plata en bancos · 💵 Efectivo → suma el **disponible total** por moneda
- 🔁 Suscripciones → costo mensual equivalente y **próximo cobro** (día de cobro fijo)
- 🧾 Cuentas (vencimientos) · ✉️ Gmail · 📱 Redes · 📌 Otros → notas y pendientes

## Usar desde el celular (recomendado)

Abrí **https://braianamir-arch.github.io/Fase/** y en el menú del navegador tocá
"Instalar app" / "Agregar a pantalla de inicio". Se actualiza sola cada vez que se publica
una versión nueva (rama `gh-pages`, que contiene solo los archivos de la app). Tus datos no
están ahí: quedan cifrados en tu teléfono.

Para publicar cambios: copiar `index.html`, `styles.css`, `*.js`, `conectores/`, íconos,
`manifest.webmanifest` y `sw.js` (subiendo su `VERSION`) a la rama `gh-pages`.

## Instalar en Android (APK)

`android/` es una app nativa mínima que muestra esta misma app web desde los archivos del
APK (no carga nada de internet salvo las APIs de las conexiones). Instalá el APK
(permitir "instalar apps de origen desconocido") y al abrirla creá tu PIN.

En el APK funciona todo menos el login de Google (Google bloquea iniciar sesión dentro de
apps como esta). Para tener Gmail y Calendar en el teléfono: conectalos en la versión web
de la computadora, tocá **Exportar** e **Importá** esa copia en el teléfono con su PIN.

Compilar (necesita JDK 17+ y Android SDK 35):

```bash
cd resumen/android
export TODOENUNO_KEYSTORE=/ruta/fuera/del/repo/todoenuno.jks TODOENUNO_KEYSTORE_PASS=...
gradle assembleRelease   # -> app/build/outputs/apk/release/app-release.apk
```

## Seguridad y privacidad

- **Todo cifrado con tu PIN**: entradas, saldos, notas y tokens se guardan con AES-256-GCM
  (clave derivada del PIN con PBKDF2-SHA256, 310.000 iteraciones). Sin el PIN no se pueden leer.
  Los datos viejos sin cifrar se migran y se borran al crear el PIN.
- **Bloqueo automático** a los 5 minutos sin uso o si salís de la app más de 1 minuto;
  esperas crecientes después de PIN incorrectos.
- **Nada sale del dispositivo** salvo las consultas a Google, Mercado Pago, dolarapi y
  CoinGecko. No hay servidor propio ni analítica. Una política de seguridad (CSP) impide que
  la página se conecte a cualquier otro sitio o cargue scripts de terceros.
- **Copias exportadas cifradas** con el PIN: aunque alguien encuentre el archivo, no lo puede leer.
- **En Android**: sin capturas de pantalla ni vista previa en "recientes" (FLAG_SECURE), sin
  copias automáticas a la nube (`allowBackup=false`), sin tráfico HTTP inseguro y los enlaces
  externos se abren en el navegador, nunca dentro de la app.
- **Repo**: `.gitignore` excluye copias, extractos (CSV/OFX), APKs y claves de firma.
- Si olvidás el PIN, los datos no se pueden recuperar (solo con una copia exportada y su PIN).

## Conexiones

En la pestaña **Conexiones**:

| Conexión | Qué trae | Qué necesita |
|---|---|---|
| ✉️ Gmail | Resumen de los últimos 30 días: avisos de bancos y billeteras, recibos de suscripciones (monto y día de cobro), facturas con vencimiento (luz, gas, agua, celular, internet, impuestos, resumen de tarjeta), notificaciones de redes y mails importantes sin leer | ID de cliente OAuth de Google (gratis, una vez) |
| 📅 Google Calendar | Eventos de hoy hasta fin del mes siguiente | El mismo login de Google |
| ▶️ YouTube | Tu canal: suscriptores, vistas y comentarios de la semana | El mismo login de Google + “YouTube Data API v3” habilitada |
| 📸 Instagram + 👍 Facebook | Seguidores, mensajes sin leer, comentarios nuevos y últimas publicaciones | Instagram profesional (creador, gratis) vinculado a una página de Facebook + app de Meta en modo Desarrollo (App ID) |
| 💙 Mercado Pago | Saldo (si la cuenta lo permite) y cobros de 30 días | Access Token de producción |
| 🏦 Cualquier banco/billetera | Saldo, resumen mensual (ingresos, egresos, mayores gastos) y suscripciones detectadas | Extracto CSV u OFX bajado del home banking |
| 💱 Cotizaciones | Dólar (oficial, blue, MEP, CCL, tarjeta, cripto…), euro, real y cripto → total en pesos | Nada (dolarapi.com y CoinGecko) |
| 📱 Otras redes | X, TikTok, WhatsApp, LinkedIn, Discord, Reddit, Twitch, Pinterest | Vía los mails de aviso en Gmail (sus APIs son pagas o solo para empresas aprobadas) |

Todo corre en el navegador, sin servidor propio: la app habla directo con cada API.
El acceso a Google es de solo lectura, dura una hora y no se guarda. El token de Mercado
Pago sí queda guardado en el navegador: usalo solo en un dispositivo propio.
Al abrir la app, las cotizaciones y Mercado Pago se actualizan solos. Google pide un clic
en **⟳ Sincronizar** por el login. Las entradas sincronizadas se reemplazan en cada
sincronización (lo que marcaste como hecho se mantiene) y las cargadas a mano no se tocan.

Para conectar Google, el ID de cliente tiene que tener como “origen autorizado” la
dirección exacta donde abrís la app (por ejemplo `http://localhost:8000` o tu URL de GitHub Pages).

## Vistas

| Pestaña | Muestra |
|---|---|
| Inicio | Totales, lo que vence/cobra en los próximos 7 días y lo de prioridad alta pendiente |
| Hoy | Resumen de un día (entradas diarias, con fecha ese día o que cobran ese día) |
| Mes | Resumen de un mes (entradas mensuales, semanales, diarias, con fecha en el mes y suscripciones) |
| Todo | Todas las entradas agrupadas por categoría |
| Conexiones | Configurar y sincronizar Gmail, Calendar, Mercado Pago, extractos y cotizaciones |

Filtros por categoría, búsqueda y casilla para marcar como hecho (va al final de la lista).

## Uso

Usa módulos ES, así que hay que servirla por HTTP (no abrir el archivo con doble clic):

```bash
cd resumen
python3 -m http.server 8000   # abrir http://localhost:8000
```

En el navegador se puede instalar como app (menú → "Instalar app" / "Agregar a pantalla
de inicio") y abre sin conexión. También funciona en cualquier hosting estático con HTTPS.

## Datos

Se guardan cifrados en el almacenamiento del navegador o del APK, solo en ese dispositivo.
Con **Exportar** bajás una copia cifrada y con **Importar** la combinás en otro dispositivo
(pide el PIN con que se exportó). Igual, no cargues contraseñas ni números de tarjeta: la
app no los necesita.

## Pruebas

```bash
cd resumen && npm test
```
