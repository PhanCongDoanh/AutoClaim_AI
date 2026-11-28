"""
Unit and Integration tests for Strict 8-Point Image Pre-Validation & Alignment Quality Gate.
"""
import io
import os
import sys
import unittest
import cv2
import numpy as np
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

from detector import (
    DamageAnalyzer,
    decode_image,
    validate_image_quality,
    validate_viewpoint,
    compute_alignment_and_deviation,
    validate_slot_pipeline,
    compute_dhash,
    dhash_distance,
    MAX_DEVIATION_PERCENT,
)

HERE = Path(__file__).parent
TESTCAR = Path("D:/testcar")


class TestImagePreValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        damage_pt = str(HERE / "weights/damage_best.pt")
        parts_pt = str(HERE / "weights/parts_best.pt")
        cls.analyzer = DamageAnalyzer(damage_pt, parts_pt)

    def test_quality_valid_image(self):
        img_path = TESTCAR / "BEFORE/01_ANGLE_1_front.jpg"
        img = decode_image(img_path.read_bytes())
        res = validate_image_quality(img)
        self.assertTrue(res["valid"])
        self.assertIsNone(res["error_code"])
        self.assertGreater(res["blur_score"], 65.0)
        self.assertGreater(res["brightness"], 45.0)

    def test_quality_blurry_image(self):
        img = np.ones((600, 800, 3), dtype=np.uint8) * 120
        # Highly blurred image
        blurred = cv2.GaussianBlur(img, (51, 51), 0)
        res = validate_image_quality(blurred)
        self.assertFalse(res["valid"])
        self.assertEqual(res["error_code"], "IMAGE_TOO_BLURRY")

    def test_quality_dark_image(self):
        dark = np.ones((600, 800, 3), dtype=np.uint8) * 20
        res = validate_image_quality(dark)
        self.assertFalse(res["valid"])
        self.assertEqual(res["error_code"], "IMAGE_TOO_DARK")

    def test_quality_low_resolution(self):
        tiny = np.ones((200, 200, 3), dtype=np.uint8) * 128
        res = validate_image_quality(tiny)
        self.assertFalse(res["valid"])
        self.assertEqual(res["error_code"], "LOW_RESOLUTION")

    def test_viewpoint_matching(self):
        front_img = decode_image((TESTCAR / "BEFORE/01_ANGLE_1_front.jpg").read_bytes())
        res = validate_viewpoint(self.analyzer, front_img, "ANGLE_1")
        self.assertTrue(res["verified"])
        self.assertTrue(res["matches_expected"])
        self.assertEqual(res["detected_angle"], "ANGLE_1")

    def test_viewpoint_wrong_angle_front_vs_rear(self):
        rear_img = decode_image((TESTCAR / "BEFORE/05_ANGLE_5_rear.jpg").read_bytes())
        res = validate_viewpoint(self.analyzer, rear_img, "ANGLE_1")
        self.assertTrue(res["verified"])
        self.assertFalse(res["matches_expected"])
        self.assertEqual(res["detected_angle"], "ANGLE_5")
        self.assertEqual(res["error_code"], "WRONG_VIEWPOINT")

    def test_viewpoint_wrong_angle_rear_vs_front(self):
        front_img = decode_image((TESTCAR / "BEFORE/01_ANGLE_1_front.jpg").read_bytes())
        res = validate_viewpoint(self.analyzer, front_img, "ANGLE_5")
        self.assertTrue(res["verified"])
        self.assertFalse(res["matches_expected"])
        self.assertEqual(res["detected_angle"], "ANGLE_1")
        self.assertEqual(res["error_code"], "WRONG_VIEWPOINT")

    def test_alignment_valid_pair(self):
        before = decode_image((TESTCAR / "BEFORE/01_ANGLE_1_front.jpg").read_bytes())
        after = decode_image((TESTCAR / "AFTER/01_ANGLE_1_front.jpg").read_bytes())
        res = compute_alignment_and_deviation(before, after, self.analyzer, max_deviation=20.0)
        self.assertTrue(res["aligned"])
        self.assertTrue(res["alignment_reliable"])
        self.assertIsNotNone(res["deviation_percent"])
        self.assertLessEqual(res["deviation_percent"], 20.0)
        self.assertIsNone(res["error_code"])

    def test_alignment_boundary_condition(self):
        before = decode_image((TESTCAR / "BEFORE/01_ANGLE_1_front.jpg").read_bytes())
        after = decode_image((TESTCAR / "AFTER/01_ANGLE_1_front.jpg").read_bytes())
        res = compute_alignment_and_deviation(before, after, self.analyzer, max_deviation=20.0)
        dev = res["deviation_percent"]
        # Test boundary at exactly dev: if max_deviation = dev, it must PASS
        res_pass = compute_alignment_and_deviation(before, after, self.analyzer, max_deviation=dev)
        self.assertIsNone(res_pass["error_code"])
        # If max_deviation is slightly less than dev (dev - 0.01), it must REJECT
        res_reject = compute_alignment_and_deviation(before, after, self.analyzer, max_deviation=round(dev - 0.01, 2))
        self.assertEqual(res_reject["error_code"], "EXCESSIVE_DEVIATION")

    def test_pipeline_valid_checkout(self):
        before_bytes = (TESTCAR / "BEFORE/01_ANGLE_1_front.jpg").read_bytes()
        after_bytes = (TESTCAR / "AFTER/01_ANGLE_1_front.jpg").read_bytes()
        res = validate_slot_pipeline(
            self.analyzer,
            image_bytes=after_bytes,
            reference_bytes=before_bytes,
            expected_angle="ANGLE_1",
            inspection_type="CHECK_OUT",
        )
        self.assertTrue(res["valid"])
        self.assertEqual(res["expected_angle"], "ANGLE_1")
        self.assertEqual(res["detected_angle"], "ANGLE_1")
        self.assertTrue(res["quality_passed"])
        self.assertTrue(res["aligned"])
        self.assertLessEqual(res["deviation_percent"], 20.0)

    def test_pipeline_reused_reference_checkout(self):
        before_bytes = (TESTCAR / "BEFORE/01_ANGLE_1_front.jpg").read_bytes()
        # Same bytes passed as current image
        res = validate_slot_pipeline(
            self.analyzer,
            image_bytes=before_bytes,
            reference_bytes=before_bytes,
            expected_angle="ANGLE_1",
            inspection_type="CHECK_OUT",
        )
        self.assertFalse(res["valid"])
        self.assertEqual(res["error_code"], "REUSED_REFERENCE_IMAGE")

    def test_pipeline_wrong_angle(self):
        before_bytes = (TESTCAR / "BEFORE/01_ANGLE_1_front.jpg").read_bytes()
        rear_bytes = (TESTCAR / "AFTER/05_ANGLE_5_rear.jpg").read_bytes()
        res = validate_slot_pipeline(
            self.analyzer,
            image_bytes=rear_bytes,
            reference_bytes=before_bytes,
            expected_angle="ANGLE_1",
            inspection_type="CHECK_OUT",
        )
        self.assertFalse(res["valid"])
        self.assertEqual(res["error_code"], "WRONG_VIEWPOINT")

    def test_pipeline_valid_checkin_no_reference(self):
        front_bytes = (TESTCAR / "BEFORE/01_ANGLE_1_front.jpg").read_bytes()
        res = validate_slot_pipeline(
            self.analyzer,
            image_bytes=front_bytes,
            reference_bytes=None,
            expected_angle="ANGLE_1",
            inspection_type="CHECK_IN",
        )
        self.assertTrue(res["valid"])
        self.assertEqual(res["message"], "Đạt chuẩn")
        self.assertEqual(res["expected_angle"], "ANGLE_1")
        self.assertTrue(res["quality_passed"])
        self.assertTrue(res["viewpoint_verified"])
        self.assertFalse(res["aligned"])
        self.assertIsNone(res["deviation_percent"])

    def test_viewpoint_front_left_and_front_right_distinction(self):
        # 02_ANGLE_2_front_left.jpg physically shows front on image-left and driver's left side on image-right => ANGLE_2
        fl_img = decode_image((TESTCAR / "BEFORE/02_ANGLE_2_front_left.jpg").read_bytes())
        res_fl = validate_viewpoint(self.analyzer, fl_img, "ANGLE_2")
        self.assertTrue(res_fl["verified"])
        self.assertTrue(res_fl["matches_expected"])
        self.assertEqual(res_fl["detected_angle"], "ANGLE_2")

        # Horizontal flip transforms physical FRONT_LEFT into physical FRONT_RIGHT (ANGLE_8)
        fr_img = cv2.flip(fl_img, 1)
        res_fr = validate_viewpoint(self.analyzer, fr_img, "ANGLE_8")
        self.assertTrue(res_fr["verified"])
        self.assertTrue(res_fr["matches_expected"])
        self.assertEqual(res_fr["detected_angle"], "ANGLE_8")

        # Cross-slot check: FRONT_RIGHT must be rejected at ANGLE_2
        res_cross = validate_viewpoint(self.analyzer, fr_img, "ANGLE_2")
        self.assertFalse(res_cross["matches_expected"])
        self.assertEqual(res_cross["error_code"], "WRONG_VIEWPOINT")

    def test_viewpoint_damaged_front_diagonal_not_misclassified_as_front(self):
        # AFTER/02_ANGLE_2_front_left.jpg has heavy front bumper damage + flat tire + cropped side door (physically FRONT_LEFT)
        dmg_diag = decode_image((TESTCAR / "AFTER/02_ANGLE_2_front_left.jpg").read_bytes())
        res = validate_viewpoint(self.analyzer, dmg_diag, "ANGLE_2")
        self.assertTrue(res["verified"])
        self.assertTrue(res["matches_expected"])
        self.assertEqual(res["detected_angle"], "ANGLE_2")

    def test_change_detection_preserved(self):
        before = decode_image((TESTCAR / "BEFORE/01_ANGLE_1_front.jpg").read_bytes())
        after = decode_image((TESTCAR / "AFTER/01_ANGLE_1_front.jpg").read_bytes())
        pair_res = self.analyzer.analyze_pair(before, after, "ANGLE_1")
        self.assertTrue(pair_res.aligned)
        self.assertGreaterEqual(len(pair_res.new_damages), 1)

    def test_dhash(self):
        img1 = decode_image((TESTCAR / "BEFORE/01_ANGLE_1_front.jpg").read_bytes())
        img2 = decode_image((TESTCAR / "AFTER/01_ANGLE_1_front.jpg").read_bytes())
        h1 = compute_dhash(img1)
        h2 = compute_dhash(img2)
        dist = dhash_distance(h1, h1)
        self.assertEqual(dist, 0)
        self.assertGreaterEqual(dhash_distance(h1, h2), 0)

    def test_resolution_dev_vs_prod_and_required_sizes(self):
        # 1. In DEV/TEST mode:
        os.environ["APP_ENV"] = "dev"
        # 373 x 228: ELIGIBLE (short >= 200, long >= 350)
        img_373_228 = np.ones((228, 373, 3), dtype=np.uint8) * 128
        res = validate_image_quality(img_373_228)
        self.assertNotEqual(res["error_code"], "LOW_RESOLUTION")

        # 350 x 200: ELIGIBLE (short == 200, long == 350)
        img_350_200 = np.ones((200, 350, 3), dtype=np.uint8) * 128
        res = validate_image_quality(img_350_200)
        self.assertNotEqual(res["error_code"], "LOW_RESOLUTION")

        # 350 x 199: REJECT (short < 200)
        img_350_199 = np.ones((199, 350, 3), dtype=np.uint8) * 128
        res = validate_image_quality(img_350_199)
        self.assertFalse(res["valid"])
        self.assertEqual(res["error_code"], "LOW_RESOLUTION")

        # 300 x 250: REJECT (long < 350: 300 < 350)
        img_300_250 = np.ones((250, 300, 3), dtype=np.uint8) * 128
        res = validate_image_quality(img_300_250)
        self.assertFalse(res["valid"])
        self.assertEqual(res["error_code"], "LOW_RESOLUTION")

        # 640 x 480: ELIGIBLE
        img_640_480 = np.ones((480, 640, 3), dtype=np.uint8) * 128
        res = validate_image_quality(img_640_480)
        self.assertNotEqual(res["error_code"], "LOW_RESOLUTION")

        # 1280 x 720: ELIGIBLE
        img_1280_720 = np.ones((720, 1280, 3), dtype=np.uint8) * 128
        res = validate_image_quality(img_1280_720)
        self.assertNotEqual(res["error_code"], "LOW_RESOLUTION")

        # 2. In PRODUCTION mode:
        os.environ["APP_ENV"] = "production"
        # 373 x 228 must be REJECTED in production because short side < 350
        res_prod_vf3 = validate_image_quality(img_373_228)
        self.assertFalse(res_prod_vf3["valid"])
        self.assertEqual(res_prod_vf3["error_code"], "LOW_RESOLUTION")

        # 640 x 480 remains ELIGIBLE in production
        res_prod_640 = validate_image_quality(img_640_480)
        self.assertNotEqual(res_prod_640["error_code"], "LOW_RESOLUTION")

        # Reset back to dev
        os.environ["APP_ENV"] = "dev"

    def test_resolution_not_auto_pass_when_other_quality_fails(self):
        os.environ["APP_ENV"] = "dev"
        # 373 x 228 is eligible for size, but if dark or blurry, must be rejected
        dark_373_228 = np.ones((228, 373, 3), dtype=np.uint8) * 20
        res_dark = validate_image_quality(dark_373_228)
        self.assertFalse(res_dark["valid"])
        self.assertEqual(res_dark["error_code"], "IMAGE_TOO_DARK")

        # Blurry image
        blur_373_228 = cv2.GaussianBlur(np.ones((228, 373, 3), dtype=np.uint8) * 128, (51, 51), 0)
        res_blur = validate_image_quality(blur_373_228)
        self.assertFalse(res_blur["valid"])
        self.assertEqual(res_blur["error_code"], "IMAGE_TOO_BLURRY")


if __name__ == "__main__":
    unittest.main()
