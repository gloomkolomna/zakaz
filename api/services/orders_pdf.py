from __future__ import annotations

import datetime
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from services.msk_time import MSK

FONT_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
FONT_REGULAR = FONT_DIR / "DejaVuSans.ttf"
FONT_BOLD = FONT_DIR / "DejaVuSans-Bold.ttf"

INK = colors.HexColor("#1A201B")
MUTED = colors.HexColor("#68716A")
LINE = colors.HexColor("#E1E3DC")
RED = colors.HexColor("#B02A21")

STATUS_LABELS = {"new": "В работе", "done": "Выполнен", "cancelled": "Отменён"}

_registered = False


def _register_fonts() -> None:
    global _registered
    if _registered:
        return
    pdfmetrics.registerFont(TTFont("ZakazSans", str(FONT_REGULAR)))
    pdfmetrics.registerFont(TTFont("ZakazSans-Bold", str(FONT_BOLD)))
    _registered = True


def _price(value: int) -> str:
    return f"{value:,}".replace(",", "\u00a0") + " ₽"


def _date(value: datetime.datetime | None) -> str:
    if value is None:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=datetime.timezone.utc)
    return value.astimezone(MSK).strftime("%d.%m.%Y %H:%M")


def _footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("ZakazSans", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(14 * mm, 8 * mm, "Магазин игр")
    canvas.drawRightString(A4[0] - 14 * mm, 8 * mm, f"Стр. {doc.page}")
    canvas.restoreState()


def render_orders_pdf(orders, positions: dict[int, int]) -> bytes:
    _register_fonts()

    title_style = ParagraphStyle(
        "Title", fontName="ZakazSans-Bold", fontSize=18, leading=22, textColor=INK
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", fontName="ZakazSans", fontSize=8.5, leading=11, textColor=MUTED
    )
    cell_style = ParagraphStyle(
        "Cell", fontName="ZakazSans", fontSize=8, leading=10.5, textColor=INK
    )
    head_style = ParagraphStyle(
        "Head", fontName="ZakazSans-Bold", fontSize=8, leading=10, textColor=colors.white
    )
    summary_label = ParagraphStyle(
        "SummaryLabel", fontName="ZakazSans", fontSize=7.5, leading=9, textColor=MUTED
    )
    summary_value = ParagraphStyle(
        "SummaryValue", fontName="ZakazSans-Bold", fontSize=13, leading=16, textColor=INK
    )

    now = datetime.datetime.now(MSK).strftime("%d.%m.%Y %H:%M")
    queue_count = sum(1 for order in orders if order.status == "new")
    unread_count = sum(1 for order in orders if order.read_at is None)
    total_sum = sum(order.total for order in orders)

    story = [
        Paragraph("Заказы — Магазин игр", title_style),
        Spacer(1, 2 * mm),
        Paragraph(f"Сформировано {now} (МСК) · заказов: {len(orders)}", subtitle_style),
        Spacer(1, 5 * mm),
    ]

    summary = Table(
        [
            [
                Paragraph("Всего", summary_label),
                Paragraph("В очереди", summary_label),
                Paragraph("Не прочитано", summary_label),
                Paragraph("Сумма", summary_label),
            ],
            [
                Paragraph(str(len(orders)), summary_value),
                Paragraph(str(queue_count), summary_value),
                Paragraph(str(unread_count), summary_value),
                Paragraph(_price(total_sum), summary_value),
            ],
        ],
        colWidths=[45.5 * mm] * 4,
    )
    summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFFFFF")),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([summary, Spacer(1, 6 * mm)])

    data = [[
        Paragraph("№", head_style),
        Paragraph("Оч.", head_style),
        Paragraph("Дата", head_style),
        Paragraph("Товар / заказчик", head_style),
        Paragraph("Поз.", head_style),
        Paragraph("Сумма", head_style),
        Paragraph("Статус", head_style),
    ]]

    if not orders:
        data.append([Paragraph("Заказов по этому фильтру нет", cell_style), "", "", "", "", "", ""])
    else:
        for order in orders:
            queue_position = positions.get(order.id) if order.status == "new" else None
            status = STATUS_LABELS.get(order.status, order.status)
            if order.status == "cancelled":
                status = f'<font color="#B02A21">{escape(status)}</font>'
            else:
                status = escape(status)

            data.append([
                Paragraph(str(order.id), cell_style),
                Paragraph(str(queue_position) if queue_position else "—", cell_style),
                Paragraph(_date(order.created_at), cell_style),
                Paragraph(
                    f"{escape(order.product_title)}<br/>"
                    f'<font color="#68716A" size="7">{escape(order.buyer_name)}</font>',
                    cell_style,
                ),
                Paragraph(str(order.items_count), cell_style),
                Paragraph(_price(order.total), cell_style),
                Paragraph(status, cell_style),
            ])

    table = Table(
        data,
        colWidths=[11 * mm, 11 * mm, 26 * mm, 71 * mm, 15 * mm, 23 * mm, 25 * mm],
        repeatRows=1,
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(table)
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("Сумма указана в рублях. Статусы: в работе, выполнен, отменён.", subtitle_style))

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )
    document.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buffer.getvalue()
