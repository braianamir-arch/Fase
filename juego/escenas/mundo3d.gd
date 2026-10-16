class_name Mundo3D
extends Node3D
# Dibuja la Grilla: un MeshInstance3D por chunk, piso y capa (paredes, suelo, techo, muebles).

var grilla: Grilla
var _capas: Dictionary = {}   # Vector3i(cx, cy, piso) -> {nombre: MeshInstance3D}


func cargar(g: Grilla) -> void:
	grilla = g
	for hijo in get_children():
		hijo.queue_free()
	_capas.clear()
	var cxs := ceili(float(g.ancho) / ArmadoChunk.CHUNK)
	var cys := ceili(float(g.alto) / ArmadoChunk.CHUNK)
	for piso in g.pisos:
		for cy in cys:
			for cx in cxs:
				_armar(Vector2i(cx, cy), piso)


func _armar(chunk: Vector2i, piso: int) -> void:
	var clave := Vector3i(chunk.x, chunk.y, piso)
	var mallas := ArmadoChunk.construir(grilla, chunk, piso)
	if not _capas.has(clave):
		_capas[clave] = {}
	for nombre in mallas:
		var mi: MeshInstance3D = _capas[clave].get(nombre)
		if mi == null:
			mi = MeshInstance3D.new()
			mi.name = "c%d_%d_p%d_%s" % [chunk.x, chunk.y, piso, nombre]
			add_child(mi)
			_capas[clave][nombre] = mi
		mi.mesh = mallas[nombre]


func actualizar_abertura(p: Vector3i, _lado: int) -> void:
	_armar(Vector2i(p.x / ArmadoChunk.CHUNK, p.y / ArmadoChunk.CHUNK), p.z)


func capa(chunk: Vector2i, piso: int, nombre: String) -> MeshInstance3D:
	return _capas.get(Vector3i(chunk.x, chunk.y, piso), {}).get(nombre)


# Muestra u oculta pisos y techos según lo que decide Vision.pisos_visibles.
func mostrar(max_piso: int, techos: bool) -> void:
	for clave: Vector3i in _capas:
		for nombre in _capas[clave]:
			var visible_capa := clave.z <= max_piso
			if nombre == "techo":
				visible_capa = visible_capa and techos
			_capas[clave][nombre].visible = visible_capa
