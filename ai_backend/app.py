from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import requests
import imagehash
import io, os
from pymongo import MongoClient
from datetime import datetime, timedelta
import numpy as np
from bson import ObjectId
import cv2
from deepface import DeepFace
import uuid
import warnings
from dotenv import load_dotenv
from functools import lru_cache
import threading
from concurrent.futures import ThreadPoolExecutor
import asyncio
import time

warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)
port = int(os.environ.get("PORT", 5000))
# MongoDB setup
load_dotenv()
MONGODB_URI = os.getenv('MONGODB_URI')
if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI environment variable not set")

client = MongoClient(MONGODB_URI)
db = client['bingo_app']
user_images_collection = db['user_images']
user_images_collection.create_index([("user_id", 1), ("created_at", -1)])

# Global models - load once
print("Loading models...")
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

print("Loading YOLO model for object detection...")
try:
    yolo_model = YOLO('yolov8n.pt')  # Using nano version for speed
    print("YOLO model loaded successfully!")
except Exception as e:
    print(f"Warning: Could not load YOLO model: {e}")
    yolo_model = None

# Pre-compute CLIP text embeddings for AI detection (one-time cost)
AI_PROMPTS = [
    "artificial intelligence generated image", "computer generated artwork",
    "digital art created by AI", "synthetic image", "AI rendered picture"
]
REAL_PROMPTS = [
    "real photograph", "natural photography", "authentic image",
    "camera captured photo", "genuine photograph"
]

DUSTBIN_CLASSES = [
    'trash can', 'garbage bin', 'waste basket', 'recycle bin', 
    'dustbin', 'rubbish bin', 'bin', 'container'
]

print("Pre-computing CLIP text embeddings...")
all_prompts = AI_PROMPTS + REAL_PROMPTS
text_inputs = clip_processor(text=all_prompts, return_tensors="pt", padding=True)
with torch.no_grad():
    PRECOMPUTED_TEXT_EMBEDDINGS = clip_model.get_text_features(**text_inputs)
    PRECOMPUTED_TEXT_EMBEDDINGS = PRECOMPUTED_TEXT_EMBEDDINGS / PRECOMPUTED_TEXT_EMBEDDINGS.norm(p=2, dim=-1, keepdim=True)

print("Pre-computing dustbin detection embeddings...")
dustbin_inputs = clip_processor(text=DUSTBIN_CLASSES, return_tensors="pt", padding=True)
with torch.no_grad():
    DUSTBIN_TEXT_EMBEDDINGS = clip_model.get_text_features(**dustbin_inputs)
    DUSTBIN_TEXT_EMBEDDINGS = DUSTBIN_TEXT_EMBEDDINGS / DUSTBIN_TEXT_EMBEDDINGS.norm(p=2, dim=-1, keepdim=True)

print("Models loaded successfully!")

# Thread pool for concurrent processing
executor = ThreadPoolExecutor(max_workers=4)

# ==================== OPTIMIZED UTILITY FUNCTIONS ====================

def load_image_fast(source):
    """Optimized image loading with caching"""
    try:
        if hasattr(source, 'save'):  # FileStorage
            return Image.open(source).convert("RGB")
        elif isinstance(source, str):
            if source.startswith(("http://", "https://")):
                response = requests.get(source, timeout=10, stream=True)
                response.raise_for_status()
                return Image.open(io.BytesIO(response.content)).convert("RGB")
            else:
                return Image.open(source).convert("RGB")
        else:
            raise ValueError("Invalid image source")
    except Exception as e:
        print(f"Error loading image: {str(e)}")
        raise

@lru_cache(maxsize=128)
def get_clip_embedding_cached(image_hash):
    """Cached CLIP embedding computation"""
    pass

def get_clip_embedding_fast(pil_image):
    """Optimized CLIP embedding"""
    try:
        inputs = clip_processor(images=pil_image, return_tensors="pt")
        with torch.no_grad():
            embedding = clip_model.get_image_features(**inputs)
        return embedding / embedding.norm(p=2)
    except Exception as e:
        print(f"Error getting CLIP embedding: {str(e)}")
        raise

def get_image_features_batch(images):
    """Process multiple images in batch for efficiency"""
    try:
        inputs = clip_processor(images=images, return_tensors="pt")
        with torch.no_grad():
            embeddings = clip_model.get_image_features(**inputs)
        return embeddings / embeddings.norm(p=2, dim=-1, keepdim=True)
    except Exception as e:
        print(f"Error in batch processing: {str(e)}")
        raise

