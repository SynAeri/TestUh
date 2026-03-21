# Nexus — Claude Code Instructions

## MCP Skill: Auto-logging

At the **start of every coding session**, call:
```
nexus_start_session(repo="SynAeri/TestUh", branch="<current git branch>", engineer="anusha")
```

During the session, **whenever you make a significant decision** (architectural choice, implementation approach, library selection, schema design, API contract), call:
```
nexus_log_decision(summary="...", reasoning="...", impact="high|medium|low", files_changed=[...])
```

Examples of decisions worth logging:
- Choosing one approach over another
- Changing a data model or schema
- Adding or removing a dependency
- Deciding how an API endpoint works
- Any trade-off with future implications

At the **end of the session** (or when a PR is opened), call:
```
nexus_end_session(pr_id="<PR number if applicable>")
```

These tools are always available via the Nexus MCP skill. Log decisions even in chat-only sessions if meaningful architectural context is discussed.
