# Temporary pairing preview for PR #325

Source: codex/pairing-group-reporting at f505500 (instructor-controlled closure and manual inclusion).
URLs:
- /inspiration/pairing-preview-325/pairing.html (participant entry; individual questionnaire URL/QR created per activity)
- /inspiration/pairing-preview-325/admin.html?view=manage
- /inspiration/pairing-preview-325/admin.html?view=groups

Preview-only adjustments: parent-relative asset paths, noindex metadata, and cache-version query strings for updated assets and invitation/waiting URLs. No preview banner in the normal UI.
Existing /inspiration/ service-worker exclusion covers this directory; no service-worker/security/hosting settings changed.
Uses the already-deployed Dashboard pairing-groups backend (version 2) and unchanged dashboard SSO.
Use synthetic data and prefix test school names with [בדיקה] so the existing mailer marks the subject as a test.
Remove this whole directory only after owner approval, final PR merge and production verification.
Do not merge PR #325 until the owner approves the preview, real SSO and the one live test email.

Final three-fix review (PR head f534b9b): max-width 1000px and sent-status wording updated in the preview only. report-format-sample.pdf is a synthetic example of the new two-column PDF layout. Live pairing-groups remains version 2: automatic approval review rejected the production function replacement pending explicit deployment authorization, even after restricting its diff to pdf.mjs only. No cached report is regenerated and no storage/delivery workflow is changed. The sample is not an actual sent report.
