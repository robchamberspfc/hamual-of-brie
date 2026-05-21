# Design Document: Manual of Me Website

## Overview

The Manual of Me website is a static single-page application (SPA) with no build step. It is delivered as a single `index.html` file that loads a `content.json` configuration file at runtime via `fetch()`. All application logic lives in a single `app.js` file; all styling in `style.css`. Third-party libraries (Marked.js, DOMPurify) are loaded from a CDN or bundled locally as plain `.js` files — no npm, no bundler, no transpilation required.

The visual identity is a **futuristic clockwork** aesthetic: think precision engineering, deep space instrumentation, and mechanical computation — not Victorian steampunk. The palette is dark steel greys, electric blues, and cyan with luminous accent highlights. Animated SVG gears and a pocket-watch dial in the header reinforce the theme without distracting from the content.

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| No build step | Vanilla HTML/CSS/JS | Zero toolchain friction; owner just edits files |
| Markdown library | Marked.js (CDN) | Mature, well-documented, browser-native, ~50 KB |
| Sanitisation | DOMPurify (CDN) | Industry-standard XSS sanitiser, pairs with Marked.js |
| Animations | CSS `@keyframes` only | No JS animation loops; respects `prefers-reduced-motion` trivially |
| Navigation | Sticky sidebar (desktop) / toggle drawer (mobile) | Standard responsive pattern; no JS framework needed |
| Content loading | `fetch('content.json')` on `DOMContentLoaded` | Simple, reliable, works from any static file server |

---

## Architecture

```
manual-of-me/
├── index.html          # Shell: landmark elements, CDN script tags, inline SVG defs
├── style.css           # All layout, theme, animations, responsive rules
├── app.js              # All runtime logic: fetch, validate, render, nav, scroll-spy
└── content.json        # Content_Config: owner info, sections, footer
```

No server-side rendering. No framework. The browser is the runtime.

### Data Flow

```
Browser loads index.html
        │
        ▼
DOMContentLoaded fires
        │
        ▼
app.js: fetch('content.json')
        │
   ┌────┴────┐
   │ error   │ success
   ▼         ▼
showError  validate(config)
           │
      ┌────┴────┐
      │ invalid │ valid
      ▼         ▼
  showError  renderPage(config)
             │
             ├─ renderHeader(config.owner)
             ├─ renderSections(config.sections)   ← Marked.parse() + DOMPurify.sanitize()
             ├─ renderNav(validSections)
             ├─ renderFooter(config.footer)
             └─ initScrollSpy()
```

### Module Responsibilities

| Module | File | Responsibility |
|---|---|---|
| Shell | `index.html` | Landmark skeleton, CDN imports, inline SVG gear/dial definitions, loading state |
| Styles | `style.css` | Layout grid, colour tokens, gear animations, responsive breakpoints, focus styles |
| App | `app.js` | Config fetch, validation, rendering, nav highlight, scroll-spy, mobile toggle |
| Config | `content.json` | All user-editable content; no logic |

---

## Components and Interfaces

### 1. Config Loader

```js
async function loadConfig(url = 'content.json')
  → Promise<Config>          // resolves with parsed+validated Config
  → throws ConfigError       // on fetch failure, JSON parse failure, or schema violation
```

Responsibilities:
- `fetch(url)` with a 5-second `AbortController` timeout
- `response.json()` — if this throws, emit a parse error
- Call `validateConfig(raw)` — if this throws, emit a validation error
- On any failure, call `showError(message)` and stop

### 2. Config Validator

```js
function validateConfig(raw)
  → Config                   // returns cleaned, validated config object
  → throws ValidationError   // on schema violation
```

Rules enforced:
- `raw.owner.name` — non-empty string (required)
- `raw.owner.tagline` — string, truncated to 150 chars if longer
- `raw.footer.attribution` — string (required)
- `raw.sections` — array (required, may be empty after filtering)
- Each section: `title` non-empty string, `slug` non-empty string matching `/^[a-z0-9-]+$/`
- Duplicate slugs → throw `ValidationError`
- Sections with missing/empty `title` are silently filtered out (not an error)
- `icon` field is optional; if present must be a non-empty string

