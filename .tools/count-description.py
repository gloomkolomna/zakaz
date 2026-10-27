from pathlib import Path

text = Path("D:/Боты/СобериЗаказ/docs/store/description.md").read_text(encoding="utf-8")
parts = text.split("## ")
for part in parts[1:]:
    title, body = part.split("\n", 1)
    body = body.strip()
    print(title.strip(), "->", len(body), "символов")
