from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
from transformers import CLIPProcessor, CLIPModel
from PIL import Image, ExifTags
from pymongo import MongoClient
from datetime import datetime
from deepface import DeepFace
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from dotenv import load_dotenv
from bson import ObjectId
import torch
import torch.nn.functional as F
import imagehash
import numpy as np
import requests
import hashlib
import uuid
import time
import io
import os
import cv2
import warnings

warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

load_dotenv()

PORT = int(os.environ.get("PORT", 5000))
MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI environment variable not set")

client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10000)
db = client["bingo_app"]
user_images_collection = db["user_images"]

user_images_collection.create_index([("user_id", 1), ("created_at", -1)])
user_images_collection.create_index([("user_id", 1), ("sha256", 1)])
user_images_collection.create_index([("sha256", 1)])
user_images_collection.create_index([("mission_id", 1), ("created_at", -1)])

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024

AI_REJECT_THRESHOLD = 0.80
AI_RETAKE_THRESHOLD = 0.55
PHASH_DUPLICATE_THRESHOLD = 6
CLIP_DUPLICATE_THRESHOLD = 0.92
DUSTBIN_CONFIDENCE_THRESHOLD = 0.60
FACE_DISTANCE_MAX = 0.68

AI_PROMPTS = [
    "artificial intelligence generated image",
    "computer generated artwork",
    "synthetic AI image",
    "AI rendered picture",
    "fake generated image",
    "stable diffusion generated image",
    "midjourney generated image",
    "dall e generated image"
]

REAL_PROMPTS = [
    "real photograph",
    "natural camera photo",
    "authentic mobile camera image",
    "real life scene",
    "unedited genuine photograph",
    "camera captured photo"
]

DUSTBIN_PROMPTS = [
    "dustbin",
    "garbage bin",
    "trash can",
    "waste basket",
    "recycle bin",
    "rubbish bin",
    "public garbage container",
    "green waste bin",
    "blue trash bin"
]

print("Loading CLIP model...")
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
clip_model.eval()

device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model.to(device)

print("Loading YOLO model...")
try:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    custom_rel_path = os.getenv("DUSTBIN_YOLO_MODEL", "models/dustbin_best.pt")
    custom_yolo_path = custom_rel_path if os.path.isabs(custom_rel_path) else os.path.join(base_dir, custom_rel_path)
    fallback_yolo_path = os.path.join(base_dir, "yolov8n.pt")

    custom_exists = os.path.exists(custom_yolo_path)
    custom_valid = custom_exists and os.path.getsize(custom_yolo_path) > 0

    if custom_exists and not custom_valid:
        print(f"Custom model exists but is empty/corrupt, skipping: {custom_yolo_path}")

    if custom_valid:
        try:
            yolo_model = YOLO(custom_yolo_path)
            YOLO_MODE = "custom"
            print(f"Custom dustbin YOLO loaded: {custom_yolo_path}")
        except Exception as custom_err:
            print(f"Custom YOLO load failed ({custom_yolo_path}): {custom_err}")
            yolo_model = YOLO(fallback_yolo_path)
            YOLO_MODE = "coco_fallback"
            print("Using YOLOv8n fallback. Train custom dustbin model for production.")
    else:
        yolo_model = YOLO(fallback_yolo_path)
        YOLO_MODE = "coco_fallback"
        print("Using YOLOv8n fallback. Train custom dustbin model for production.")
except Exception as e:
    yolo_model = None
    YOLO_MODE = "disabled"
    print(f"YOLO load failed: {e}")

print("Precomputing CLIP text embeddings...")

def build_text_embeddings(prompts):
    inputs = clip_processor(text=prompts, return_tensors="pt", padding=True, truncation=True).to(device)
    with torch.no_grad():
        emb = clip_model.get_text_features(**inputs)
        emb = emb / emb.norm(p=2, dim=-1, keepdim=True)
    return emb

AI_TEXT_EMB = build_text_embeddings(AI_PROMPTS)
REAL_TEXT_EMB = build_text_embeddings(REAL_PROMPTS)
DUSTBIN_TEXT_EMB = build_text_embeddings(DUSTBIN_PROMPTS)

executor = ThreadPoolExecutor(max_workers=4)