### 3. Renderer

```js
function renderHeader(owner)        // populates <header> with name + tagline + dial SVG
function renderSections(sections)   // creates <section> elements in <main>
function renderNav(sections)        // populates <nav> with anchor links
function renderFooter(footer)       // populates <footer> with attribution
```

Markdown pipeline per section body:

```
raw Markdown string
      │
      ▼
Marked.parse(body, { mangle: false, headerIds: false })
      │
      ▼
DOMPurify.sanitize(html, SANITIZE_CONFIG)
      │
      ▼
element.innerHTML = sanitizedHtml
```

`SANITIZE_CONFIG` (DOMPurify options):
```js
{
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
  FORBID_ATTR: [],           // DOMPurify strips on* attrs by default
  FORCE_BODY: true
}
```

Links produced by Marked.js are post-processed to add `target="_blank" rel="noopener noreferrer"` via a custom Marked renderer override:

```js
const renderer = new marked.Renderer();
renderer.link = (href, title, text) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`;
marked.use({ renderer });
```

### 4. Section Navigation (Section_Nav)

```js
function renderNav(sections)        // builds <ul> of <li><a> links
function initScrollSpy()            // attaches IntersectionObserver
function highlightNavItem(slug)     // toggles aria-current="page" + CSS class
```

Scroll-spy uses `IntersectionObserver` with a `rootMargin` of `-50% 0px -50% 0px` so the section whose top edge is nearest the viewport midpoint is highlighted. Edge cases:
- Above first section → highlight first item
- Below last section → highlight last item

Mobile toggle:

```js
function initMobileNav()
// toggles .nav--open class on <nav>
// toggles aria-expanded on the toggle button
// traps focus within nav when open (Tab cycles within)
```

### 5. Animation Engine

All animation is CSS-only. `app.js` does not drive any animation. The Animation Engine is entirely declarative in `style.css`.

Gear rotation classes:

```css
.gear--slow   { animation: spin 60s linear infinite; }
.gear--medium { animation: spin 24s linear infinite; }
.gear--fast   { animation: spin 8s linear infinite; }
.gear--ccw    { animation: spin-ccw 40s linear infinite; }
```

Section entry transition (applied via JS class toggle on nav click):

```css
.section--entering {
  animation: section-enter 300ms ease-out forwards;
}
@keyframes section-enter {
  from { opacity: 0.4; box-shadow: 0 0 0 0 var(--accent-cyan); }
  to   { opacity: 1;   box-shadow: 0 0 12px 2px var(--accent-cyan); }
}
```

`prefers-reduced-motion` override (single rule, covers everything):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 6. Error Display

```js
function showError(message)
// Inserts a <div role="alert" class="error-banner"> into <main>
// Clears any partial render
// Does NOT throw — terminal state
```

---

## Data Models

### Content_Config (content.json)

```jsonc
{
  "owner": {
    "name": "string (required, non-empty)",
    "tagline": "string (required, max 150 chars)"
  },
  "footer": {
    "attribution": "string (required)"
  },
  "sections": [
    {
      "title":  "string (required, non-empty)",
      "slug":   "string (required, unique, /^[a-z0-9-]+$/)",
      "icon":   "string (optional, non-empty if present)",
      "body":   "string (required, may be empty)"
    }
  ]
}
```

### Default content.json (12 sections)

```json
{
  "owner": {
    "name": "Your Name",
    "tagline": "A guide to working with me"
  },
  "footer": {
    "attribution": "Built with Manual of Me · Edit content.json to make it yours"
  },
  "sections": [
    {
      "title": "Working Hours & Days",
      "slug": "working-hours-days",
      "icon": "⏰",
      "body": "## My typical working hours\n\nReplace this with your actual hours, e.g.:\n\n- **Monday–Friday**: 09:00–17:30\n- I'm usually online by 08:45 and check messages until 18:00\n- I take a proper lunch break 12:30–13:30"
    },
    {
      "title": "Communication Preferences",
      "slug": "communication-preferences",
      "icon": "💬",
      "body": "## How I prefer to communicate\n\nDescribe your preferences here, e.g.:\n\n- **Async first**: I prefer Slack messages over calls for non-urgent topics\n- For complex discussions, a short doc beats a long thread\n- I respond to messages within 4 hours during working hours"
    },
    {
      "title": "Conditions I Like to Work In",
      "slug": "conditions-i-like-to-work-in",
      "icon": "🌿",
      "body": "## My ideal working environment\n\nDescribe what helps you do your best work, e.g.:\n\n- Deep focus blocks in the morning, collaborative work in the afternoon\n- I work best with clear goals and minimal interruptions\n- Background music helps me concentrate"
    },
    {
      "title": "Things I Need",
      "slug": "things-i-need",
      "icon": "🔧",
      "body": "## What I need to do my best work\n\nList what you need from colleagues and the environment, e.g.:\n\n- Clear context when asking me to review something\n- Advance notice for meetings where possible\n- Psychological safety to ask 'dumb' questions"
    },
    {
      "title": "Best Way to Receive Feedback",
      "slug": "best-way-to-receive-feedback",
      "icon": "📣",
      "body": "## How to give me feedback effectively\n\nDescribe your preferences, e.g.:\n\n- Direct and specific is better than vague and gentle\n- Written feedback I can reflect on works better than verbal-only\n- I appreciate feedback as close to the event as possible"
    },
    {
      "title": "Things I Love at Work",
      "slug": "things-i-love-at-work",
      "icon": "❤️",
      "body": "## What energises me at work\n\nShare what you genuinely enjoy, e.g.:\n\n- Solving gnarly technical problems with a small team\n- Mentoring and pair programming\n- Clear documentation and well-named variables"
    },
    {
      "title": "Things I Struggle With",
      "slug": "things-i-struggle-with",
      "icon": "⚡",
      "body": "## My known challenges\n\nBe honest — this builds trust, e.g.:\n\n- Context-switching between many tasks in a single day\n- Ambiguous requirements without a clear definition of done\n- Very long meetings without a clear agenda"
    },
    {
      "title": "What Gets Me Excited Outside of Work",
      "slug": "what-gets-me-excited-outside-of-work",
      "icon": "🚀",
      "body": "## My interests outside work\n\nShare a few things that light you up, e.g.:\n\n- Hiking and wild swimming\n- Reading science fiction\n- Tinkering with home automation projects"
    },
    {
      "title": "Top 5 Films",
      "slug": "top-5-films",
      "icon": "🎬",
      "body": "## My all-time favourite films\n\nReplace with your actual top 5:\n\n1. *2001: A Space Odyssey* (1968)\n2. *Blade Runner* (1982)\n3. *Arrival* (2016)\n4. *The Shawshank Redemption* (1994)\n5. *Spirited Away* (2001)"
    },
    {
      "title": "Favourite Cheese",
      "slug": "favourite-cheese",
      "icon": "🧀",
      "body": "## Cheeses I hold dear\n\nA deeply important section. My current rankings:\n\n- **Cheddar** — the undisputed classic; mature, sharp, reliable\n- Add your other favourites here\n- Brie is acceptable in a sandwich emergency"
    },
    {
      "title": "Any Other Interesting Fact",
      "slug": "any-other-interesting-fact",
      "icon": "💡",
      "body": "## Something you might not know about me\n\nShare a surprising or memorable fact, e.g.:\n\n- I once cycled from London to Paris in three days\n- I can solve a Rubik's cube in under two minutes\n- I have a strong opinion about the correct way to load a dishwasher"
    },
    {
      "title": "Favourite Joke",
      "slug": "favourite-joke",
      "icon": "😄",
      "body": "## My go-to joke\n\nAdd your favourite here. Mine:\n\n> Why do programmers prefer dark mode?\n>\n> Because light attracts bugs."
    }
  ]
}
```

### Internal Section Object (post-validation, in-memory)

```ts
interface Section {
  title: string;       // non-empty, validated
  slug: string;        // unique, /^[a-z0-9-]+$/
  icon?: string;       // optional
  body: string;        // raw Markdown, may be empty
  element?: Element;   // set after renderSections(), used by scroll-spy
}
```

---

## Animation Approach

### Gear SVGs

Gears are inline SVG elements defined in `index.html` using `<symbol>` + `<use>` so the same path is reused at different sizes. Each gear is a `<g>` element with a CSS class that controls its rotation speed and direction.

Example gear symbol (simplified):

```svg
<symbol id="gear-12" viewBox="0 0 100 100">
  <!-- 12-tooth gear path generated from parametric formula -->
  <path d="M50,10 L53,18 ..." fill="currentColor"/>
  <circle cx="50" cy="50" r="8" fill="var(--bg-primary)"/>
