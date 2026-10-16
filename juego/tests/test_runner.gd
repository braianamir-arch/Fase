extends RefCounted
var t
func test_igual_pasa() -> void:
	t.igual(2 + 2, 4)
func test_cerca_pasa() -> void:
	t.cerca(0.1 + 0.2, 0.3, 0.0001)
