import inspect
import tempfile
import unittest
from pathlib import Path

import app


class CaptionWorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.originals = {
            "ASSET_DIR": app.ASSET_DIR,
            "FINAL_OUTPUT": app.FINAL_OUTPUT,
            "CLEAN_OUTPUT": app.CLEAN_OUTPUT,
            "CAPTIONED_OUTPUT": app.CAPTIONED_OUTPUT,
            "CAPTION_SRT": app.CAPTION_SRT,
            "CAPTION_PROJECT": app.CAPTION_PROJECT,
            "TARGET_SIZE": app.TARGET_SIZE,
        }
        app.ASSET_DIR = Path(self.temporary_directory.name)
        app.FINAL_OUTPUT = app.ASSET_DIR / "final_output.mp4"
        app.CLEAN_OUTPUT = app.ASSET_DIR / "final_output_clean.mp4"
        app.CAPTIONED_OUTPUT = app.ASSET_DIR / "final_output_captioned.mp4"
        app.CAPTION_SRT = app.ASSET_DIR / "hillgram_captions.srt"
        app.CAPTION_PROJECT = app.ASSET_DIR / "caption_project.json"
        app.TARGET_SIZE = (180, 320)

        app.run_ffmpeg(
            [
                "-y",
                "-f",
                "lavfi",
                "-i",
                "color=c=0x16324f:s=180x320:d=1",
                "-r",
                "24",
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                app.ffmpeg_path(app.ASSET_DIR / "video_0.mp4"),
            ]
        )
        app.run_ffmpeg(
            [
                "-y",
                "-f",
                "lavfi",
                "-i",
                "sine=frequency=440:duration=1",
                "-c:a",
                "libmp3lame",
                app.ffmpeg_path(app.ASSET_DIR / "audio_0.mp3"),
            ]
        )

    def tearDown(self) -> None:
        for name, value in self.originals.items():
            setattr(app, name, value)
        self.temporary_directory.cleanup()

    def test_clean_captioned_and_srt_outputs(self) -> None:
        scenes = [app.Scene(narration="A clear scientific caption.", prompt="laboratory")]

        clean = app.assemble_masterpiece_ffmpeg(
            scenes,
            1.0,
            include_captions=False,
            output_path=app.CLEAN_OUTPUT,
        )
        captioned = app.assemble_masterpiece_ffmpeg(
            scenes,
            1.0,
            include_captions=True,
            output_path=app.CAPTIONED_OUTPUT,
        )
        subtitle_file = app.write_srt_captions(scenes)

        self.assertGreater(clean.stat().st_size, 0)
        self.assertGreater(captioned.stat().st_size, 0)
        self.assertNotEqual(clean.read_bytes(), captioned.read_bytes())
        self.assertIn("A clear scientific caption.", subtitle_file.read_text(encoding="utf-8"))
        self.assertTrue(app.describe_rendered_video(clean)[1])
        self.assertTrue(app.describe_rendered_video(captioned)[1])

    def test_caption_replacement_requires_one_block_per_scene(self) -> None:
        scenes = [
            app.Scene(narration="First", prompt="one"),
            app.Scene(narration="Second", prompt="two"),
        ]
        replaced = app.caption_scenes_from_text("New first\n\nNew second", scenes)
        self.assertEqual([scene.narration for scene in replaced], ["New first", "New second"])

        with self.assertRaises(ValueError):
            app.caption_scenes_from_text("Only one block", scenes)

    def test_short_content_is_not_extended_to_fifteen_minutes(self) -> None:
        scenes = [
            app.Scene(
                narration="A concise science scene with a warm British narration voice.",
                prompt="cinematic laboratory research",
            )
        ]

        limited = app.trim_scenes_to_minutes(scenes, 15)

        self.assertEqual(limited, scenes)
        self.assertLess(app.estimate_total_duration(limited), 15 * 60)

    def test_renderers_do_not_loop_short_visuals(self) -> None:
        ffmpeg_source = inspect.getsource(app.assemble_masterpiece_ffmpeg)
        moviepy_source = inspect.getsource(app.fit_video_to_duration)

        self.assertNotIn("stream_loop", ffmpeg_source)
        self.assertIn("tpad=stop_mode=clone", ffmpeg_source)
        self.assertNotIn("loop_video", moviepy_source)


if __name__ == "__main__":
    unittest.main()
