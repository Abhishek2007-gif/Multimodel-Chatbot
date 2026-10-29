import asyncio
import re
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings


class WebSearchService:
    @classmethod
    async def search(cls, query: str, max_results: int = 5) -> Dict[str, Any]:
        """
        Execute web search using Tavily, DuckDuckGo, or verified Wikipedia search fallback.
        Returns a dict with {"provider": str, "results": List[Dict[str, Any]]}.
        """
        if not query or not query.strip():
            return {"provider": "none", "results": []}

        clean_query = query.strip()
        provider_name = settings.SEARCH_PROVIDER.lower()

        # 1. Try Tavily if configured
        if provider_name == "tavily" and settings.TAVILY_API_KEY and "your_tavily" not in settings.TAVILY_API_KEY:
            try:
                from tavily import AsyncTavilyClient
                client = AsyncTavilyClient(api_key=settings.TAVILY_API_KEY)
                response = await asyncio.wait_for(
                    client.search(query=clean_query, max_results=max_results),
                    timeout=5.0
                )
                results = []
                for r in response.get("results", []):
                    results.append({
                        "title": r.get("title", "Untitled"),
                        "url": r.get("url", ""),
                        "snippet": r.get("content", ""),
                        "score": r.get("score", 0.9)
                    })
                if results:
                    return {"provider": "tavily", "results": results}
            except Exception as e:
                print(f"[WebSearch] Tavily failed: {e}. Falling back to free search engines.")

        # 2. Try DuckDuckGo / ddgs with strict timeout
        try:
            def run_ddgs():
                try:
                    from ddgs import DDGS
                except ImportError:
                    from duckduckgo_search import DDGS
                with DDGS() as ddgs:
                    return list(ddgs.text(clean_query, max_results=max_results))

            raw_results = await asyncio.wait_for(asyncio.to_thread(run_ddgs), timeout=3.5)
            if raw_results:
                results = []
                for r in raw_results:
                    results.append({
                        "title": r.get("title", "Web Result"),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", ""),
                        "score": 0.88
                    })
                if results:
                    return {"provider": "duckduckgo", "results": results}
        except Exception as e:
            print(f"[WebSearch] DuckDuckGo attempt timed out or failed: {e}")

        # 3. Fast, reliable live public encyclopedia search fallback (Wikipedia API)
        try:
            encoded_query = urllib.parse.quote(clean_query)
            wiki_url = (
                f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={encoded_query}"
                f"&format=json&utf8=&srlimit={max_results}"
            )
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(wiki_url, headers={"User-Agent": "SoulSyncBot/1.0 (Educational/MVP)"})
                if resp.status_code == 200:
                    data = resp.json()
                    search_items = data.get("query", {}).get("search", [])
                    results = []
                    for item in search_items:
                        title = item.get("title", "Article")
                        raw_snippet = item.get("snippet", "")
                        clean_snippet = re.sub(r"<[^>]+>", "", raw_snippet).strip()
                        article_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
                        results.append({
                            "title": title,
                            "url": article_url,
                            "snippet": clean_snippet or f"Information regarding {title}",
                            "score": 0.85
                        })
                    if results:
                        return {"provider": "web_search", "results": results}
        except Exception as e:
            print(f"[WebSearch] Web encyclopedia fallback failed: {e}")

        return {"provider": "none", "results": []}

    @classmethod
    def format_for_prompt(cls, search_data: Dict[str, Any]) -> str:
        """Format search results for prompt injection."""
        results = search_data.get("results", [])
        if not results:
            return ""

        lines = [
            "Live Web Search Results:",
            "Use the verified search findings below to ground your answer. Always cite sources as [Title](URL)."
        ]
        for i, item in enumerate(results, 1):
            lines.append(f"[{i}] [{item['title']}]({item['url']}): {item['snippet']}")
        lines.append(
            "\nImportant: Differentiate between facts found in the sources and your own analysis. Never fabricate URLs."
        )
        return "\n".join(lines)