# ==================== DUSTBIN DETECTION ====================

def detect_dustbin_fast(pil_image):
    """Optimized dustbin detection using YOLO + CLIP"""
    try:
        results = {
            "dustbin_detected": False,
            "confidence": 0.0,
            "method": "none",
            "details": {}
        }
        
        # Method 1: YOLO object detection (primary)
        if yolo_model is not None:
            try:
                # Convert PIL to numpy array for YOLO
                img_array = np.array(pil_image)
                
                # Run YOLO detection
                detections = yolo_model(img_array, verbose=False)[0]
                
                # Check for relevant object classes
                dustbin_classes_yolo = [39, 73]  # bottle, book (closest matches in COCO)
                # Note: COCO doesn't have direct dustbin class, so we check for containers
                
                max_conf = 0.0
                for detection in detections.boxes.data:
                    class_id = int(detection[5])
                    confidence = float(detection[4])
                    
                    # Check for container-like objects with high confidence
                    if class_id in dustbin_classes_yolo and confidence > 0.3:
                        max_conf = max(max_conf, confidence)
                
                if max_conf > 0.3:
                    results.update({
                        "dustbin_detected": True,
                        "confidence": max_conf,
                        "method": "yolo",
                        "details": {"yolo_confidence": max_conf}
                    })
                    return results
                    
                results["details"]["yolo_confidence"] = max_conf
                
            except Exception as e:
                print(f"YOLO detection error: {e}")
                results["details"]["yolo_error"] = str(e)
        
        # Method 2: CLIP-based detection (fallback)
        try:
            # Get image embedding
            image_inputs = clip_processor(images=pil_image, return_tensors="pt")
            with torch.no_grad():
                image_features = clip_model.get_image_features(**image_inputs)
                image_features = image_features / image_features.norm(p=2)
            
            # Compare with dustbin text embeddings
            similarities = torch.nn.functional.cosine_similarity(
                image_features.unsqueeze(1), DUSTBIN_TEXT_EMBEDDINGS.unsqueeze(0), dim=2
            ).squeeze()
            
            max_similarity = torch.max(similarities).item()
            best_match_idx = torch.argmax(similarities).item()
            
            # Threshold for dustbin detection
            if max_similarity > 0.25:  # Adjust threshold as needed
                results.update({
                    "dustbin_detected": True,
                    "confidence": max_similarity,
                    "method": "clip",
                    "details": {
                        "clip_confidence": max_similarity,
                        "best_match": DUSTBIN_CLASSES[best_match_idx]
                    }
                })
                return results
            
            results["details"].update({
                "clip_confidence": max_similarity,
                "best_match": DUSTBIN_CLASSES[best_match_idx]
            })
            
        except Exception as e:
            print(f"CLIP dustbin detection error: {e}")
            results["details"]["clip_error"] = str(e)
        
        return results
        
    except Exception as e:
        return {
            "dustbin_detected": False,
            "confidence": 0.0,
            "method": "none",
            "error": str(e)
        }

# ==================== OPTIMIZED AI DETECTION ====================
# ...existing code for analyze_statistical_properties_fast, analyze_frequency_domain_fast, clip_based_ai_detection_fast, detect_ai_generated_fast...

# ==================== OPTIMIZED DUPLICATE DETECTION ====================
# ...existing code for is_duplicate_fast...

# ==================== OPTIMIZED DATABASE OPERATIONS ====================

def save_user_image_fast(user_id, image_url, mission_id, phash, clip_embedding, ai_result=None, dustbin_result=None):
    """Optimized database save with dustbin info"""
    try:
        doc = {
            "user_id": user_id,
            "image_url": image_url,
            "mission_id": mission_id,
            "phash": phash,
            "clip_embedding": clip_embedding.squeeze().tolist() if hasattr(clip_embedding, 'squeeze') else clip_embedding,
            "ai_detection": ai_result,
            "dustbin_detection": dustbin_result,  # New field
            "created_at": datetime.utcnow(),
            "status": "active"
        }
        
        result = user_images_collection.insert_one(doc)
        return str(result.inserted_id)
    except Exception as e:
        print(f"Database save error: {str(e)}")
        raise

