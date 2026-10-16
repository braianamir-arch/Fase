class_name PantallaMuerte
extends CanvasLayer
# "This is how you died", como en PZ.

signal volver

var resumen := ""


func _ready() -> void:
	add_child(Estilo.fondo(Color(0.12, 0.0, 0.0, 0.75)))
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 16)
	add_child(col)
	col.add_child(Estilo.etiqueta("This is how you died", 54, Color(0.95, 0.9, 0.85)))
	col.add_child(Estilo.etiqueta("Así moriste", 26, Color(0.8, 0.7, 0.65)))
	col.add_child(Estilo.etiqueta(resumen, 28))
	col.add_child(Estilo.boton("Volver al menú", func(): volver.emit()))
	var tam := get_viewport().get_visible_rect().size
	col.position = Vector2(tam.x * 0.5 - 300, tam.y * 0.3)
