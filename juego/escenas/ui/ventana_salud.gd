class_name VentanaSalud
extends Ventana
# Salud: estado general y heridas por parte del cuerpo, con Vendar.

const ESTADOS := [[90, "Sano"], [80, "Leve"], [70, "Menor"], [60, "Moderado"], [50, "Grave"], [40, "Muy grave"],
	[20, "Crítico"], [10, "Muy crítico"], [0, "Terminal"]]

var partida: Partida
var mandar: Callable


func _init() -> void:
	super("Salud")


func refrescar() -> void:
	limpiar()
	var c := partida.cuerpo
	var estado := "Terminal"
	for e in ESTADOS:
		if c.salud >= e[0]:
			estado = e[1]
			break
	fila("Estado: %s (%d %%)" % [estado, int(c.salud)])
	if c.heridas.is_empty():
		fila("Sin heridas.")
	var objs := DatosJuego.cargar_json("res://datos/objetos.json")
	for h in c.heridas:
		var botones := []
		if not h.vendada:
			for v in [&"venda", &"trapo", &"venda_sucia"]:
				if partida.inventario.items.has(v):
					botones.append(["Vendar", func(): mandar.call({"tipo": &"vendar", "parte": h.parte, "id": v})])
					break
		var txt := "%s: %s%s" % [String(h.parte).replace("_", " ").capitalize(), String(h.tipo).capitalize(),
			"  (vendada)" if h.vendada else "  (sangra)"]
		fila(txt, botones)
