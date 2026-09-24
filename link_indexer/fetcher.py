"""Descarga de páginas: estática (requests) o renderizada (Selenium).

Incluye cortesía básica de scraping: respeta robots.txt, identifica al bot
con un User-Agent propio y espacia las peticiones a un mismo dominio.
"""

from __future__ import annotations

import logging
import time
from urllib import robotparser
from urllib.parse import urlparse

import requests

log = logging.getLogger(__name__)

DEFAULT_USER_AGENT = "LinkIndexerBot/0.1 (+https://github.com/braianamir-arch/fase)"


class PoliteSession:
    """Controla robots.txt y el intervalo mínimo entre peticiones por dominio."""

    def __init__(self, user_agent: str = DEFAULT_USER_AGENT, delay: float = 1.0):
        self.user_agent = user_agent
        self.delay = delay
        self._robots: dict[str, robotparser.RobotFileParser | None] = {}
        self._last_hit: dict[str, float] = {}

    def allowed(self, url: str) -> bool:
        parts = urlparse(url)
        base = f"{parts.scheme}://{parts.netloc}"
        if base not in self._robots:
            rp = robotparser.RobotFileParser()
            try:
                resp = requests.get(
                    f"{base}/robots.txt", headers={"User-Agent": self.user_agent}, timeout=10
                )
                if resp.status_code >= 400:
                    rp = None  # sin robots.txt: todo permitido
                else:
                    rp.parse(resp.text.splitlines())
            except requests.RequestException:
                rp = None
            self._robots[base] = rp
        rp = self._robots[base]
        return True if rp is None else rp.can_fetch(self.user_agent, url)

    def throttle(self, url: str) -> None:
        host = urlparse(url).netloc
        wait = self._last_hit.get(host, 0) + self.delay - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        self._last_hit[host] = time.monotonic()


class StaticFetcher:
    """Obtiene el HTML tal cual lo devuelve el servidor."""

    def __init__(self, polite: PoliteSession, timeout: float = 15):
        self.polite = polite
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers["User-Agent"] = polite.user_agent

    def get(self, url: str, headers: dict[str, str] | None = None) -> str | None:
        if not self.polite.allowed(url):
            log.info("robots.txt no permite %s", url)
            return None
        self.polite.throttle(url)
        try:
            resp = self.session.get(url, headers=headers, timeout=self.timeout)
            resp.raise_for_status()
        except requests.RequestException as exc:
            log.warning("Error al descargar %s: %s", url, exc)
            return None
        return resp.text

    def close(self) -> None:
        self.session.close()


class SeleniumFetcher:
    """Obtiene el HTML después de ejecutar JavaScript con Chrome headless."""

    def __init__(self, polite: PoliteSession, timeout: float = 20):
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options

        self.polite = polite
        self.timeout = timeout
        opts = Options()
        opts.add_argument("--headless=new")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument(f"--user-agent={polite.user_agent}")
        self.driver = webdriver.Chrome(options=opts)
        self.driver.set_page_load_timeout(timeout)

    def get(self, url: str, headers: dict[str, str] | None = None,
            wait_selector: str | None = None) -> str | None:
        from selenium.common.exceptions import WebDriverException
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support import expected_conditions as EC
        from selenium.webdriver.support.ui import WebDriverWait

        if not self.polite.allowed(url):
            log.info("robots.txt no permite %s", url)
            return None
        self.polite.throttle(url)
        try:
            self.driver.get(url)
            if wait_selector:
                WebDriverWait(self.driver, self.timeout).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, wait_selector))
                )
            return self.driver.page_source
        except WebDriverException as exc:
            log.warning("Error de Selenium en %s: %s", url, exc)
            return None

    def close(self) -> None:
        self.driver.quit()
