# EmailJS setup (2 steps)

Forms use **EmailJS** so messages go to **derek.ray.21041@gmail.com**. Service ID is already set. You only need to add your **Template ID** and **Public Key**.

## 1. Create one email template

1. In EmailJS, go to **Email Templates** → **Create New Template**.
2. Set:
   - **To Email:** `derek.ray.21041@gmail.com`
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

## 4. Connect your email service (required)

In EmailJS, go to **Email Services** and make sure the service (e.g. Gmail) linked to **service_wcr1i89** is **connected** and verified. If it isn’t, emails will fail even with the correct Template ID and Public Key.

---

## Troubleshooting

- **"Email is not set up" alert**  
  You still have `YOUR_TEMPLATE_ID` or `YOUR_PUBLIC_KEY` in **script.js**. Replace both with the real values from the EmailJS dashboard.

- **"Something went wrong" after submitting**  
  - Open the browser **Developer Console** (F12 → Console) and check the red error message.  
  - In EmailJS: confirm the **template variables** match exactly: `{{type}}`, `{{package}}`, `{{from_name}}`, `{{from_email}}`, `{{subject}}`, `{{message}}`.  
  - Confirm the **email service** (e.g. Gmail) for **service_wcr1i89** is connected and working in the EmailJS dashboard.

- **Success modal but no email received**  
  That bug is fixed: the success message now only appears when the send actually succeeds. If you still see it with no email, check your spam folder and the EmailJS dashboard **Email History** to see if the send was attempted or failed.
