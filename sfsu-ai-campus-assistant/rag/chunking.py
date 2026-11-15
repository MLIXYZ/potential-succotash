from __future__ import annotations

import re


def _hard_split(text: str, size: int) -> list[str]:
    out: list[str] = []
    while len(text) > size:
        cut = text.rfind(" ", 0, size)
        if cut <= size // 2:
            cut = size
        out.append(text[:cut].strip())
        text = text[cut:].strip()
    if text:
        out.append(text)
    return out


def chunk_text(text: str, size: int = 1200, overlap: int = 200) -> list[str]:
    text = text.replace("\r\n", "\n").strip()
    if not text:
        return []

    pieces: list[str] = []
    for para in re.split(r"\n\s*\n", text):
        para = para.strip()
        if para:
            pieces.extend([para] if len(para) <= size else _hard_split(para, size))

    chunks: list[str] = []
    current = ""
    for piece in pieces:
        if current and len(current) + 2 + len(piece) > size:
            chunks.append(current)
            tail = current[-overlap:] if overlap > 0 else ""
            space = tail.find(" ")
            if space != -1:
                tail = tail[space + 1 :]
            current = f"{tail}\n\n{piece}" if tail else piece
        else:
            current = f"{current}\n\n{piece}" if current else piece
    if current:
        chunks.append(current)
    return chunks
