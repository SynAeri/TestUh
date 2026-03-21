#!/usr/bin/env python3
# Updates Claude Code MCP configuration to add NEXUS_API_URL environment variable

import json
import os
from pathlib import Path

CLAUDE_CONFIG = Path.home() / ".claude.json"
BACKEND_URL = "https://unflattering-elinor-distinctively.ngrok-free.dev"

def update_config():
    if not CLAUDE_CONFIG.exists():
        print(f"Error: {CLAUDE_CONFIG} not found")
        return False

    # Backup
    backup_path = CLAUDE_CONFIG.with_suffix('.json.bak')
    with open(CLAUDE_CONFIG, 'r') as f:
        content = f.read()
    with open(backup_path, 'w') as f:
        f.write(content)
    print(f"Backup created: {backup_path}")

    # Load config
    config = json.loads(content)

    # Update all projects with nexus MCP server
    updated_count = 0
    for project_key, project_data in config.items():
        if isinstance(project_data, dict) and 'mcpServers' in project_data:
            if 'nexus' in project_data['mcpServers']:
                project_data['mcpServers']['nexus']['env'] = {
                    'NEXUS_API_URL': BACKEND_URL
                }
                updated_count += 1
                print(f"Updated project: {project_key}")

    # Save
    with open(CLAUDE_CONFIG, 'w') as f:
        json.dump(config, f, indent=2)

    print(f"\nUpdated {updated_count} project(s) with NEXUS_API_URL={BACKEND_URL}")
    print("\nIMPORTANT: Restart Claude Code for changes to take effect!")
    return True

if __name__ == "__main__":
    update_config()
