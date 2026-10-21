# Todo en uno

App web para leer en un solo lugar los resúmenes diarios y mensuales de todo lo tuyo,
**ordenados por prioridad** (alta → media → baja; dentro de cada una, por fecha):

- 🏦 Plata en bancos · 💵 Efectivo → suma el **disponible total** por moneda
- 🔁 Suscripciones → costo mensual equivalente y **próximo cobro** (día de cobro fijo)
- 🧾 Cuentas (vencimientos) · ✉️ Gmail · 📱 Redes · 📌 Otros → notas y pendientes

## Vistas

| Pestaña | Muestra |
|---|---|
| Inicio | Totales, lo que vence/cobra en los próximos 7 días y lo de prioridad alta pendiente |
| Hoy | Resumen de un día (entradas diarias, con fecha ese día o que cobran ese día) |
| Mes | Resumen de un mes (entradas mensuales, semanales, diarias, con fecha en el mes y suscripciones) |
| Todo | Todas las entradas agrupadas por categoría |

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
