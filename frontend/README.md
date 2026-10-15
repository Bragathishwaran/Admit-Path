# AdmitPath — Front-End Website

A modern, responsive college admissions counseling website built **front-end only**
with HTML5, CSS3, **Tailwind CSS**, **Bootstrap 5**, and vanilla JavaScript.
There is no backend: a small localStorage-backed mock API in `assets/js/api.js`
supplies realistic data for every page, dashboard and form.

## Run it

The pages load shared components (`components/*.html`) with `fetch`, so open the
site over HTTP — opening `index.html` directly via `file://` will block the
partials.

```powershell
# Option A — Python (no install)
python -m http.server 5500

# Option B — npx
npm run serve
```

Then browse to http://localhost:5500/.

## Demo login

| Role      | Email                     | Password      |
|-----------|---------------------------|---------------|
| Student   | student@admitpath.test    | Student@123   |

The login page has a one-click "fill demo" button for the student role.

## Pages

Public: `index.html`, `home-2.html`, `about.html`, `services.html`, `pricing.html`,
`counselors.html`, `blog.html`, `blog-details.html`, `contact.html`,
`coming-soon.html`, `maintenance.html`, `404.html`.

Auth: `login.html`, `register.html`, `forgot-password.html`.

App: `student-dashboard.html`, `application-checklist.html`,
`essay-feedback.html`, `meetings.html`.

## Structure

```
frontend/
├─ assets/
│  ├─ css/     variables, style, responsive, dashboard, rtl (+ bootstrap/tailwind stubs)
│  ├─ js/      config, api, validation, theme, rtl, navigation, main + page modules
│  └─ images/  branding, placeholders
├─ components/ header, footer, newsletter, breadcrumb, preloader, modal, toast
├─ pages/      partials-loader.js
└─ *.html
```

## Architecture notes

- **Styling layered last:** Bootstrap 5 (CDN) provides the reset/base, Tailwind
  Play CDN runs with `preflight:false`, and custom CSS in `assets/css/*` applies
  on top. Design tokens live in `variables.css`.
- **Script order:** Bootstrap bundle → `config.js` → `api.js` → `validation.js` →
  `navigation.js` → `main.js` → page module → `pages/partials-loader.js`.
  `theme.js` and `rtl.js` are loaded in `<head>` to avoid a theme flash.
- **Mock API:** all reads/writes go through `AP.api.*`; data persists in
  `localStorage`, so changes survive reloads. Clearing site data reseeds defaults.
- **Validation:** declarative — add `data-validate` (plus `data-match`, `data-ext`,
  `data-maxmb`, `data-msg`) and a sibling `.ap-error-msg` element.
- **Extras:** dark mode, full RTL support, preloader, toasts, modals, reveal-on-scroll.

## Accessibility & SEO

Semantic landmarks, skip link, ARIA on interactive widgets, keyboard-closable
modals, per-page titles/descriptions/canonical + Open Graph tags, plus
`robots.txt` and `sitemap.xml`.

## Note

This is a front-end demo — there is no real authentication, storage or server.
Do not use the demo credentials or mock API in production.
