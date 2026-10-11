"""Article-page text extraction for feeds whose entries carry little or no body.

Some feeds publish only a title (Hankyung) or a one-line teaser (Fed); the article text
lives on the linked page. This module turns that page's HTML into plain text without a
per-site selector: it picks the block container holding the most non-link text, which is
where an article body sits on a news page (navigation, related-news lists and footers
are either dropped by tag or lose on link density). Stdlib only, like the feed parsers.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from html.parser import HTMLParser

# Subtrees that never hold article text.
_SKIP_TAGS = frozenset(
    {
        "script",
        "style",
        "noscript",
        "template",
        "svg",
        "iframe",
        "nav",
        "header",
        "footer",
        "aside",
        "form",
        "button",
        "select",
        "figure",
        "figcaption",
    }
)

# Containers: text inside them (outside a nested container) is scored for them.
_CONTAINER_TAGS = frozenset({"body", "main", "article", "section", "div", "td"})

# Paragraph-level breaks inside a container.
_BREAK_TAGS = frozenset(
    {"p", "br", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "tr", "dd", "dt"}
)

_VOID_TAGS = frozenset(
    {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source",
     "track", "wbr"}
)  # fmt: skip

# Below this many characters the "article" is more likely a stray caption than a body.
MIN_ARTICLE_CHARS = 200

_CHARSET_RE = re.compile(rb"""<meta[^>]+charset\s*=\s*["']?\s*([A-Za-z0-9_\-]+)""", re.I)
_SPACES_RE = re.compile(r"[ \t\r\f\v ​]+")


@dataclass
class _Container:
    parts: list[str] = field(default_factory=list)
    text_chars: int = 0
    link_chars: int = 0

    @property
    def score(self) -> int:
        return self.text_chars - self.link_chars


class _ArticleParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, _Container | None]] = []
        self.containers: list[_Container] = []
        self.skip_depth = 0
        self.link_depth = 0

    def _current(self) -> _Container | None:
        for _, container in reversed(self.stack):
            if container is not None:
                return container
        return None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.skip_depth:
            if tag in _SKIP_TAGS:
                self.skip_depth += 1
            return
        if tag in _SKIP_TAGS:
            self.skip_depth = 1
            return
        if tag in _BREAK_TAGS and (current := self._current()) is not None:
            current.parts.append("\n")
        if tag in _VOID_TAGS:
            return
        container = None
        if tag in _CONTAINER_TAGS:
            container = _Container()
            self.containers.append(container)
        if tag == "a":
            self.link_depth += 1
        self.stack.append((tag, container))

    def handle_endtag(self, tag: str) -> None:
        if self.skip_depth:
            if tag in _SKIP_TAGS:
                self.skip_depth -= 1
            return
        if tag in _BREAK_TAGS and (current := self._current()) is not None:
            current.parts.append("\n")
        # Close up to the matching open tag; a stray end tag with no match is ignored.
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for closed, _ in self.stack[i:]:
                    if closed == "a":
                        self.link_depth = max(0, self.link_depth - 1)
                del self.stack[i:]
                return

    def handle_data(self, data: str) -> None:
        if self.skip_depth:
            return
        current = self._current()
        if current is None:
            return
        current.parts.append(data)
        n = len(data.strip())
        current.text_chars += n
        if self.link_depth:
            current.link_chars += n


def decode_html(raw: bytes) -> str:
    """Decode page bytes: declared ``<meta charset>`` first, then UTF-8, then CP949."""
    match = _CHARSET_RE.search(raw[:4096])
    candidates = [match.group(1).decode("ascii", "ignore")] if match else []
    candidates += ["utf-8", "cp949"]
    for encoding in candidates:
        try:
            return raw.decode(encoding)
        except (LookupError, UnicodeDecodeError):
            continue
    return raw.decode("utf-8", errors="replace")


def _normalize(parts: list[str]) -> str:
    lines = (_SPACES_RE.sub(" ", line).strip() for line in "".join(parts).split("\n"))
    return "\n".join(line for line in lines if line)


def extract_article_text(raw: bytes) -> str:
    """Return the article body text of an HTML page, or ``""`` when none is found."""
    parser = _ArticleParser()
    try:
        parser.feed(decode_html(raw))
        parser.close()
    except Exception:  # malformed markup: score whatever was parsed so far
        pass
    if not parser.containers:
        return ""
    best = max(parser.containers, key=lambda c: c.score)
    if best.score <= 0:
        return ""
    return _normalize(best.parts)
