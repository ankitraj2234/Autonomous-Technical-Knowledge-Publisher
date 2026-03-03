Step-up authentication resolves the tension between frictionless d security boundaries by deferring high-assurance verification until the moment of critical action rather than demanding it at session inception. Unlike static MFicies that rigidly e biometric or hardware-key validation at step-up flows leverage the Authentication Context Class Reference (ACR) framework to dynamically elevate assurance levels based on resource sensitivity, behavioral anomalies, or transaction risk scores.

The pattern hinges on maintaining dual-state session semantics: your baseline session operates under standard assurance (acr: "0" or "1"), but accessing protected resources—financial transfers, API key regeneration, or cross-organizational data—requires transient elevation to a higher ACR value. When the Resource Server detects insufficient assurance in the access token's `acr` claim, it triggers a 403 with `insufficient_user_authentication` per RFC 6750, directing the client to the Identity Provider's step-up endpoint with a binding nonce.

Implementation requires cryptographic binding between the existing session and the elevation challenge to prevent session fixation attacks. Generate an elevation token containing the current session ID hashed with a short-lived nonce, return it to the client, and expect it back alongside fresh high-assurance credentials. The IDP validates the binding, issues a new access token with elevated `acr` and `amr` (Authentication Methods Reference) claims—typically appending "hwk" for hardware keys or "bio" for biometrics—and sets a narrow time-to-live of 5-10 minutes to minimize the theft window.

```javascript
// Elevation token structure (JWT)
{
  "sub": "user_123",
  "sid": "session_abc",
  "nbf": 1700000000,
  "exp": 1700000600, // Strict 10 min max
  "nonce": "crypto_random_32_bytes",
  "target_acr": "https://schemas.company.com/acr/loa3",
  "binding": "sha256(session_abc + nonce + client_secret)"
}
```

Your middleware must implement ACR hierarchy validation rather than binary MFA checks. Parse `acr_values_supported` from your OpenID Provider Metadata to establish ordering—urn:mace:incommon:iap:silver ranks lower than urn:mace:incommon:iap:gold—and reject tokens where the presented ACR is semantically inferior to the resource requirement. Store elevation state server-side alongside the primary session; never rely solely on client-side token claims for high-value operations to prevent replay attacks using stolen elevated tokens.

```python
def require_step_up(required_acr):
    def decorator(func):
        def wrapper(request):
            token = extract_token(request)
            current_acr = token.get("acr")
            auth_time = token.get("auth_time")
            
            # ACR dominance check with freshness requirement
            if not acr_dominates(current_acr, required_acr):
                raise StepUpRequired(required_acr)
            
            # Re-authentication if elevation expired (5 min window)
            if time.now() - auth_time > 300:
                raise SessionStale()
                
            return func(request)
        return wrapper
    return decorator
```

Critical vulnerability: elevation tokens leaking via browser history or referrer headers. Implement single-use elevation codes exchanged for tokens via back-channel POST to prevent credential leakage. Additionally, bind the step-up to the original session's proof-of-possession key if using DPoP (Demonstrating Proof-of-Possession), ensuring the elevated token cannot be used from a different device fingerprint even if exfiltrated.

Monitor for bypass attempts via concurrent session fixation—an attacker spins up a session, tricks the victim into completing step-up, then swaps sessions. Mitigate by attribute-locking elevated sessions: IP subnet continuity, device fingerprint matching, or requiring re-confirmation when detecting session attribute drift. The elevation token must reference the original session's secure binding so that a step-up performed in Session A cannot validate against Session B's context, preventing lateral privilege escalation through session confusion.