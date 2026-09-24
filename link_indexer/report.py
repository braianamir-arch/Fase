"""Genera una página HTML sencilla para revisar los resultados en el navegador."""

from __future__ import annotations

from html import escape


def render_html(index: dict) -> str:
    sections = []
    for site in index["results"]:
        rows = []
        for page in site["pages"]:
            items = "".join(
                f'<li><span class="tag">{escape(m["type"])}</span> '
                f'<a href="{escape(m["url"])}" target="_blank" rel="noopener noreferrer">'
                f'{escape(m["url"])}</a></li>'
                for m in page["media"]
            )
            rows.append(
                f'<h3><a href="{escape(page["url"])}" target="_blank" rel="noopener noreferrer">'
                f'{escape(page["title"])}</a></h3><ul>{items}</ul>'
            )
        body = "".join(rows) or f'<p class="empty">{escape(site.get("error") or "Sin resultados")}</p>'
        sections.append(f'<section><h2>{escape(site["site"])}</h2>{body}</section>')

    return f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Resultados: {escape(index["query"])}</title>
<style>
 body{{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#222}}
 section{{border:1px solid #ddd;border-radius:8px;padding:1rem;margin-bottom:1rem}}
 h2{{margin-top:0}} li{{margin:.3rem 0;word-break:break-all}}
 .tag{{display:inline-block;min-width:4.5rem;font-size:.75rem;background:#eef;border-radius:4px;padding:0 .4rem}}
 .empty{{color:#888}}
</style></head><body>
<h1>“{escape(index["query"])}”</h1>
<p>{index["total_media"]} enlaces encontrados · {escape(index["generated_at"])}</p>
{"".join(sections)}
</body></html>"""
