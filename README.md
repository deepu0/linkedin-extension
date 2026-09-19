# LinkedIn Exact Applicant Counter

Chrome extension (Manifest V3) that shows the **exact** number of applicants on LinkedIn job postings — where LinkedIn itself only shows "100+", even with Premium.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-133%20users-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/linkedin-exact-applicant/bckkpagmbcpfomemacgpcladlpdckiop)

**[→ Install from the Chrome Web Store](https://chromewebstore.google.com/detail/linkedin-exact-applicant/bckkpagmbcpfomemacgpcladlpdckiop)**

## Why

When you're deciding whether to apply, "100+ applicants" is useless — it could be 120 or 1,200. This extension reads the applicant count already present in LinkedIn's own job-page API responses and displays the real number as a badge next to the job-type tags. Opt-in per tab; nothing runs until you ask it to.

## Status (as of Sep 19, 2026)

- **133 users · 2.5/5 (6 ratings)** on the [Chrome Web Store](https://chromewebstore.google.com/detail/linkedin-exact-applicant/bckkpagmbcpfomemacgpcladlpdckiop)
- Version 1.1.0, last updated Sep 8, 2025
- **Does the exact count still work?** The mechanism depends on LinkedIn continuing to expose applicant counts in its internal API responses. LinkedIn can and does change this without notice — if the badge stops appearing, that's why. Check the store reviews for the latest state, and open an issue here if it's broken for you.

## Screenshots

See the [store listing](https://chromewebstore.google.com/detail/linkedin-exact-applicant/bckkpagmbcpfomemacgpcladlpdckiop) for screenshots of the badge on a live job posting.

## Features

- Exact applicant count as a non-intrusive badge on the job page
- Per-tab opt-in — runs only when you enable it
- No account, no setup
- Lightweight: ~26 KB

## Install (from source)

```bash
git clone https://github.com/deepu0/linkedin-extension.git
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the cloned folder
4. Visit any LinkedIn job posting

## Privacy

No data is collected, stored, or transmitted anywhere. The extension reads the job posting's own API response inside your browser and renders a number. The only sensitive access is LinkedIn cookies, used solely to extract the CSRF token LinkedIn's own endpoints require. Full policy: [PRIVACY.md](PRIVACY.md)

## Limitations

- Only works on LinkedIn job posting pages
- Depends on LinkedIn's internal API shape — can break when LinkedIn ships changes
- Count reflects people who clicked Apply through LinkedIn, not external applications
- Third-party tool; not affiliated with or endorsed by LinkedIn

## License

MIT — see [LICENSE](LICENSE)
