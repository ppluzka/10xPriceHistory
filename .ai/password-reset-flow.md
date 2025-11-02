# Password Reset Flow Diagram

## Visual Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PASSWORD RESET FLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│ User visits │
│  /login     │
└──────┬──────┘
       │
       │ Clicks "Zapomniałeś hasła?"
       ▼
┌──────────────────┐
│ /forgot-password │◄─────── Already logged in?
└────────┬─────────┘         Redirect to /dashboard
         │
         │ Enters email
         │ Clicks "Wyślij link resetujący"
         ▼
┌─────────────────────────────┐
│ POST /api/auth/             │
│      forgot-password        │
│                             │
│ 1. Validate email (Zod)     │
│ 2. Call Supabase            │
│    resetPasswordForEmail()  │
│ 3. Return success (always)  │
└────────┬────────────────────┘
         │
         ├─────────────────┬───────────────┐
         │                 │               │
         ▼                 ▼               ▼
    Email exists      Email not found  Invalid format
         │                 │               │
         │                 │               │
         ▼                 ▼               ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ Supabase │    │ Supabase │    │  Return  │
   │  sends   │    │  does    │    │  400 Bad │
   │  email   │    │  nothing │    │  Request │
   └────┬─────┘    └────┬─────┘    └─────┬────┘
        │               │                 │
        └───────┬───────┘                 │
                │                         │
                ▼                         ▼
        ┌──────────────┐          ┌─────────────┐
        │ Show success │          │ Show error  │
        │   message    │          │   message   │
        └──────┬───────┘          └─────────────┘
               │
               │ User checks email
               ▼
        ┌──────────────────────────────────┐
        │ Email from Supabase              │
        │                                  │
        │ Subject: Reset Your Password     │
        │                                  │
        │ Link:                            │
        │ https://app.com/reset-password   │
        │   ?token_hash=xxx                │
        │   &type=recovery                 │
        └──────────────┬───────────────────┘
                       │
                       │ User clicks link
                       ▼
        ┌────────────────────────────────┐
        │ Supabase validates token       │
        │ Creates session with user      │
        │ Sets auth cookies              │
        └──────────────┬─────────────────┘
                       │
                       │ Redirects with session
                       ▼
        ┌────────────────────────────────┐
        │ /reset-password                │
        │                                │
        │ 1. Check session exists        │
        │ 2. Render form if valid        │
        │ 3. Show error if invalid       │
        └──────────┬─────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
   Valid token         Invalid/expired
         │                   │
         │                   │
         ▼                   ▼
   ┌──────────┐       ┌────────────────┐
   │ Show     │       │ Show error:    │
   │ password │       │ "Link wygasł"  │
   │ form     │       │                │
   │          │       │ Button: "Wyślij│
   │ Password │       │  nowy link"    │
   │ Confirm  │       └────────────────┘
   └────┬─────┘
        │
        │ User enters passwords
        │ Clicks "Zresetuj hasło"
        ▼
┌─────────────────────────────┐
│ POST /api/auth/             │
│      reset-password         │
│                             │
│ 1. Validate input (Zod)     │
│ 2. Check session exists     │
│ 3. Call Supabase            │
│    updateUser({ password }) │
│ 4. Return success           │
└────────┬────────────────────┘
         │
         ├──────────────┬──────────────┬─────────────┐
         │              │              │             │
         ▼              ▼              ▼             ▼
    Success       No session      Weak pwd     Validation
         │              │              │         error
         │              │              │             │
         ▼              ▼              ▼             ▼
   ┌─────────┐    ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ Return  │    │ Return  │   │ Return  │   │ Return  │
   │   200   │    │   401   │   │   422   │   │   400   │
   │ Success │    │Unauth.  │   │Weak pwd │   │Bad req. │
   └────┬────┘    └────┬────┘   └────┬────┘   └────┬────┘
        │              │              │             │
        └──────┬───────┴──────┬───────┴─────────────┘
               │              │
         Success?             Error?
               │              │
               ▼              ▼
        ┌─────────────┐  ┌──────────────┐
        │ Show success│  │ Show error   │
        │   message   │  │   message    │
        │             │  └──────────────┘
        │ Wait 2 sec  │
        └──────┬──────┘
               │
               │ Auto-redirect
               ▼
        ┌─────────────────────────┐
        │ /login?password_reset=  │
        │        true             │
        │                         │
        │ Shows green banner:     │
        │ "✓ Hasło zostało        │
        │    zmienione"           │
        └───────┬─────────────────┘
                │
                │ User logs in with new password
                ▼
        ┌─────────────────┐
        │ POST /api/auth/ │
        │      login      │
        └────────┬────────┘
                 │
                 │ Success
                 ▼
        ┌─────────────────┐
        │   /dashboard    │
        │                 │
        │ User is now     │
        │ logged in with  │
        │ new password    │
        └─────────────────┘

