# AI service for context summarization and fix drafting
# Uses Google Gemini for incident analysis

import os
from typing import Dict, Any
from app.models.schemas import CodingContextSummary, IncidentDetail

# Import Google Gemini
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None

class AIService:
    """Handles all LLM interactions for the incident response platform"""

    def __init__(self):
        # Force use of Gemini (Anthropic models having issues)
        gemini_key = os.getenv("GEMINI_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")

        if gemini_key and GEMINI_AVAILABLE:
            self.use_mock = False
            self.use_anthropic = False
            genai.configure(api_key=gemini_key)
            self.model = genai.GenerativeModel('gemini-flash-latest')
            self.client = self.model
            print("AI Service: Using Google Gemini (gemini-flash-latest)")
        elif anthropic_key:
            self.use_mock = False
            self.use_anthropic = True
            try:
                from anthropic import Anthropic
                self.client = Anthropic(api_key=anthropic_key)
                print("AI Service: Using Anthropic Claude")
            except (ImportError, Exception) as e:
                print(f"Warning: Anthropic initialization failed ({e}), using mock responses")
                self.use_mock = True
                self.use_anthropic = False
        else:
            print("Warning: No API keys found or libraries missing, using mock AI responses")
            self.use_mock = True
            self.use_anthropic = False

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

        import json

        if self.use_anthropic:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            content = response.content[0].text
        else:
            response = self.model.generate_content(prompt)
            content = response.text

        try:
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = content[json_start:json_end]
                data = json.loads(json_str)
            else:
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
        Uses Gemini AI for intelligent analysis.
        Returns: Dict with analysis, probable_cause, proposed_fix, and patch_notes
        """
        print(f"[AI SERVICE] Using {'Mock' if self.use_mock else ('Anthropic' if self.use_anthropic else 'Gemini')} for fix analysis")
        print(f"[AI SERVICE] Incident: {incident.title}")
        print(f"[AI SERVICE] Context summary: {context.summary[:100]}...")
        print(f"[AI SERVICE] Decisions: {context.decisions}")
        print(f"[AI SERVICE] Assumptions: {context.assumptions}")

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

        import json

        if self.use_anthropic:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            content = response.content[0].text
        else:
            response = self.model.generate_content(prompt)
            content = response.text

        try:
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = content[json_start:json_end]
                return json.loads(json_str)
            else:
                return json.loads(content)
        except Exception:
            return {
                "analysis": content,
                "probable_cause": "Unable to parse structured response",
                "proposed_fix": "See analysis above",
                "patch_notes": "AI-generated analysis available in raw format"
            }


ai_service = AIService()
