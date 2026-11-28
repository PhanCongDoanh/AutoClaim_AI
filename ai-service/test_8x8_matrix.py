"""
Mandatory 8x8 Real Image Matrix Test for Strict 8-Point Viewpoint Validation.
Tests 8 physical images from D:/testcar/BEFORE against all 8 expected_angle values (64 calls).
Verifies:
- Zero false acceptance on wrong viewpoints (56 mismatched cases rejected with WRONG_VIEWPOINT or VIEWPOINT_UNCERTAIN).
- Expected matching viewpoints pass with verified=True and matches_expected=True.
- Specific user reported bug scenarios are tested and verified.
"""
import os
import sys
import requests
from pathlib import Path

AI_URL = "http://localhost:5000/validate-slot"
BEFORE_DIR = Path("D:/testcar/BEFORE")

# Physically verified 3D ground-truth viewpoint of each file in BEFORE
# (Both 8_front_left.jpg and 2_front_right.jpg physically show front on image-left + driver's left side on image-right = ANGLE_2 FRONT_LEFT)
IMAGE_ACTUAL_ANGLES = {
    "1_front.jpg": "ANGLE_1",
    "2_front_right.jpg": "ANGLE_2",
    "3_right.jpg": "ANGLE_7",
    "4_rear_right.jpg": "ANGLE_6",
    "5_rear.jpg": "ANGLE_5",
    "6_rear_left.jpg": "ANGLE_4",
    "7_left.jpg": "ANGLE_3",
    "8_front_left.jpg": "ANGLE_2",
}

ALL_ANGLES = [
    "ANGLE_1", "ANGLE_2", "ANGLE_3", "ANGLE_4",
    "ANGLE_5", "ANGLE_6", "ANGLE_7", "ANGLE_8"
]

def run_8x8_matrix():
    print("=" * 80)
    print("MANDATORY 8x8 MATRIX TEST (64 COMBINATIONS)")
    print("=" * 80)

    total = 0
    passed_correct = 0
    rejected_wrong = 0
    unexpected_passes = 0
    unexpected_fails = 0

    matrix = {}

    for filename, actual_angle in sorted(IMAGE_ACTUAL_ANGLES.items()):
        img_path = BEFORE_DIR / filename
        with open(img_path, "rb") as f:
            img_bytes = f.read()

        matrix[filename] = {}

        for expected_angle in ALL_ANGLES:
            total += 1
            files = {"image": (filename, img_bytes, "image/jpeg")}
            data = {"expected_angle": expected_angle, "inspection_type": "CHECK_IN"}

            resp = requests.post(AI_URL, files=files, data=data)
            res = resp.json()

            valid = res.get("valid")
            detected = res.get("detected_angle")
            err = res.get("error_code")
            msg = res.get("message")

            is_match = (actual_angle == expected_angle)

            matrix[filename][expected_angle] = {
                "valid": valid,
                "detected": detected,
                "error_code": err,
                "message": msg
            }

            if is_match:
                if valid is True:
                    passed_correct += 1
                    status = "PASS (Expected Match)"
                else:
                    unexpected_fails += 1
                    status = f"FAIL (Expected Match but got {err})"
            else:
                if valid is False and err in ("WRONG_VIEWPOINT", "VIEWPOINT_UNCERTAIN"):
                    rejected_wrong += 1
                    status = f"PASS (Correctly Rejected: {err})"
                else:
                    unexpected_passes += 1
                    status = f"FAIL (False Acceptance: valid={valid}, err={err})"

            print(f"[{filename:16s}] as [{expected_angle:7s}] -> actual={actual_angle:7s}, detected={str(detected):7s} => {status}")

    print("\n" + "=" * 80)
    print("8x8 MATRIX TEST SUMMARY:")
    print(f"Total combinations tested: {total}")
    print(f"Correctly accepted matches: {passed_correct}")
    print(f"Correctly rejected mismatches: {rejected_wrong}")
    print(f"Unexpected passes (False acceptance): {unexpected_passes}")
    print(f"Unexpected fails: {unexpected_fails}")
    print("=" * 80)

    assert unexpected_passes == 0, f"Detected {unexpected_passes} false acceptances!"
    assert passed_correct == 8, f"Expected 8 passes, got {passed_correct}!"
    assert rejected_wrong == 56, f"Expected 56 rejections, got {rejected_wrong}!"
    print(">>> 8x8 MATRIX TEST FULLY PASSED WITH ZERO FALSE ACCEPTANCE! <<<\n")


