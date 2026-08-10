import re
import unicodedata


CODE_BLOCK = re.compile(r"```[\s\S]*?```|(?:^|\n)(?: {4}|\t).+(?:(?:\n)(?: {4}|\t).+)*", re.MULTILINE)
URL_ONLY = re.compile(r"^\s*https?://\S+\s*$", re.IGNORECASE)


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).replace("\r\n", "\n").replace("\r", "\n")
    value = CODE_BLOCK.sub("\nコード部分は省略します。\n", value)
    value = "".join(char for char in value if char in "\n\t" or not unicodedata.category(char).startswith("C"))
    lines = []
    for line in value.splitlines():
        if URL_ONLY.match(line):
            continue
        lines.append(re.sub(r"[ \t\u3000]+", " ", line).strip())
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()
