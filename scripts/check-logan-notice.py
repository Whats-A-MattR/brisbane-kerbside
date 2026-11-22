"""Update only the local Logan notice snapshot. No network writes."""
import csv
import io
import json
import re
import sys
from datetime import date, datetime, timedelta
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from zoneinfo import ZoneInfo

SCHEDULE = "https://www.logan.qld.gov.au/residents/waste-and-recycling/kerbside-clean-up/schedule"
NOTICE = "https://www.logan.qld.gov.au/announcement"
CSV = "https://www.arcgis.com/sharing/rest/content/items/17ae783777574d33bbf992c08fc24be0/data"
STATE = Path(__file__).resolve().parents[1] / "sites/logan/storm-notice.json"
HOST = "www.logan.qld.gov.au"
DELAY = re.compile(r"^Kerbside collections? in (.+?) (?:have|has) been delayed(?:, and will restart as soon as possible)?\.?$", re.I)
RESUMED = re.compile(r"^Kerbside collections? in (.+?) (?:have|has) (?:now )?resumed(?:\.|$)", re.I)


class PublicBlocks(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.stack = []
        self.blocks = []
        self.feed(html)
        self.close()

    def handle_starttag(self, tag, attrs):
        if tag in {"h1", "h2", "p", "a", "td"}:
            self.stack.append((tag, dict(attrs), []))

    def handle_data(self, data):
        for _, _, parts in self.stack:
            parts.append(data)

    def handle_endtag(self, tag):
        if self.stack and self.stack[-1][0] == tag:
            name, attrs, parts = self.stack.pop()
            self.blocks.append((name, attrs, " ".join("".join(parts).split())))


def linked_notice(html):
    blocks = PublicBlocks(html).blocks
    if not (any(t == "h1" and s.casefold() == "kerbside clean-up schedule" for t, _, s in blocks)
            and any(t == "td" and re.fullmatch(r"\d{1,2} [A-Za-z]+ 20\d\d", s) for t, _, s in blocks)):
        raise ValueError("Council schedule could not be verified")
    for tag, attrs, title in blocks:
        if tag != "a" or not re.search(r"severe weather|kerbside.*(?:update|notice)", title, re.I):
            continue
        url = urlsplit(urljoin(SCHEDULE, attrs.get("href", "")))
        if (url.scheme, url.netloc, url.path) == ("https", HOST, "/announcement"):
            return NOTICE
    return None


def kerbside_paragraphs(html):
    in_section = False
    for tag, _, copy in PublicBlocks(html).blocks:
        if tag == "h2":
            if in_section:
                break
            in_section = copy.casefold() == "kerbside collection"
        elif tag == "p" and in_section:
            yield copy


def named_areas(raw):
    return {re.sub(r"[^a-z0-9]+", "-", name.strip().casefold()).strip("-")
            for name in re.split(r",\s*(?:and\s+)?|\s+and\s+", raw, flags=re.I)}


def match_run(raw, csv_body, today):
    areas = named_areas(raw)
    if not areas or "" in areas:
        return None
    groups = {}
    for row in csv.DictReader(io.StringIO(csv_body.lstrip("\ufeff"))):
        name = row["Suburb"].strip()
        slug = next(iter(named_areas(name)), "")
        if slug not in areas:
            continue
        start, end = (datetime.strptime(row[key], "%d/%m/%Y").date()
                      for key in ("Start_Date", "End_Date"))
        # Never infer a delay for a future round from a notice that has no date.
        if start <= today and end >= today - timedelta(days=14):
            groups.setdefault((start, end), {})[slug] = name.title()
    if len(groups) != 1:
        return None
    (start, end), matched = next(iter(groups.items()))
    if matched.keys() != areas:
        return None
    return start.isoformat(), end.isoformat(), sorted(matched), [matched[k] for k in sorted(matched)]


def snapshot(previous, source, paragraphs, csv_body, today):
    status, run, end, ids, names = "none", None, None, [], []
    if source:
        status = "advisory"
        ids = previous["areaIds"]
        # Multiple conflicting or unrecognised collection paragraphs are advisory only.
        if len(paragraphs) == 1:
            resumed = RESUMED.fullmatch(paragraphs[0])
            delay = DELAY.fullmatch(paragraphs[0])
            if resumed and previous["areaIds"] and named_areas(resumed[1]) == set(previous["areaIds"]):
                status = "none"
                # Preserve the scope privately in the snapshot so repeated resolution stays idempotent.
                ids = previous["areaIds"]
            elif delay and (matched := match_run(delay[1], csv_body, today)):
                status = "delayed"
                run, end, ids, names = matched
    elif previous["status"] != "none":
        # A verified schedule with no banner is not a resumption report.
        # Retire the neutral pointer after a week with the banner absent.
        if previous["source"] != SCHEDULE or today < date.fromisoformat(previous["checkedOn"]) + timedelta(days=7):
            status, ids = "advisory", previous["areaIds"]
    result = dict(status=status, councilId="logan", collectionId=run, areaIds=ids,
                  areaNames=names, originalEnd=end, checkedOn=today.isoformat(),
                  source=source or SCHEDULE)
    if all(result[k] == previous[k] for k in result if k != "checkedOn"):
        return previous  # no commit or deploy just for a new check date
    return result


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def fetch(url):
    request = Request(url, headers={"User-Agent": "KerbsideSiteFactory/1.0 (public schedule status)"})
    with build_opener(NoRedirects()).open(request, timeout=15) as response:
        raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError("Source exceeded size limit")
        return raw.decode("utf-8-sig")


def main():
    previous = json.loads(STATE.read_text())
    today = datetime.now(ZoneInfo("Australia/Brisbane")).date()
    source = linked_notice(fetch(SCHEDULE))
    paragraphs = list(kerbside_paragraphs(fetch(source))) if source else []
    csv_body = fetch(CSV) if len(paragraphs) == 1 and DELAY.fullmatch(paragraphs[0]) else ""
    result = snapshot(previous, source, paragraphs, csv_body, today)
    if result != previous:
        STATE.write_text(json.dumps(result, indent=2) + "\n")
    print(f"Logan notice: {result['status']} ({'updated' if result != previous else 'unchanged'})")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError) as error:
        sys.exit(f"Could not verify Logan notice; stored snapshot unchanged: {error}")
