# Security Threat Model

Current release has no login, persistent storage, billing, file upload, or external AI credentials. That keeps the demo surface small but is not production security. Before customer use, add organization isolation, secure sessions with MFA, rate limits, file scanning, sandboxed solver workers, secret storage, audit logs, data export/deletion, prompt-injection defenses, least-privilege tool permissions, dependency scanning, and human approval for consequential actions.
