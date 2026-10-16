class_name JugadorNodo
extends Persona
# El personaje del jugador: lee la posición de Partida y la interpola.

var _antes := Vector3.ZERO


func _ready() -> void:
	armar()


func sincronizar(p: Partida, delta: float) -> void:
	var meta := Vector3(p.jugador_pos.x, p.jugador_pos.y * ArmadoChunk.ALTO_PISO, p.jugador_pos.z)
	var vel := (meta - _antes).length() / maxf(delta, 0.001)
	_antes = meta
	position = meta
	rotation.y = atan2(p.jugador_mirando.x, p.jugador_mirando.y)
	caido = p.tumbado > 0.0 or p.cuerpo.muerto
	animar(delta, vel / 1.5)