```

## Component Interaction Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                       FRONTEND LAYER                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────┐         ┌─────────────────────┐     │
│  │ forgot-password     │         │ reset-password      │     │
│  │      .astro         │         │      .astro         │     │
│  │                     │         │                     │     │
│  │ - Check if logged   │         │ - Validate token    │     │
│  │ - Render layout     │         │ - Check session     │     │
│  │ - Load React form   │         │ - Load React form   │     │
│  └──────┬──────────────┘         └──────┬──────────────┘     │
│         │                               │                     │
│         │ client:load                   │ client:load         │
│         ▼                               ▼                     │
│  ┌──────────────────────┐      ┌──────────────────────┐     │
│  │ ForgotPasswordForm   │      │ ResetPasswordForm    │     │
│  │     (React)          │      │     (React)          │     │
│  │                      │      │                      │     │
│  │ - Email input        │      │ - Password inputs    │     │
│  │ - Validation         │      │ - Validation         │     │
│  │ - Submit handler     │      │ - Submit handler     │     │
│  │ - Success/Error UI   │      │ - Success/Error UI   │     │
│  └──────┬───────────────┘      └──────┬───────────────┘     │
│         │                             │                      │
└─────────┼─────────────────────────────┼──────────────────────┘
          │ fetch()                     │ fetch()
          │                             │
┌─────────▼─────────────────────────────▼──────────────────────┐
│                        API LAYER                              │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────┐      ┌────────────────────────┐ │
│  │ /api/auth/             │      │ /api/auth/             │ │
│  │   forgot-password      │      │   reset-password       │ │
│  │                        │      │                        │ │
│  │ 1. Parse request       │      │ 1. Parse request       │ │
│  │ 2. Validate with Zod   │      │ 2. Validate with Zod   │ │
│  │ 3. Create Supabase     │      │ 3. Create Supabase     │ │
│  │    client              │      │    client              │ │
│  │ 4. Call resetPassword  │      │ 4. Check session       │ │
│  │    ForEmail()          │      │ 5. Call updateUser()   │ │
│  │ 5. Return response     │      │ 6. Return response     │ │
│  └────────┬───────────────┘      └────────┬───────────────┘ │
│           │                               │                  │
└───────────┼───────────────────────────────┼──────────────────┘
            │                               │
            │ Supabase SDK                  │ Supabase SDK
            │                               │
┌───────────▼───────────────────────────────▼──────────────────┐
│                    SUPABASE AUTH LAYER                        │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────┐          ┌────────────────────┐     │
│  │ resetPasswordFor   │          │ updateUser()       │     │
│  │ Email()            │          │                    │     │
│  │                    │          │ - Validate session │     │
│  │ 1. Check user      │          │ - Hash new pwd     │     │
│  │    exists          │          │ - Update database  │     │
│  │ 2. Generate token  │          │ - Invalidate old   │     │
│  │ 3. Send email      │          │   tokens           │     │
│  │ 4. Return          │          │ - Return success   │     │
│  └────────┬───────────┘          └────────────────────┘     │
│           │                                                   │
│           │ Email Service                                     │
│           ▼                                                   │
│  ┌────────────────────────────────┐                         │
│  │ Email Template Service         │                         │
│  │                                │                         │
│  │ - Load template                │                         │
│  │ - Insert reset link            │                         │
│  │ - Send via SMTP                │                         │
│  └────────────────────────────────┘                         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## State Machine Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              PASSWORD RESET STATE MACHINE                   │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────┐
                    │  IDLE    │
                    │  (Initial│
                    │   state) │
                    └────┬─────┘
                         │
              User clicks "Zapomniałeś hasła?"
                         │
                         ▼
                ┌────────────────┐
                │ EMAIL_FORM     │
                │   (Showing     │
                │    form)       │
                └────┬───┬───────┘
                     │   │
        User enters  │   │ Invalid email
        valid email  │   │ format
                     │   │
                     ▼   ▼
            ┌──────────────┐  ┌──────────────┐
            │ SUBMITTING   │  │ VALIDATION   │
            │   (Loading)  │  │   ERROR      │
            └──────┬───────┘  └──────────────┘
                   │
          API call │ completes
                   │
         ┌─────────┴─────────┐
         │                   │
    Success                 Error
         │                   │
         ▼                   ▼
┌────────────────┐    ┌─────────────┐
│ EMAIL_SENT     │    │ API_ERROR   │
│   (Success     │    │   (Show     │
│    message)    │    │    error)   │
└────────────────┘    └─────────────┘
         │
         │ User checks email
         │ Clicks link
         ▼
┌────────────────────┐
│ TOKEN_RECEIVED     │
│   (Supabase        │
│    validates)      │
└────────┬───────────┘
         │
         ├────────────┬─────────────┐
         │            │             │
    Valid token   Expired       Invalid
         │            │             │
         ▼            ▼             ▼
┌──────────────┐  ┌──────────┐  ┌──────────┐
│ PASSWORD_    │  │ TOKEN_   │  │ TOKEN_   │
│   FORM       │  │ EXPIRED  │  │ INVALID  │
│   (Ready for │  │          │  │          │
│    input)    │  └──────────┘  └──────────┘
└──────┬───────┘
       │
       │ User enters passwords
       │
       ▼
┌────────────────┐
│ VALIDATING_    │
│   PASSWORDS    │
└──────┬─────────┘
       │
       ├─────────────┬──────────────┐
       │             │              │
  Both valid    Too short      Don't match
       │             │              │
       ▼             ▼              ▼
┌──────────────┐  ┌──────────┐  ┌──────────┐
│ UPDATING_    │  │PASSWORD_ │  │PASSWORD_ │
│  PASSWORD    │  │TOO_SHORT │  │MISMATCH  │
│  (Loading)   │  │          │  │          │
└──────┬───────┘  └──────────┘  └──────────┘
       │
       │ API call completes
       │
       ├─────────────┬─────────────┐
       │             │             │
   Success      Session         Server
                expired         error
       │             │             │
       ▼             ▼             ▼
┌──────────────┐  ┌──────────┐  ┌──────────┐
│ PASSWORD_    │  │ SESSION_ │  │ UPDATE_  │
│   UPDATED    │  │ EXPIRED  │  │ ERROR    │
│  (Success)   │  │          │  │          │
└──────┬───────┘  └──────────┘  └──────────┘
       │
       │ Wait 2 seconds
       │
       ▼
┌────────────────┐
│ REDIRECTING    │
└──────┬─────────┘
       │
       │ Navigate to /login
       │
       ▼
┌────────────────┐
│ COMPLETED      │
│  (Terminal     │
│   state)       │
└────────────────┘
```

