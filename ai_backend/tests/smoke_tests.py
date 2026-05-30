import requests
import tempfile
import os
import sys

BASE = "https://ayush133-bingo.hf.space"
HEADERS = {"Content-Type": "application/json"}

# Sample images (public URLs)
SAMPLES = {
    # Use picsum.photos to avoid hotlink blocks
    "real_photo": "https://picsum.photos/id/1003/800/600",
    "ai_sample": "https://picsum.photos/id/1025/800/600",
    "dustbin": "https://picsum.photos/id/1060/800/600",
    "face1": "https://picsum.photos/id/1005/800/600",
    "face2": "https://picsum.photos/id/1011/800/600"
}


def pretty_print(title, obj):
    print("\n=== %s ===" % title)
    try:
        print(obj)
    except Exception:
        print(str(obj))


def test_analyze_ai_only(url):
    r = requests.post(f"{BASE}/analyze_ai_only", json={"image_url": url}, timeout=30)
    return r.status_code, r.json()


def test_detect_dustbin(url):
    r = requests.post(f"{BASE}/detect_dustbin", json={"image_url": url}, timeout=30)
    return r.status_code, r.json()


def test_check_duplicate(url, user_id):
    r = requests.post(f"{BASE}/check_duplicate", json={"image_url": url, "user_id": user_id}, timeout=30)
    return r.status_code, r.json()


def test_verify(face_url1, face_url2):
    tmp1 = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    tmp2 = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    try:
        tmp1.write(requests.get(face_url1, timeout=30).content)
        tmp1.flush()
        tmp2.write(requests.get(face_url2, timeout=30).content)
        tmp2.flush()

        # Ensure files are opened and closed cleanly before deletion
        with open(tmp1.name, "rb") as f1, open(tmp2.name, "rb") as f2:
            files = {"image1": f1, "image2": f2}
            r = requests.post(f"{BASE}/verify", files=files, timeout=60)
            status, payload = r.status_code, r.json()

        return status, payload
    finally:
        # Give a short pause to allow remote process to release handles
        try:
            os.unlink(tmp1.name)
        except Exception:
            pass
        try:
            os.unlink(tmp2.name)
        except Exception:
            pass


if __name__ == "__main__":
    try:
        code, res = test_analyze_ai_only(SAMPLES["real_photo"])
        pretty_print("analyze_ai_only (real_photo)", {"status_code": code, "result": res})
    except Exception as e:
        pretty_print("analyze_ai_only error", str(e))

    try:
        code, res = test_analyze_ai_only(SAMPLES["ai_sample"])
        pretty_print("analyze_ai_only (ai_sample)", {"status_code": code, "result": res})
    except Exception as e:
        pretty_print("analyze_ai_only error (ai_sample)", str(e))

    try:
        code, res = test_detect_dustbin(SAMPLES["dustbin"])
        pretty_print("detect_dustbin (dustbin)", {"status_code": code, "result": res})
    except Exception as e:
        pretty_print("detect_dustbin error", str(e))

    try:
        code, res = test_check_duplicate(SAMPLES["real_photo"], "test_user_123")
        pretty_print("check_duplicate (real_photo)", {"status_code": code, "result": res})
    except Exception as e:
        pretty_print("check_duplicate error", str(e))

    try:
        code, res = test_verify(SAMPLES["face1"], SAMPLES["face2"])
        pretty_print("verify (face1 vs face2)", {"status_code": code, "result": res})
    except Exception as e:
        pretty_print("verify error", str(e))

    print("\nSmoke tests complete.")
