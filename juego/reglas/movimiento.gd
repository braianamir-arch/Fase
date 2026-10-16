class_name Movimiento
extends RefCounted
# Posturas, velocidad, ruido de pasos y resistencia (endurance 1 = descansado, 0 = agotado).

enum Postura { CAMINAR, CORRER, ESPRINTAR, AGACHADO }

const RUIDO_ID := {Postura.CAMINAR: "caminar", Postura.CORRER: "correr", Postura.ESPRINTAR: "esprintar", Postura.AGACHADO: "agachado"}
const VEL_ID := {Postura.CAMINAR: "caminar", Postura.CORRER: "correr", Postura.ESPRINTAR: "esprintar", Postura.AGACHADO: "agachado"}

static var _mov: Dictionary = {}
static var _ruidos: Dictionary = {}

var endurance: float = 1.0


static func datos() -> Dictionary:
	if _mov.is_empty():
		_mov = DatosJuego.cargar_json("res://datos/movimiento.json")
		_ruidos = DatosJuego.cargar_json("res://datos/ruidos.json")
	return _mov


# Nivel del moodle de esfuerzo según lo gastado: 0, ≥25 %, ≥50 %, ≥75 %, ≥90 %.
func nivel_cansancio() -> int:
	var gastado := 1.0 - endurance
	var n := 0
	for u in [0.25, 0.5, 0.75, 0.9]:
		if gastado >= u:
			n += 1
	return n


# La postura que de verdad se puede usar: con High Exertion no se esprinta, con Excessive no se corre.
func postura_posible(p: Postura, carga_nivel: int) -> Postura:
	var c := nivel_cansancio()
	if p == Postura.ESPRINTAR and (c >= 2 or carga_nivel >= 2):
		p = Postura.CORRER
	if p == Postura.CORRER and (c >= 3 or carga_nivel >= 3):
		p = Postura.CAMINAR
	return p


func velocidad(p: Postura, carga_nivel: int, rasgos: Array) -> float:
	var d := datos()
	var v := float(d.velocidad_mps[VEL_ID[p]])
	if rasgos.has(&"atletico") and (p == Postura.CORRER or p == Postura.ESPRINTAR):
		v *= 1.2
	v *= 1.0 - float(d.penalizacion_velocidad.carga[clampi(carga_nivel, 0, 4)])
	v *= 1.0 - float(d.penalizacion_velocidad.cansancio[nivel_cansancio()])
	return v


func ruido_paso(p: Postura, rasgos: Array) -> float:
	datos()
	var r := float(_ruidos[RUIDO_ID[p]].radio)
	var mult: Dictionary = _mov.multiplicador_ruido_pasos
	for k in mult:
		if rasgos.has(StringName(k)):
			r *= float(mult[k])
	return r


func avanzar(segundos: float, p: Postura, moviendose: bool, rasgos: Array = []) -> void:
	var e: Dictionary = datos().endurance_por_segundo
	var delta := 0.0
	if moviendose and p == Postura.ESPRINTAR:
		delta = -float(e.esprintar)
	elif moviendose and p == Postura.CORRER:
		delta = -float(e.correr)
	elif moviendose:
		delta = float(e.recupera_caminando)
	else:
		delta = float(e.recupera_parado)
	if delta < 0.0:
		if rasgos.has(&"atletico"):
			delta *= 0.8
		if rasgos.has(&"falta_aliento"):
			delta *= 1.4
	endurance = clampf(endurance + delta * segundos, 0.0, 1.0)


# Cada golpe gasta peso del arma × 0,00336 (código B42) × endurance_mod del arma.
func gastar_golpe(peso_arma: float, endurance_mod: float, rasgos: Array = []) -> void:
	var g := float(datos().endurance_por_segundo.golpe_por_peso) * peso_arma * endurance_mod
	if rasgos.has(&"falta_aliento"):
		g *= 1.3
	endurance = clampf(endurance - g, 0.0, 1.0)
