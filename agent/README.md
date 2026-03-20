Simple Agent - Auto-categorizes and syncs files

Cross-platform Windows/Linux agent that scans folders and extracts metadata.

## What It Does

1. Scans Downloads, Desktop, Pictures, Documents
2. Categorizes each file (Game, Picture, Video, etc)
3. Extracts GPS location from photos
4. Uploads everything to backend
5. Waits for delete/keep commands

## Setup

```bash
cd agent-simple
pip install -r requirements.txt
python agent.py
```

That's it. Agent auto-registers and starts scanning.

## Categorization

Automatic detection:
- .jpg/.png/.gif = Picture
- .mp4/.avi/.mkv = Video
- .pdf/.doc/.txt = Document
- .zip/.rar/.7z = Archive
- Steam/Epic/Game paths = Game
- Everything else = Other

## Location Detection

Reads EXIF GPS data from photos:
- Latitude/Longitude extracted
- Stored in location field
- Searchable from frontend

## Commands Supported

- delete - Permanently deletes files
- keep - Marks as keep (no deletion)

Agent polls every 5 seconds for new commands.

## Monitoring

Agent sends heartbeat every 30 seconds to show it's online.

## Files Scanned

Default folders:
- ~/Downloads
- ~/Desktop
- ~/Pictures
- ~/Documents

Recursively scans all subfolders.
