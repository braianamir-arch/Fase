class_name PantallaCreacion
extends CanvasLayer
# Creación de personaje como PZ: profesiones a la izquierda, rasgos positivos y negativos,
# puntos restantes abajo. Empezar solo se habilita si el total queda ≥ 0.

signal empezar(profesion: StringName, rasgos: Array)

var profesion: StringName = &"personalizada"
var elegidos: Array = []
var _puntos: Label
var _boton: Button
var _lista_prof: ItemList
var _pos: ItemList
var _neg: ItemList
var _ids_prof: Array = []
var _ids_pos: Array = []
var _ids_neg: Array = []


func _ready() -> void:
	add_child(Estilo.fondo())
	var raiz := VBoxContainer.new()
	raiz.set_anchors_preset(Control.PRESET_FULL_RECT)
	raiz.offset_left = 24
	raiz.offset_top = 16
	raiz.offset_right = -24
	raiz.offset_bottom = -16
	add_child(raiz)
	raiz.add_child(Estilo.etiqueta("Creá tu personaje", 34))
	var fila := HBoxContainer.new()
	fila.size_flags_vertical = Control.SIZE_EXPAND_FILL
	fila.add_theme_constant_override("separation", 16)
	raiz.add_child(fila)
	var profs := DatosJuego.cargar_json("res://datos/profesiones.json")
	var rasgos := DatosJuego.cargar_json("res://datos/rasgos.json")
	_lista_prof = _lista(fila, "Profesión")
	for k in profs:
		_ids_prof.append(StringName(k))
		_lista_prof.add_item("%s  (%+d)" % [profs[k].nombre, profs[k].puntos])
	_lista_prof.select(0)
	_lista_prof.item_selected.connect(func(i):
		profesion = _ids_prof[i]
		_actualizar())
	_pos = _lista(fila, "Rasgos positivos")
	_neg = _lista(fila, "Rasgos negativos")
	for k in Creacion.elegibles():
		var r: Dictionary = rasgos[String(k)]
		var costo := int(r.costo)
		if costo <= 0:
			_ids_pos.append(k)
			_pos.add_item("%s  (%d)" % [r.nombre, costo])
		else:
			_ids_neg.append(k)
			_neg.add_item("%s  (+%d)" % [r.nombre, costo])
	_pos.item_clicked.connect(func(i, _p, _b): _alternar(_ids_pos[i]))
	_neg.item_clicked.connect(func(i, _p, _b): _alternar(_ids_neg[i]))
	var abajo := HBoxContainer.new()
	raiz.add_child(abajo)
	_puntos = Estilo.etiqueta("", 28)
	_puntos.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	abajo.add_child(_puntos)
	_boton = Estilo.boton("Empezar", func(): empezar.emit(profesion, elegidos.duplicate()), 260)
	abajo.add_child(_boton)
	_actualizar()


func _lista(padre: Control, titulo: String) -> ItemList:
	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	padre.add_child(col)
	col.add_child(Estilo.etiqueta(titulo, 24))
	var l := ItemList.new()
	l.size_flags_vertical = Control.SIZE_EXPAND_FILL
	l.add_theme_font_size_override("font_size", 22)
	l.select_mode = ItemList.SELECT_SINGLE
	col.add_child(l)
	return l


func _alternar(r: StringName) -> void:
	if elegidos.has(r):
		elegidos.erase(r)
	elif not Creacion.excluido(r, elegidos):
		elegidos.append(r)
	_actualizar()


func _actualizar() -> void:
	for par in [[_pos, _ids_pos], [_neg, _ids_neg]]:
		var lista: ItemList = par[0]
		for i in lista.item_count:
			var id: StringName = par[1][i]
			lista.set_item_custom_bg_color(i, Color(0.2, 0.45, 0.25, 0.8) if elegidos.has(id) else Color(0, 0, 0, 0))
			lista.set_item_disabled(i, not elegidos.has(id) and Creacion.excluido(id, elegidos))
	var p := Creacion.puntos(profesion, elegidos)
	_puntos.text = "Puntos para gastar: %d" % p
	_puntos.add_theme_color_override("font_color", Color(0.9, 0.3, 0.3) if p < 0 else Color(0.9, 0.9, 0.88))
	_boton.disabled = not Creacion.valido(profesion, elegidos)
