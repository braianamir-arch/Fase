# Link Indexer

Motor de búsqueda de enlaces multimedia: recibe el título de una obra, lo busca en una
lista configurable de sitios y extrae los **iframes**, etiquetas **`<video>/<source>`**,
metadatos **`og:video`** y enlaces directos a **archivos de video** que aparecen en el HTML
público. El resultado se guarda en JSON y, opcionalmente, en un informe HTML.

## Estructura

```
link_indexer/
├── config.py     # SiteConfig + carga de sites.json
├── fetcher.py    # StaticFetcher (requests) y SeleniumFetcher (JS), robots.txt y pausas
├── extractor.py  # BeautifulSoup: resultados de búsqueda y enlaces multimedia
├── engine.py     # Orquesta: búsqueda -> páginas de la obra -> medios
├── report.py     # Informe HTML sencillo
└── cli.py        # Línea de comandos
tests/            # Pruebas con un servidor HTTP local
sites.example.json
```

Flujo: `search_url` con `{query}` → página de resultados → se filtran los enlaces
(`result_selector`) cuyo texto contiene todas las palabras del título → se visita cada
resultado → `extract_media()` recoge los enlaces → JSON.

## Uso

```bash
pip install -r requirements.txt
cp sites.example.json sites.json   # edita los sitios y selectores
python -m link_indexer "Nosferatu" --sites sites.json -o resultados.json --html resultados.html -v
```

Para sitios que cargan su contenido con JavaScript, pon `"render": "selenium"` (necesita
Chrome/Chromium instalado; Selenium Manager descarga el driver) y, si hace falta,
`"wait_selector"` con el elemento a esperar.

### Salida (resumen)

```json
{
  "query": "Nosferatu",
  "generated_at": "2026-09-24T16:40:00+00:00",
  "total_media": 5,
  "results": [
    {
      "site": "Mi videoteca",
      "search_url": "https://videoteca.example.org/buscar?q=Nosferatu",
      "pages": [
        {
          "title": "Nosferatu (1922)",
          "url": "https://videoteca.example.org/obra/nosferatu",
          "media": [
            {"type": "iframe", "url": "https://player.example.org/embed/123", "host": "player.example.org"},
            {"type": "video", "url": "https://videoteca.example.org/media/nosferatu.webm", "mime": "video/webm"}
          ]
        }
      ],
      "error": null
    }
  ]
}
```

## Uso responsable

- El script respeta `robots.txt`, se identifica con un User-Agent propio y espacia las
  peticiones (`--delay`). No intenta saltarse logins, captchas, DRM ni ofuscación.
- Úsalo con sitios cuyos términos permitan el acceso automatizado y con contenido que
  tengas derecho a indexar (dominio público, licencias abiertas, tu propio catálogo,
  p. ej. Internet Archive o Wikimedia Commons). Que un enlace sea visible en el HTML no
  significa que su contenido pueda redistribuirse.

## Pruebas

```bash
python -m pytest -q
```
