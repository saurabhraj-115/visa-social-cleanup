import json
from datetime import datetime
from rich.console import Console
from rich.table import Table
from rich import box

console = Console()

SEVERITY_COLOR = {
    "high": "bold red",
    "medium": "yellow",
    "low": "dim green",
}

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Visa Cleanup Report</title>
<style>
  body {{ font-family: Arial, sans-serif; margin: 2rem; background: #f9f9f9; }}
  h1 {{ color: #333; }}
  .summary {{ margin-bottom: 1.5rem; padding: 1rem; background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }}
  table {{ width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }}
  th {{ background: #333; color: #fff; padding: 10px 12px; text-align: left; }}
  td {{ padding: 10px 12px; border-bottom: 1px solid #eee; vertical-align: top; max-width: 400px; word-wrap: break-word; }}
  tr:last-child td {{ border-bottom: none; }}
  .high {{ background: #fff0f0; }}
  .medium {{ background: #fffbe6; }}
  .badge {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }}
  .badge-high {{ background: #e53e3e; color: #fff; }}
  .badge-medium {{ background: #dd6b20; color: #fff; }}
  .preview {{ font-size: 0.9em; color: #444; }}
  a {{ color: #2b6cb0; }}
</style>
</head>
<body>
<h1>Visa Cleanup Report</h1>
<div class="summary">
  <strong>Generated:</strong> {generated}<br>
  <strong>Total flagged items:</strong> {total}<br>
  <strong>High severity:</strong> {high} &nbsp;|&nbsp; <strong>Medium severity:</strong> {medium}
</div>
<table>
  <thead>
    <tr>
      <th>Platform</th>
      <th>Type</th>
      <th>Content Preview</th>
      <th>Severity</th>
      <th>Reason</th>
      <th>Direct Link</th>
    </tr>
  </thead>
  <tbody>
{rows}
  </tbody>
</table>
</body>
</html>"""

ROW_TEMPLATE = """    <tr class="{severity}">
      <td>{platform}</td>
      <td>{content_type}</td>
      <td class="preview">{preview}</td>
      <td><span class="badge badge-{severity}">{severity_upper}</span></td>
      <td>{reason}</td>
      <td><a href="{url}" target="_blank">Open &rarr;</a></td>
    </tr>"""


def print_report(flagged: list[tuple]) -> None:
    """Print a rich terminal table of flagged items."""
    if not flagged:
        console.print("\n[bold green]No flagged items found.[/bold green]\n")
        return

    table = Table(
        title="Flagged Content",
        box=box.ROUNDED,
        show_lines=True,
        highlight=True,
    )
    table.add_column("Platform", style="bold", width=12)
    table.add_column("Type", width=10)
    table.add_column("Preview", width=50)
    table.add_column("Severity", width=10)
    table.add_column("Reason", width=40)
    table.add_column("Link", width=40)

    for item, result in flagged:
        preview = item.text[:120].replace("\n", " ") + ("..." if len(item.text) > 120 else "")
        color = SEVERITY_COLOR.get(result.severity, "")
        table.add_row(
            item.platform,
            item.content_type,
            preview,
            f"[{color}]{result.severity.upper()}[/{color}]",
            result.reason,
            item.url,
        )

    console.print(table)


def save_json(flagged: list[tuple], path: str) -> None:
    data = {
        "generated": datetime.now().isoformat(),
        "total_flagged": len(flagged),
        "items": [
            {
                "platform": item.platform,
                "content_type": item.content_type,
                "text": item.text,
                "url": item.url,
                "created_at": item.created_at,
                "item_id": item.item_id,
                "severity": result.severity,
                "reason": result.reason,
            }
            for item, result in flagged
        ],
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def save_html(flagged: list[tuple], path: str) -> None:
    high = sum(1 for _, r in flagged if r.severity == "high")
    medium = sum(1 for _, r in flagged if r.severity == "medium")

    rows = []
    for item, result in flagged:
        preview = item.text[:300].replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
        rows.append(ROW_TEMPLATE.format(
            platform=item.platform,
            content_type=item.content_type,
            preview=preview,
            severity=result.severity,
            severity_upper=result.severity.upper(),
            reason=result.reason.replace("<", "&lt;").replace(">", "&gt;"),
            url=item.url,
        ))

    html = HTML_TEMPLATE.format(
        generated=datetime.now().strftime("%Y-%m-%d %H:%M"),
        total=len(flagged),
        high=high,
        medium=medium,
        rows="\n".join(rows),
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
