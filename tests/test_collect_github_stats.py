import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).parents[1] / "scripts" / "collect_github_stats.py"
SPEC = importlib.util.spec_from_file_location("collect_github_stats", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class GitHubContributionParserTests(unittest.TestCase):
    def test_parses_daily_counts_and_builds_month_totals(self):
        html = """
        <td data-date="2026-08-30" id="day-1" data-level="2" class="ContributionCalendar-day"></td>
        <tool-tip for="day-1">3 contributions on August 30th.</tool-tip>
        <td data-date="2026-09-01" id="day-2" data-level="1" class="ContributionCalendar-day"></td>
        <tool-tip for="day-2">1 contribution on September 1st.</tool-tip>
        <td data-date="2026-09-02" id="day-3" data-level="0" class="ContributionCalendar-day"></td>
        <tool-tip for="day-3">No contributions on September 2nd.</tool-tip>
        """
        days = MODULE.parse_contributions(html)
        self.assertEqual(days, [
            {"date": "2026-08-30", "count": 3, "level": 2},
            {"date": "2026-09-01", "count": 1, "level": 1},
            {"date": "2026-09-02", "count": 0, "level": 0},
        ])
        self.assertEqual(MODULE.summarize_contributions(days), {
            "totalContributions": 4,
            "activeDays": 2,
            "busiestDay": {"date": "2026-08-30", "count": 3},
            "months": [
                {"key": "2026-08", "label": "Aug", "count": 3},
                {"key": "2026-09", "label": "Sep", "count": 1},
            ],
        })


if __name__ == "__main__":
    unittest.main()
