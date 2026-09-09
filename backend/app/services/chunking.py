def chunk_text(text: str, size: int = 900, overlap: int = 140) -> list[str]:
    paragraphs = ["\n".join(line.strip() for line in block.splitlines() if line.strip()) for block in text.split("\n\n")]
    paragraphs = [paragraph for paragraph in paragraphs if paragraph]
    if not paragraphs:
        return []
    effective_overlap = min(max(overlap, 0), max(size // 4, 1))
    units: list[str] = []
    for paragraph in paragraphs:
        if paragraph.startswith("#") and units:
            units[-1] = f"{units[-1]}\n{paragraph}"
        else:
            units.append(paragraph)
    chunks: list[str] = []
    current = ""
    for paragraph in units:
        if len(paragraph) > size:
            if current:
                chunks.append(current)
                current = ""
            start = 0
            while start < len(paragraph):
                end = min(start + size, len(paragraph))
                if end < len(paragraph):
                    boundary = paragraph.rfind(" ", start, end)
                    if boundary > start:
                        end = boundary
                chunks.append(paragraph[start:end].strip())
                if end == len(paragraph):
                    break
                start = max(end - effective_overlap, start + 1)
            continue
        candidate = f"{current}\n\n{paragraph}" if current else paragraph
        if len(candidate) <= size:
            current = candidate
            continue
        if current:
            chunks.append(current)
        tail = current[-effective_overlap:] if current else ""
        current = f"{tail}\n\n{paragraph}".strip()
    if current:
        chunks.append(current)
    return chunks
