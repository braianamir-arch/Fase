class_name Cuerpo
extends RefCounted
# Salud del personaje: 17 partes, heridas que sangran hasta vendarlas y curan solo vendadas,
# e infección Knox (contagio por arañazo/laceración/mordida, muerte a las 72 h). Datos: infeccion.json.

const PARTES: Array[StringName] = [&"mano_izq", &"mano_der", &"antebrazo_izq", &"antebrazo_der",
	&"brazo_izq", &"brazo_der", &"torso_sup", &"torso_inf", &"cabeza", &"cuello", &"ingle",
	&"muslo_izq", &"muslo_der", &"canilla_izq", &"canilla_der", &"pie_izq", &"pie_der"]

static var _datos: Dictionary = {}

var salud: float = 100.0
var infectado_knox: bool = false
var horas_infectado: float = 0.0
var muerto: bool = false
var causa_muerte: StringName = &""
var rasgos: Array = []
# Cada herida: {parte, tipo, vendada, venda_limpia, horas_curando, horas_para_curar}
var heridas: Array[Dictionary] = []


func _init(p_rasgos: Array = []) -> void:
	rasgos = p_rasgos


static func datos() -> Dictionary:
	if _datos.is_empty():
		_datos = DatosJuego.cargar_json("res://datos/infeccion.json")
	return _datos


# Agrega la herida y devuelve si contagió la infección Knox.
func herir(parte: StringName, tipo: StringName, rng: RandomNumberGenerator) -> bool:
	var d := datos()
	var rango: Array = d.curacion_horas.get(tipo, [10, 20])
	if rasgos.has(&"curacion_lenta"):
		rango = d.curacion_horas.curacion_lenta.get(tipo, rango)
	elif rasgos.has(&"curacion_rapida"):
		rango = d.curacion_horas.curacion_rapida.get(tipo, rango)
	heridas.append({"parte": parte, "tipo": tipo, "vendada": false, "venda_limpia": false,
		"horas_curando": 0.0, "horas_para_curar": rng.randf_range(rango[0], rango[1])})
	salud = maxf(salud - float(d["daño_inicial"].get(tipo, 5.0)), 0.0)
	var contagia := rng.randf() < float(d.contagio.get(tipo, 0.0))
	if contagia:
		infectado_knox = true
	_revisar_muerte(&"herida")
	return contagia


func vendar(parte: StringName, limpia: bool) -> void:
	for h in heridas:
		if h.parte == parte:
			h.vendada = true
			h.venda_limpia = limpia


func sangrando() -> bool:
	for h in heridas:
		if not h.vendada:
			return true
	return false


func partes_sangrando() -> int:
	var n := 0
	for h in heridas:
		if not h.vendada:
			n += 1
	return n


func dolor() -> float:
	var d: Dictionary = datos().dolor_por_herida
	var total := 0.0
	for h in heridas:
		total += float(d.get(h.tipo, 10.0)) * (0.5 if h.vendada else 1.0)
	return minf(total, 100.0)


func avanzar(horas: float) -> void:
	if muerto:
		return
	var d := datos()
	var s: Dictionary = d.sangrado_por_hora
	var curadas: Array[Dictionary] = []
	for h in heridas:
		if h.vendada:
			h.horas_curando += horas
			if h.horas_curando >= h.horas_para_curar:
				curadas.append(h)
		else:
			var tasa := float(s.get(h.tipo, 2.0))
			if h.parte == &"cuello":
				tasa *= float(s.cuello_mult)
			salud -= tasa * horas
	for h in curadas:
		heridas.erase(h)
	_revisar_muerte(&"desangrado")
	if infectado_knox and not muerto:
		var mult := 1.0
		for r in d.multiplicador_rasgo:
			if rasgos.has(StringName(r)):
				mult *= float(d.multiplicador_rasgo[r])
		horas_infectado += horas * mult   # Resilient ×0,75 de velocidad de progresión
		# Desde las 5 h la infección baja la salud, pero no mata antes de su hora.
		if horas_infectado > 5.0:
			salud = maxf(salud - horas * 0.8, 1.0)
		if horas_infectado >= float(d.horas_hasta_muerte):
			salud = 0.0
			muerto = true
			causa_muerte = &"infeccion"
	if not muerto:
		salud = minf(salud + horas * 0.5 * float(heridas.is_empty() and not infectado_knox), 100.0)


func sintoma() -> String:
	if not infectado_knox:
		return ""
	var s := ""
	for par in datos().sintomas:
		if horas_infectado >= float(par[0]):
			s = par[1]
	return s


func _revisar_muerte(causa: StringName) -> void:
	if salud <= 0.0 and not muerto:
		salud = 0.0
		muerto = true
		causa_muerte = causa
