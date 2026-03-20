Simple File Manager Backend - Hackathon Ready

No authentication, no complex setup, just works in 2 minutes.

## Features

All your requirements implemented:
- Delete, Keep buttons
- File info (name, size, path, category, location)
- Categories: Game, Picture, Video, Document, Archive, Other
- Location extraction from photos (GPS/EXIF)
- Search: "Sydney" finds all files with Sydney location
- Search: "Game:Fortnite" finds Fortnite in Game category
- Search: "Category:Picture" finds all pictures
- Real-time updates via polling (every 5 seconds)

## Quick Start

```bash
cd backend-simple
pip install -r requirements.txt
python main.py
```

Backend at: http://localhost:8000

Optional: Set GEMINI_API_KEY for AI categorization:
```bash
export GEMINI_API_KEY="your-key-here"
python main.py
```

## API Endpoints

GET /files - List all files (filter by device_id, category, keep_status)
GET /files?category=Picture - Get all pictures
GET /files?keep_status=keep - Get kept files
GET /search?q=Sydney - Search for Sydney
GET /search?q=Game:Fortnite - Search Fortnite in Games
PATCH /files/{id}/keep - Update keep status (keep, delete, unreviewed)
POST /commands - Send delete command to device
POST /devices - Register device
POST /folders - Register folder
POST /files/batch - Upload files

## Search Engine

Uses SQLite built-in text search - no extra software needed.

Search formats:
- "Sydney" - finds files with Sydney in filename or location
- "Game:Fortnite" - finds Fortnite in Game category
- "Category:Picture" - finds all pictures
- "Location:Sydney" - finds files from Sydney

## For Frontend

```javascript
// Get all files
fetch('http://localhost:8000/files')

// Get pictures only
fetch('http://localhost:8000/files?category=Picture')

// Search for Sydney photos
fetch('http://localhost:8000/search?q=Sydney')

// Search for Fortnite game files
fetch('http://localhost:8000/search?q=Game:Fortnite')

// Mark file as keep
fetch('http://localhost:8000/files/{file_id}/keep', {
  method: 'PATCH',
  body: JSON.stringify({keep_status: 'keep'})
})

// Delete files
fetch('http://localhost:8000/commands', {
  method: 'POST',
  body: JSON.stringify({
    device_id: 'xxx',
    command_type: 'delete',
    target_files: ['/path/to/file.jpg']
  })
})
```

## Files Structure

Only 3 files:
- main.py (200 lines) - FastAPI backend
- database.py (80 lines) - SQLite database
- ai_helper.py (60 lines) - Optional Gemini AI

Total: 340 lines of code

## Database Fields

File table:
- id, device_id, folder_id
- path, filename, size_bytes
- file_hash
- keep_status (unreviewed, keep, delete)
- category (Game, Picture, Video, Document, Archive, Other)
- location (GPS coordinates or city name)
- metadata (extra info as JSON)
- created_at

## Category Detection

Automatic based on file extension:
- .jpg/.png = Picture
- .mp4/.avi = Video
- .pdf/.doc = Document
- .zip/.rar = Archive
- Steam/Epic/Game folders = Game

Location Detection:
- Reads GPS EXIF data from photos
- Extracts coordinates
- Optional: Use Gemini to identify landmarks

## What Works Without Gemini

Without API key (100% free):
- File categorization by extension
- GPS location from EXIF
- All search functions
- Delete/Keep actions
- Real-time sync

With Gemini API key (optional):
- Better categorization for unclear files
- Identify landmarks in photos
- Read image content

## Running Everything

Terminal 1:
```bash
cd backend-simple
python main.py
```

Terminal 2:
```bash
cd agent-simple
python agent.py
```

Your files are now synced and searchable.
