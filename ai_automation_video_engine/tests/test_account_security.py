import tempfile
import unittest
from pathlib import Path

import app


class AccountSecurityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.original_data_dir = app.DATA_DIR
        self.original_vault_path = app.VAULT_PATH
        self.original_backup_dir = app.BACKUP_DIR
        app.DATA_DIR = Path(self.temporary_directory.name)
        app.VAULT_PATH = app.DATA_DIR / "test_vault.json"
        app.BACKUP_DIR = app.DATA_DIR / "backups"

    def tearDown(self) -> None:
        app.DATA_DIR = self.original_data_dir
        app.VAULT_PATH = self.original_vault_path
        app.BACKUP_DIR = self.original_backup_dir
        self.temporary_directory.cleanup()

    def create_account(self) -> None:
        ok, username = app.create_hillgram_user(
            "science.creator",
            "creator@example.com",
            "Strong!Pass9021",
            "Strong!Pass9021",
            [app.SCIENCE_TOPICS[0]],
        )
        self.assertTrue(ok)
        self.assertEqual(username, "science.creator")

    def test_password_is_salted_and_not_stored_as_plaintext(self) -> None:
        self.create_account()
        record = app.load_vault()["users"]["science.creator"]

        self.assertNotIn("password", record)
        self.assertNotEqual(record["password_hash"], "Strong!Pass9021")
        self.assertTrue(record["salt"])
        self.assertEqual(record["password_iterations"], app.PASSWORD_HASH_ITERATIONS)

    def test_account_locks_after_repeated_failed_logins(self) -> None:
        self.create_account()

        for _ in range(app.MAX_FAILED_LOGIN_ATTEMPTS):
            ok, _ = app.authenticate_hillgram_user("science.creator", "Wrong!Pass9021")
            self.assertFalse(ok)

        ok, message = app.authenticate_hillgram_user("science.creator", "Strong!Pass9021")
        self.assertFalse(ok)
        self.assertIn("temporarily locked", message)

    def test_password_change_revokes_older_sessions(self) -> None:
        self.create_account()
        before = app.load_vault()["users"]["science.creator"]["security"]["session_version"]

        ok, _ = app.change_hillgram_password(
            "science.creator",
            "Strong!Pass9021",
            "New!SecurePass349",
            "New!SecurePass349",
        )

        self.assertTrue(ok)
        after = app.load_vault()["users"]["science.creator"]["security"]["session_version"]
        self.assertEqual(after, before + 1)
        self.assertFalse(app.verify_hillgram_user("science.creator", "Strong!Pass9021"))
        self.assertTrue(app.verify_hillgram_user("science.creator", "New!SecurePass349"))

    def test_deletion_requires_password_and_removes_camera_captures(self) -> None:
        self.create_account()
        camera_directory = app.DATA_DIR / "camera_shots" / "science.creator"
        camera_directory.mkdir(parents=True)
        (camera_directory / "capture.jpg").write_bytes(b"test")

        ok, _ = app.delete_hillgram_account("science.creator", "wrong", "science.creator")
        self.assertFalse(ok)
        self.assertIn("science.creator", app.load_vault()["users"])

        ok, _ = app.delete_hillgram_account(
            "science.creator",
            "Strong!Pass9021",
            "science.creator",
        )
        self.assertTrue(ok)
        self.assertNotIn("science.creator", app.load_vault()["users"])
        self.assertFalse(camera_directory.exists())

    def test_private_profile_requires_follow_approval(self) -> None:
        self.create_account()
        ok, _ = app.create_hillgram_user(
            "private.creator",
            "private@example.com",
            "Hidden!Pass9021",
            "Hidden!Pass9021",
            [app.SCIENCE_TOPICS[1]],
        )
        self.assertTrue(ok)
        private_record = app.get_user_record("private.creator")
        private_record["settings"]["private_profile"] = True
        app.save_user_record("private.creator", private_record)

        ok, message = app.follow_user("science.creator", "private.creator")
        self.assertTrue(ok)
        self.assertIn("request sent", message.lower())
        self.assertNotIn("private.creator", app.get_user_record("science.creator")["following"])

        ok, _ = app.respond_to_follow_request("private.creator", "science.creator", True)
        self.assertTrue(ok)
        self.assertIn("private.creator", app.get_user_record("science.creator")["following"])
        self.assertIn("science.creator", app.get_user_record("private.creator")["followers"])

    def test_reports_are_deduplicated_and_backups_are_scrubbed_on_deletion(self) -> None:
        self.create_account()
        item = {
            "id": "pexels-123",
            "source_url": "https://www.pexels.com/video/123",
            "topic": "science",
        }
        ok, _ = app.record_content_report("science.creator", item, "Misinformation", "Incorrect claim")
        self.assertTrue(ok)
        duplicate_ok, _ = app.record_content_report("science.creator", item, "Spam", "Repeated")
        self.assertFalse(duplicate_ok)

        backup = app.create_vault_backup(force=True)
        self.assertIsNotNone(backup)
        ok, _ = app.delete_hillgram_account(
            "science.creator",
            "Strong!Pass9021",
            "science.creator",
        )
        self.assertTrue(ok)
        for backup_path in app.BACKUP_DIR.glob("hillgram_vault_*.json"):
            self.assertNotIn("science.creator", backup_path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
