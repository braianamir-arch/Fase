class_name HudVista
extends Control
# Dibuja el HUD: joystick, botones, reloj, moodles y el menú contextual.

const MOODLES := [[&"panico", "Pánico"], [&"dolor", "Dolor"], [&"sangrando", "Sangrando"], [&"herido", "Herido"],
	[&"cansancio_fisico", "Esfuerzo"], [&"carga", "Carga"], [&"enfermo", "Mareado"]]
const COLOR_NIVEL := [Color(0, 0, 0, 0), Color(0.95, 0.85, 0.3), Color(0.95, 0.6, 0.2), Color(0.9, 0.3, 0.2), Color(0.6, 0.05, 0.05)]

var hud: Hud
var partida: Partida
var fuente: Font


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	set_anchors_preset(PRESET_FULL_RECT)
	fuente = ThemeDB.fallback_font


func _texto(pos: Vector2, s: String, tam: int = 22, color := Color.WHITE) -> void:
	draw_string_outline(fuente, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1, tam, 6, Color(0, 0, 0, 0.8))
	draw_string(fuente, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1, tam, color)


func _draw() -> void:
	if hud == null or partida == null:
		return
	# Joystick
	var c := hud.centro_joystick()
	draw_circle(c, Hud.RADIO_JOY, Color(1, 1, 1, 0.10))
	draw_arc(c, Hud.RADIO_JOY, 0, TAU, 48, Color(1, 1, 1, 0.35), 3.0)
	draw_circle(c + hud.joystick() * Hud.RADIO_JOY, 42, Color(1, 1, 1, 0.35))
	# Botones
	var b := hud.botones()
	var etiquetas := {&"atacar": "Atacar", &"agacharse": "Agachar", &"esprintar": "Correr", &"inventario": "Inv.", &"salud": "Salud"}
	for n in b:
		var r: Rect2 = b[n]
		var activo: bool = (n == &"agacharse" and hud.agachado())
		draw_rect(r, Color(1, 1, 1, 0.28 if activo else 0.14))
		draw_rect(r, Color(1, 1, 1, 0.45), false, 2.0)
		_texto(r.position + Vector2(10, r.size.y * 0.5 + 8), etiquetas.get(n, String(n)), 20)
	# Reloj y moodles
	_texto(Vector2(24, 40), partida.reloj.texto(), 24)
	var m := Moodles.calcular(partida.cuerpo, partida.movimiento, partida.inventario, partida.panico, partida.capacidad())
	var y := 70.0
	for par in MOODLES:
		var nivel: int = m.get(par[0], 0)
		if nivel <= 0:
			continue
		draw_circle(Vector2(44, y + 18), 20, COLOR_NIVEL[nivel])
		draw_arc(Vector2(44, y + 18), 20, 0, TAU, 32, Color(0, 0, 0, 0.6), 2.0)
		_texto(Vector2(36, y + 26), str(nivel), 20, Color.BLACK)
		_texto(Vector2(72, y + 26), par[1], 20)
		y += 48
	# Menú contextual
	var opciones := hud.opciones_menu()
	for i in opciones.size():
		var r: Rect2 = hud.rects_menu[i]
		draw_rect(r, Color(0.12, 0.12, 0.12, 0.92))
		draw_rect(r, Color(1, 1, 1, 0.4), false, 2.0)
		_texto(r.position + Vector2(14, 38), opciones[i], 24)
	if hud.menu_abierto() and opciones.is_empty():
		pass
