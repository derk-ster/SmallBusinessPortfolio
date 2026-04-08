# EmailJS setup (2 steps)

Forms use **EmailJS** so messages go to your inbox. The site passes **`to_email`** (see `NOTIFICATION_INBOX` in `script.js`, currently **derek.ray.2104@gmail.com**). Service ID is already set. You only need to add your **Template ID** and **Public Key**, and match the template **To Email** (see below).

## 1. Create one email template

1. In EmailJS, go to **Email Templates** → **Create New Template**.
2. Set:
   - **To Email:** `{{to_email}}` (recommended — matches `NOTIFICATION_INBOX` in `script.js`), **or** a static address such as `derek.ray.2104@gmail.com`
   - **Subject:** `{{subject}}`
   - **Reply To:** `{{from_email}}` — **required** so when you click Reply in Gmail, your reply goes to the client who filled the form (not back to yourself).
   - **Content (Body):** use these variables (copy-paste):

```
Type: {{type}}
Package: {{package}}

Name: {{from_name}}
Email: {{from_email}}

Message:
{{message}}
```

3. Save and copy the **Template ID** (e.g. `template_xxxxx`).

## 2. Get your Public Key

1. In EmailJS go to **Account**.
2. Copy your **Public Key** (e.g. `user_xxxxx`).

## 3. Paste into the site

1. Open **script.js**.
2. Replace `YOUR_TEMPLATE_ID` with your Template ID (keep the quotes).
3. Replace `YOUR_PUBLIC_KEY` with your Public Key (keep the quotes).
4. Save. Contact and Questions forms will then send real emails to your inbox.

## Optional: Pasted images (contact and questions forms)

Visitors can paste screenshots into the message box. The site sends them as template parameters **`pasted_image_1`**, **`pasted_image_2`**, … up to **`pasted_image_5`** (JPEG data URLs, same style as the EmailJS canvas example).

1. In your template, open the **Attachments** tab.
2. For each slot you want to support, add **Variable Attachment**.
3. Set **Parameter name** to `pasted_image_1` (then `pasted_image_2`, etc.). **Filename** can be `pasted-1.jpg`. **Content type** `JPEG` (or leave default if offered).
4. Save. If these are not added, EmailJS may ignore the extra parameters and the images will not arrive as attachments.

## 4. Connect your email service (required)

In EmailJS, go to **Email Services** and make sure the service (e.g. Gmail) linked to **service_ui61fqn** is **connected** and verified. If it isn’t, emails will fail even with the correct Template ID and Public Key.

---

## Troubleshooting

- **"Email is not set up" alert**  
  You still have `YOUR_TEMPLATE_ID` or `YOUR_PUBLIC_KEY` in **script.js**. Replace both with the real values from the EmailJS dashboard.

- **"Something went wrong" after submitting**  
  - Open the browser **Developer Console** (F12 → Console) and check the red error message.  
  - In EmailJS: confirm the **template variables** match: `{{type}}`, `{{package}}`, `{{from_name}}`, `{{from_email}}`, `{{subject}}`, `{{message}}`, and if you use dynamic recipient, **`{{to_email}}`** in the **To Email** field.  
  - Confirm the **email service** (e.g. Gmail) for **service_ui61fqn** is connected and working in the EmailJS dashboard.

- **Success modal but no email received**  
  That bug is fixed: the success message only appears when the send actually succeeds. If you still see it with no email, check spam and EmailJS **Email History**.

- **HTTP 404 — “Account not found”**  
  The **Public Key** in **script.js** is invalid for EmailJS (typo, or you used **Refresh Keys** so the old key died). Copy the **current** Public Key from **Account**, update `EMAILJS_PUBLIC_KEY`, redeploy, hard-refresh. **Account → Security:** turn **off** “Use Private Key” for browser-only sites. Never put the **Private Key** in your site.

- **HTTP 400 — “The service ID not found”**  
  **Public Key** and **Service ID** must be from the **same** logged-in EmailJS account.
