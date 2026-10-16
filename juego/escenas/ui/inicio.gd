class_name PantallaInicio
extends CanvasLayer
# Menú principal: Nueva partida / Continuar.

signal nueva
signal continuar


func _ready() -> void:
	add_child(Estilo.fondo())
	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_CENTER)
	col.add_theme_constant_override("separation", 18)
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	add_child(col)
	col.add_child(Estilo.etiqueta("ZOMBOID", 72, Color(0.85, 0.15, 0.12)))
	col.add_child(Estilo.etiqueta("Muldraugh, Kentucky — 9 de julio de 1993", 22))
	col.add_child(Estilo.boton("Nueva partida", func(): nueva.emit()))
	var c := Estilo.boton("Continuar", func(): continuar.emit())
	c.disabled = not FileAccess.file_exists("user://partida.json")
	col.add_child(c)
	col.position = Vector2(get_viewport().get_visible_rect().size.x * 0.5 - 180, get_viewport().get_visible_rect().size.y * 0.25)
