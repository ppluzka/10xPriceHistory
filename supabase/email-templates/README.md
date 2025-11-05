# Supabase Email Templates

This directory contains custom email templates for Supabase Authentication.

## Files

- `confirm-signup.html` - HTML email template for email confirmation
- `confirm-signup.txt` - Plain text fallback version
- `reset-password.html` - HTML email template for password reset
- `reset-password.txt` - Plain text fallback version

## How to Use

### Email Confirmation Template

1. **Navigate to Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to: **Authentication** → **Email Templates** → **Confirm signup**

2. **Copy the HTML Template**
   - Open `confirm-signup.html` in this directory
   - Copy the entire HTML content
   - Paste it into the "Body" field in Supabase Dashboard

3. **Set the Subject Line**
   - Subject: `Potwierdź swój email - PriceHistory`

4. **Optional: Plain Text Version**
   - Supabase will automatically generate a plain text version, but you can also use `confirm-signup.txt` if needed

### Password Reset Template

1. **Navigate to Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to: **Authentication** → **Email Templates** → **Reset password**

2. **Copy the HTML Template**
   - Open `reset-password.html` in this directory
   - Copy the entire HTML content
   - Paste it into the "Body" field in Supabase Dashboard

3. **Set the Subject Line**
   - Subject: `Resetuj hasło - PriceHistory`

4. **Optional: Plain Text Version**
   - Supabase will automatically generate a plain text version, but you can also use `reset-password.txt` if needed

## Template Variables

The template uses Supabase's Go template variables:

- `{{ .ConfirmationURL }}` - The confirmation link URL
- `{{ .SiteURL }}` - Your site URL (configured in Supabase settings)
- `{{ .Email }}` - User's email address (if available in context)

## Design Features

- ✅ Modern, gradient design matching PriceHistory branding
- ✅ Fully responsive (works on mobile and desktop)
- ✅ Accessible with proper contrast ratios
- ✅ Works in all major email clients (including Outlook)
- ✅ Clear call-to-action button
- ✅ Security notice and helpful information
- ✅ Polish language support

## Customization

To customize colors:
- Search for `#667eea` and `#764ba2` (primary gradient colors)
- Replace with your brand colors if needed

To customize text:
- All text is in Polish (`pl` language)
- Update the content as needed for your branding

## Template-Specific Details

### Email Confirmation
- **Expiration**: Link is valid for 24 hours
- **Purpose**: Verify user email address during signup
- **Security**: Low risk - only confirms email ownership

### Password Reset
- **Expiration**: Link is valid for 60 minutes
- **Purpose**: Allow users to reset forgotten passwords
- **Security**: High risk - includes security warnings
- **One-time use**: Token can only be used once

## Testing

### Testing Email Confirmation
1. Sign up with a test email
2. Check the email in various clients (Gmail, Outlook, Apple Mail)
3. Verify the confirmation link works correctly
4. Test on mobile devices

### Testing Password Reset
1. Request password reset from `/forgot-password`
2. Check the email in various clients
3. Verify the reset link redirects to `/reset-password`
4. Test the password reset flow end-to-end
5. Verify the link expires after 60 minutes
6. Verify the link can only be used once

