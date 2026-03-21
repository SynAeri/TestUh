# Simple FastAPI backend for hackathon - no auth, no complexity, just works

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import init_db, get_db, Device, Folder, File, Command
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ai_helper import search_images_by_description, analyze_image_content
import os

app = FastAPI(title="File Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


class DeviceCreate(BaseModel):
    name: str
    platform: str


class FolderCreate(BaseModel):
    device_id: str
    path: str


class FileCreate(BaseModel):
    device_id: str
    folder_id: str
    path: str
    filename: str
    size_bytes: int
    file_hash: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    metadata: Optional[dict] = None


class CommandCreate(BaseModel):
    device_id: str
    command_type: str
    target_files: List[str]


@app.get("/")
def root():
    return {"status": "running", "message": "File Manager API"}


@app.post("/devices")
def register_device(device: DeviceCreate, db: Session = Depends(get_db)):
    new_device = Device(name=device.name, platform=device.platform)
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    return {"device_id": new_device.id, "name": new_device.name}


@app.post("/devices/{device_id}/heartbeat")
def heartbeat(device_id: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if device:
        device.last_seen = datetime.utcnow()
        db.commit()
        return {"status": "ok"}
    return {"status": "device not found"}


@app.get("/devices")
def list_devices(db: Session = Depends(get_db)):
    devices = db.query(Device).all()
    return {"devices": [{"id": d.id, "name": d.name, "platform": d.platform, "last_seen": d.last_seen} for d in devices]}


@app.post("/folders")
def add_folder(folder: FolderCreate, db: Session = Depends(get_db)):
    new_folder = Folder(device_id=folder.device_id, path=folder.path)
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    return {"folder_id": new_folder.id}


@app.post("/files")
def add_file(file: FileCreate, db: Session = Depends(get_db)):
    new_file = File(
        device_id=file.device_id,
        folder_id=file.folder_id,
        path=file.path,
        filename=file.filename,
        size_bytes=file.size_bytes,
        file_hash=file.file_hash,
        category=file.category,
        location=file.location,
        file_metadata=file.metadata
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    return {"file_id": new_file.id}


@app.post("/files/batch")
def add_files_batch(files: List[FileCreate], db: Session = Depends(get_db)):
    for file in files:
        new_file = File(
            device_id=file.device_id,
            folder_id=file.folder_id,
            path=file.path,
            filename=file.filename,
            size_bytes=file.size_bytes,
            file_hash=file.file_hash,
            category=file.category,
            location=file.location,
            file_metadata=file.metadata
        )
        db.add(new_file)
    db.commit()
    return {"added": len(files)}


@app.get("/files")
def list_files(device_id: Optional[str] = None, category: Optional[str] = None, keep_status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(File)
    if device_id:
        query = query.filter(File.device_id == device_id)
    if category:
        query = query.filter(File.category == category)
    if keep_status:
        query = query.filter(File.keep_status == keep_status)
    files = query.all()
    return {"files": [{"id": f.id, "filename": f.filename, "path": f.path, "size_bytes": f.size_bytes, "category": f.category, "location": f.location, "keep_status": f.keep_status} for f in files]}


@app.post("/commands")
def create_command(cmd: CommandCreate, db: Session = Depends(get_db)):
    new_cmd = Command(
        device_id=cmd.device_id,
        command_type=cmd.command_type,
        target_files=cmd.target_files
    )
    db.add(new_cmd)
    db.commit()
    db.refresh(new_cmd)
    return {"command_id": new_cmd.id}


@app.get("/commands/pending/{device_id}")
def get_pending_commands(device_id: str, db: Session = Depends(get_db)):
    commands = db.query(Command).filter(
        Command.device_id == device_id,
        Command.status == "pending"
    ).all()
    return {"commands": [{"id": c.id, "command_type": c.command_type, "target_files": c.target_files} for c in commands]}


@app.post("/commands/{command_id}/complete")
def complete_command(command_id: str, success: bool, db: Session = Depends(get_db)):
    cmd = db.query(Command).filter(Command.id == command_id).first()
    if cmd:
        cmd.status = "completed" if success else "failed"
        db.commit()
        return {"status": "updated"}
    return {"status": "command not found"}


@app.patch("/files/{file_id}/keep")
def update_keep_status(file_id: str, keep_status: str, db: Session = Depends(get_db)):
    file = db.query(File).filter(File.id == file_id).first()
    if file:
        file.keep_status = keep_status
        db.commit()
        return {"status": "updated", "keep_status": keep_status}
    return {"status": "file not found"}


@app.get("/search")
def search_files(q: str, db: Session = Depends(get_db)):
    if ":" in q:
        parts = q.split(":", 1)
        search_type = parts[0].lower()
        search_value = parts[1].strip()

        if search_type == "category":
            files = db.query(File).filter(File.category.ilike(f"%{search_value}%")).all()
        elif search_type == "game":
            files = db.query(File).filter(File.category == "Game", File.filename.ilike(f"%{search_value}%")).all()
        elif search_type == "location":
            files = db.query(File).filter(File.location.ilike(f"%{search_value}%")).all()
        else:
            files = db.query(File).filter(File.filename.ilike(f"%{search_value}%")).all()
    else:
        files = db.query(File).filter(
            (File.filename.ilike(f"%{q}%")) | (File.location.ilike(f"%{q}%"))
        ).all()

    return {"files": [{"id": f.id, "filename": f.filename, "path": f.path, "category": f.category, "location": f.location} for f in files]}


@app.get("/search/vision")
def visual_search(description: str, device_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(File).filter(File.category == "Picture")

    if device_id:
        query = query.filter(File.device_id == device_id)

    picture_files = query.all()
    image_paths = [f.path for f in picture_files if os.path.exists(f.path)]

    if not image_paths:
        return {"message": "No images found", "files": []}

    matching_results = search_images_by_description(description, image_paths)

    matched_files = []
    for result in matching_results:
        file = db.query(File).filter(File.path == result["path"]).first()
        if file:
            matched_files.append({
                "id": file.id,
                "filename": file.filename,
                "path": file.path,
                "category": file.category,
                "location": file.location,
                "confidence": result["confidence"]
            })

    return {
        "description": description,
        "total_images_searched": len(image_paths),
        "matches_found": len(matched_files),
        "files": matched_files
    }


@app.get("/files/{file_id}/analyze")
def analyze_file(file_id: str, db: Session = Depends(get_db)):
    file = db.query(File).filter(File.id == file_id).first()

    if not file:
        return {"error": "File not found"}

    if file.category != "Picture":
        return {"error": "Only images can be analyzed"}

    if not os.path.exists(file.path):
        return {"error": "File path does not exist"}

    analysis = analyze_image_content(file.path)

    if file.file_metadata is None:
        file.file_metadata = {}
    file.file_metadata["ai_description"] = analysis
    db.commit()

    return {
        "file_id": file.id,
        "filename": file.filename,
        "analysis": analysis
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
