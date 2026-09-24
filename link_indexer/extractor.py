"""Extracción de enlaces con BeautifulSoup."""

from __future__ import annotations

import re
import unicodedata
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

VIDEO_EXTENSIONS = (".mp4", ".webm", ".ogv", ".ogg", ".mov", ".mkv", ".m3u8", ".mpd")


def normalize(text: str) -> str:
    """Minúsculas, sin acentos ni signos: 'El Señor, 1ª parte' -> 'el senor 1a parte'."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def title_matches(query: str, text: str) -> bool:
    """True si todas las palabras de la búsqueda aparecen en el texto."""
    words = normalize(query).split()
    haystack = normalize(text).split()
    return bool(words) and all(w in haystack for w in words)


def _is_http(url: str) -> bool:
    return urlparse(url).scheme in ("http", "https")


def extract_result_links(html: str, base_url: str, selector: str, query: str) -> list[dict]:
    """Devuelve los enlaces de la página de búsqueda cuyo texto coincide con la obra."""
    soup = BeautifulSoup(html, "lxml")
    seen: set[str] = set()
    results = []
    for a in soup.select(selector):
        href = a.get("href")
        if not href:
            continue
        label = a.get_text(" ", strip=True) or a.get("title", "")
        url = urljoin(base_url, href)
        if not _is_http(url) or url in seen or not title_matches(query, label):
            continue
        seen.add(url)
        results.append({"title": label, "url": url})
    return results


def extract_media(html: str, page_url: str) -> list[dict]:
    """Extrae iframes, etiquetas <video>/<source>, metadatos og:video y enlaces a archivos de video."""
    soup = BeautifulSoup(html, "lxml")
    found: dict[str, dict] = {}

    def add(url: str | None, kind: str, **extra) -> None:
        if not url:
            return
        absolute = urljoin(page_url, url.strip())
        if _is_http(absolute) and absolute not in found:
            found[absolute] = {"type": kind, "url": absolute, **extra}

    for iframe in soup.find_all("iframe"):
        add(iframe.get("src") or iframe.get("data-src"), "iframe",
            host=urlparse(urljoin(page_url, iframe.get("src") or iframe.get("data-src") or "")).netloc)

    for video in soup.find_all("video"):
        add(video.get("src"), "video")
        for source in video.find_all("source"):
            add(source.get("src"), "video", mime=source.get("type"))

    for prop in ("og:video", "og:video:url", "og:video:secure_url"):
        for meta in soup.find_all("meta", attrs={"property": prop}):
            add(meta.get("content"), "og:video")

    for a in soup.find_all("a", href=True):
        path = urlparse(a["href"]).path.lower()
        if path.endswith(VIDEO_EXTENSIONS):
            add(a["href"], "file", label=a.get_text(" ", strip=True))

    return list(found.values())
