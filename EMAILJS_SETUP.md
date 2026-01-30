# EmailJS setup (2 steps)

Forms use **EmailJS** so messages go to **derek.ray.21041@gmail.com**. Service ID is already set. You only need to add your **Template ID** and **Public Key**.

## 1. Create one email template

1. In EmailJS, go to **Email Templates** → **Create New Template**.
2. Set:
   - **To Email:** `derek.ray.21041@gmail.com`
   - **Subject:** `{{subject}}`
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