## Security Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY CHECKS                          │
└─────────────────────────────────────────────────────────────┘

REQUEST: POST /api/auth/forgot-password
│
├─ ✓ Rate Limiting (Supabase)
│  └─ Max ~100 requests/hour per IP
│
├─ ✓ Input Validation (Zod)
│  ├─ Email format check
│  └─ Max length check (255 chars)
│
├─ ✓ Email Enumeration Prevention
│  └─ Always return success (even if email doesn't exist)
│
└─ ✓ CSRF Protection (Astro default)


REQUEST: Click reset link from email
│
├─ ✓ Token Validation (Supabase)
│  ├─ Token exists in database
│  ├─ Token not expired (< 60 min)
│  └─ Token not already used
│
├─ ✓ Session Creation (Supabase)
│  ├─ Generate new JWT
│  ├─ Set secure cookies
│  └─ Associate with user
│
└─ ✓ Redirect URL Validation
   └─ URL must be whitelisted in Supabase


REQUEST: POST /api/auth/reset-password
│
├─ ✓ Session Validation
│  ├─ Session cookie exists
│  ├─ JWT is valid
│  ├─ User exists
│  └─ Session not expired
│
├─ ✓ Input Validation (Zod)
│  ├─ Password min length (8 chars)
│  ├─ Password max length (72 chars)
│  └─ Password format check
│
├─ ✓ Password Strength (Supabase)
│  └─ Additional strength checks
│
├─ ✓ Password Hashing (Supabase)
│  └─ bcrypt with salt
│
└─ ✓ Session Invalidation
   └─ Old tokens invalidated after password change
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR SCENARIOS                          │
└─────────────────────────────────────────────────────────────┘

Forgot Password Errors:
│
├─ Invalid Email Format
│  └─ Client: "Wprowadź prawidłowy adres email"
│  └─ Status: Prevented before API call
│
├─ Network Error
│  └─ Client: "Wystąpił błąd połączenia"
│  └─ Status: Caught in try/catch
│
├─ Rate Limit
│  └─ Client: "Zbyt wiele prób"
│  └─ Status: 429 from Supabase
│
└─ Server Error
   └─ Client: "Wystąpił błąd serwera"
   └─ Status: 500 from API


Reset Password Errors:
│
├─ Invalid Token
│  ├─ Cause: Token expired (> 60 min)
│  ├─ Cause: Token already used
│  └─ UI: Show error state with "Wyślij nowy link" button
│
├─ No Session
│  ├─ Cause: User opened URL without clicking email link
│  ├─ Response: 401 Unauthorized
│  └─ UI: Show invalid token error
│
├─ Password Too Short
│  └─ Client: "Hasło musi mieć minimum 8 znaków"
│  └─ Status: Prevented before API call
│
├─ Passwords Don't Match
│  └─ Client: "Hasła nie są identyczne"
│  └─ Status: Prevented before API call
│
├─ Weak Password
│  ├─ Response: 422 from Supabase
│  └─ Client: "Hasło jest zbyt słabe"
│
└─ Server Error
   ├─ Response: 500 from API
   └─ Client: "Wystąpił błąd serwera"
```

---

**Diagram Version**: 1.0  
**Last Updated**: November 2, 2025  
**Format**: ASCII/Text diagrams for easy viewing in any editor

