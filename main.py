#!/usr/bin/env python3
"""
Visa Cleanup Agent
Scans your social media for content that might be flagged during a US visa interview.
"""
import argparse
import sys
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn

import config
import analyzer as anlz
import reporter

console = Console()

PLATFORM_MODULES = {
    "reddit": "platforms.reddit_client",
    "twitter": "platforms.twitter_client",
    "facebook": "platforms.facebook_client",
    "instagram": "platforms.instagram_client",
    "linkedin": "platforms.linkedin_client",
}


def check_credentials(platforms: list[str]) -> bool:
    missing = []
    checks = {
        "reddit": [config.REDDIT_CLIENT_ID, config.REDDIT_CLIENT_SECRET],
        "twitter": [config.TWITTER_BEARER_TOKEN, config.TWITTER_USERNAME],
        "facebook": [config.FACEBOOK_ACCESS_TOKEN],
        "instagram": [config.INSTAGRAM_USERNAME, config.INSTAGRAM_PASSWORD],
        "linkedin": [config.LINKEDIN_CLIENT_ID, config.LINKEDIN_CLIENT_SECRET],
    }
    names = {
        "reddit": ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET"],
        "twitter": ["TWITTER_BEARER_TOKEN", "TWITTER_USERNAME"],
        "facebook": ["FACEBOOK_ACCESS_TOKEN"],
        "instagram": ["INSTAGRAM_USERNAME", "INSTAGRAM_PASSWORD"],
        "linkedin": ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    }
    for p in platforms:
        for val, name in zip(checks[p], names[p]):
            if not val:
                missing.append(name)
    if missing:
        console.print(f"[red]Missing credentials:[/red] {', '.join(missing)}")
        console.print("Copy .env.example to .env and fill in the missing values.")
        console.print("See SETUP.md for step-by-step instructions.")
        return False
    if not config.ANTHROPIC_API_KEY:
        console.print("[red]Missing: ANTHROPIC_API_KEY[/red]")
        return False
    return True


def fetch_platform(platform: str, limit: int) -> list:
    import importlib  # noqa: PLC0415
    try:
        module = importlib.import_module(PLATFORM_MODULES[platform])
        return module.fetch_items(limit=limit or None)
    except Exception as e:
        console.print(f"[red][{platform.title()}] Error: {e}[/red]")
        return []


def main():
    parser = argparse.ArgumentParser(
        description="Scan your social media for content that might raise concerns at a US visa interview."
    )
    parser.add_argument(
        "--platforms",
        nargs="+",
        choices=["reddit", "twitter", "facebook", "instagram", "linkedin"],
        default=["reddit", "twitter", "facebook", "instagram", "linkedin"],
        help="Which platforms to scan (default: all)",
    )
    parser.add_argument(
        "--severity",
        choices=["high", "medium", "low"],
        default="medium",
        help="Minimum severity to include in report (default: medium)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Max items to fetch per platform (default: all). Use 50 for a quick test.",
    )
    parser.add_argument(
        "--output",
        default="report",
        help="Base filename for output files (default: report → report.json + report.html)",
    )
    args = parser.parse_args()

    console.rule("[bold]Visa Social Media Cleanup Agent[/bold]")
    console.print()

    if not check_credentials(args.platforms):
        sys.exit(1)

    # Fetch content from all platforms
    all_items = []
    for platform in args.platforms:
        with console.status(f"[cyan]Fetching {platform.title()} content...[/cyan]"):
            items = fetch_platform(platform, args.limit)
        console.print(f"  [green]✓[/green] {platform.title()}: fetched {len(items)} items")
        all_items.extend(items)

    if not all_items:
        console.print("\n[yellow]No content fetched. Check your credentials and try again.[/yellow]")
        sys.exit(0)

    console.print(f"\nAnalyzing [bold]{len(all_items)}[/bold] items with Claude...\n")

    # Analyze with Claude
    content_analyzer = anlz.ContentAnalyzer()
    flagged = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Analyzing content...", total=len(all_items))

        def on_progress(current, total, item, result):
            progress.advance(task)

        pairs = content_analyzer.analyze_batch(all_items, progress_callback=on_progress)

    # Filter by severity
    severity_order = {"high": 2, "medium": 1, "low": 0}
    min_sev = severity_order[args.severity]
    for item, result in pairs:
        if result.flag and severity_order.get(result.severity, 0) >= min_sev:
            flagged.append((item, result))

    # Sort by severity descending
    flagged.sort(key=lambda x: severity_order.get(x[1].severity, 0), reverse=True)

    console.print()
    console.rule("[bold]Results[/bold]")

    if not flagged:
        console.print("\n[bold green]No concerning content found. You're good to go![/bold green]\n")
    else:
        high_count = sum(1 for _, r in flagged if r.severity == "high")
        med_count = sum(1 for _, r in flagged if r.severity == "medium")
        console.print(
            f"\nFound [bold]{len(flagged)}[/bold] flagged items: "
            f"[red]{high_count} high[/red], [yellow]{med_count} medium[/yellow]\n"
        )

        reporter.print_report(flagged)

        json_path = f"{args.output}.json"
        html_path = f"{args.output}.html"
        reporter.save_json(flagged, json_path)
        reporter.save_html(flagged, html_path)

        console.print(f"\n[bold]Reports saved:[/bold]")
        console.print(f"  • {json_path}")
        console.print(f"  • [link]{html_path}[/link] (open in browser for clickable links)")
        console.print()
        console.print("[bold yellow]Review the report and use the direct links to manually remove flagged content.[/bold yellow]")


if __name__ == "__main__":
    main()
