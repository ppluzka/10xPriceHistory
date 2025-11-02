# Password Reset Testing Guide

## Quick Testing Steps

### Prerequisites
- Supabase local instance running or cloud connection configured
- Valid SMTP configuration in Supabase
- Application running (e.g., `npm run dev`)

## Test Scenarios

### 1. Happy Path - Complete Flow

**Step 1: Request Password Reset**
1. Navigate to `http://localhost:4321/login`
2. Click "Zapomniałeś hasła?" link
3. You should be on `/forgot-password`
4. Enter a valid registered email
5. Click "Wyślij link resetujący"
6. Verify success message appears
7. Check email inbox

**Expected Results:**
- ✅ Form accepts email
- ✅ Button shows "Wysyłanie..." during request
- ✅ Success message: "Link do zresetowania hasła został wysłany..."
- ✅ Email arrives within 1-2 minutes
- ✅ Form is replaced with success state

**Step 2: Click Reset Link**
1. Open email from Supabase
2. Click the reset password link
3. Should redirect to `/reset-password`
4. Form should be displayed (not error state)

**Expected Results:**
- ✅ Link opens in browser
- ✅ Lands on `/reset-password`
- ✅ Form is enabled and ready for input
- ✅ No "invalid token" error

**Step 3: Set New Password**
1. Enter new password (8+ characters)
2. Enter same password in confirm field
3. Click "Zresetuj hasło"
4. Wait for success message
5. Should auto-redirect to login

**Expected Results:**
- ✅ Password validates (8+ chars)
- ✅ Confirmation validates (must match)
- ✅ Button shows "Resetowanie..." during request
- ✅ Success message: "Hasło zostało zmienione pomyślnie"
- ✅ Auto-redirects after 2 seconds

**Step 4: Login with New Password**
1. Should be on `/login?password_reset=true`
2. Should see green success banner
3. Enter email and new password
4. Click "Zaloguj się"

**Expected Results:**
- ✅ Success banner visible
- ✅ Can login with NEW password
- ✅ OLD password no longer works
- ✅ Redirects to dashboard

---

### 2. Validation Testing

**Email Validation (Forgot Password)**
```
Test Cases:
1. Empty email → "Email jest wymagany"
2. Invalid format (no @) → "Wprowadź prawidłowy adres email"
3. Invalid format (no domain) → "Wprowadź prawidłowy adres email"
4. Valid format → No error
```

**Password Validation (Reset Password)**
```
Test Cases:
1. Empty password → "Hasło jest wymagane"
2. < 8 characters → "Hasło musi mieć minimum 8 znaków"
3. 8+ characters → No error
4. Empty confirm → "Potwierdzenie hasła jest wymagane"
5. Non-matching confirm → "Hasła nie są identyczne"
6. Matching confirm → No error
```

---

### 3. Error State Testing

**Expired Token**
1. Request password reset
2. Wait 61 minutes (or manually expire in Supabase)
3. Click reset link
4. Should show error: "Link wygasł lub jest nieprawidłowy"
5. Should show button: "Wyślij nowy link"

**Invalid Token**
1. Visit `/reset-password` directly (no token)
2. Should show error state
3. Cannot submit form

**Already Used Token**
1. Request reset and complete flow once
2. Try to use same reset link again
3. Should show invalid token error

---

### 4. Security Testing

**Email Enumeration Prevention**
1. Go to `/forgot-password`
2. Enter non-existent email (e.g., `doesnotexist999@test.com`)
3. Submit form
4. Should show SUCCESS message (not "email not found")
5. No email should arrive

**Why?** Prevents attackers from discovering valid emails

**Rate Limiting**
1. Submit forgot password form multiple times rapidly
2. Supabase should eventually rate limit
3. Should see 429 error: "Zbyt wiele prób..."

---

### 5. UI/UX Testing

**Loading States**
- [ ] Forgot password button shows "Wysyłanie..." during request
- [ ] Reset password button shows "Resetowanie..." during request
- [ ] Submit buttons are disabled during loading
- [ ] Form inputs are disabled during loading

**Error Display**
- [ ] Errors shown in red/destructive color
- [ ] Errors appear below relevant input field
- [ ] General errors shown at top of form
- [ ] Error clears when user starts typing

**Success Display**
- [ ] Success messages shown in green
- [ ] Success replaces form (forgot password)
- [ ] Success shown above redirect message (reset)

**Navigation**
- [ ] "Wróć do logowania" link works
- [ ] All pages use consistent AuthLayout
- [ ] Logo/branding consistent

---

### 6. Accessibility Testing

**Keyboard Navigation**
```
Test Flow:
1. Tab through form - focus order should be logical
2. Enter key should submit form (when valid)
3. Escape key should clear errors (if implemented)
4. All interactive elements should be keyboard accessible
```

**Screen Reader Testing**
- [ ] Form labels properly associated with inputs
- [ ] Error messages announced when they appear
- [ ] Success messages announced
- [ ] Loading states announced

---

### 7. Cross-Browser Testing

**Browsers to Test:**
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] Edge

**Test:**
- Form display and styling
- Email validation
- Password visibility toggle (if implemented)
- Auto-redirect functionality

---

### 8. Mobile Testing

**Responsive Design**
- [ ] Forms display properly on mobile
- [ ] Buttons are touch-friendly
- [ ] Text is readable without zooming
- [ ] Cards/layouts adapt to screen size

**Mobile-Specific**
- [ ] Email keyboard opens for email input
- [ ] Password keyboard appropriate
- [ ] No horizontal scrolling
- [ ] Success messages fully visible

