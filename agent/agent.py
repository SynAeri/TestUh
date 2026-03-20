Super simple agent - just scans folders and syncs to backend

import os
import requests
import time
import hashlib
import platform
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import exifread
from PIL import Image

BACKEND_URL = "http://localhost:8000"
DEVICE_NAME = f"{platform.system()} Computer"
DEVICE_ID = None
FOLDER_IDS = {}


def get_default_folders():
    home = str(Path.home())
    folders = [
        os.path.join(home, "Downloads"),
        os.path.join(home, "Desktop"),
        os.path.join(home, "Pictures"),
        os.path.join(home, "Documents"),
    ]
    return [f for f in folders if os.path.exists(f)]


def compute_hash(filepath):
    try:
        hasher = hashlib.sha256()
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b""):
                hasher.update(chunk)
        return hasher.hexdigest()
    except:
        return None


def get_category(filename, filepath):
    ext = os.path.splitext(filename)[1].lower()

    image_exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
    video_exts = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv']
    doc_exts = ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.ppt']
    archive_exts = ['.zip', '.rar', '.7z', '.tar', '.gz']

    if ext in image_exts:
        return "Picture"
    elif ext in video_exts:
        return "Video"
    elif ext in doc_exts:
        return "Document"
    elif ext in archive_exts:
        return "Archive"

    if any(game in filepath.lower() for game in ['steam', 'game', 'epic', 'riot', 'origin']):
        return "Game"

    return "Other"


def extract_location_from_image(filepath):
    try:
        with open(filepath, 'rb') as f:
            tags = exifread.process_file(f, details=False)

        gps_lat = tags.get('GPS GPSLatitude')
        gps_lon = tags.get('GPS GPSLongitude')

        if gps_lat and gps_lon:
            return f"{gps_lat},{gps_lon}"
    except:
        pass
    return None


def register_device():
    global DEVICE_ID
    response = requests.post(f"{BACKEND_URL}/devices", json={
        "name": DEVICE_NAME,
        "platform": platform.system()
    })
    if response.status_code == 200:
        DEVICE_ID = response.json()["device_id"]
        print(f"Registered device: {DEVICE_ID}")
        return True
    return False


def register_folder(path):
    response = requests.post(f"{BACKEND_URL}/folders", json={
        "device_id": DEVICE_ID,
        "path": path
    })
    if response.status_code == 200:
        folder_id = response.json()["folder_id"]
        FOLDER_IDS[path] = folder_id
        print(f"Registered folder: {path}")
        return folder_id
    return None


def scan_folder(folder_path, folder_id):
    files_to_upload = []

    for root, dirs, files in os.walk(folder_path):
        for filename in files:
            filepath = os.path.join(root, filename)
            try:
                size = os.path.getsize(filepath)
                file_hash = compute_hash(filepath) if size < 50 * 1024 * 1024 else None

                category = get_category(filename, filepath)
                location = extract_location_from_image(filepath) if category == "Picture" else None

                files_to_upload.append({
                    "device_id": DEVICE_ID,
                    "folder_id": folder_id,
                    "path": filepath,
                    "filename": filename,
                    "size_bytes": size,
                    "file_hash": file_hash,
                    "category": category,
                    "location": location,
                    "metadata": {}
                })

                if len(files_to_upload) >= 50:
                    requests.post(f"{BACKEND_URL}/files/batch", json=files_to_upload)
                    print(f"Uploaded {len(files_to_upload)} files")
                    files_to_upload = []
            except:
                continue

    if files_to_upload:
        requests.post(f"{BACKEND_URL}/files/batch", json=files_to_upload)
        print(f"Uploaded {len(files_to_upload)} files")


def execute_command(command):
    cmd_type = command["command_type"]
    files = command["target_files"]
    cmd_id = command["id"]

    success = True

    if cmd_type == "delete":
        for filepath in files:
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except:
                success = False

    elif cmd_type == "move":
        pass

    requests.post(f"{BACKEND_URL}/commands/{cmd_id}/complete", json={"success": success})
    print(f"Executed command {cmd_type}: {'success' if success else 'failed'}")


def poll_commands():
    response = requests.get(f"{BACKEND_URL}/commands/pending/{DEVICE_ID}")
    if response.status_code == 200:
        commands = response.json()["commands"]
        for cmd in commands:
            execute_command(cmd)


def heartbeat_loop():
    while True:
        try:
            requests.post(f"{BACKEND_URL}/devices/{DEVICE_ID}/heartbeat")
        except:
            pass
        time.sleep(30)


def command_loop():
    while True:
        try:
            poll_commands()
        except:
            pass
        time.sleep(5)


def main():
    print("Simple File Management Agent")
    print("=" * 40)

    if not register_device():
        print("Failed to register device")
        return

    folders = get_default_folders()
    print(f"\nFound {len(folders)} folders to monitor")

    for folder in folders:
        folder_id = register_folder(folder)
        if folder_id:
            print(f"Scanning: {folder}")
            scan_folder(folder, folder_id)

    print("\nInitial scan complete!")
    print("Monitoring for commands... (Press Ctrl+C to stop)")

    import threading
    threading.Thread(target=heartbeat_loop, daemon=True).start()

    try:
        command_loop()
    except KeyboardInterrupt:
        print("\nStopping agent...")


if __name__ == "__main__":
    main()
