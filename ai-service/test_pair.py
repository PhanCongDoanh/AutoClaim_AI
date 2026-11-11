"""
Test 1 cặp ảnh Before/After KHÔNG cần backend/DB.

    python test_pair.py --before truoc.jpg --after sau.jpg --angle ANGLE_3
    python test_pair.py --folder demo_xe1   # thư mục có before/ANGLE_1.jpg..., after/ANGLE_1.jpg...

Kết quả: in JSON + lưu ảnh so sánh vào out/ (đỏ = hư hại MỚI, xanh = đã có từ trước).
"""
import argparse
import json
import os
from dataclasses import asdict
from pathlib import Path

import cv2

from detector import DamageAnalyzer, decode_image, draw_pair

HERE = Path(__file__).parent


def run(an, before_path, after_path, angle, out_dir):
    before = decode_image(Path(before_path).read_bytes())
    after = decode_image(Path(after_path).read_bytes())
    r = an.analyze_pair(before, after, angle)
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{angle}_compare.jpg"
    cv2.imwrite(str(out), draw_pair(before, after, r))
    print(json.dumps({"angle": angle, "aligned": r.aligned, "inliers": r.inliers,
                      "new": [{k: v for k, v in asdict(d).items() if k != "polygon_norm"} for d in r.new_damages],
                      "preExisting": [{k: v for k, v in asdict(d).items() if k != "polygon_norm"} for d in r.old_damages]},
                     ensure_ascii=False, indent=2))
    print("->", out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--before"), ap.add_argument("--after"), ap.add_argument("--angle", default="ANGLE_3")
    ap.add_argument("--folder", help="thư mục chứa before/ và after/ với tên ANGLE_1..8.(jpg|png)")
    ap.add_argument("--damage", default=os.getenv("DAMAGE_MODEL", str(HERE / "weights/damage_best.pt")))
    ap.add_argument("--parts", default=os.getenv("PART_MODEL", str(HERE / "weights/parts_best.pt")))
    ap.add_argument("--out", default=str(HERE / "out"))
    a = ap.parse_args()

    an = DamageAnalyzer(a.damage, a.parts)
    print("Classes:", an.damage_model.names, "| part model:", an.part_model is not None)
    if a.folder:
        root = Path(a.folder)
        for i in range(1, 9):
            angle = f"ANGLE_{i}"
            b = next(iter(sorted((root / "before").glob(f"{angle}.*"))), None)
            f = next(iter(sorted((root / "after").glob(f"{angle}.*"))), None)
            if b and f:
                run(an, b, f, angle, Path(a.out) / root.name)
    else:
        run(an, a.before, a.after, a.angle, Path(a.out))


if __name__ == "__main__":
    main()
