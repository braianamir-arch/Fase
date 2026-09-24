import functools
import http.server
import json
import threading
from pathlib import Path

import pytest

from link_indexer.cli import main
from link_indexer.config import SiteConfig
from link_indexer.engine import SearchEngine
from link_indexer.extractor import extract_media, normalize, title_matches

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def server():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(FIXTURES))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    httpd.RequestHandlerClass.log_message = lambda *a: None
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{httpd.server_port}"
    httpd.shutdown()


def test_normalize_and_match():
    assert normalize("El Señor, 1ª parte") == "el senor 1a parte"
    assert title_matches("metropolis", "Metrópolis (1927)")
    assert not title_matches("nosferatu", "Metrópolis")


def test_extract_media():
    html = (FIXTURES / "obra" / "nosferatu").read_text()
    media = extract_media(html, "https://sitio.org/obra/nosferatu")
    by_url = {m["url"]: m["type"] for m in media}
    assert by_url == {
        "https://player.example.org/embed/123": "iframe",
        "https://player2.example.org/e/abc": "iframe",
        "https://sitio.org/media/nosferatu.webm": "video",
        "https://cdn.example.org/nosferatu.mp4": "og:video",
        "https://sitio.org/descargas/nosferatu.mp4?dl=1": "file",
    }


def test_engine_end_to_end(server):
    site = SiteConfig(name="local", search_url=server + "/buscar.html?q={query}",
                      result_selector=".resultados a.titulo")
    with SearchEngine([site], delay=0) as engine:
        index = engine.search("nosferatu")
    pages = index["results"][0]["pages"]
    assert [p["url"] for p in pages] == [server + "/obra/nosferatu"]
    assert index["total_media"] == 5


def test_robots_blocks(server):
    site = SiteConfig(name="local", search_url=server + "/privado/buscar?q={query}")
    with SearchEngine([site], delay=0) as engine:
        index = engine.search("nosferatu")
    assert index["results"][0]["error"]


def test_cli_writes_json_and_html(server, tmp_path):
    sites = tmp_path / "sites.json"
    sites.write_text(json.dumps({"sites": [{
        "name": "local", "search_url": server + "/buscar.html?q={query}",
        "result_selector": ".resultados a.titulo"}]}))
    out, html = tmp_path / "r.json", tmp_path / "r.html"
    assert main(["Nosferatu", "--sites", str(sites), "-o", str(out), "--html", str(html), "--delay", "0"]) == 0
    assert json.loads(out.read_text())["total_media"] == 5
    assert "player.example.org" in html.read_text()


def test_invalid_config():
    with pytest.raises(ValueError):
        SiteConfig(name="x", search_url="https://sin-placeholder.org")
