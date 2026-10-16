extends RefCounted
var t

func test_capacidad_por_fuerza() -> void:
	t.cerca(Inventario.capacidad(5), 12.0, 0.001)
	t.cerca(Inventario.capacidad(3), 9.0, 0.001)
	t.cerca(Inventario.capacidad(10), 20.0, 0.001)

func test_nivel_de_carga() -> void:
	var inv := Inventario.new()
	t.igual(inv.nivel_carga(8.0), 0)
	inv.extra_peso = 10.0
	t.igual(inv.nivel_carga(8.0), 2, "10/8 = 125 %")
	inv.extra_peso = 8.5
	t.igual(inv.nivel_carga(8.0), 1)
	inv.extra_peso = 14.5
	t.igual(inv.nivel_carga(8.0), 4)

func test_equipado_pesa_30_por_ciento() -> void:
	var inv := Inventario.new()
	inv.agregar(&"pala")   # peso 3
	t.cerca(inv.peso_total(), 3.0, 0.001)
	inv.equipar(&"pala", true)
	t.cerca(inv.peso_total(), 0.9, 0.001)
	t.igual(inv.equipada, &"pala")
	t.verdad(inv.dos_manos)

func test_quitar() -> void:
	var inv := Inventario.new()
	inv.agregar(&"venda")
	t.verdad(inv.quitar(&"venda"))
	t.verdad(not inv.quitar(&"venda"))
	inv.agregar(&"bate")
	inv.equipar(&"bate", true)
	inv.quitar(&"bate")
	t.igual(inv.equipada, &"")