---

## Common Issues and Fixes

### Issue: Email Not Arriving

**Troubleshooting:**
1. Check Supabase SMTP configuration
2. Check spam folder
3. Verify email in Supabase Auth users table
4. Check Supabase logs in dashboard
5. In local dev, use "Auto Confirm" to bypass email

**Fix for Local Dev:**
```
Supabase Dashboard → Authentication → Settings
Enable "Confirm Email" = OFF
```

### Issue: Invalid Token Error

**Possible Causes:**
1. Token expired (> 60 minutes old)
2. Token already used
3. Session not properly set
4. Cookie not being sent

**Debugging:**
```javascript
// Add to reset-password.astro to debug
console.log("Session:", session);
console.log("Token valid:", isTokenValid);
```

### Issue: Redirect URLs Not Working

**Fix:**
```
Supabase Dashboard → Authentication → URL Configuration
Add to Redirect URLs:
- http://localhost:4321/reset-password
- http://localhost:*/reset-password
- https://yourdomain.com/reset-password
```

### Issue: "Invalid redirect URL" Error

**Fix:**
Whitelist your domain in Supabase:
```
Supabase Dashboard → Authentication → URL Configuration
Site URL: http://localhost:4321 (dev)
Redirect URLs: http://localhost:**/reset-password
```

---

## Automated Testing Ideas

### Unit Tests
```typescript
// Test email validation
describe('ForgotPasswordForm', () => {
  it('validates email format', () => {
    // Test invalid formats
    // Test valid formats
  });
});

// Test password validation
describe('ResetPasswordForm', () => {
  it('requires 8+ character password', () => {
    // Test short passwords
    // Test valid passwords
  });
  
  it('validates password confirmation', () => {
    // Test matching
    // Test non-matching
  });
});
```

### Integration Tests
```typescript
// Test API endpoints
describe('POST /api/auth/forgot-password', () => {
  it('sends reset email for valid email', async () => {
    // Mock Supabase
    // Test response
  });
  
  it('returns success for non-existent email', async () => {
    // Verify no email enumeration
  });
});

describe('POST /api/auth/reset-password', () => {
  it('updates password with valid token', async () => {
    // Mock session
    // Test password update
  });
  
  it('rejects invalid token', async () => {
    // Test without session
  });
});
```

### E2E Tests (Playwright/Cypress)
```typescript
test('complete password reset flow', async ({ page }) => {
  // 1. Go to forgot password
  await page.goto('/forgot-password');
  
  // 2. Submit email
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  
  // 3. Verify success message
  await expect(page.locator('text=Link do zresetowania')).toBeVisible();
  
  // 4. Would need to mock email/token for rest of flow
});
```

---

## Performance Testing

### Response Times
- Forgot password API: < 2 seconds
- Reset password API: < 2 seconds
- Page loads: < 1 second

### Load Testing
Test multiple concurrent password reset requests:
```bash
# Using Apache Bench
ab -n 100 -c 10 -p email.json -T application/json \
  http://localhost:4321/api/auth/forgot-password
```

---

## Security Audit Checklist

- [ ] Passwords never logged or exposed
- [ ] Reset tokens are one-time use
- [ ] Tokens expire appropriately (60 min)
- [ ] No email enumeration possible
- [ ] Rate limiting prevents abuse
- [ ] HTTPS enforced in production
- [ ] Secure cookies (httpOnly, secure, sameSite)
- [ ] CSRF protection (Astro default)
- [ ] Input validation on client and server
- [ ] SQL injection not possible (using ORM)
- [ ] XSS not possible (React escapes by default)

---

## Test User Setup

### Create Test Users
```sql
-- In Supabase SQL Editor
-- User 1: Normal user
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('test1@example.com', crypt('OldPassword123', gen_salt('bf')), now());

-- User 2: Unconfirmed email
INSERT INTO auth.users (email, encrypted_password)
VALUES ('test2@example.com', crypt('Password123', gen_salt('bf')));
```

### Or Use Registration Flow
1. Go to `/register`
2. Register new account
3. Confirm email
4. Use for testing

---

## Sign-Off Checklist

Before considering password reset feature complete:

**Functionality**
- [ ] Can request password reset
- [ ] Email arrives with valid link
- [ ] Can set new password
- [ ] Old password stops working
- [ ] New password works for login

**User Experience**
- [ ] Clear instructions at each step
- [ ] Helpful error messages
- [ ] Loading states shown
- [ ] Success feedback clear
- [ ] Mobile-friendly

**Security**
- [ ] No email enumeration
- [ ] Tokens expire properly
- [ ] Rate limiting works
- [ ] All validation in place

**Code Quality**
- [ ] No linter errors
- [ ] Type-safe (TypeScript)
- [ ] Comments where needed
- [ ] Follows project structure

**Documentation**
- [ ] Implementation documented
- [ ] Testing guide created
- [ ] Error messages catalogued
- [ ] Security notes included

---

## Quick Manual Test Script

Copy and run through this:

```
✅ /forgot-password loads
✅ Enter test@example.com
✅ Submit → success message
✅ Check email (or Supabase logs)
✅ Click reset link
✅ /reset-password loads
✅ Enter "NewPass123" twice
✅ Submit → success
✅ Auto-redirect to /login
✅ See success banner
✅ Login with new password
✅ Access /dashboard
✅ DONE!
```

**Time Required:** ~5 minutes (with SMTP configured)

---

**Last Updated:** November 2, 2025  
**Version:** 1.0  
**Status:** Ready for Testing

