# AI service for context summarization and fix drafting
# Uses Anthropic Claude API to process coding transcripts and generate incident fixes

import os
from typing import Dict, Any
from anthropic import Anthropic
from app.models.schemas import CodingContextSummary, IncidentDetail

class AIService:
    """Handles all LLM interactions for the incident response platform"""

    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        self.use_mock = not api_key
        if not self.use_mock:
            self.client = Anthropic(api_key=api_key)
            self.model = "claude-3-5-sonnet-20241022"

    def summarize_coding_transcript(self, transcript: str) -> CodingContextSummary:
        """
        Takes a Claude coding session transcript and extracts structured context.
        Returns: CodingContextSummary with decisions, assumptions, files changed, etc.
        """
        if self.use_mock:
            return CodingContextSummary(
                summary=f"Mock summary of transcript: {transcript[:100]}...",
                decisions=["Decision 1 (mock)", "Decision 2 (mock)"],
                assumptions=["Assumption 1 (mock)", "Assumption 2 (mock)"],
                files_changed=["file1.py", "file2.py"],
                intended_outcome="Mock intended outcome"
            )

        prompt = f"""You are analyzing a coding session transcript. Extract and structure the following information:

1. A brief summary of what was accomplished
2. Key decisions made during the session
3. Assumptions that were made
4. Files that were changed
5. The intended outcome

Transcript:
{transcript}

Respond in JSON format with these exact keys:
{{
    "summary": "brief summary",
    "decisions": ["decision 1", "decision 2"],
    "assumptions": ["assumption 1", "assumption 2"],
    "files_changed": ["file1.py", "file2.py"],
    "intended_outcome": "what was intended"
}}
"""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )

        import json
        content = response.content[0].text

        try:
            data = json.loads(content)
            return CodingContextSummary(**data)
        except Exception as e:
            return CodingContextSummary(
                summary=content,
                decisions=[],
                assumptions=[],
                files_changed=[],
                intended_outcome="Failed to parse structured output"
            )

    def draft_fix_for_incident(
        self,
        incident: IncidentDetail,
        context: CodingContextSummary
    ) -> Dict[str, Any]:
        """
        Analyzes an incident with coding context and drafts a probable fix.
        Returns: Dict with analysis, probable_cause, proposed_fix, and patch_notes
        """
        if self.use_mock:
            return {
                "analysis": f"Mock analysis: The incident '{incident.title}' appears to be related to assumptions made in {context.summary}. The timeout configuration may be too aggressive.",
                "probable_cause": "Webhook timeout assumption of 5 seconds is too short for production load",
                "proposed_fix": "Increase timeout to 30 seconds and add retry logic with exponential backoff",
                "patch_notes": "Adjusted payment webhook timeout configuration based on production patterns"
            }

        prompt = f"""You are helping debug a production incident. You have access to the coding context that led to this deployment.

INCIDENT:
- Title: {incident.title}
- Symptoms: {incident.symptoms}
- Service: {incident.impacted_service}
- Severity: {incident.severity}

CODING CONTEXT FROM AI SESSION:
- Summary: {context.summary}
- Decisions made:
{chr(10).join('  - ' + d for d in context.decisions)}
- Assumptions made:
{chr(10).join('  - ' + a for a in context.assumptions)}
- Files changed:
{chr(10).join('  - ' + f for f in context.files_changed)}

TASK:
1. Analyze the incident in light of the coding decisions and assumptions
2. Identify the probable root cause
3. Propose a specific fix
4. Write patch notes for the engineer reviewing this

Respond in JSON format:
{{
    "analysis": "detailed analysis of what went wrong",
    "probable_cause": "one-sentence root cause",
    "proposed_fix": "specific code changes or configuration needed",
    "patch_notes": "summary for PR/review"
}}
"""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )

        import json
        content = response.content[0].text

        try:
            return json.loads(content)
        except Exception:
            return {
                "analysis": content,
                "probable_cause": "Unable to parse structured response",
                "proposed_fix": "See analysis above",
                "patch_notes": "AI-generated analysis available in raw format"
            }


ai_service = AIService()
