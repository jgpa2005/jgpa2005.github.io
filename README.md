# Slip (website)

Phone-friendly expense tracker. Open in Safari → **Share → Add to Home Screen**.

## Why Home Screen sometimes looks “stuck”

iPhone Home Screen shortcuts can keep an old copy of the website.

Also important:

- Your transactions are saved **on the phone** for that exact web address
- If the Slip link changes (temporary tunnel URL), or you delete the Home Screen icon, iOS may start a **new empty** Slip
- **Do not delete** the Home Screen icon just to get updates

## How Slip handles updates now

1. Versioned files (`app.js?v=…`, `styles.css?v=…`)
2. Service worker keeps the current version until you choose to update
3. An **Update** banner when a newer Slip is ready — tap **Update** to apply it
4. **Export backup / Import backup** so you never lose transactions

## Safe update habit

1. Open Slip from Home Screen  
2. If you see **Update**, tap it when you want the new version  
3. Periodically tap **Export backup** (Files / Downloads)

## Permanent address

**Live site:** https://jgpa2005.github.io/

Source/repo: https://github.com/jgpa2005/jgpa2005.github.io

Home Screen + your data stay stable on that fixed URL. Use **Export backup** before switching from any temporary link, then **Import backup** on the permanent site.
