import ipaddress
import re
import socket
from urllib.parse import urljoin, urlparse, urlunparse, quote
import hashlib

import httpx
import trafilatura
from bs4 import BeautifulSoup
from fastapi import HTTPException

from app.config import settings

MAX_BYTES = 2_000_000
ALLOWED_SCHEMES = {"http", "https"}


def _clean_extracted_text(value: str) -> str:
    paragraphs = re.split(r"\n\s*\n", value)
    cleaned: list[str] = []
    seen: set[str] = set()
    for paragraph in paragraphs:
        lines = [" ".join(line.split()) for line in paragraph.splitlines() if line.strip()]
        if not lines:
            continue
        block = "\n".join(lines)
        normalized = re.sub(r"[^\w]+", " ", block.lower()).strip()
        is_heading = block.lstrip().startswith("#")
        if (len(normalized) < 12 and not is_heading) or normalized in seen:
            continue
        seen.add(normalized)
        cleaned.append(block)
    return "\n\n".join(cleaned)


def _extract_text_from_html(html: str, final_url: str) -> tuple[str, str]:
    metadata = trafilatura.extract_metadata(html)
    title = metadata.title if metadata and metadata.title else final_url

    extracted = trafilatura.extract(html, include_comments=False, include_tables=True, favor_recall=True) or ""
    text = _clean_extracted_text(extracted)

    if len(text.strip()) < 80:
        soup = BeautifulSoup(html, "lxml")
        title_tag = soup.title.get_text(" ", strip=True) if soup.title else None
        if title_tag:
            title = title_tag

        container_selectors = ["main", "article", "body"]
        for selector in container_selectors:
            container = soup.select_one(selector)
            if not container:
                continue
            for tag in container.select("script, style, noscript, svg, iframe"):
                tag.decompose()
            body_text = "\n".join(line.strip() for line in container.stripped_strings if line.strip())
            text = _clean_extracted_text(body_text)
            if len(text.strip()) >= 80:
                break

    return text.strip(), title


async def _render_page_text(url: str) -> tuple[str, str] | None:
    try:
        from playwright.async_api import async_playwright
    except Exception:
        return None

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            try:
                page = await browser.new_page(user_agent="PanoptesBot/1.0")
                await page.goto(url, wait_until="domcontentloaded", timeout=45000)
                try:
                    await page.wait_for_load_state("networkidle", timeout=15000)
                except Exception:
                    pass
                await page.wait_for_timeout(500)
                title = (await page.title()) or url
                body_text = (await page.locator("body").inner_text()).strip()
                return _clean_extracted_text(body_text), title
            finally:
                await browser.close()
    except Exception:
        return None


def _is_private_host(hostname: str) -> bool:
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Não foi possível resolver o domínio da URL.")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return True
    return False


def validate_public_url(raw: str) -> str:
    parsed = urlparse(raw.strip())
    if parsed.scheme not in ALLOWED_SCHEMES or not parsed.hostname:
        raise HTTPException(status_code=400, detail="Informe uma URL http ou https válida.")
    host = parsed.hostname.lower()
    if host in {"localhost", "127.0.0.1", "::1"} or host.endswith(".local"):
        raise HTTPException(status_code=400, detail="URLs internas não são permitidas.")
    if _is_private_host(host):
        raise HTTPException(status_code=400, detail="A URL aponta para um endereço privado.")
    return parsed.geturl()


def normalize_url(raw: str) -> str:
    parsed = urlparse(raw.strip())
    return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), parsed.path or "/", "", parsed.query, ""))


async def fetch_public(client: httpx.AsyncClient, url: str) -> tuple[str, str]:
    # Validate every redirect before making the next request; never forward credentials.
    for _ in range(4):
        url = validate_public_url(url)
        async with client.stream("GET", url, follow_redirects=False) as response:
            if response.is_redirect:
                location = response.headers.get("location")
                if not location:
                    raise ValueError("Redirecionamento sem destino")
                url = urljoin(url, location)
                continue
            response.raise_for_status()
            content = bytearray()
            async for block in response.aiter_bytes():
                content.extend(block)
                if len(content) > MAX_BYTES:
                    raise ValueError("Página excede 2 MB")
            return str(response.url), content.decode(response.encoding or "utf-8", errors="replace")
    raise ValueError("Limite de redirecionamentos excedido")


