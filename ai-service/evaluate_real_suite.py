import requests
import json
import os

AI_URL = "http://localhost:5000/validate-slot"
BACKEND_URL = "http://localhost:8080/api/inspections/validate-slot"
VEHICLE_ID = "c4f7e1df-d13a-4001-b683-2e210e53ec2b"

PAIR_MAPPINGS = [
    ("ANGLE_1", "1_front.jpg"),
    ("ANGLE_2", "8_front_left.jpg"),
    ("ANGLE_3", "7_left.jpg"),
    ("ANGLE_4", "6_rear_left.jpg"),
    ("ANGLE_5", "5_rear.jpg"),
    ("ANGLE_6", "4_rear_right.jpg"),
    ("ANGLE_7", "3_right.jpg"),
    ("ANGLE_8", "2_front_right.jpg"),
]

def test_8_real_pairs():
    print("=== TEST 1: ALL 8 REAL ANGLE PAIRS (BEFORE vs AFTER) ===")
    results = []
    for angle_code, filename in PAIR_MAPPINGS:
        before_path = os.path.join(r"D:\testcar\BEFORE", filename)
        after_path = os.path.join(r"D:\testcar\AFTER", filename)

        with open(before_path, "rb") as rf, open(after_path, "rb") as curf:
            files = {
                "image": (filename, curf, "image/jpeg"),
                "reference_image": (filename, rf, "image/jpeg")
            }
            data = {
                "expected_angle": angle_code,
                "inspection_type": "CHECK_OUT"
            }
            resp = requests.post(AI_URL, files=files, data=data)
            res = resp.json()
            dev = res.get("deviation_percent")
            valid = res.get("valid")
            inliers = res.get("inliers")
            print(f"[{angle_code}] {filename:16s} => valid={valid}, dev={dev}%, inliers={inliers}, msg={res.get('message')}")
            assert valid is True, f"Failed for {angle_code}"
            assert dev is not None and dev <= 20.0, f"Deviation exceeded 20% for {angle_code}"
            results.append((angle_code, dev, inliers))
    print("--> ALL 8 REAL ANGLE PAIRS PASSED!\n")
    return results

def test_viewpoint_mismatch():
    print("=== TEST 2: VIEWPOINT MISMATCH (Rear as ANGLE_1) ===")
    rear_path = os.path.join(r"D:\testcar\AFTER", "5_rear.jpg")
    ref_front = os.path.join(r"D:\testcar\BEFORE", "1_front.jpg")
    with open(ref_front, "rb") as rf, open(rear_path, "rb") as curf:
        files = {
            "image": ("5_rear.jpg", curf, "image/jpeg"),
            "reference_image": ("1_front.jpg", rf, "image/jpeg")
        }
        data = {
            "expected_angle": "ANGLE_1",
            "inspection_type": "CHECK_OUT"
        }
        resp = requests.post(AI_URL, files=files, data=data)
        res = resp.json()
        print(f"Result: valid={res.get('valid')}, detected={res.get('detected_angle')}, code={res.get('error_code')}, msg={res.get('message')}")
        assert res.get("valid") is False
        assert res.get("error_code") == "WRONG_VIEWPOINT"
    print("--> VIEWPOINT MISMATCH REJECTED AS EXPECTED!\n")