def to_native(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {k: to_native(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [to_native(v) for v in obj]
    if isinstance(obj, tuple):
        return tuple(to_native(v) for v in obj)
    if isinstance(obj, (np.generic, np.bool_)):
        return obj.item()
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


def allowed_extension(filename):
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS


def validate_uploaded_image(file):
    if not file:
        return False, "missing_image"

    if not allowed_extension(file.filename):
        return False, "invalid_file_extension"

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)

    if size <= 0:
        return False, "empty_file"

    if size > MAX_IMAGE_SIZE:
        return False, "file_too_large"

    try:
        raw = file.read()
        file.seek(0)
        img = Image.open(io.BytesIO(raw))
        img.verify()
        file.seek(0)
    except Exception:
        return False, "invalid_image_content"

    return True, "valid"


def calculate_sha256_from_bytes(image_bytes):
    return hashlib.sha256(image_bytes).hexdigest()


def load_image_from_bytes(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return img


def load_image_fast(source):
    if hasattr(source, "read"):
        data = source.read()
        source.seek(0)
        return Image.open(io.BytesIO(data)).convert("RGB")

    if isinstance(source, bytes):
        return Image.open(io.BytesIO(source)).convert("RGB")

    if isinstance(source, str):
        if source.startswith(("http://", "https://")):
            response = requests.get(source, timeout=12, stream=True)
            response.raise_for_status()

            content_length = response.headers.get("content-length")
            if content_length and int(content_length) > MAX_IMAGE_SIZE:
                raise ValueError("remote_image_too_large")

            content = response.content
            if len(content) > MAX_IMAGE_SIZE:
                raise ValueError("remote_image_too_large")

            return Image.open(io.BytesIO(content)).convert("RGB")

        return Image.open(source).convert("RGB")

    raise ValueError("invalid_image_source")


def get_image_bytes_from_url(image_url):
    response = requests.get(image_url, timeout=12)
    response.raise_for_status()

    if len(response.content) > MAX_IMAGE_SIZE:
        raise ValueError("remote_image_too_large")

    return response.content


def get_clip_embedding_fast(pil_image):
    inputs = clip_processor(images=pil_image, return_tensors="pt").to(device)
    with torch.no_grad():
        embedding = clip_model.get_image_features(**inputs)
        embedding = embedding / embedding.norm(p=2, dim=-1, keepdim=True)
    return embedding.cpu()


def get_image_features_batch(images):
    inputs = clip_processor(images=images, return_tensors="pt", padding=True).to(device)
    with torch.no_grad():
        embeddings = clip_model.get_image_features(**inputs)
        embeddings = embeddings / embeddings.norm(p=2, dim=-1, keepdim=True)
    return embeddings.cpu()


def cosine_similarity_tensor(current_embedding, stored_embedding):
    if stored_embedding is None:
        return 0.0

    if not torch.is_tensor(current_embedding):
        current_embedding = torch.tensor(current_embedding, dtype=torch.float32)

    if not torch.is_tensor(stored_embedding):
        stored_embedding = torch.tensor(stored_embedding, dtype=torch.float32)

    current_embedding = current_embedding.flatten().float()
    stored_embedding = stored_embedding.flatten().float()

    if current_embedding.numel() != stored_embedding.numel():
        return 0.0

    current_embedding = current_embedding / current_embedding.norm(p=2)
    stored_embedding = stored_embedding / stored_embedding.norm(p=2)

    return float(torch.dot(current_embedding, stored_embedding).item())


def hamming_distance_phash(hash1, hash2):
    try:
        return imagehash.hex_to_hash(hash1) - imagehash.hex_to_hash(hash2)
    except Exception:
        return 999


def analyze_image_quality(pil_image):
    img = np.array(pil_image)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))

    too_blurry = blur_score < 35
    too_dark = brightness < 35
    too_bright = brightness > 235
    low_contrast = contrast < 18

    return {
        "blur_score": blur_score,
        "brightness": brightness,
        "contrast": contrast,
        "too_blurry": too_blurry,
        "too_dark": too_dark,
        "too_bright": too_bright,
        "low_contrast": low_contrast,
        "quality_passed": not (too_blurry or too_dark or too_bright or low_contrast)
    }


def has_exif_data(pil_image):
    try:
        exif = pil_image.getexif()
        return bool(exif and len(exif.items()) > 0)
    except Exception:
        return False


def clip_based_ai_detection_fast(pil_image):
    image_emb = get_clip_embedding_fast(pil_image).to(device)

    ai_scores = torch.matmul(image_emb, AI_TEXT_EMB.T).squeeze()
    real_scores = torch.matmul(image_emb, REAL_TEXT_EMB.T).squeeze()

    ai_score = float(torch.max(ai_scores).item())
    real_score = float(torch.max(real_scores).item())

    raw_conf = ai_score / (ai_score + real_score + 1e-8)
    return {
        "clip_ai_score": ai_score,
        "clip_real_score": real_score,
        "clip_ai_probability": float(raw_conf)
    }


def detect_ai_generated_fast(pil_image):
    clip_result = clip_based_ai_detection_fast(pil_image)
    quality = analyze_image_quality(pil_image)
    exif_exists = has_exif_data(pil_image)

    score = clip_result["clip_ai_probability"]

    if not exif_exists:
        score += 0.06

    if quality["too_blurry"]:
        score -= 0.03

    if quality["low_contrast"]:
        score += 0.02

    score = max(0.0, min(1.0, score))

    if score >= AI_REJECT_THRESHOLD:
        decision = "reject"
        is_ai = True
    elif score >= AI_RETAKE_THRESHOLD:
        decision = "retake"
        is_ai = False
    else:
        decision = "pass"
        is_ai = False

    return {
        "is_ai_generated": is_ai,
        "confidence": score,
        "decision": decision,
        "clip": clip_result,
        "exif_present": exif_exists,
        "quality": quality
    }


def detect_dustbin_fast(pil_image):
    result = {
        "dustbin_detected": False,
        "confidence": 0.0,
        "method": "none",
        "details": {}
    }

    if yolo_model is not None:
        try:
            img_array = np.array(pil_image)
            detections = yolo_model(img_array, verbose=False)[0]
            max_conf = 0.0
            best_cls = None

            for box in detections.boxes.data:
                conf = float(box[4])
                cls = int(box[5])
                max_conf = max(max_conf, conf)
                if conf == max_conf:
                    best_cls = cls

            if YOLO_MODE == "custom":
                if max_conf >= DUSTBIN_CONFIDENCE_THRESHOLD:
                    return {
                        "dustbin_detected": True,
                        "confidence": max_conf,
                        "method": "custom_yolo",
                        "details": {"class_id": best_cls}
                    }
            else:
                result["details"]["yolo_fallback_max_confidence"] = max_conf
                result["details"]["warning"] = "COCO YOLO does not have a reliable dustbin class. Use custom model."

        except Exception as e:
            result["details"]["yolo_error"] = str(e)

    try:
        image_emb = get_clip_embedding_fast(pil_image).to(device)
        sims = torch.matmul(image_emb, DUSTBIN_TEXT_EMB.T).squeeze()
        max_sim = float(torch.max(sims).item())
        best_idx = int(torch.argmax(sims).item())

        clip_threshold = 0.27

        result["details"]["clip_confidence"] = max_sim
        result["details"]["best_clip_match"] = DUSTBIN_PROMPTS[best_idx]

        if max_sim >= clip_threshold:
            result.update({
                "dustbin_detected": True,
                "confidence": max_sim,
                "method": "clip_fallback"
            })

    except Exception as e:
        result["details"]["clip_error"] = str(e)

    return result


def get_user_images_fast(user_id, limit=200):
    try:
        cursor = user_images_collection.find(
            {"user_id": user_id, "status": "active"},
            {
                "sha256": 1,
                "phash": 1,
                "clip_embedding": 1,
                "image_url": 1,
                "created_at": 1,
                "mission_id": 1
            }
        ).sort("created_at", -1).limit(limit)

        return list(cursor)
    except Exception as e:
        print(f"Database query error: {e}")
        return []


def check_exact_duplicate(user_id, sha256_hash):
    existing = user_images_collection.find_one({
        "user_id": user_id,
        "sha256": sha256_hash,
        "status": "active"
    })
    return existing


def is_duplicate_fast(current_sha256, current_phash, current_embedding, previous_images):
    for prev in previous_images:
        if current_sha256 and prev.get("sha256") == current_sha256:
            return True, "sha256", 1.0, prev

    for prev in previous_images:
        prev_phash = prev.get("phash")
        if prev_phash:
            distance = hamming_distance_phash(current_phash, prev_phash)
            if distance <= PHASH_DUPLICATE_THRESHOLD:
                score = 1.0 - (distance / 64.0)
                return True, "phash", score, prev

    for prev in previous_images:
        prev_emb = prev.get("clip_embedding")
        if prev_emb:
            sim = cosine_similarity_tensor(current_embedding, prev_emb)
            if sim >= CLIP_DUPLICATE_THRESHOLD:
                return True, "clip_embedding", sim, prev

    return False, "none", 0.0, None


def verify_faces_fast(img1_path, img2_path):
    try:
        result = DeepFace.verify(
            img1_path=img1_path,
            img2_path=img2_path,
            model_name="ArcFace",
            detector_backend="retinaface",
            enforce_detection=True
        )

        distance = float(result.get("distance", 999))
        threshold = float(result.get("threshold", FACE_DISTANCE_MAX))
        verified = bool(result.get("verified", False)) and distance <= threshold

        return {
            "verified": verified,
            "distance": distance,
            "threshold": threshold,
            "model": "ArcFace",
            "detector": "retinaface"
        }
    except Exception as e:
        return {
            "verified": False,
            "error": str(e),
            "model": "ArcFace",
            "detector": "retinaface"
        }


def verify_faces_from_images(current_img, profile_img):
    temp_files = []

    try:
        temp1 = f"temp_current_{uuid.uuid4().hex}.jpg"
        temp2 = f"temp_profile_{uuid.uuid4().hex}.jpg"
        temp_files = [temp1, temp2]

        current_img.save(temp1)
        profile_img.save(temp2)

        return verify_faces_fast(temp1, temp2)
    finally:
        for path in temp_files:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass


def simple_liveness_check(current_img, challenge_img=None):
    if challenge_img is None:
        return {
            "liveness_checked": False,
            "liveness_passed": None,
            "reason": "challenge_image_not_provided"
        }

    try:
        h1 = imagehash.phash(current_img)
        h2 = imagehash.phash(challenge_img)
        distance = h1 - h2

        if distance < 5:
            return {
                "liveness_checked": True,
                "liveness_passed": False,
                "reason": "images_too_similar",
                "phash_distance": distance
            }

        return {
            "liveness_checked": True,
            "liveness_passed": True,
            "reason": "challenge_variation_detected",
            "phash_distance": distance
        }

    except Exception as e:
        return {
            "liveness_checked": True,
            "liveness_passed": False,
            "reason": str(e)
        }


def calculate_risk_score(ai_result, duplicate_result, face_result, dustbin_result, liveness_result, quality_result):
    risk = 0
    reasons = []

    if ai_result.get("decision") == "reject":
        risk += 70
        reasons.append("ai_generated")
    elif ai_result.get("decision") == "retake":
        risk += 30
        reasons.append("ai_suspicious")

    is_duplicate = duplicate_result.get("duplicate", False)
    if is_duplicate:
        risk += 80
        reasons.append("duplicate")

    if face_result is not None and not face_result.get("verified", False):
        risk += 70
        reasons.append("face_mismatch")

    if not dustbin_result.get("dustbin_detected", False):
        risk += 50
        reasons.append("no_dustbin_detected")

    if liveness_result.get("liveness_checked") and not liveness_result.get("liveness_passed"):
        risk += 60
        reasons.append("liveness_failed")

    if not quality_result.get("quality_passed", True):
        risk += 20
        reasons.append("poor_image_quality")

    if risk >= 60:
        decision = "rejected"
    elif risk >= 35:
        decision = "retake"
    else:
        decision = "approved"

    return {
        "risk_score": risk,
        "decision": decision,
        "reasons": reasons
    }


def save_user_image_fast(
    user_id,
    image_url,
    mission_id,
    sha256_hash,
    phash,
    clip_embedding,
    ai_result=None,
    dustbin_result=None,
    face_result=None,
    liveness_result=None,
    risk_result=None
):
    doc = {
        "user_id": user_id,
        "image_url": image_url,
        "mission_id": mission_id,
        "sha256": sha256_hash,
        "phash": phash,
        "clip_embedding": clip_embedding.squeeze().tolist() if hasattr(clip_embedding, "squeeze") else clip_embedding,
        "ai_detection": to_native(ai_result),
        "dustbin_detection": to_native(dustbin_result),
        "face_verification": to_native(face_result),
        "liveness": to_native(liveness_result),
        "risk": to_native(risk_result),
        "created_at": datetime.utcnow(),
        "status": "active"
    }

    result = user_images_collection.insert_one(doc)
    return str(result.inserted_id)


def parse_request_image():
    if request.content_type and "application/json" in request.content_type:
        data = request.json or {}

        image_url = data.get("image_url")
        profile_image_url = data.get("profile_image_url")
        challenge_image_url = data.get("challenge_image_url")
        user_id = data.get("user_id")
        mission_id = data.get("mission_id", "unknown")

        if not image_url or not user_id:
            return None, None, None, None, None, None, ("missing_image_url_or_user_id", 400)

        image_bytes = get_image_bytes_from_url(image_url)
        current_img = load_image_from_bytes(image_bytes)
        profile_img = load_image_fast(profile_image_url) if profile_image_url else None
        challenge_img = load_image_fast(challenge_image_url) if challenge_image_url else None
        sha256_hash = calculate_sha256_from_bytes(image_bytes)

        return current_img, profile_img, challenge_img, user_id, mission_id, image_url, sha256_hash

    image_file = request.files.get("image")
    profile_file = request.files.get("profile_image")
    challenge_file = request.files.get("challenge_image")
    user_id = request.form.get("user_id")
    mission_id = request.form.get("mission_id", "unknown")

    if not image_file or not user_id:
        return None, None, None, None, None, None, ("missing_image_or_user_id", 400)

    valid, msg = validate_uploaded_image(image_file)
    if not valid:
        return None, None, None, None, None, None, (msg, 400)

    if profile_file:
        valid, msg = validate_uploaded_image(profile_file)
        if not valid:
            return None, None, None, None, None, None, (f"profile_{msg}", 400)

    if challenge_file:
        valid, msg = validate_uploaded_image(challenge_file)
        if not valid:
            return None, None, None, None, None, None, (f"challenge_{msg}", 400)

    image_bytes = image_file.read()
    image_file.seek(0)

    current_img = load_image_from_bytes(image_bytes)
    profile_img = load_image_fast(profile_file) if profile_file else None
    challenge_img = load_image_fast(challenge_file) if challenge_file else None

    sha256_hash = calculate_sha256_from_bytes(image_bytes)
    image_url = f"uploaded_{uuid.uuid4().hex}.jpg"

    return current_img, profile_img, challenge_img, user_id, mission_id, image_url, sha256_hash


@app.route("/comprehensive_check", methods=["POST"])
def comprehensive_check():
    start_time = time.time()

    try:
        parsed = parse_request_image()

        if len(parsed) == 7 and isinstance(parsed[-1], tuple):
            reason, code = parsed[-1]
            return jsonify({
                "status": "rejected",
                "reason": reason,
                "processing_time": time.time() - start_time
            }), code

        current_img, profile_img, challenge_img, user_id, mission_id, image_url, sha256_hash = parsed

        exact_duplicate = check_exact_duplicate(user_id, sha256_hash)
        if exact_duplicate:
            return jsonify({
                "status": "rejected",
                "reason": "exact_duplicate",
                "method": "sha256",
                "matched_image": exact_duplicate.get("image_url"),
                "processing_time": time.time() - start_time
            })

        future_ai = executor.submit(detect_ai_generated_fast, current_img)
        future_phash = executor.submit(lambda: str(imagehash.phash(current_img)))
        future_clip = executor.submit(get_clip_embedding_fast, current_img)
        future_dustbin = executor.submit(detect_dustbin_fast, current_img)
        future_quality = executor.submit(analyze_image_quality, current_img)

        ai_result = future_ai.result()
        current_phash = future_phash.result()
        current_embedding = future_clip.result()
        dustbin_result = future_dustbin.result()
        quality_result = future_quality.result()

        previous_images = get_user_images_fast(user_id)
        is_dup, dup_method, dup_score, matched = is_duplicate_fast(
            sha256_hash,
            current_phash,
            current_embedding,
            previous_images
        )

        duplicate_result = {
            "duplicate": is_dup,
            "method": dup_method,
            "score": dup_score,
            "matched_image": matched.get("image_url") if matched else None
        }

        face_result = None
        if profile_img is not None:
            face_result = verify_faces_from_images(current_img, profile_img)

        liveness_result = simple_liveness_check(current_img, challenge_img)

        risk_result = calculate_risk_score(
            ai_result,
            duplicate_result,
            face_result,
            dustbin_result,
            liveness_result,
            quality_result
        )

        if risk_result["decision"] != "approved":
            return jsonify({
                "status": risk_result["decision"],
                "reasons": risk_result["reasons"],
                "risk_score": risk_result["risk_score"],
                "ai_detection": to_native(ai_result),
                "duplicate_detection": to_native(duplicate_result),
                "face_verification": to_native(face_result),
                "dustbin_detection": to_native(dustbin_result),
                "liveness": to_native(liveness_result),
                "quality": to_native(quality_result),
                "processing_time": time.time() - start_time
            })

        saved_id = save_user_image_fast(
            user_id=user_id,
            image_url=image_url,
            mission_id=mission_id,
            sha256_hash=sha256_hash,
            phash=current_phash,
            clip_embedding=current_embedding,
            ai_result=ai_result,
            dustbin_result=dustbin_result,
            face_result=face_result,
            liveness_result=liveness_result,
            risk_result=risk_result
        )

        return jsonify({
            "status": "approved",
            "message": "All checks passed",
            "saved_id": saved_id,
            "risk_score": risk_result["risk_score"],
            "ai_detection": to_native(ai_result),
            "duplicate_detection": to_native(duplicate_result),
            "face_verification": to_native(face_result),
            "dustbin_detection": to_native(dustbin_result),
            "liveness": to_native(liveness_result),
            "quality": to_native(quality_result),
            "processing_time": time.time() - start_time
        })

    except Exception as e:
        print(f"Comprehensive check error: {e}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "processing_time": time.time() - start_time
        }), 500


