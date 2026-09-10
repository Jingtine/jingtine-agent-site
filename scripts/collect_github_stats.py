"""Collect a reviewable snapshot of Jingtine's public GitHub activity."""
import json
import os
import re
import sys
from collections import OrderedDict
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH = os.path.join(PROJECT_DIR, "public", "data", "github-stats.json")
GITHUB_USER = "Jingtine"
USER_AGENT = "jingtine-agent-site/1.0"


class ContributionParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.days = {}
        self.tooltip_for = None
        self.tooltip_text = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "td" and "ContributionCalendar-day" in attributes.get("class", ""):
            day_id = attributes.get("id")
            date = attributes.get("data-date")
            if day_id and date:
                self.days[day_id] = {
                    "date": date,
                    "count": 0,
                    "level": int(attributes.get("data-level", "0") or 0),
                }
        elif tag == "tool-tip" and attributes.get("for") in self.days:
            self.tooltip_for = attributes["for"]
            self.tooltip_text = []

    def handle_data(self, data):
        if self.tooltip_for:
            self.tooltip_text.append(data)

    def handle_endtag(self, tag):
        if tag != "tool-tip" or not self.tooltip_for:
            return
        match = re.search(r"([\d,]+) contributions?", " ".join(self.tooltip_text), re.IGNORECASE)
        if match:
            self.days[self.tooltip_for]["count"] = int(match.group(1).replace(",", ""))
        self.tooltip_for = None
        self.tooltip_text = []


def parse_contributions(html):
    parser = ContributionParser()
    parser.feed(html)
    return sorted(parser.days.values(), key=lambda day: day["date"])


def summarize_contributions(days):
    monthly = OrderedDict()
    for day in days:
        key = day["date"][:7]
        monthly[key] = monthly.get(key, 0) + int(day["count"])
    months = [
        {"key": key, "label": datetime.strptime(key, "%Y-%m").strftime("%b"), "count": count}
        for key, count in monthly.items()
    ]
    busiest = max(days, key=lambda day: day["count"], default={"date": "", "count": 0})
    return {
        "totalContributions": sum(int(day["count"]) for day in days),
        "activeDays": sum(1 for day in days if int(day["count"]) > 0),
        "busiestDay": {"date": busiest["date"], "count": int(busiest["count"])},
        "months": months,
    }


def fetch_text(url, accept):
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": accept})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def fetch_json(url):
    return json.loads(fetch_text(url, "application/vnd.github+json"))


def github_url(value, fallback):
    if isinstance(value, str) and value.startswith("https://github.com/"):
        return value
    return fallback


def collect():
    profile = fetch_json(f"https://api.github.com/users/{GITHUB_USER}")
    repos = fetch_json(f"https://api.github.com/users/{GITHUB_USER}/repos?per_page=100&sort=updated&type=owner")
    html = fetch_text(f"https://github.com/users/{GITHUB_USER}/contributions", "text/html")
    days = parse_contributions(html)
    if not days:
        raise ValueError("GitHub contribution calendar contained no daily entries")
    owned = [repo for repo in repos if not repo.get("fork") and not repo.get("archived")]
    summary = summarize_contributions(days)
    months = summary.pop("months")
    summary["stars"] = sum(int(repo.get("stargazers_count") or 0) for repo in owned)
    repositories = []
    for repo in owned[:6]:
        name = str(repo.get("name") or "Untitled repository")
        repositories.append({
            "name": name,
            "url": github_url(repo.get("html_url"), f"https://github.com/{GITHUB_USER}"),
            "description": str(repo.get("description") or "Public GitHub repository"),
            "stars": int(repo.get("stargazers_count") or 0),
            "forks": int(repo.get("forks_count") or 0),
            "language": str(repo.get("language") or "Code"),
            "updatedAt": str(repo.get("updated_at") or ""),
        })
    return {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "profile": {
            "login": str(profile.get("login") or GITHUB_USER),
            "url": github_url(profile.get("html_url"), f"https://github.com/{GITHUB_USER}"),
            "publicRepos": int(profile.get("public_repos") or 0),
            "followers": int(profile.get("followers") or 0),
        },
        "summary": summary,
        "months": months,
        "calendar": days,
        "repositories": repositories,
    }


def main():
    try:
        data = collect()
        with open(OUTPUT_PATH, "w", encoding="utf-8", newline="\n") as output:
            json.dump(data, output, ensure_ascii=False, indent=2)
            output.write("\n")
        print(f"GitHub stats: {data['summary']['totalContributions']} contributions, {len(data['repositories'])} recent repositories")
        return 0
    except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
        print(f"Unable to collect GitHub stats: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
