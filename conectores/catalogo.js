// Catálogo de conexiones agrupado, con el método de cada una y un mini tutorial.
// metodo: "api" (conexión directa), "gmail" (se lee de los mails de aviso), "numero"
// (número de cuenta + acceso directo), "auto" (no necesita nada).
import { SERVICIOS } from "./gmail.js";
import { PROVEEDORES } from "./servicios.js";

const pasosGmail = (nombre, donde = "Configuración → Notificaciones") => [
  "Conectá Google (grupo Google, arriba) si todavía no lo hiciste.",
  `En ${nombre}, entrá a ${donde} y activá los avisos por correo electrónico.`,
  "Usá el mismo Gmail que conectaste. Desde el próximo aviso, aparece solo acá.",
];

const deGmail = (lista, extra = {}) => lista.map(([id, nombre]) => ({
  id, nombre, metodo: "gmail", pasos: pasosGmail(nombre, extra[id]),
}));

export const GRUPOS = [
  {
    id: "ia", nombre: "Inteligencia artificial", icono: "✨",
    apps: [{ id: "claude", nombre: "Claude (resúmenes)", metodo: "api", conexion: "ia", pasos: [
      "Entrá a console.anthropic.com y creá una cuenta.",
      "En Billing cargá crédito (con 5 USD alcanza para meses).",
      "En API Keys tocá “Create Key”, copiala y pegala acá. No la compartas.",
    ] }],
  },
  {
    id: "google", nombre: "Google", icono: "🔵",
    apps: [{ id: "google", nombre: "Gmail, Calendar y YouTube", metodo: "api", conexion: "google", pasos: [
      "console.cloud.google.com → APIs y servicios → Biblioteca: habilitá Gmail API, Google Calendar API y YouTube Data API v3.",
      "Google Auth Platform → Público: modo Prueba y tu mail como usuario de prueba.",
      "Clientes → Crear cliente → Aplicación web, con el origen autorizado de esta app.",
      "Pegá el ID de cliente acá y tocá Conectar.",
    ] }],
  },
  {
    id: "billeteras", nombre: "Billeteras", icono: "💳",
    apps: [
      { id: "mercadopago", nombre: "Mercado Pago", metodo: "api", conexion: "mp", pasos: [
        "mercadopago.com.ar/developers → Tus integraciones → Crear aplicación.",
        "Abrí “Credenciales de producción” y copiá el Access Token (APP_USR-…).",
        "Pegalo acá y tocá Sincronizar. Queda cifrado con tu PIN.",
      ] },
      ...deGmail(SERVICIOS.billeteras.filter(([id]) => id !== "mercadopago"), {
        naranjax: "la app de Naranja X → Perfil → Notificaciones",
        modo: "la app de MODO → Perfil → Notificaciones",
      }),
    ],
  },
  {
    id: "servicios", nombre: "Servicios (agua, luz, gas)", icono: "💡",
    apps: [
      ...PROVEEDORES.map((p) => ({ id: p.id, nombre: `${p.nombre} (${p.tipo.toLowerCase()})`, metodo: "numero", pasos: [
        `Escribí tu número de cuenta de ${p.nombre} (está en la factura).`,
        `Activá la factura digital en ${p.nombre} para que llegue a tu Gmail con monto y vencimiento.`,
        "Con “Ver factura” se abre la página de la empresa con tu número ya copiado.",
      ] })),
      ...deGmail(SERVICIOS.servicios.filter(([id]) => !PROVEEDORES.some((p) => p.id === id)), {}),
    ],
  },
  {
    id: "suscripciones", nombre: "Suscripciones", icono: "🔁",
    apps: deGmail(SERVICIOS.suscripciones, {}).map((a) => ({ ...a, pasos: [
      "Conectá Google: los recibos de pago se detectan solos.",
      `Cuando llega el recibo de ${a.nombre}, la app anota el monto y el día de cobro.`,
      "Desde la suscripción podés tocar “Dar de baja”.",
    ] })),
  },
  {
    id: "redes", nombre: "Redes sociales", icono: "📱",
    apps: [
      { id: "instagram", nombre: "Instagram", metodo: "api", conexion: "instagram", pasos: [
        "Instagram → Configuración → Tipo de cuenta → Cambiar a cuenta profesional → Creador.",
        "developers.facebook.com → Crear app → “Administrar mensajes y contenido en Instagram”.",
        "Roles de la app → Evaluador de Instagram → tu usuario; aceptá la invitación en Instagram.",
        "Instagram API → Generar tokens de acceso → Agregar cuenta → Generar token → pegalo acá.",
      ] },
      { id: "youtube", nombre: "YouTube", metodo: "api", conexion: "google", pasos: [
        "Se conecta con Google: habilitá YouTube Data API v3 en Google Cloud.",
      ] },
      ...deGmail(SERVICIOS.redes.filter(([id]) => !["instagram", "youtube"].includes(id)), {}),
    ],
  },
  {
    id: "cotizaciones", nombre: "Cotizaciones", icono: "💱",
    apps: [{ id: "cotizaciones", nombre: "Dólar, euro y cripto", metodo: "auto", conexion: "cotizaciones", pasos: [
      "No hace falta hacer nada: se actualizan solas al abrir la app.",
      "Elegí qué dólar usar para pasar todo a pesos.",
    ] }],
  },
];

export const NOMBRE_METODO = { api: "Conexión directa", gmail: "Vía Gmail", numero: "Número de cuenta", auto: "Automático" };
