class_name Ventana
extends PanelContainer
# Ventana estilo PZ (fondo oscuro, título, cerrar) con contenido que se rearma con refrescar().

signal cerrada

var titulo := ""
var _lista: VBoxContainer


func _init(p_titulo: String) -> void:
	titulo = p_titulo
	var est := StyleBoxFlat.new()
	est.bg_color = Color(0.08, 0.08, 0.08, 0.92)
	est.border_color = Color(0.5, 0.5, 0.5)
	est.set_border_width_all(2)
	est.set_content_margin_all(14)
	add_theme_stylebox_override("panel", est)
	var col := VBoxContainer.new()
	add_child(col)
	var cab := HBoxContainer.new()
	col.add_child(cab)
	var l := Label.new()
	l.text = titulo
	l.add_theme_font_size_override("font_size", 28)
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cab.add_child(l)
	var x := Button.new()
	x.text = "  X  "
	x.custom_minimum_size = Vector2(70, 56)
	x.pressed.connect(func(): cerrada.emit())
	cab.add_child(x)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(520, 420)
	col.add_child(scroll)
	_lista = VBoxContainer.new()
	_lista.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(_lista)


func limpiar() -> void:
	for h in _lista.get_children():
		h.queue_free()


func fila(texto: String, botones: Array = []) -> void:
	var h := HBoxContainer.new()
	var l := Label.new()
	l.text = texto
	l.add_theme_font_size_override("font_size", 22)
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(l)
	for b in botones:
		var bt := Button.new()
		bt.text = b[0]
		bt.custom_minimum_size = Vector2(110, 52)
		bt.pressed.connect(b[1])
		h.add_child(bt)
	_lista.add_child(h)
