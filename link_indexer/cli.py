"""Interfaz de línea de comandos.

Uso:
    python -m link_indexer "Nosferatu" --sites sites.json -o resultados.json --html resultados.html
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

from .config import load_sites
from .engine import SearchEngine
from .report import render_html


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Busca una obra en varios sitios y extrae sus enlaces multimedia.")
    parser.add_argument("title", nargs="?", help="Título de la obra (si se omite, se pide por teclado)")
    parser.add_argument("--sites", default="sites.json", help="Archivo JSON con la lista de sitios")
    parser.add_argument("-o", "--output", default="resultados.json", help="Archivo JSON de salida")
    parser.add_argument("--html", help="Genera además un informe HTML en esta ruta")
    parser.add_argument("--delay", type=float, default=1.0, help="Segundos entre peticiones al mismo dominio")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING,
                        format="%(levelname)s %(message)s")

    title = args.title or input("Título de la obra: ").strip()
    if not title:
        parser.error("hace falta un título")

    with SearchEngine(load_sites(args.sites), delay=args.delay) as engine:
        index = engine.search(title)

    Path(args.output).write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{index['total_media']} enlaces guardados en {args.output}")
    if args.html:
        Path(args.html).write_text(render_html(index), encoding="utf-8")
        print(f"Informe HTML en {args.html}")
    return 0
