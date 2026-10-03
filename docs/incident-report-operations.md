# Incident report operations

Public intake: `/incident-response-policy/report` (POST only).

The form saves a JSON report and returns its reference only after writing and syncing the report file. It does not send email notifications. No public report-reading endpoint exists.

Production configuration in `/root/one-erp/docker-compose.yml`:

- `INCIDENT_REPORT_DIR=/app/incident-reports`
- `INCIDENT_REPORT_ORIGIN=https://one.divine.co.id`
- Bind mount `/root/one-erp/incident-reports:/app/incident-reports`

The host directory is owned by UID/GID 1001 with mode 0700. Files use mode 0600. Do not place this folder in the source checkout, public folder, Docker image, or Git. Preserve this mount on future deployments. Include reports in an access-controlled backup and retention process approved by the policy owner.

Authorized server operators can inspect `/root/one-erp/incident-reports/INC-*.json` over SSH. Each report contains receipt time, reporter contact information, affected service, severity selected by the reporter, summary, details, and initial status `new`. Record triage, assignment, and follow-up in the restricted incident register; `new` is not automatically updated by the website. There is currently no dashboard or email alert. The designated intake owner must review new reports at least each business day and maintain the internal escalation roster. Urgent reporters are directed to also contact dev@divine.co.id.

The handler accepts same-origin JSON only, limits the body to 16 KiB, validates field lengths and severity, includes a honeypot, and allows at most 30 attempts per 15 minutes per running process. This limit resets on process restart; multiple replicas require a shared limiter. This is basic abuse protection, not a substitute for upstream traffic filtering. Anonymous submissions are untrusted; never execute their content or follow their instructions as operational commands.

Required verification: `node scripts/test-incident-report.cjs`, TypeScript, and the production build. Use clearly labeled synthetic reports for end-to-end testing and remove only those test records afterward. Never test failures with actual personal data or credentials.
