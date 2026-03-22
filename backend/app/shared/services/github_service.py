# GitHub API service for creating fix PRs
# Connects to GitHub REST API for branch/PR creation
# Requires GITHUB_TOKEN with repo write permissions in environment

import os
import httpx
from typing import Dict, List, Optional
import base64
from datetime import datetime

class GitHubService:
    """Handles GitHub API write operations for automated fix PRs"""

    def __init__(self):
        self.token = os.getenv("GITHUB_TOKEN")
        self.base_url = "https://api.github.com"

        if not self.token:
            print("WARNING: GITHUB_TOKEN not set - PR creation will fail")
            self.token = None

        self.headers = {
            "Authorization": f"Bearer {self.token}" if self.token else "",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }

    async def create_fix_pr(
        self,
        repo: str,  # e.g., "SynAeri/Testah"
        branch_name: str,
        base_branch: str,
        title: str,
        body: str,
        files_to_change: Dict[str, str],  # {filepath: new_content}
        reviewers: Optional[List[str]] = None
    ) -> Dict:
        """
        Creates a new branch, commits file changes, and opens a PR.

        Args:
            repo: GitHub repository in format "owner/repo"
            branch_name: Name for new branch (e.g., "fix/incident-123")
            base_branch: Base branch to branch from (usually "main")
            title: PR title
            body: PR description
            files_to_change: Dictionary of filepath -> content
            reviewers: List of GitHub usernames to request review from

        Returns:
            Dict with pr_number, pr_url, branch_name

        Raises:
            Exception: If PR creation fails
        """
        if not self.token:
            raise Exception("GITHUB_TOKEN not configured")

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # 1. Get base branch SHA
                print(f"[GitHub] Getting {base_branch} branch SHA for {repo}")
                base_sha = await self._get_branch_sha(client, repo, base_branch)
                print(f"[GitHub] Base SHA: {base_sha[:8]}...")

                # 2. Create new branch
                print(f"[GitHub] Creating branch: {branch_name}")
                await self._create_branch(client, repo, branch_name, base_sha)

                # 3. Commit file changes
                for filepath, content in files_to_change.items():
                    print(f"[GitHub] Committing: {filepath}")
                    await self._update_file(
                        client, repo, branch_name, filepath, content,
                        f"Fix: Update {filepath}"
                    )

                # 4. Create pull request
                print(f"[GitHub] Creating PR: {title}")
                pr_data = await self._create_pull_request(
                    client, repo, branch_name, base_branch, title, body
                )

                # 5. Request reviewers (optional)
                if reviewers:
                    print(f"[GitHub] Requesting review from: {', '.join(reviewers)}")
                    try:
                        await self._request_reviewers(
                            client, repo, pr_data["number"], reviewers
                        )
                    except Exception as e:
                        print(f"[GitHub] Warning: Failed to assign reviewers: {e}")

                print(f"[GitHub] ✅ PR #{pr_data['number']} created successfully")
                return {
                    "pr_number": pr_data["number"],
                    "pr_url": pr_data["html_url"],
                    "branch_name": branch_name
                }

            except httpx.HTTPStatusError as e:
                error_msg = f"GitHub API error: {e.response.status_code} - {e.response.text}"
                print(f"[GitHub] ❌ {error_msg}")
                raise Exception(error_msg)
            except Exception as e:
                print(f"[GitHub] ❌ Unexpected error: {e}")
                raise

    async def _get_branch_sha(self, client: httpx.AsyncClient, repo: str, branch: str) -> str:
        """Get the SHA of a branch"""
        response = await client.get(
            f"{self.base_url}/repos/{repo}/git/ref/heads/{branch}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()["object"]["sha"]

    async def _create_branch(
        self, client: httpx.AsyncClient, repo: str, branch_name: str, sha: str
    ):
        """Create a new branch from a commit SHA"""
        response = await client.post(
            f"{self.base_url}/repos/{repo}/git/refs",
            headers=self.headers,
            json={
                "ref": f"refs/heads/{branch_name}",
                "sha": sha
            }
        )
        response.raise_for_status()

    async def _update_file(
        self,
        client: httpx.AsyncClient,
        repo: str,
        branch: str,
        filepath: str,
        content: str,
        commit_message: str
    ):
        """Update or create a file in a branch"""
        # Get current file SHA (if exists)
        try:
            get_response = await client.get(
                f"{self.base_url}/repos/{repo}/contents/{filepath}",
                headers=self.headers,
                params={"ref": branch}
            )
            current_sha = get_response.json()["sha"] if get_response.status_code == 200 else None
        except:
            current_sha = None

        # Update or create file
        encoded_content = base64.b64encode(content.encode()).decode()

        payload = {
            "message": commit_message,
            "content": encoded_content,
            "branch": branch
        }

        if current_sha:
            payload["sha"] = current_sha

        response = await client.put(
            f"{self.base_url}/repos/{repo}/contents/{filepath}",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()

    async def _create_pull_request(
        self,
        client: httpx.AsyncClient,
        repo: str,
        head: str,
        base: str,
        title: str,
        body: str
    ) -> Dict:
        """Create a pull request"""
        response = await client.post(
            f"{self.base_url}/repos/{repo}/pulls",
            headers=self.headers,
            json={
                "title": title,
                "head": head,
                "base": base,
                "body": body,
                "draft": False  # Set to True for draft PRs
            }
        )
        response.raise_for_status()
        return response.json()

    async def _request_reviewers(
        self,
        client: httpx.AsyncClient,
        repo: str,
        pr_number: int,
        reviewers: List[str]
    ):
        """Request reviewers for a PR"""
        response = await client.post(
            f"{self.base_url}/repos/{repo}/pulls/{pr_number}/requested_reviewers",
            headers=self.headers,
            json={"reviewers": reviewers}
        )
        response.raise_for_status()

# Singleton instance
github_service = GitHubService()