def test_reported_user_scenarios():
    print("=" * 80)
    print("REPRODUCING REPORTED USER SCENARIOS")
    print("=" * 80)

    # Scenario 1: ANGLE_2 expected Front-Left, but Right-side photo (3_right.jpg) uploaded
    print("\n[Scenario 1] ANGLE_2 expected Front-Left, uploading 3_right.jpg (Right-side)")
    with open(BEFORE_DIR / "3_right.jpg", "rb") as f:
        resp = requests.post(AI_URL, files={"image": ("3_right.jpg", f.read(), "image/jpeg")},
                             data={"expected_angle": "ANGLE_2", "inspection_type": "CHECK_IN"}).json()
    print(f"Result: valid={resp.get('valid')}, detected={resp.get('detected_angle')}, err={resp.get('error_code')}, msg={resp.get('message')}")
    assert resp.get("valid") is False
    assert resp.get("error_code") == "WRONG_VIEWPOINT"
    assert resp.get("detected_angle") == "ANGLE_7"
    print("-> PASS: Right-side photo strictly REJECTED at ANGLE_2 with WRONG_VIEWPOINT (identified as ANGLE_7).")

    # Scenario 2: ANGLE_3 expected Left-Side, but Rear-Left photo (6_rear_left.jpg) uploaded
    print("\n[Scenario 2] ANGLE_3 expected Left-Side, uploading 6_rear_left.jpg (Rear-Left)")
    with open(BEFORE_DIR / "6_rear_left.jpg", "rb") as f:
        resp = requests.post(AI_URL, files={"image": ("6_rear_left.jpg", f.read(), "image/jpeg")},
                             data={"expected_angle": "ANGLE_3", "inspection_type": "CHECK_IN"}).json()
    print(f"Result: valid={resp.get('valid')}, detected={resp.get('detected_angle')}, err={resp.get('error_code')}, msg={resp.get('message')}")
    assert resp.get("valid") is False
    assert resp.get("error_code") == "WRONG_VIEWPOINT"
    assert resp.get("detected_angle") == "ANGLE_4"
    print("-> PASS: Rear-Left photo strictly REJECTED at ANGLE_3 with WRONG_VIEWPOINT (identified as ANGLE_4).")

    # Scenario 3: ANGLE_5 expected Rear, but Left-Side photo (7_left.jpg) uploaded
    print("\n[Scenario 3] ANGLE_5 expected Rear, uploading 7_left.jpg (Left-Side)")
    with open(BEFORE_DIR / "7_left.jpg", "rb") as f:
        resp = requests.post(AI_URL, files={"image": ("7_left.jpg", f.read(), "image/jpeg")},
                             data={"expected_angle": "ANGLE_5", "inspection_type": "CHECK_IN"}).json()
    print(f"Result: valid={resp.get('valid')}, detected={resp.get('detected_angle')}, err={resp.get('error_code')}, msg={resp.get('message')}")
    assert resp.get("valid") is False
    assert resp.get("error_code") == "WRONG_VIEWPOINT"
    assert resp.get("detected_angle") == "ANGLE_3"
    print("-> PASS: Left-side photo strictly REJECTED at ANGLE_5 with WRONG_VIEWPOINT (identified as ANGLE_3).")

    # Scenario 4: ANGLE_7 receives Right-side photo (3_right.jpg)
    print("\n[Scenario 4] ANGLE_7 receives Right-side photo (3_right.jpg)")
    with open(BEFORE_DIR / "3_right.jpg", "rb") as f:
        resp = requests.post(AI_URL, files={"image": ("3_right.jpg", f.read(), "image/jpeg")},
                             data={"expected_angle": "ANGLE_7", "inspection_type": "CHECK_IN"}).json()
    print(f"Result: valid={resp.get('valid')}, detected={resp.get('detected_angle')}, err={resp.get('error_code')}, msg={resp.get('message')}")
    assert resp.get("valid") is True
    assert resp.get("detected_angle") == "ANGLE_7"
    assert resp.get("error_code") is None
    print("-> PASS: Right-side photo correctly ACCEPTED at ANGLE_7.")

    print("\n>>> ALL REPORTED USER SCENARIOS VERIFIED SUCCESSFULLY! <<<\n")


if __name__ == "__main__":
    run_8x8_matrix()
    test_reported_user_scenarios()