def test_backend_slot_validation():
    print("=== TEST 3: BACKEND API VALIDATE-SLOT ===")
    front_path = os.path.join(r"D:\testcar\AFTER", "1_front.jpg")
    with open(front_path, "rb") as curf:
        files = {"image": ("1_front.jpg", curf, "image/jpeg")}
        params = {
            "vehicleId": VEHICLE_ID,
            "angleCode": "ANGLE_1",
            "sessionType": "CHECK_IN"
        }
        resp = requests.post(BACKEND_URL, params=params, files=files)
        res = resp.json()
        print(f"Backend result: status={resp.status_code}, valid={res.get('valid')}, dev={res.get('deviation_percent')}%, hash={res.get('image_hash')[:16]}...")
        assert resp.status_code == 200
        assert res.get("valid") is True
        img_hash = res.get("image_hash")

    # Test duplicate hash rejection
    with open(front_path, "rb") as curf:
        files = {"image": ("1_front.jpg", curf, "image/jpeg")}
        params = {
            "vehicleId": VEHICLE_ID,
            "angleCode": "ANGLE_1",
            "sessionType": "CHECK_IN",
            "clientHashes": [img_hash]
        }
        resp = requests.post(BACKEND_URL, params=params, files=files)
        res = resp.json()
        print(f"Duplicate test result: valid={res.get('valid')}, code={res.get('error_code')}, msg={res.get('message')}")
        assert res.get("valid") is False
        assert res.get("error_code") in ("DUPLICATE_IMAGE", "DUPLICATE_IMAGE_BATCH")
    print("--> BACKEND API VALIDATE-SLOT PASSED!\n")

