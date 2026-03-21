# AI categorization and vision search using Google Gemini API

import os
import google.generativeai as genai
from PIL import Image

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-pro')
    vision_model = genai.GenerativeModel('gemini-1.5-flash')


def categorize_file_with_ai(filename, filepath):
    if not GEMINI_API_KEY:
        return None

    prompt = f"""Categorize this file into ONE of these categories: Game, Picture, Video, Document, Archive, Other.

Filename: {filename}
Path: {filepath}

Only respond with the category name, nothing else."""

    try:
        response = model.generate_content(prompt)
        category = response.text.strip()
        if category in ["Game", "Picture", "Video", "Document", "Archive", "Other"]:
            return category
    except:
        pass

    return None


def categorize_image_with_ai(image_path):
    if not GEMINI_API_KEY:
        return None, None

    try:
        img = Image.open(image_path)

        prompt = "Categorize this image as: Picture, Screenshot, or Meme. Also identify the location if visible (city/landmark). Format: Category|Location"

        response = vision_model.generate_content([prompt, img])
        result = response.text.strip()

        if "|" in result:
            category, location = result.split("|", 1)
            return category.strip(), location.strip()

        return result, None
    except:
        return None, None


def analyze_image_content(image_path):
    if not GEMINI_API_KEY:
        return None

    try:
        img = Image.open(image_path)

        prompt = """Analyze this image and provide a detailed description including:
- What objects/people/things are in the image
- Activities happening
- Location/setting if identifiable
- Any text visible
- Overall mood/context

Be concise but descriptive."""

        response = vision_model.generate_content([prompt, img])
        return response.text.strip()
    except Exception as e:
        print(f"Error analyzing image: {e}")
        return None


def search_images_by_description(description, image_paths):
    if not GEMINI_API_KEY:
        return []

    matching_images = []

    for image_path in image_paths:
        try:
            img = Image.open(image_path)

            prompt = f"""Does this image match this description: "{description}"?

Consider:
- Objects and subjects in the image
- Activities shown
- Location/setting
- Colors and mood
- Any visible text

Answer with ONLY "YES" or "NO" and a confidence score 0-100.
Format: YES|85 or NO|20"""

            response = vision_model.generate_content([prompt, img])
            result = response.text.strip()

            if "|" in result:
                answer, confidence = result.split("|")
                if answer.strip().upper() == "YES" and int(confidence.strip()) > 60:
                    matching_images.append({
                        "path": image_path,
                        "confidence": int(confidence.strip())
                    })
        except Exception as e:
            print(f"Error searching image {image_path}: {e}")
            continue

    return sorted(matching_images, key=lambda x: x['confidence'], reverse=True)
