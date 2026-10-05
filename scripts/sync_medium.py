"""Sync RSS articles into client/src/content/blog as Markdown files."""

from datetime import datetime
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.error import URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "client/src/content/blog"
FEEDS = (("medium", "https://medium.com/feed/@moonNight1"),)


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


class MarkdownParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.links: list[tuple[int, str]] = []
        self.pre = 0

    def newline(self, count: int = 2) -> None:
        self.parts.append("\n" * count)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs = dict(attrs)
        if tag in {"p", "div", "section", "article", "ul", "ol", "blockquote"}:
            self.newline()
        elif tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self.newline()
            self.parts.append("#" * int(tag[1]) + " ")
        elif tag == "li":
            self.newline(1)
            self.parts.append("- ")
        elif tag == "br":
            self.newline(1)
        elif tag == "hr":
            self.newline()
            self.parts.append("---")
            self.newline()
        elif tag == "pre":
            self.newline()
            self.parts.append("```text\n")
            self.pre += 1
        elif tag == "code" and not self.pre:
            self.parts.append("`")
        elif tag in {"strong", "b"}:
            self.parts.append("**")
        elif tag in {"em", "i"}:
            self.parts.append("*")
        elif tag == "a" and attrs.get("href"):
            self.links.append((len(self.parts), attrs["href"] or ""))
        elif tag == "img" and attrs.get("src") and "/_/stat?" not in attrs["src"]:
            self.parts.append(f"![{attrs.get('alt') or 'Image'}]({attrs['src']})")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"p", "div", "section", "article", "ul", "ol", "blockquote"}:
            self.newline()
        elif tag in {"h1", "h2", "h3", "h4", "h5", "h6", "li"}:
            self.newline()
        elif tag == "pre" and self.pre:
            self.pre -= 1
            self.newline()
            self.parts.append("```")
            self.newline()
        elif tag == "code" and not self.pre:
            self.parts.append("`")
        elif tag in {"strong", "b"}:
            self.parts.append("**")
        elif tag in {"em", "i"}:
            self.parts.append("*")
        elif tag == "a" and self.links:
            start, href = self.links.pop()
            label = "".join(self.parts[start:]).strip()
            del self.parts[start:]
            self.parts.append(f"[{label}]({href})" if label else href)

    def handle_data(self, data: str) -> None:
        self.parts.append(data)

    def markdown(self) -> str:
        return re.sub(r"\n{3,}", "\n\n", "".join(self.parts)).strip()


def html_to_markdown(content: str) -> str:
    parser = MarkdownParser()
    parser.feed(content)
    return parser.markdown()


def published_date(value: str) -> str:
    try:
        return parsedate_to_datetime(value).date().isoformat()
    except (TypeError, ValueError):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
        except ValueError:
            return ""


def article_key(link: str) -> str:
    path = urlsplit(link).path.rstrip("/")
    article_id = re.search(r"-([0-9a-f]{12})$", path, re.IGNORECASE)
    return article_id.group(1).lower() if article_id else path


def existing_articles(name: str) -> set[str]:
    articles = set()
    source_link = re.compile(rf"\[Read on {re.escape(name)}\]\((https?://[^)]+)\)")
    for file in OUTPUT_DIR.glob("*.md"):
        match = source_link.search(file.read_text(encoding="utf-8"))
        if match:
            articles.add(article_key(match.group(1)))
    return articles


def sync_feed(name: str, url: str) -> None:
    request = Request(url, headers={"User-Agent": "AchmadPortfolio/1.0"})
    try:
        with urlopen(request, timeout=15) as response:
            root = ET.fromstring(response.read())
    except (OSError, URLError, ET.ParseError) as error:
        print(f"Could not refresh {name} RSS feed: {error}; keeping cached posts.")
        return

    entries = [node for node in root.iter() if local_name(node.tag) in {"item", "entry"}]
    if not entries:
        print(f"No posts returned by {name} RSS feed; keeping cached posts.")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    articles = existing_articles(name)
    added = 0
    for entry in entries:
        fields: dict[str, str] = {}
        for child in entry:
            key = local_name(child.tag)
            value = (
                child.attrib.get("href") or "".join(child.itertext()).strip()
                if key == "link"
                else "".join(child.itertext()).strip()
            )
            if key in {"encoded", "content", "description", "summary"}:
                fields.setdefault("body", value)
                if key == "encoded":
                    fields["body"] = value
            elif value:
                fields[key] = value

        title = fields.get("title", "Untitled")
        slug = re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", title.lower())).strip("-")
        link = fields.get("link", "")
        if link and article_key(link) in articles:
            continue
        body = html_to_markdown(fields.get("body", ""))
        if not body.startswith("# "):
            body = f"# {title}\n\n{body}"
        date = published_date(fields.get("pubDate") or fields.get("published") or fields.get("updated", ""))
        byline = f"Published {date} · " if date else ""
        if link:
            byline += f"[Read on {name}]({link})"
        post = f"{body}\n\n---\n\n{byline}\n"
        (OUTPUT_DIR / f"{name}-{slug or 'post'}.md").write_text(post, encoding="utf-8")
        added += 1
        if link:
            articles.add(article_key(link))

    print(f"Added {added} of {len(entries)} post(s) from {name}.")


if __name__ == "__main__":
    for feed_name, feed_url in FEEDS:
        sync_feed(feed_name, feed_url)
