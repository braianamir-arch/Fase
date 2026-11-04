// Facturas de servicios (agua, luz, gas). Las empresas no tienen API pública y sus sitios
// piden captcha o registro, así que la app: 1) detecta las facturas que llegan a Gmail
// (activá la factura digital en cada empresa) y 2) guarda tu número de cuenta para abrir
// la página de la factura con el número ya copiado.
export const PROVEEDORES = [
  { id: "osse", nombre: "OSSE San Juan", tipo: "Agua", icono: "💧", url: "https://www.ossesanjuan.com.ar/",
    ayuda: "Entrá a “Pagá tu factura” y pegá tu número de cuenta." },
  { id: "naturgysj", nombre: "Naturgy San Juan", tipo: "Luz", icono: "⚡", url: "https://oficinavirtual.naturgysj.com.ar/pagos",
    ayuda: "Pegá tu número de suministro para ver y pagar la factura." },
  { id: "ecogas", nombre: "Ecogas", tipo: "Gas", icono: "🔥", url: "https://autogestion.ecogas.com.ar/uiextranet/espacio_reimp_fd.php",
    ayuda: "Elegí San Juan, pegá tu número de cuenta y descargá la factura." },
];

const soloDigitos = (s) => String(s || "").replace(/\D/g, "");

export function validarNumero(n) {
  const d = soloDigitos(n);
  return d.length >= 6 && d.length <= 20 ? d : null;
}

// Una entrada por proveedor configurado. Si Gmail ya trajo la factura (gmail:servicios:<id>),
// esa entrada manda (tiene monto y vencimiento) y acá solo se agrega el acceso directo.
export function entradasServicios(numeros, existentes, hoy) {
  const conGmail = new Set(existentes.filter((e) => e.origen === "gmail").map((e) => e.externoId));
  return PROVEEDORES.filter((p) => validarNumero(numeros?.[p.id])).filter((p) => !conGmail.has(`gmail:servicios:${p.id}`)).map((p) => ({
    externoId: `servicio:${p.id}`,
    categoria: "servicios",
    titulo: `${p.icono} ${p.tipo} · ${p.nombre}`,
    prioridad: "media",
    frecuencia: "mensual",
    fecha: hoy,
    enlace: p.url,
    nota: `Cuenta N° ${validarNumero(numeros[p.id])}. Todavía no llegó la factura a Gmail: activá la factura digital para que aparezcan monto y vencimiento.`,
  }));
}

export const proveedorDe = (externoId) =>
  PROVEEDORES.find((p) => externoId === `servicio:${p.id}` || externoId === `gmail:servicios:${p.id}`);
