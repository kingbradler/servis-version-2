"""Tests for Instagram / TikTok / Facebook URL validators."""

from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from apps.core.social_urls import validate_social_url, validate_video_url


class SocialUrlValidationTests(SimpleTestCase):
    def test_empty_ok(self):
        self.assertEqual(validate_social_url(""), "")
        self.assertEqual(validate_video_url(None), "")

    def test_instagram_profile(self):
        url = validate_social_url(
            "instagram.com/servis", networks={"instagram"}
        )
        self.assertEqual(url, "https://instagram.com/servis")

    def test_tiktok_profile(self):
        url = validate_social_url(
            "https://www.tiktok.com/@servis", networks={"tiktok"}
        )
        self.assertEqual(url, "https://www.tiktok.com/@servis")

    def test_facebook_rejects_wrong_network(self):
        with self.assertRaises(ValidationError):
            validate_social_url(
                "https://www.facebook.com/servis", networks={"instagram"}
            )

    def test_rejects_unknown_host(self):
        with self.assertRaises(ValidationError):
            validate_social_url("https://example.com/x")


class VideoUrlValidationTests(SimpleTestCase):
    def test_tiktok_video(self):
        url = validate_video_url(
            "https://www.tiktok.com/@u/video/1234567890123456789"
        )
        self.assertIn("tiktok.com", url)

    def test_instagram_reel(self):
        url = validate_video_url("https://www.instagram.com/reel/AbCdEf123/")
        self.assertIn("instagram.com", url)

    def test_rejects_facebook_for_product_video(self):
        with self.assertRaises(ValidationError):
            validate_video_url("https://www.facebook.com/watch/?v=1")