</symbol>
```

Placement: two large gears (120–160 px) are positioned `position: fixed` in the bottom-left and top-right corners of the viewport, behind content (`z-index: -1`). A third medium gear (80 px) sits within the header dial assembly.

All gear SVGs carry `aria-hidden="true"` and `focusable="false"`.

### Pocket-Watch Dial

The dial is an inline SVG in the `<header>`:

```svg
<svg class="dial" aria-hidden="true" focusable="false" viewBox="0 0 200 200">
  <!-- Outer ring -->
  <circle cx="100" cy="100" r="95" class="dial__ring"/>
  <!-- 60 tick marks generated by app.js at init -->
  <g class="dial__ticks" id="dial-ticks"></g>
  <!-- Centre point -->
  <circle cx="100" cy="100" r="4" class="dial__centre"/>
  <!-- Decorative inner ring -->
  <circle cx="100" cy="100" r="70" class="dial__inner-ring"/>
</svg>
```

Tick marks (60 total, 12 major) are generated by `app.js` using a simple loop that places `<line>` elements at 6° intervals. This is a one-time DOM write at init, not an animation loop.

### Colour Tokens (CSS custom properties)

```css
:root {
  --bg-primary:      #0d1117;   /* near-black, deep space */
  --bg-secondary:    #161b22;   /* section card background */
  --bg-tertiary:     #21262d;   /* nav background */
  --steel-light:     #8b949e;   /* secondary text */
  --steel-mid:       #484f58;   /* borders, dividers */
  --steel-dark:      #30363d;   /* subtle backgrounds */
  --accent-blue:     #1f6feb;   /* primary interactive */
  --accent-cyan:     #39d0d8;   /* highlights, glow effects */
  --accent-cyan-dim: #1a6b70;   /* muted cyan for borders */
  --text-primary:    #e6edf3;   /* body text — contrast ≥ 4.5:1 on --bg-primary */
  --text-secondary:  #8b949e;   /* secondary text */
  --focus-ring:      #58a6ff;   /* keyboard focus indicator */
  --error-bg:        #3d1a1a;
  --error-border:    #f85149;
  --error-text:      #ffa198;
}
```

Contrast verification:
- `--text-primary` (#e6edf3) on `--bg-primary` (#0d1117): **~14:1** ✓
- `--text-secondary` (#8b949e) on `--bg-primary` (#0d1117): **~5.5:1** ✓
- `--accent-cyan` (#39d0d8) on `--bg-primary` (#0d1117): **~8.2:1** ✓
- `--focus-ring` (#58a6ff) on `--bg-primary` (#0d1117): **~5.9:1** ✓

---

## Page Layout

### Desktop (≥ 768 px)

```
┌─────────────────────────────────────────────────────────┐
│  <header>  [dial SVG]  Name · Tagline                   │
├──────────────┬──────────────────────────────────────────┤
│  <nav>       │  <main>                                  │
│  (sticky)    │  <section> Working Hours                 │
│  · Working   │  <section> Communication                 │
│    Hours     │  <section> ...                           │
│  · Comms     │                                          │
│  · ...       │                                          │
│              │                                          │
├──────────────┴──────────────────────────────────────────┤
│  <footer>  Attribution text                             │
└─────────────────────────────────────────────────────────┘
```

CSS Grid layout:

```css
body {
  display: grid;
  grid-template-rows: auto 1fr auto;   /* header / content / footer */
  grid-template-columns: 240px 1fr;    /* nav / main */
  grid-template-areas:
    "header header"
    "nav    main"
    "footer footer";
  min-height: 100vh;
}
header { grid-area: header; }
nav    { grid-area: nav; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
main   { grid-area: main; }
footer { grid-area: footer; }
```

### Mobile (< 768 px)

```
┌──────────────────────────┐
│  <header>  Name          │
│            [☰ toggle]    │
├──────────────────────────┤
│  <nav> (drawer, hidden)  │
│  [slides in on toggle]   │
├──────────────────────────┤
│  <main>                  │
│  <section> Working Hours │
│  <section> ...           │
├──────────────────────────┤
│  <footer>                │
└──────────────────────────┘
```

```css
@media (max-width: 767px) {
  body {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "nav"
      "main"
      "footer";
  }
  nav {
    position: fixed;
    top: 0; left: 0;
    width: 80vw; max-width: 320px;
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 300ms ease;
    z-index: 100;
  }
  nav.nav--open {
    transform: translateX(0);
  }
}
```

---

## Error Handling

| Failure Mode | Detection Point | User-Visible Response |
|---|---|---|
| `content.json` not found (404) | `fetch()` response status | Error banner: "Could not load content.json — check the file exists." |
| Network timeout / offline | `AbortController` timeout (5 s) | Error banner: "Content could not be loaded — check your connection." |
| Invalid JSON syntax | `response.json()` throws | Error banner: "content.json contains invalid JSON — check the file syntax." |
| Missing `owner.name` | `validateConfig()` | Error banner: "Configuration error: owner.name is required." |
| Duplicate slugs | `validateConfig()` | Error banner: "Configuration error: duplicate slug '[slug]' found." |
| Section with empty title | `validateConfig()` | Section silently skipped; no error shown |
| Markdown parse error | Marked.js (rare) | Construct rendered as escaped plain text (Marked.js default) |
| XSS attempt in body | DOMPurify | Stripped silently; no error shown |
| Content not visible within 3 s | `setTimeout` watchdog | Error banner: "Content is taking too long to load." |

Error banner markup:

```html
<div role="alert" class="error-banner" aria-live="assertive">
  <strong>Error:</strong> <span class="error-banner__message"></span>
</div>
```

The `role="alert"` ensures screen readers announce the error immediately.

---

## Testing Strategy

### PBT Applicability Assessment

This feature is a static website with the following characteristics:
- Content rendering is a **pure transformation**: Markdown string → sanitised HTML string
- Config validation is a **pure function**: raw JSON object → validated Config or error
- Navigation highlight logic is **deterministic**: scroll position → active slug
- Animations are CSS-only (no JS logic to test)
- Layout is CSS-only (snapshot/visual tests, not PBT)

PBT **is** applicable to the Markdown rendering pipeline and config validation logic. It is **not** applicable to CSS layout, animations, or DOM interaction.

### Unit Tests

Focus on concrete examples and edge cases:

- Config validator: valid config passes, missing `owner.name` throws, duplicate slugs throw, empty-title sections are filtered
- Markdown renderer: each element mapping from Requirement 2.1 renders correctly
- Link renderer: links get `target="_blank" rel="noopener noreferrer"`
- XSS sanitisation: `<script>` tags stripped, `onclick` attributes stripped
- Empty body: renders section title only, no body element
- Error display: `showError()` inserts `role="alert"` element

### Property-Based Tests

Using [fast-check](https://github.com/dubzzz/fast-check) (browser-compatible, no build step needed via CDN):

Each property test runs a minimum of **100 iterations**.

Tag format: `Feature: manual-of-me-website, Property N: <property text>`

### Integration / Smoke Tests

- Page loads from a local static server and renders all 12 default sections
- Mobile nav toggle opens and closes correctly
- Keyboard navigation traverses all interactive elements in DOM order
- `prefers-reduced-motion` media query halts all animations

### Accessibility Checks

- Run axe-core against the rendered page
- Manual keyboard-only navigation walkthrough
- Screen reader smoke test (VoiceOver / NVDA)
- Colour contrast verification against token values above


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The following properties are derived from the acceptance criteria. They are suitable for property-based testing because they involve pure functions (config validation, Markdown rendering, scroll-spy logic) where input variation meaningfully exercises edge cases. CSS layout, animations, and DOM interaction are tested via example-based and smoke tests instead.

**PBT library**: [fast-check](https://github.com/dubzzz/fast-check) — browser-compatible, no build step required (available via CDN or local copy).

---

### Property 1: Config validator accepts all structurally valid section arrays

*For any* array of section objects where every object has a non-empty `title` string, a non-empty `slug` string matching `/^[a-z0-9-]+$/`, all slugs are unique within the array, and `body` is a string — `validateConfig()` SHALL return a valid Config without throwing.

**Validates: Requirements 1.1**

---

### Property 2: Config validator rejects arrays containing duplicate slugs

*For any* valid section array to which a duplicate slug is introduced at any position, `validateConfig()` SHALL throw a `ValidationError` regardless of where in the array the duplicate appears.

**Validates: Requirements 1.6**

---

### Property 3: Renderer preserves section order

*For any* valid array of N sections, the rendered DOM SHALL contain exactly N `<section>` elements whose headings appear in the same order as the input array.

**Validates: Requirements 1.2**

---

### Property 4: Whitespace-only titles are silently filtered

*For any* string composed entirely of Unicode whitespace characters (space, tab, newline, carriage return, non-breaking space, and combinations thereof), a section object whose `title` is that string SHALL be excluded from the rendered output and from the Section_Nav, and the remaining valid sections SHALL be rendered without error.

**Validates: Requirements 1.4**

---

### Property 5: All Markdown element mappings produce correct HTML

*For any* Markdown string containing one or more of the specified constructs (`#`–`####`, `- `/`* `, `1. `, `**`, `*`, `` ` ``, fenced code blocks, `> `, `[text](url)`), the rendered HTML SHALL contain the corresponding HTML element (`<h1>`–`<h4>`, `<ul><li>`, `<ol><li>`, `<strong>`, `<em>`, `<code>`, `<pre><code>`, `<blockquote>`, `<a>`) for each construct present.

**Validates: Requirements 2.1, 2.2**

---

### Property 6: All rendered links carry safe cross-origin attributes

*For any* Markdown body containing one or more hyperlinks `[text](url)`, every `<a>` element in the rendered HTML SHALL have `target="_blank"` and `rel="noopener noreferrer"`, regardless of the URL scheme, link text content, or surrounding Markdown structure.

**Validates: Requirements 2.3**

---

### Property 7: Forbidden tags and on* attributes are stripped from all rendered output

*For any* Markdown body string into which one or more forbidden constructs are injected — `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, or any HTML attribute beginning with `on` (e.g., `onclick`, `onerror`, `onload`) — the sanitised HTML returned by the rendering pipeline SHALL contain none of those tags or attributes.

**Validates: Requirements 2.5**

---

### Property 8: Renderer never throws on arbitrary string input

*For any* string passed as a section `body` — including empty strings, strings composed entirely of whitespace, strings containing control characters, strings containing malformed Markdown, and strings containing arbitrary Unicode — the rendering pipeline SHALL return a string without throwing an exception.

**Validates: Requirements 2.7**

---

### Property 9: Section_Nav titles correspond exactly to rendered sections

*For any* valid config, the set of section titles displayed in the Section_Nav SHALL be identical to the set of section titles rendered in `<main>` — no title present in the nav that is absent from the content, and no title present in the content that is absent from the nav.

**Validates: Requirements 4.1, 4.5**

---

### Property 10: Scroll-spy highlights the correct section for any scroll position

*For any* set of section top-edge positions and any scroll position (including positions above the first section and below the last section), the scroll-spy logic SHALL identify the slug of the section whose top edge is nearest to and above the viewport midpoint — or the first section slug when no section top edge is above the midpoint, or the last section slug when the scroll position is below all sections.

**Validates: Requirements 4.3, 4.6**

