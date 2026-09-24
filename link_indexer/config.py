"""Carga y validación de la lista de sitios a consultar."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class SiteConfig:
    """Describe cómo buscar en un sitio concreto.

    - ``search_url``: plantilla con ``{query}``, p. ej. ``https://sitio.org/buscar?q={query}``.
    - ``result_selector``: selector CSS de los enlaces a resultados en la página de búsqueda.
    - ``render``: ``"static"`` (requests) o ``"selenium"`` (páginas que dependen de JavaScript).
    - ``max_results``: cuántas páginas de resultado visitar por sitio.
    - ``wait_selector``: (solo Selenium) elemento a esperar antes de leer el HTML.
    """

    name: str
    search_url: str
    result_selector: str = "a"
    render: str = "static"
    max_results: int = 5
    wait_selector: str | None = None
    headers: dict[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if "{query}" not in self.search_url:
            raise ValueError(f"[{self.name}] search_url debe contener '{{query}}'")
        if self.render not in ("static", "selenium"):
            raise ValueError(f"[{self.name}] render debe ser 'static' o 'selenium'")


def load_sites(path: str | Path) -> list[SiteConfig]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return [SiteConfig(**entry) for entry in data["sites"]]