def test_backend_submission_gate_rejection():
    print("=== TEST 4: BACKEND SUBMISSION GATE (DUPLICATE & VIEWPOINT REJECTION) ===")
    import cv2
    import numpy as np
    import io

    checkin_url = "http://localhost:8080/api/inspections/check-in"

    # Tạo 2 ảnh CCCD giả định riêng biệt
    img_cccd1 = np.ones((500, 800, 3), dtype=np.uint8) * 200
    cv2.putText(img_cccd1, "CCCD MAT TRUOC", (50, 250), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    _, buf1 = cv2.imencode(".jpg", img_cccd1)
    cccd1_bytes = buf1.tobytes()

    img_cccd2 = np.ones((500, 800, 3), dtype=np.uint8) * 180
    cv2.putText(img_cccd2, "CCCD MAT SAU", (50, 250), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    _, buf2 = cv2.imencode(".jpg", img_cccd2)
    cccd2_bytes = buf2.tobytes()

    # Sub-test 4A: Trùng lặp CCCD mặt trước và mặt sau
    files_dup_cccd = [
        ("data", (None, json.dumps({"renterName": "Nguyen Van A", "renterPhone": "0901234567", "vehicleId": VEHICLE_ID}), "application/json")),
        ("images", ("cccd_front.jpg", io.BytesIO(cccd1_bytes), "image/jpeg")),
        ("images", ("cccd_back.jpg", io.BytesIO(cccd1_bytes), "image/jpeg")), # Trùng cccd1
    ]
    for angle_code, filename in PAIR_MAPPINGS:
        p = os.path.join(r"D:\testcar\BEFORE", filename)
        files_dup_cccd.append(("images", (filename, open(p, "rb"), "image/jpeg")))

    resp_dup_cccd = requests.post(checkin_url, files=files_dup_cccd)
    print(f"4A Duplicate CCCD status: {resp_dup_cccd.status_code}, response: {resp_dup_cccd.text}")
    assert resp_dup_cccd.status_code == 422
    err_json = resp_dup_cccd.json()
    assert "Ảnh CCCD mặt sau bị trùng lặp" in str(err_json)
    assert "CCCD_BACK" in str(err_json.get("details", {}).get("invalidAngles", {}))
    print("--> 4A REJECTED DUPLICATE CCCD WITH CLEAR MESSAGE & INVALID ANGLE SLOT!\n")

    # Sub-test 4B: Trùng lặp ảnh góc xe (Ví dụ ANGLE_2 và ANGLE_8 dùng cùng 1 ảnh)
    files_dup_angle = [
        ("data", (None, json.dumps({"renterName": "Nguyen Van B", "renterPhone": "0901234567", "vehicleId": VEHICLE_ID}), "application/json")),
        ("images", ("cccd_front.jpg", io.BytesIO(cccd1_bytes), "image/jpeg")),
        ("images", ("cccd_back.jpg", io.BytesIO(cccd2_bytes), "image/jpeg")),
    ]
    # ANGLE_1: 1_front
    files_dup_angle.append(("images", ("1_front.jpg", open(os.path.join(r"D:\testcar\BEFORE", "1_front.jpg"), "rb"), "image/jpeg")))
    # ANGLE_2: 8_front_left
    files_dup_angle.append(("images", ("8_front_left.jpg", open(os.path.join(r"D:\testcar\BEFORE", "8_front_left.jpg"), "rb"), "image/jpeg")))
    # ANGLE_3..7
    for angle_code, filename in PAIR_MAPPINGS[2:7]:
        p = os.path.join(r"D:\testcar\BEFORE", filename)
        files_dup_angle.append(("images", (filename, open(p, "rb"), "image/jpeg")))
    # ANGLE_8: Dùng lại 8_front_left (trùng ANGLE_2)
    files_dup_angle.append(("images", ("dup_angle2.jpg", open(os.path.join(r"D:\testcar\BEFORE", "8_front_left.jpg"), "rb"), "image/jpeg")))

    resp_dup_angle = requests.post(checkin_url, files=files_dup_angle)
    print(f"4B Duplicate Angle status: {resp_dup_angle.status_code}, response: {resp_dup_angle.text}")
    assert resp_dup_angle.status_code == 422
    err_angle_json = resp_dup_angle.json()
    invalid_angles = err_angle_json.get("details", {}).get("invalidAngles", {})
    assert "ANGLE_8" in invalid_angles
    assert "Ảnh này đã được sử dụng tại Góc trước trái" in str(invalid_angles["ANGLE_8"])
    print("--> 4B REJECTED DUPLICATE ANGLE IDENTIFYING EXACT SLOT & ORIGINAL ANGLE NAME!\n")

    # Sub-test 4C: Sai góc chụp (Ví dụ gửi ảnh Đuôi xe vào ANGLE_1 Đầu xe)
    # Tạo ảnh đuôi xe biến đổi nhẹ để hash không trùng
    rear_img = cv2.imread(os.path.join(r"D:\testcar\BEFORE", "5_rear.jpg"))
    rear_img_mod = rear_img.copy()
    rear_img_mod[0, 0, 0] = (int(rear_img_mod[0, 0, 0]) + 10) % 256
    _, rear_buf = cv2.imencode(".jpg", rear_img_mod)
    rear_mod_bytes = rear_buf.tobytes()

    files_wrong_view = [
        ("data", (None, json.dumps({"renterName": "Nguyen Van C", "renterPhone": "0901234567", "vehicleId": VEHICLE_ID}), "application/json")),
        ("images", ("cccd_front.jpg", io.BytesIO(cccd1_bytes), "image/jpeg")),
        ("images", ("cccd_back.jpg", io.BytesIO(cccd2_bytes), "image/jpeg")),
        ("images", ("wrong_angle1.jpg", io.BytesIO(rear_mod_bytes), "image/jpeg")), # ANGLE_1 có hình đuôi xe
    ]
    for angle_code, filename in PAIR_MAPPINGS[1:]:
        p = os.path.join(r"D:\testcar\BEFORE", filename)
        files_wrong_view.append(("images", (filename, open(p, "rb"), "image/jpeg")))

    resp_wrong_view = requests.post(checkin_url, files=files_wrong_view)
    print(f"4C Wrong Viewpoint status: {resp_wrong_view.status_code}, response: {resp_wrong_view.text}")
    assert resp_wrong_view.status_code == 422
    err_view_json = resp_wrong_view.json()
    assert "ANGLE_1" in err_view_json.get("details", {}).get("invalidAngles", {})
    print("--> 4C REJECTED WRONG VIEWPOINT AT SUBMISSION GATE IDENTIFYING ANGLE_1!\n")

if __name__ == "__main__":
    test_8_real_pairs()
    test_viewpoint_mismatch()
    test_backend_slot_validation()
    test_backend_submission_gate_rejection()
    print("ALL INTEGRATION AND EVALUATION TESTS COMPLETED SUCCESSFULLY!")
