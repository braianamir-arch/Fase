# Todo en uno

App web para leer en un solo lugar los resúmenes diarios y mensuales de todo lo tuyo,
**ordenados por prioridad** (alta → media → baja; dentro de cada una, por fecha):

- 🏦 Plata en bancos · 💵 Efectivo → suma el **disponible total** por moneda
- 🔁 Suscripciones → costo mensual equivalente y **próximo cobro** (día de cobro fijo)
- 🧾 Cuentas (vencimientos) · ✉️ Gmail · 📱 Redes · 📌 Otros → notas y pendientes

## Conexiones

En la pestaña **Conexiones**:

| Conexión | Qué trae | Qué necesita |
|---|---|---|
| ✉️ Gmail | Resumen de los últimos 30 días: avisos de bancos y billeteras, recibos de suscripciones (monto y día de cobro), facturas con vencimiento (luz, gas, agua, celular, internet, impuestos, resumen de tarjeta), notificaciones de redes y mails importantes sin leer | ID de cliente OAuth de Google (gratis, una vez) |
| 📅 Google Calendar | Eventos de hoy hasta fin del mes siguiente | El mismo login de Google |
| 💙 Mercado Pago | Saldo (si la cuenta lo permite) y cobros de 30 días | Access Token de producción |
| 🏦 Cualquier banco/billetera | Saldo, resumen mensual (ingresos, egresos, mayores gastos) y suscripciones detectadas | Extracto CSV u OFX bajado del home banking |
| 💱 Cotizaciones | Dólar (oficial, blue, MEP, CCL, tarjeta, cripto…), euro, real y cripto → total en pesos | Nada (dolarapi.com y CoinGecko) |
| 📱 Redes | Instagram, Facebook, X, TikTok, YouTube, LinkedIn, WhatsApp, Discord, Reddit, Twitch, Pinterest | Vía los mails de aviso en Gmail (sus APIs no dan acceso a notificaciones personales) |

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

También funciona tal cual en GitHub Pages o cualquier hosting estático.

## Datos

Se guardan en `localStorage` del navegador (solo en ese dispositivo, **sin cifrar**:
no cargues contraseñas, claves ni números de tarjeta). Con **Exportar** bajás una copia
JSON y con **Importar** la cargás en otro dispositivo.

## Pruebas

```bash
cd resumen && npm test
```
