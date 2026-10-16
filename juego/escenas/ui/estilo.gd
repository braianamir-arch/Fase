class_name Estilo
extends RefCounted
# Botones y textos grandes para el dedo, con el tono oscuro de las pantallas de PZ.

static func boton(texto: String, accion: Callable, ancho: float = 360.0) -> Button:
	var b := Button.new()
	b.text = texto
	b.custom_minimum_size = Vector2(ancho, 64)
	b.add_theme_font_size_override("font_size", 26)
	b.pressed.connect(accion)
	return b


static func etiqueta(texto: String, tam: int = 24, color := Color(0.9, 0.9, 0.88)) -> Label:
	var l := Label.new()
	l.text = texto
	l.add_theme_font_size_override("font_size", tam)
	l.add_theme_color_override("font_color", color)
	return l


static func fondo(color := Color(0.05, 0.05, 0.06, 1.0)) -> ColorRect:
	var f := ColorRect.new()
	f.color = color
	f.set_anchors_preset(Control.PRESET_FULL_RECT)
	return f
