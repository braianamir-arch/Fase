class_name VentanaInventario
extends Ventana
# Inventario: peso total sobre capacidad, objetos con Equipar / Soltar.

var partida: Partida
var mandar: Callable   # (accion: Dictionary) -> void


func _init() -> void:
	super("Inventario")


func refrescar() -> void:
	limpiar()
	var inv := partida.inventario
	fila("Peso: %.1f / %.0f" % [inv.peso_total(), partida.capacidad()])
	var armas := DatosJuego.cargar_json("res://datos/armas.json")
	var objs := DatosJuego.cargar_json("res://datos/objetos.json")
	for id in inv.items:
		var d: Dictionary = armas.get(String(id), objs.get(String(id), {}))
		var nombre: String = d.get("nombre", String(id))
		var extra := ""
		if id == inv.equipada:
			extra = "  (en la mano, %d/%d)" % [partida.condicion_armas.get(id, d.get("condicion_max", 0)), d.get("condicion_max", 0)]
		var botones := []
		if Inventario.es_arma(id) and id != inv.equipada:
			botones.append(["Equipar", func(): mandar.call({"tipo": &"equipar", "id": id})])
		botones.append(["Soltar", func(): mandar.call({"tipo": &"soltar", "id": id})])
		fila("%s  %.1f%s" % [nombre, Inventario.peso_de(id), extra], botones)