@app.route("/detect_dustbin", methods=["POST"])
def detect_dustbin_endpoint():
    try:
        if request.content_type and "application/json" in request.content_type:
            image_url = request.json.get("image_url")
            if not image_url:
                return jsonify({"error": "missing_image_url"}), 400
            img = load_image_fast(image_url)
        else:
            image_file = request.files.get("image")
            valid, msg = validate_uploaded_image(image_file)
            if not valid:
                return jsonify({"error": msg}), 400
            img = load_image_fast(image_file)

        result = detect_dustbin_fast(img)
        return jsonify(to_native(result))

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analyze_ai_only", methods=["POST"])
def analyze_ai_only():
    try:
        if request.content_type and "application/json" in request.content_type:
            image_url = request.json.get("image_url")
            if not image_url:
                return jsonify({"error": "missing_image_url"}), 400
            img = load_image_fast(image_url)
        else:
            image_file = request.files.get("image")
            valid, msg = validate_uploaded_image(image_file)
            if not valid:
                return jsonify({"error": msg}), 400
            img = load_image_fast(image_file)

        result = detect_ai_generated_fast(img)
        return jsonify(to_native(result))

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/verify", methods=["POST"])
def verify_faces():
    file1 = request.files.get("image1")
    file2 = request.files.get("image2")

    valid1, msg1 = validate_uploaded_image(file1)
    if not valid1:
        return jsonify({"error": f"image1_{msg1}"}), 400

    valid2, msg2 = validate_uploaded_image(file2)
    if not valid2:
        return jsonify({"error": f"image2_{msg2}"}), 400

    temp_files = []

    try:
        temp1 = f"temp1_{uuid.uuid4().hex}.jpg"
        temp2 = f"temp2_{uuid.uuid4().hex}.jpg"
        temp_files = [temp1, temp2]

        file1.save(temp1)
        file2.save(temp2)

        result = verify_faces_fast(temp1, temp2)
        return jsonify(to_native(result))

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        for path in temp_files:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass


@app.route("/check_duplicate", methods=["POST"])
def check_duplicate():
    try:
        if request.content_type and "application/json" in request.content_type:
            data = request.json or {}
            image_url = data.get("image_url")
            user_id = data.get("user_id")

            if not image_url or not user_id:
                return jsonify({"error": "missing_image_url_or_user_id"}), 400

            image_bytes = get_image_bytes_from_url(image_url)
            img = load_image_from_bytes(image_bytes)
            sha256_hash = calculate_sha256_from_bytes(image_bytes)
        else:
            image_file = request.files.get("image")
            user_id = request.form.get("user_id")

            if not image_file or not user_id:
                return jsonify({"error": "missing_image_or_user_id"}), 400

            valid, msg = validate_uploaded_image(image_file)
            if not valid:
                return jsonify({"error": msg}), 400

            image_bytes = image_file.read()
            image_file.seek(0)
            img = load_image_from_bytes(image_bytes)
            sha256_hash = calculate_sha256_from_bytes(image_bytes)

        exact = check_exact_duplicate(user_id, sha256_hash)
        if exact:
            return jsonify({
                "duplicate": True,
                "method": "sha256",
                "score": 1.0,
                "matched_image": exact.get("image_url")
            })

        phash = str(imagehash.phash(img))
        embedding = get_clip_embedding_fast(img)
        previous = get_user_images_fast(user_id)

        is_dup, method, score, matched = is_duplicate_fast(sha256_hash, phash, embedding, previous)

        return jsonify({
            "duplicate": is_dup,
            "method": method,
            "score": score,
            "matched_image": matched.get("image_url") if matched else None
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/batch_check", methods=["POST"])
def batch_check():
    try:
        data = request.json or {}
        images = data.get("images", [])
        user_id = data.get("user_id")

        if not user_id or not images:
            return jsonify({"error": "missing_user_id_or_images"}), 400

        results = []

        for idx, item in enumerate(images):
            try:
                image_url = item.get("image_url")
                mission_id = item.get("mission_id", f"batch_{idx}")

                if not image_url:
                    results.append({
                        "index": idx,
                        "status": "error",
                        "reason": "missing_image_url"
                    })
                    continue

                image_bytes = get_image_bytes_from_url(image_url)
                img = load_image_from_bytes(image_bytes)
                sha256_hash = calculate_sha256_from_bytes(image_bytes)

                exact = check_exact_duplicate(user_id, sha256_hash)
                if exact:
                    results.append({
                        "index": idx,
                        "status": "rejected",
                        "reason": "exact_duplicate"
                    })
                    continue

                ai = detect_ai_generated_fast(img)
                phash = str(imagehash.phash(img))
                emb = get_clip_embedding_fast(img)
                dustbin = detect_dustbin_fast(img)
                quality = analyze_image_quality(img)
                previous = get_user_images_fast(user_id)

                dup, method, score, matched = is_duplicate_fast(sha256_hash, phash, emb, previous)
                duplicate_result = {
                    "duplicate": dup,
                    "method": method,
                    "score": score,
                    "matched_image": matched.get("image_url") if matched else None
                }

                risk = calculate_risk_score(
                    ai,
                    duplicate_result,
                    None,
                    dustbin,
                    {"liveness_checked": False, "liveness_passed": None},
                    quality
                )

                if risk["decision"] != "approved":
                    results.append({
                        "index": idx,
                        "status": risk["decision"],
                        "reasons": risk["reasons"],
                        "risk_score": risk["risk_score"]
                    })
                    continue

                saved_id = save_user_image_fast(
                    user_id=user_id,
                    image_url=image_url,
                    mission_id=mission_id,
                    sha256_hash=sha256_hash,
                    phash=phash,
                    clip_embedding=emb,
                    ai_result=ai,
                    dustbin_result=dustbin,
                    risk_result=risk
                )

                results.append({
                    "index": idx,
                    "status": "approved",
                    "saved_id": saved_id
                })

            except Exception as e:
                results.append({
                    "index": idx,
                    "status": "error",
                    "error": str(e)
                })

        approved = len([r for r in results if r["status"] == "approved"])
        rejected = len([r for r in results if r["status"] in ["rejected", "retake"]])
        errors = len([r for r in results if r["status"] == "error"])

        return jsonify({
            "summary": {
                "total": len(results),
                "approved": approved,
                "rejected_or_retake": rejected,
                "errors": errors
            },
            "results": results
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health_check():
    try:
        client.admin.command("ping")

        return jsonify({
            "status": "healthy",
            "database": "connected",
            "clip_model": "loaded",
            "yolo_mode": YOLO_MODE,
            "device": device,
            "timestamp": datetime.utcnow().isoformat()
        })

    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500


if __name__ == "__main__":
    print("=" * 60)
    print("BinGo Image Verification Service")
    print("=" * 60)
    print(f"Port: {PORT}")
    print(f"Device: {device}")
    print(f"YOLO mode: {YOLO_MODE}")
    print("Checks enabled:")
    print("  - Upload validation")
    print("  - SHA256 exact duplicate")
    print("  - pHash near duplicate")
    print("  - CLIP semantic duplicate")
    print("  - AI image detection")
    print("  - Face verification with ArcFace")
    print("  - Optional liveness challenge")
    print("  - Dustbin detection")
    print("  - Risk-based decision")
    print("=" * 60)

    app.run(debug=False, port=PORT, host="0.0.0.0", threaded=True)