def get_user_images_fast(user_id, limit=100):
    """Optimized user image retrieval"""
    try:
        cursor = user_images_collection.find(
            {"user_id": user_id, "status": "active"},
            {"phash": 1, "clip_embedding": 1, "image_url": 1, "created_at": 1}
        ).sort("created_at", -1).limit(limit)
        return list(cursor)
    except Exception as e:
        print(f"Database query error: {str(e)}")
        return []

# ==================== OPTIMIZED FACE VERIFICATION ====================
# ...existing code for verify_faces_fast...

# ==================== MAIN API ENDPOINTS ====================

@app.route("/comprehensive_check", methods=["POST"])
def comprehensive_check():
    """Optimized comprehensive verification"""
    start_time = time.time()
    
    try:
        # Parse input
        if request.content_type and 'application/json' in request.content_type:
            data = request.json
            image_url = data.get("image_url")
            profile_image_url = data.get("profile_image_url")
            user_id = data.get("user_id")
            mission_id = data.get("mission_id", "unknown")
            
            if not image_url or not user_id:
                return jsonify({"error": "Missing image_url or user_id"}), 400
            
            current_img = load_image_fast(image_url)
            profile_img = load_image_fast(profile_image_url) if profile_image_url else None
        else:
            image_file = request.files.get("image")
            profile_file = request.files.get("profile_image")
            user_id = request.form.get("user_id")
            mission_id = request.form.get("mission_id", "unknown")
            
            if not image_file or not user_id:
                return jsonify({"error": "Missing image file or user_id"}), 400
            
            current_img = load_image_fast(image_file)
            profile_img = load_image_fast(profile_file) if profile_file else None

        print(f"Processing for user: {user_id}")

        # Parallel processing of image features
        with ThreadPoolExecutor(max_workers=4) as executor:  # Changed from 3 to 4
            future_ai = executor.submit(detect_ai_generated_fast, current_img)
            future_phash = executor.submit(lambda: str(imagehash.phash(current_img)))
            future_clip = executor.submit(get_clip_embedding_fast, current_img)
            future_dustbin = executor.submit(detect_dustbin_fast, current_img)  # New
            
            ai_result = future_ai.result()
            current_phash = future_phash.result()
            current_embedding = future_clip.result()
            dustbin_result = future_dustbin.result()  # New

        # Early AI rejection (keep existing code)
        if ai_result["is_ai_generated"] and ai_result["confidence"] > 0.7:
            return jsonify({
                "status": "rejected",
                "reason": "ai_generated",
                "ai_generated": True,
                "ai_confidence": ai_result["confidence"],
                "processing_time": time.time() - start_time
            })

        # Add dustbin check after AI check
        if not dustbin_result["dustbin_detected"]:
            return jsonify({
                "status": "rejected",
                "reason": "no_dustbin_detected",
                "dustbin_detected": False,
                "dustbin_confidence": dustbin_result["confidence"],
                "dustbin_method": dustbin_result["method"],
                "processing_time": time.time() - start_time
            })

        # Optimized duplicate check
        previous_images = get_user_images_fast(user_id)
        
        for prev_img in previous_images:
            is_dup, method, score = is_duplicate_fast(
                current_phash, prev_img.get("phash"),
                current_embedding, prev_img.get("clip_embedding")
            )
            
            if is_dup:
                return jsonify({
                    "status": "rejected",
                    "reason": "duplicate",
                    "duplicate": True,
                    "method": method,
                    "score": score,
                    "matched_image": prev_img.get("image_url"),
                    "processing_time": time.time() - start_time
                })

        # Face verification (if needed)
        face_result = None
        if profile_img:
            temp_files = []
            try:
                temp1 = f"temp_current_{uuid.uuid4().hex}.jpg"
                temp2 = f"temp_profile_{uuid.uuid4().hex}.jpg"
                temp_files = [temp1, temp2]
                
                current_img.save(temp1)
                profile_img.save(temp2)
                
                face_result = verify_faces_fast(temp1, temp2)
                
                if not face_result.get("verified", False):
                    return jsonify({
                        "status": "rejected",
                        "reason": "face_mismatch",
                        "face_verified": False,
                        "processing_time": time.time() - start_time
                    })
                        
            finally:
                for temp_file in temp_files:
                    if os.path.exists(temp_file):
                        try:
                            os.remove(temp_file)
                        except:
                            pass

        # Save approved image
        try:
            image_url_to_save = image_url if 'image_url' in locals() else f"uploaded_{uuid.uuid4().hex}"
            saved_id = save_user_image_fast(
                user_id, image_url_to_save, mission_id, 
                current_phash, current_embedding, ai_result, dustbin_result
            )
            
            return jsonify({
                "status": "approved",
                "message": "All checks passed",
                "saved_id": saved_id,
                "ai_generated": ai_result["is_ai_generated"],
                "ai_confidence": ai_result["confidence"],
                "dustbin_detected": dustbin_result["dustbin_detected"],
                "dustbin_confidence": dustbin_result["confidence"],
                "dustbin_method": dustbin_result["method"],
                "duplicate": False,
                "face_verified": face_result.get("verified") if face_result else None,
                "processing_time": time.time() - start_time
            })
            
        except Exception as save_error:
            return jsonify({
                "status": "approved",
                "message": "Checks passed but save failed",
                "error": str(save_error),
                "processing_time": time.time() - start_time
            })

    except Exception as e:
        print(f"Comprehensive check error: {str(e)}")
        return jsonify({
            "error": f"Internal server error: {str(e)}",
            "processing_time": time.time() - start_time
        }), 500