async def scrape_github(client: httpx.AsyncClient, url: str) -> tuple[list[dict], dict]:
    import json
    parts = urlparse(url).path.strip("/").split("/")
    if len(parts) < 2:
        raise ValueError("Informe a URL de um repositório GitHub")
    owner, repo = parts[:2]
    repo = repo.removesuffix(".git")
    base = f"https://api.github.com/repos/{quote(owner, safe='')}/{quote(repo, safe='')}"
    async def api(path: str):
        _, body = await fetch_public(client, base + path)
        return json.loads(body)
    metadata = await api("")
    ref = metadata["default_branch"]
    scope = ""
    if len(parts) > 2:
        if parts[2] not in ("tree", "blob") or len(parts) < 4:
            raise ValueError("Use a raiz do repositório ou uma URL tree/blob")
        # Resolve branch names containing slashes by trying the longest ref first.
        for boundary in range(len(parts), 3, -1):
            candidate = "/".join(parts[3:boundary])
            try:
                commit = await api("/commits/" + quote(candidate, safe=""))
                ref = commit["sha"]
                scope = "/".join(parts[boundary:])
                break
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code not in (404, 422):
                    raise
        else:
            raise ValueError("Ramificação ou commit não encontrado")
    commit = await api("/commits/" + quote(ref, safe=""))
    sha = commit["sha"]
    tree = await api(f"/git/trees/{sha}?recursive=1")
    if tree.get("truncated"):
        raise ValueError("Árvore GitHub truncada; selecione um repositório menor ou implemente paginação por subárvore")
    files = [item for item in tree["tree"] if item["type"] == "blob"
             and (not scope or item["path"] == scope or item["path"].startswith(scope + "/"))
             and item["path"].lower().endswith((".md", ".mdx", ".rst", ".txt"))
             and not any(segment in ("node_modules", "vendor", ".git") for segment in item["path"].split("/"))]
    files.sort(key=lambda item: (not item["path"].lower().startswith("readme"), not item["path"].startswith("docs/"), item["path"]))
    pages, errors = [], []
    for item in files[:settings.github_max_files]:
        path = item["path"]
        try:
            _, body = await fetch_public(client, f"https://raw.githubusercontent.com/{owner}/{repo}/{sha}/{quote(path, safe='/')}")
            if body.strip():
                pages.append({"url": f"https://github.com/{owner}/{repo}/blob/{sha}/{path}", "title": path, "text": body.strip(), "commit": sha})
        except (ValueError, httpx.HTTPError) as exc:
            errors.append({"url": path, "reason": str(exc)[:200]})
    return pages, {"kind": "github", "commit": sha, "discovered": len(files), "truncated": len(files) > settings.github_max_files, "skipped": errors}


async def scrape_url(url: str) -> dict:
    safe_url = validate_public_url(normalize_url(url))
    pages: list[dict] = []
    report = {"kind": "web", "skipped": [], "truncated": False}
    async with httpx.AsyncClient(timeout=20, trust_env=False, headers={"User-Agent": "PanoptesBot/1.0"}) as client:
        if urlparse(safe_url).hostname == "github.com":
            pages, report = await scrape_github(client, safe_url)
        else:
            root = urlparse(safe_url)
            # Start from the parent directory so sibling documentation pages are eligible.
            prefix = root.path.rsplit("/", 1)[0] + "/"
            queue, visited = [safe_url], set()
            while queue and len(pages) < settings.scrape_max_pages and len(visited) < settings.scrape_max_pages * 4:
                current = queue.pop(0)
                if current in visited:
                    continue
                visited.add(current)
                try:
                    final_url, html = await fetch_public(client, current)
                    text, title = _extract_text_from_html(html, final_url)
                    if len(text.strip()) < 80:
                        rendered = await _render_page_text(final_url)
                        if rendered:
                            rendered_text, rendered_title = rendered
                            if len(rendered_text.strip()) >= len(text.strip()):
                                text, title = rendered_text, rendered_title
                    if len(text.strip()) >= 80:
                        pages.append({"url": final_url, "title": title, "text": text.strip()})
                    else:
                        report["skipped"].append({"url": current, "reason": "Texto insuficiente; a página pode exigir JavaScript ou conter conteúdo dinâmico"})
                    links = []
                    for link in BeautifulSoup(html, "lxml").select("a[href]"):
                        candidate = normalize_url(urljoin(final_url, link["href"]))
                        parsed = urlparse(candidate)
                        if parsed.scheme in ALLOWED_SCHEMES and parsed.netloc == root.netloc and parsed.path.startswith(prefix) and candidate not in visited and candidate not in queue:
                            links.append(candidate)
                    queue.extend(sorted(set(links), key=lambda value: (not any(word in value.lower() for word in ("docs", "guide", "manual", "tutorial")), value)))
                except (httpx.HTTPError, ValueError, HTTPException) as exc:
                    report["skipped"].append({"url": current, "reason": str(exc)[:200]})
            report.update(visited=len(visited), truncated=bool(queue))
    # Deduplicate identical pages without deleting meaningful repeated technical paragraphs.
    unique, hashes = [], set()
    for page in pages:
        digest = hashlib.sha256(page["text"].encode()).hexdigest()
        if digest not in hashes:
            hashes.add(digest)
            unique.append(page)
    if not unique:
        raise HTTPException(status_code=422, detail={"message": "Nenhum conteúdo extraído", "report": report})
    text = "\n\n".join(f"# {page['title']}\n\n{page['text']}" for page in unique)
    if len(text) > settings.scrape_max_characters:
        raise ValueError("Conteúdo excede SCRAPE_MAX_CHARACTERS; reduza o escopo da URL")
    report.update(pages=len(unique), characters=len(text), duplicates_removed=len(pages)-len(unique))
    return {"url": safe_url, "title": unique[0]["title"][:180], "text": text, "pages": unique, "report": report}
