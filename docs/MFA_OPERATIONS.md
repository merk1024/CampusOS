# Administrator MFA operations

## Deployment and enrollment

MFA is opt-in by default. Existing accounts are not automatically enrolled.
Set MFA_ENCRYPTION_KEY on the API server before enrollment: a canonical base64
encoding of exactly 32 cryptographically random bytes. Generate locally with
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
Do not paste this key into chat, Git, frontend environment variables or logs.
Use a distinct key for staging and production; retain it in a secure secret backup.
Missing keys with stored active/pending factors stop API startup, never bypass MFA.

1. Deploy the migration and API/UI together with the key configured.
2. Sign in as owner, open Profile and Two-factor authentication.
3. Reenter the current password; scan the locally generated QR or enter the manual key.
4. Confirm a code; securely save the ten recovery codes shown once.
5. Choose Codes saved: sign in again. Existing sessions have already been revoked.
6. Test sign-in from a second browser and exercise one recovery code.
7. Only after all administrators can enroll, optionally set
   MFA_REQUIRE_ADMIN_ENROLLMENT=true on the server and redeploy.

Enforcement sends unenrolled administrators to restricted enrollment, including
old sessions. Rolling enforcement back to false does not bypass active MFA.
Students/teachers keep their original login. No production setting is activated
automatically by the code or seed.

## Verification and recovery

Login challenges expire after five minutes, allow five failed attempts, and cannot
authenticate API requests. At most ten outstanding challenges per account are
allowed. Codes use six digits and 30-second periods, with one adjacent step of
clock skew. A consumed step cannot be reused; wait for the next code if enrollment
or login just consumed it. Keep server time synchronized.

Recovery requires the password plus one of the 32-character recovery codes.
Each code works once. Profile shows remaining codes; regeneration requires fresh
password and MFA proof, invalidates old codes and revokes all account sessions.

An enrolled superadministrator can use User Management > Reset MFA for ordinary
administrators only, with the superadministrator's own fresh password and MFA
proof. The target's sessions, challenges, factor and codes are revoked. If
enforcement is enabled, the target must re-enroll before getting a full session.
This endpoint cannot reset any superadministrator, including the acting owner.

If an owner loses the authenticator and every recovery code, there is intentionally
no web/email bypass. An authorized database operator must verify owner identity
out-of-band, take a secure backup, and perform a reviewed transactional repair:
increment the owner's session_version and remove only that owner's factor,
recovery codes and challenges. With enforcement enabled the owner then enters
restricted re-enrollment. Record the approval and repair in an independently
protected incident log. No public reset script automates this exceptional process.

## Secret handling and limitations

Secrets are AES-256-GCM encrypted with account-bound associated data. Challenge
and high-entropy recovery codes are SHA-256 hashed. Provisioning data/codes are
transient browser state, not localStorage/sessionStorage; QR rendering is local.
API responses are no-store. Passwords, OTPs, provisioning URIs and code hashes
are excluded from MFA audit records and error responses.

Database backups alone cannot decrypt factors: retain their encryption key in a
separate protected system. Key replacement without re-encryption makes existing
TOTP credentials unusable. Automated encryption-key rotation is not implemented.
The process-level HTTP rate limit is supplemented by persisted challenge/attempt
limits; it is not a distributed denial-of-service control. TOTP is not phishing
resistant and MFA does not replace authorization checks.

Warnings for five MFA failures in ten minutes are a separate Security Center
rule. They are advisory and update on refresh, not background notifications.
