# Supabase Email Templates

This directory contains custom email templates for Supabase Authentication.

## Files

- `confirm-signup.html` - HTML email template for email confirmation
- `confirm-signup.txt` - Plain text fallback version

## How to Use

1. **Navigate to Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to: **Authentication** → **Email Templates** → **Confirm signup**

2. **Copy the HTML Template**
   - Open `confirm-signup.html` in this directory
   - Copy the entire HTML content
   - Paste it into the "Subject" and "Body" fields in Supabase Dashboard

3. **Set the Subject Line**
   - Subject: `Potwierdź swój email - PriceHistory`

4. **Optional: Plain Text Version**
   - Supabase will automatically generate a plain text version, but you can also use `confirm-signup.txt` if needed

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

## Testing

After updating the template in Supabase:
1. Sign up with a test email
2. Check the email in various clients (Gmail, Outlook, Apple Mail)
3. Verify the confirmation link works correctly
4. Test on mobile devices