@app.route("/detect_dustbin", methods=["POST"])
def detect_dustbin_endpoint():
    """Standalone dustbin detection endpoint"""
    try:
        data = request.json
        image_url = data.get("image_url")
        
        if not image_url:
            return jsonify({"error": "Missing image_url"}), 400
        
        current_img = load_image_fast(image_url)
        dustbin_result = detect_dustbin_fast(current_img)
        
        return jsonify(dustbin_result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/batch_check", methods=["POST"])
def batch_check_optimized():
    """Optimized batch processing"""
    try:
        data = request.json
        images = data.get("images", [])
        user_id = data.get("user_id")
        
        if not user_id or not images:
            return jsonify({"error": "Missing user_id or images"}), 400
        
        # Load all images first
        loaded_images = []
        for idx, img_data in enumerate(images):
            try:
                img = load_image_fast(img_data.get("image_url"))
                loaded_images.append((idx, img, img_data))
            except Exception as e:
                loaded_images.append((idx, None, img_data, str(e)))
        
        # Batch process image features
        valid_images = [(idx, img, data) for idx, img, data in loaded_images if img is not None]
        
        if valid_images:
            # Batch CLIP processing
            batch_images = [img for _, img, _ in valid_images]
            batch_embeddings = get_image_features_batch(batch_images)
            
            # Process each image
            results = []
            previous_images = get_user_images_fast(user_id)
            
            for i, (idx, img, img_data) in enumerate(valid_images):
                try:
                    # AI detection
                    ai_result = detect_ai_generated_fast(img)
                    if ai_result["is_ai_generated"] and ai_result["confidence"] > 0.7:
                        results.append({
                            "index": idx,
                            "status": "rejected",
                            "reason": "ai_generated"
                        })
                        continue
                    
                    # Dustbin detection
                    dustbin_result = detect_dustbin_fast(img)
                    if not dustbin_result["dustbin_detected"]:
                        results.append({
                            "index": idx,
                            "status": "rejected",
                            "reason": "no_dustbin_detected",
                            "dustbin_confidence": dustbin_result["confidence"]
                        })
                        continue

                    # Duplicate check
                    current_phash = str(imagehash.phash(img))
                    current_embedding = batch_embeddings[i]
                    
                    is_duplicate = False
                    for prev_img in previous_images:
                        is_dup, _, _ = is_duplicate_fast(
                            current_phash, prev_img.get("phash"),
                            current_embedding, prev_img.get("clip_embedding")
                        )
                        if is_dup:
                            is_duplicate = True
                            break
                    
                    if is_duplicate:
                        results.append({
                            "index": idx,
                            "status": "rejected",
                            "reason": "duplicate"
                        })
                        continue
                    
                    # Save approved image
                    saved_id = save_user_image_fast(
                        user_id, img_data.get("image_url"),
                        img_data.get("mission_id", f"batch_{idx}"),
                        current_phash, current_embedding, ai_result, dustbin_result
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
        
        # Handle failed image loads
        for idx, img, data, error in [item for item in loaded_images if len(item) == 4]:
            results.append({
                "index": idx,
                "status": "error",
                "error": error
            })
        
        # Summary
        approved = len([r for r in results if r["status"] == "approved"])
        rejected = len([r for r in results if r["status"] == "rejected"])
        errors = len([r for r in results if r["status"] == "error"])
        
        return jsonify({
            "summary": {
                "total": len(results),
                "approved": approved,
                "rejected": rejected,
                "errors": errors
            },
            "results": results
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500



def verify_faces_fast(img1_path, img2_path):
    """
    Fast face verification using DeepFace.
    Returns a dict with 'verified' key.
    """
    try:
        result = DeepFace.verify(
            img1_path=img1_path,
            img2_path=img2_path,
            model_name="VGG-Face",
            detector_backend="opencv",
            enforce_detection=False
        )
        return {
            "verified": result.get("verified", False),
            "distance": result.get("distance"),
            "threshold": result.get("threshold")
        }
    except Exception as e:
        print(f"DeepFace verification error: {e}")
        return {"verified": False, "error": str(e)}

# ==================== SIMPLIFIED UTILITY ENDPOINTS ====================
def to_native(obj):
    """Recursively convert numpy types to native Python types."""
    if isinstance(obj, dict):
        return {k: to_native(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [to_native(v) for v in obj]
    elif isinstance(obj, (np.generic, np.bool_)):
        return obj.item()
    else:
        return obj

@app.route("/verify", methods=["POST"])
def verify_faces():
    """Optimized face verification endpoint"""
    file1 = request.files.get("image1")
    file2 = request.files.get("image2")

    if not file1 or not file2:
        return jsonify({"error": "Missing image files"}), 400

    temp_files = []
    try:
        temp1 = f"temp1_{uuid.uuid4().hex}.jpg"
        temp2 = f"temp2_{uuid.uuid4().hex}.jpg"
        temp_files = [temp1, temp2]
        
        file1.save(temp1)
        file2.save(temp2)
        
        result = verify_faces_fast(temp1, temp2)
        result_native = to_native(result)  # <-- Convert all numpy types
        return jsonify(result_native)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        for temp_file in temp_files:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except:
                    pass

@app.route("/analyze_ai_only", methods=["POST"])
def analyze_ai_only():
    """AI detection only endpoint"""
    try:
        data = request.json
        image_url = data.get("image_url")
        
        if not image_url:
            return jsonify({"error": "Missing image_url"}), 400
        
        current_img = load_image_fast(image_url)
        ai_result = detect_ai_generated_fast(current_img)
        
        return jsonify(ai_result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    try:
        db.command('ping')
        return jsonify({
            "status": "healthy",
            "database": "connected",
            "models": "loaded",
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500

# ==================== LEGACY ENDPOINTS (simplified) ====================

@app.route("/check_duplicate", methods=["POST"])
def check_duplicate():
    """Legacy duplicate check endpoint"""
    try:
        data = request.json
        image_url = data.get("image_url")
        user_id = data.get("user_id")
        
        if not image_url or not user_id:
            return jsonify({"error": "Missing image_url or user_id"}), 400

        current_img = load_image_fast(image_url)
        
        # Quick checks
        ai_result = detect_ai_generated_fast(current_img)
        if ai_result["is_ai_generated"] and ai_result["confidence"] > 0.7:
            return jsonify({
                "duplicate": False,
                "ai_generated": True,
                "rejected": True
            })

        current_phash = str(imagehash.phash(current_img))
        current_embedding = get_clip_embedding_fast(current_img)
        
        # Check duplicates
        previous_images = get_user_images_fast(user_id)
        for prev_img in previous_images:
            is_dup, method, score = is_duplicate_fast(
                current_phash, prev_img.get("phash"),
                current_embedding, prev_img.get("clip_embedding")
            )
            if is_dup:
                return jsonify({
                    "duplicate": True,
                    "method": method,
                    "score": score
                })

        # Save and return
        saved_id = save_user_image_fast(user_id, image_url, "legacy", current_phash, current_embedding, ai_result)
        return jsonify({
            "duplicate": False,
            "saved_id": saved_id,
            "ai_generated": ai_result["is_ai_generated"]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("="*50)
    print("OPTIMIZED Image Verification Service")
    print("="*50)
    print("✓ Parallel processing enabled")
    print("✓ Pre-computed CLIP text embeddings")
    print("✓ Optimized AI detection pipeline")
    print("✓ Fast duplicate detection")
    print("✓ Batch processing support")
    print("✓ Efficient database operations")
    print("="*50)

    app.run(debug=False, port=port, host='0.0.0.0', threaded=True)