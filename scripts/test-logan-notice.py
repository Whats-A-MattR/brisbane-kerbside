import importlib.util
import unittest
from datetime import date
from pathlib import Path

spec = importlib.util.spec_from_file_location("notice", Path(__file__).with_name("check-logan-notice.py"))
notice = importlib.util.module_from_spec(spec)
spec.loader.exec_module(notice)

SCHEDULE_PAGE = '<h1>Kerbside clean-up schedule</h1><table><tr><td>9 November 2026</td></tr></table>'
LINK = '<a href="/announcement">Go to Severe weather information</a>'
HTML = ('<h2>Storm related waste</h2><p>Not a collection date.</p><h2>Kerbside collection</h2>'
        '<p>Kerbside collections in Browns Plains and Regents Park have been delayed, and will restart as soon as possible.</p>'
        '<h2>Community support</h2><p>Other information</p>')
CSV = ('Suburb,Start_Date,End_Date\nBROWNS PLAINS,9/11/2026,20/11/2026\n'
       'REGENTS PARK,9/11/2026,20/11/2026\nHILLCREST,23/11/2026,4/12/2026\n')
TODAY = date(2026, 11, 22)
EMPTY = dict(status="none", councilId="logan", collectionId=None, areaIds=[], areaNames=[],
             originalEnd=None, checkedOn=TODAY.isoformat(), source=notice.SCHEDULE)


class NoticeTests(unittest.TestCase):
    def test_only_verified_same_origin_link(self):
        self.assertEqual(notice.linked_notice(SCHEDULE_PAGE + LINK), notice.NOTICE)
        self.assertIsNone(notice.linked_notice(SCHEDULE_PAGE))
        self.assertIsNone(notice.linked_notice(SCHEDULE_PAGE + LINK.replace('/announcement', 'https://example.org/announcement')))
        with self.assertRaises(ValueError):
            notice.linked_notice('Service unavailable')

    def test_delayed_exact_run_and_no_unnecessary_update(self):
        text = list(notice.kerbside_paragraphs(HTML))
        result = notice.snapshot(EMPTY, notice.NOTICE, text, CSV, TODAY)
        self.assertEqual(result["status"], "delayed")
        self.assertEqual(result["areaIds"], ["browns-plains", "regents-park"])
        self.assertEqual(result["collectionId"], "2026-11-09")
        self.assertIs(notice.snapshot(result, notice.NOTICE, text, CSV, date(2026, 11, 23)), result)

    def test_unclear_never_becomes_a_suburb_delay(self):
        for text in ("Hillcrest", "Browns Plains and Hillcrest", "Unlisted"):
            result = notice.snapshot(EMPTY, notice.NOTICE, [f"Kerbside collections in {text} have been delayed."], CSV, TODAY)
            self.assertEqual(result["status"], "advisory")
            self.assertIsNone(result["collectionId"])

    def test_mixed_status_is_advisory(self):
        result = notice.snapshot(EMPTY, notice.NOTICE, [
            "Kerbside collections in Browns Plains and Regents Park have been delayed, but Browns Plains has since resumed."
        ], CSV, TODAY)
        self.assertEqual(result["status"], "advisory")

    def test_disappearance_is_not_a_confirmation_of_resumption(self):
        previous = notice.snapshot(EMPTY, notice.NOTICE, list(notice.kerbside_paragraphs(HTML)), CSV, TODAY)
        absent = notice.snapshot(previous, None, [], "", TODAY)
        self.assertEqual(absent["status"], "advisory")
        self.assertEqual(absent["areaIds"], previous["areaIds"])
        self.assertEqual(absent["areaNames"], ["Browns Plains", "Regents Park"])
        self.assertEqual(notice.snapshot(absent, None, [], "", date(2026, 11, 29))["status"], "none")
        self.assertEqual(notice.snapshot(absent, notice.NOTICE, ["Kerbside collections in Browns Plains and Regents Park have resumed."], "", TODAY)["status"], "none")
        self.assertEqual(notice.snapshot(previous, notice.NOTICE, ["Kerbside collections in Browns Plains and Regents Park have resumed."], "", TODAY)["status"], "none")
        self.assertEqual(notice.snapshot(previous, notice.NOTICE, ["Kerbside collections in Browns Plains and Regents Park have not resumed."], "", TODAY)["status"], "advisory")


if __name__ == "__main__":
    unittest.main()
