I have identified the cause of the "Certificate creation failed" error.

**Root Cause:**
The server-side validation schema (`insertCertificateSchema`) requires a `userId` field because the database column is mandatory. However, the `POST /api/certificates` endpoint in `server/routes.ts` validates the request body *directly* without injecting the authenticated user's ID first. This causes the validation to fail every time with "Invalid certificate data".

**The Fix:**
I will modify the `POST /api/certificates` handler in `server/routes.ts` to include the `userId` from the session (`req.user.id`) in the data object passed to the validator. This aligns with how other endpoints (like `/api/dictation/test`) already handle this.

**Plan:**
1.  **Update `server/routes.ts`**: Locate the `POST /api/certificates` route (around line 5050) and modify the `safeParse` call to merge `userId: req.user!.id` into the payload.
2.  **Verify**: I will verify that the change compiles and follows the established pattern of other working endpoints.

This is a server-side fix that will immediately resolve the issue for the client without needing frontend changes.