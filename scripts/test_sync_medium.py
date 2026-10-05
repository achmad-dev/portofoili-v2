import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

import sync_medium


class SyncFeedTests(unittest.TestCase):
    def test_preserves_renamed_article_and_adds_new_article(self):
        feed = b"""<rss><channel>
            <item>
                <title>Original title</title>
                <link>https://medium.com/@author/original-title-46ea9ef371eb?source=rss</link>
                <description>Old article</description>
            </item>
            <item>
                <title>New article</title>
                <link>https://medium.com/@author/new-article-890d1768d6dd</link>
                <description>New article body</description>
            </item>
        </channel></rss>"""

        with tempfile.TemporaryDirectory() as directory:
            output_dir = Path(directory)
            renamed = output_dir / "my-chosen-name.md"
            original_content = (
                "# My chosen name\n\n"
                "[Read on medium](https://medium.com/@author/old-slug-46ea9ef371eb)\n"
            )
            renamed.write_text(original_content, encoding="utf-8")

            with patch.object(sync_medium, "OUTPUT_DIR", output_dir), patch.object(
                sync_medium, "urlopen", side_effect=[BytesIO(feed), BytesIO(feed)]
            ):
                sync_medium.sync_feed("medium", "https://example.com/feed")
                sync_medium.sync_feed("medium", "https://example.com/feed")

            self.assertEqual(renamed.read_text(encoding="utf-8"), original_content)
            self.assertEqual(
                {file.name for file in output_dir.glob("*.md")},
                {"my-chosen-name.md", "medium-new-article.md"},
            )


if __name__ == "__main__":
    unittest.main()
