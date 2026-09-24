"""Orquesta la búsqueda: sitio -> página de resultados -> páginas de la obra -> medios."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from urllib.parse import quote_plus

from .config import SiteConfig
from .extractor import extract_media, extract_result_links
from .fetcher import PoliteSession, SeleniumFetcher, StaticFetcher

log = logging.getLogger(__name__)


class SearchEngine:
    def __init__(self, sites: list[SiteConfig], delay: float = 1.0):
        self.sites = sites
        self.polite = PoliteSession(delay=delay)
        self._static: StaticFetcher | None = None
        self._selenium: SeleniumFetcher | None = None

    # Los fetchers se crean bajo demanda: Selenium solo arranca si algún sitio lo pide.
    def _fetch(self, site: SiteConfig, url: str) -> str | None:
        if site.render == "selenium":
            if self._selenium is None:
                self._selenium = SeleniumFetcher(self.polite)
            return self._selenium.get(url, site.headers, site.wait_selector)
        if self._static is None:
            self._static = StaticFetcher(self.polite)
        return self._static.get(url, site.headers)

    def search_site(self, site: SiteConfig, query: str) -> dict:
        search_url = site.search_url.format(query=quote_plus(query))
        entry = {"site": site.name, "search_url": search_url, "pages": [], "error": None}

        html = self._fetch(site, search_url)
        if html is None:
            entry["error"] = "No se pudo obtener la página de búsqueda (o robots.txt lo impide)"
            return entry

        candidates = extract_result_links(html, search_url, site.result_selector, query)
        log.info("[%s] %d resultados coinciden con '%s'", site.name, len(candidates), query)

        for cand in candidates[: site.max_results]:
            page_html = self._fetch(site, cand["url"])
            if page_html is None:
                continue
            media = extract_media(page_html, cand["url"])
            if media:
                entry["pages"].append({**cand, "media": media})
        return entry

    def search(self, query: str) -> dict:
        results = []
        for site in self.sites:
            try:
                results.append(self.search_site(site, query))
            except Exception as exc:  # un sitio roto no debe tumbar toda la búsqueda
                log.exception("[%s] fallo inesperado", site.name)
                results.append({"site": site.name, "pages": [], "error": str(exc)})
        return {
            "query": query,
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "total_media": sum(len(p["media"]) for r in results for p in r["pages"]),
            "results": results,
        }

    def close(self) -> None:
        for fetcher in (self._static, self._selenium):
            if fetcher is not None:
                fetcher.close()

    def __enter__(self) -> "SearchEngine":
        return self

    def __exit__(self, *exc) -> None:
        self.close()
