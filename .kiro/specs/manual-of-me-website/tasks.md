# Implementation Plan: Manual of Me Website

## Overview

Build a static single-page website with no build step. The implementation proceeds in layers: scaffold the file structure, populate default content, build the HTML shell, add CSS theme and animations, implement app.js logic (config loading, validation, rendering, navigation, scroll-spy), then wire everything together and verify with tests.

## Tasks

- [x] 1. Scaffold project files and content.json
  - [x] 1.1 Create the four project files with minimal stubs
    - Create `index.html`, `style.css`, `app.js`, and `content.json` in the project root
    - `index.html`: DOCTYPE, `<html lang="en">`, empty `<head>` with charset/viewport meta, empty `<body>`
    - `style.css`: empty file with a comment header
    - `app.js`: empty file with a `'use strict';` directive
    - `content.json`: `{}` placeholder
    - _Requirements: 5.1, 7.3_

  - [x] 1.2 Populate content.json with all 12 default sections
    - Write the full `content.json` matching the data model in the design: `owner`, `footer`, and `sections` array
    - Include all 12 sections in order: working-hours-days, communication-preferences, conditions-i-like-to-work-in, things-i-need, best-way-to-receive-feedback, things-i-love-at-work, things-i-struggle-with, what-gets-me-excited-outside-of-work, top-5-films, favourite-cheese, any-other-interesting-fact, favourite-joke
    - Each section must have `title`, `slug`, `icon`, and `body` fields populated with instructional/example Markdown
    - The `favourite-cheese` section body must explicitly name cheddar as a list item
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 1.3 Write unit tests for content.json schema conformance
    - Verify the JSON parses without error
    - Assert exactly 12 sections are present in the correct order
    - Assert each section has non-empty `title`, valid `slug` matching `/^[a-z0-9-]+$/`, and a `body` string
    - Assert all slugs are unique
    - Assert the `favourite-cheese` body contains the word "cheddar"
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

- [x] 2. Build the HTML shell (index.html)
  - [x] 2.1 Add `<head>` with CDN script tags and metadata
    - Set `<title>Manual of Me</title>`
    - Add `<link rel="stylesheet" href="style.css">`
    - Add CDN `<script>` tags for Marked.js and DOMPurify (defer or at end of body)
    - Add `<script src="app.js" defer></script>`
    - _Requirements: 6.1, 7.3_

  - [x] 2.2 Add semantic landmark skeleton to `<body>`
    - Add `<header>`, `<nav aria-label="Section navigation">`, `<main>`, and `<footer>` elements
    - Inside `<header>`: add a loading-state placeholder `<div class="loading-state">Loading…</div>` and the pocket-watch dial SVG stub (empty `<svg class="dial" aria-hidden="true" focusable="false" viewBox="0 0 200 200">` with outer ring circle, inner ring circle, centre point, and an empty `<g id="dial-ticks">`)
    - Inside `<header>`: add a mobile nav toggle `<button class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Open navigation">☰</button>`
    - Add `id="site-nav"` to `<nav>`
    - _Requirements: 5.1, 5.4, 6.1, 6.2_

  - [x] 2.3 Add inline SVG gear symbol definitions
    - Inside `<body>` before `<header>`, add a hidden `<svg aria-hidden="true" focusable="false" style="display:none">` containing `<defs>`
    - Define at least two `<symbol>` elements: `id="gear-12"` (12-tooth gear path) and `id="gear-8"` (8-tooth gear path), each with `viewBox="0 0 100 100"`, a `<path>` for the teeth, and a centre `<circle>`
    - Add two decorative gear `<use>` elements in the page body (outside `<main>`) with classes `gear gear--slow` and `gear gear--ccw`, referencing the symbols; both carry `aria-hidden="true"` and `focusable="false"`
    - _Requirements: 3.1, 3.2, 6.6_

- [x] 3. Implement CSS theme, layout, and animations (style.css)
  - [x] 3.1 Define colour tokens and base reset
    - Add `:root` block with all CSS custom properties from the design: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--steel-light`, `--steel-mid`, `--steel-dark`, `--accent-blue`, `--accent-cyan`, `--accent-cyan-dim`, `--text-primary`, `--text-secondary`, `--focus-ring`, `--error-bg`, `--error-border`, `--error-text`
    - Add a minimal CSS reset: `box-sizing: border-box`, `margin: 0`, `padding: 0` on `*`
    - Set `body` background to `var(--bg-primary)` and `color` to `var(--text-primary)`
    - _Requirements: 3.4, 6.4_

  - [x] 3.2 Implement CSS Grid page layout (desktop and mobile)
    - Add the desktop grid to `body`: `display: grid`, `grid-template-rows: auto 1fr auto`, `grid-template-columns: 240px 1fr`, `grid-template-areas: "header header" "nav main" "footer footer"`, `min-height: 100vh`
    - Assign `grid-area` to `header`, `nav`, `main`, `footer`
    - Make `nav` sticky: `position: sticky; top: 0; height: 100vh; overflow-y: auto`
    - Add `@media (max-width: 767px)` block: single-column grid, `nav` becomes `position: fixed` drawer with `transform: translateX(-100%)` and `transition: transform 300ms ease`; `.nav--open` sets `transform: translateX(0)`
    - _Requirements: 5.3, 5.4_

  - [x] 3.3 Style header, sections, nav, and footer
    - `<header>`: flex layout, align dial and text side-by-side, padding, background `var(--bg-secondary)`
    - Section containers: `background: var(--bg-secondary)`, visible border using `var(--steel-mid)`, minimum `16px` vertical margin between adjacent sections, padding
    - `<nav>` background `var(--bg-tertiary)`, list items as block links, active item style using `aria-current="page"` selector (distinct colour/background)
    - `<footer>`: padding, `color: var(--text-secondary)`, centred text
    - `.nav-toggle`: visible only on mobile (`display: none` on desktop, `display: block` inside the `max-width: 767px` media query)
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [x] 3.4 Add focus styles and accessibility styles
    - Add `:focus-visible` outline using `var(--focus-ring)` with at least `2px` solid outline and `2px` offset on all interactive elements
    - Ensure focus ring contrast ≥ 3:1 against adjacent colours (verified by token values in design)
    - Add `.error-banner` styles: `background: var(--error-bg)`, `border: 1px solid var(--error-border)`, `color: var(--error-text)`, padding, `border-radius`
    - _Requirements: 6.3, 6.4_

  - [x] 3.5 Add gear and dial animations, section entry transition, and reduced-motion override
    - Define `@keyframes spin` (0% → 360°) and `@keyframes spin-ccw` (0% → -360°)
    - Add gear rotation classes: `.gear--slow` (60 s), `.gear--medium` (24 s), `.gear--fast` (8 s), `.gear--ccw` (40 s)
    - Position decorative gears `position: fixed`, `z-index: -1`, one bottom-left and one top-right
    - Add `.dial` styles: `width`/`height`, stroke colours using `var(--accent-cyan)` and `var(--steel-mid)`
    - Add `.section--entering` keyframe animation: `section-enter` 300 ms ease-out, opacity 0.4→1 with cyan box-shadow glow
    - Add `@media (prefers-reduced-motion: reduce)` block: `*, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }`
    - _Requirements: 3.3, 3.5, 3.7, 7.2_

- [x] 4. Implement app.js — config loading and validation
  - [x] 4.1 Implement `validateConfig(raw)`
    - Validate `raw.owner.name` is a non-empty string; throw `ValidationError` if absent or empty
    - Validate `raw.owner.tagline` is a string; truncate to 150 chars if longer
    - Validate `raw.footer.attribution` is a non-empty string; throw `ValidationError` if absent
    - Validate `raw.sections` is an array; throw `ValidationError` if absent
    - For each section: filter out objects where `title` is absent, null, or whitespace-only (silent skip)
    - For remaining sections: validate `slug` is non-empty and matches `/^[a-z0-9-]+$/`; throw `ValidationError` if not
    - Detect duplicate slugs across all remaining sections; throw `ValidationError` naming the duplicate slug
    - Validate optional `icon` field: if present, must be a non-empty string
    - Return the cleaned config object
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [ ]* 4.2 Write property test for `validateConfig` — Property 1: accepts all structurally valid section arrays
    - **Property 1: Config validator accepts all structurally valid section arrays**
    - **Validates: Requirements 1.1**
    - Use fast-check to generate arbitrary arrays of valid section objects (non-empty title, valid slug, unique slugs, string body) and assert `validateConfig()` returns without throwing

  - [ ]* 4.3 Write property test for `validateConfig` — Property 2: rejects duplicate slugs
    - **Property 2: Config validator rejects arrays containing duplicate slugs**
    - **Validates: Requirements 1.6**
    - Use fast-check to generate a valid section array, then inject a duplicate slug at an arbitrary position, and assert `validateConfig()` throws `ValidationError`

  - [ ]* 4.4 Write property test for `validateConfig` — Property 4: whitespace-only titles are silently filtered
    - **Property 4: Whitespace-only titles are silently filtered**
    - **Validates: Requirements 1.4**
    - Use fast-check to generate strings composed entirely of Unicode whitespace characters as `title`, assert the section is excluded from the returned config and no error is thrown

  - [ ]* 4.5 Write unit tests for `validateConfig` edge cases
    - Test: valid config passes through unchanged
    - Test: missing `owner.name` throws `ValidationError`
    - Test: duplicate slugs throw `ValidationError` with the slug named in the message
    - Test: section with empty title is filtered, remaining sections returned
    - Test: tagline longer than 150 chars is truncated to exactly 150
    - _Requirements: 1.1, 1.4, 1.5, 1.6_

  - [x] 4.6 Implement `loadConfig(url)` with timeout and error handling
    - Use `AbortController` with a 5-second timeout
    - `fetch(url)` — on non-OK response, call `showError()` with a "could not load" message and return
    - `response.json()` — on parse failure, call `showError()` with an "invalid JSON" message and return
    - Call `validateConfig(raw)` — on `ValidationError`, call `showError()` with the validation message and return
    - On success, return the validated config
    - Add a `setTimeout` watchdog (3 s) that calls `showError()` with a "taking too long" message if `renderPage()` has not been called yet
    - _Requirements: 1.5, 7.1, 7.4_

  - [x] 4.7 Implement `showError(message)`
    - Clear `<main>` of any partial render
    - Insert `<div role="alert" class="error-banner" aria-live="assertive"><strong>Error:</strong> <span class="error-banner__message">{message}</span></div>` into `<main>`
    - _Requirements: 1.5, 7.4_

- [x] 5. Checkpoint — validate config loading and error handling
  - Ensure all tests written so far pass
  - Manually verify: serve the project from a local static server, confirm the 12 default sections load without error
  - Ask the user if any questions arise before proceeding

- [x] 6. Implement app.js — Markdown rendering pipeline
  - [x] 6.1 Configure Marked.js renderer with safe link override
    - Create a `new marked.Renderer()` instance
    - Override `renderer.link` to produce `<a href="…" target="_blank" rel="noopener noreferrer"…>` for every link
    - Call `marked.use({ renderer, mangle: false, headerIds: false })`
    - _Requirements: 2.3_

  - [x] 6.2 Implement the Markdown rendering pipeline function
    - Write `function renderMarkdown(body)` that:
      1. Returns an empty string if `body` is empty or whitespace-only
      2. Calls `marked.parse(body)`
      3. Passes the result through `DOMPurify.sanitize(html, SANITIZE_CONFIG)` where `SANITIZE_CONFIG` forbids `script`, `iframe`, `object`, `embed`, `form` tags and sets `FORCE_BODY: true`
      4. Returns the sanitised HTML string
    - Wrap the entire function body in a try/catch; on any exception return the body escaped as plain text
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 6.3 Write property test for rendering pipeline — Property 5: Markdown element mappings produce correct HTML
    - **Property 5: All Markdown element mappings produce correct HTML**
    - **Validates: Requirements 2.1, 2.2**
    - Use fast-check to generate Markdown strings containing one or more of the specified constructs and assert the rendered HTML contains the corresponding HTML element for each construct present

  - [ ]* 6.4 Write property test for rendering pipeline — Property 6: all rendered links carry safe cross-origin attributes
    - **Property 6: All rendered links carry safe cross-origin attributes**
    - **Validates: Requirements 2.3**
    - Use fast-check to generate Markdown bodies containing one or more `[text](url)` links with arbitrary URL schemes and link text, and assert every `<a>` in the output has `target="_blank"` and `rel="noopener noreferrer"`

  - [ ]* 6.5 Write property test for rendering pipeline — Property 7: forbidden tags and on* attributes are stripped
    - **Property 7: Forbidden tags and on* attributes are stripped from all rendered output**
    - **Validates: Requirements 2.5**
    - Use fast-check to inject arbitrary combinations of `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, and `on*` attributes into Markdown body strings, and assert none appear in the sanitised output

  - [ ]* 6.6 Write property test for rendering pipeline — Property 8: renderer never throws on arbitrary string input
    - **Property 8: Renderer never throws on arbitrary string input**
    - **Validates: Requirements 2.7**
    - Use fast-check to generate arbitrary strings (including empty, whitespace-only, control characters, malformed Markdown, arbitrary Unicode) and assert `renderMarkdown()` returns a string without throwing

  - [ ]* 6.7 Write unit tests for rendering pipeline
    - Test: each Markdown element from Requirement 2.1 renders to its correct HTML element
    - Test: links get `target="_blank" rel="noopener noreferrer"`
    - Test: `<script>` tag in body is stripped from output
    - Test: `onclick` attribute in body is stripped from output
    - Test: empty body returns empty string
    - Test: whitespace-only body returns empty string
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. Implement app.js — page rendering functions
  - [x] 7.1 Implement `renderHeader(owner)`
    - Populate `<header>` with `<h1>` containing `owner.name` and `<p>` containing `owner.tagline`
    - Generate 60 tick marks in `#dial-ticks` using a loop: place `<line>` elements at 6° intervals, with major ticks (every 5th, i.e. 12 total) longer than minor ticks
    - Remove the loading-state placeholder
    - _Requirements: 5.1, 3.2_

  - [x] 7.2 Implement `renderSections(sections)`
    - For each section in the array, create a `<section id="{slug}">` element
    - Inside each section: add `<h2>{icon} {title}</h2>` (omit icon span if `icon` is absent)
    - If `renderMarkdown(section.body)` returns non-empty HTML, create a `<div class="section__body">` and set its `innerHTML` to the sanitised HTML
    - If body is empty/whitespace, render the section container with title only (no body div)
    - Store a reference to each section element on the section object as `section.element`
    - Append all section elements to `<main>`
    - _Requirements: 1.2, 1.7, 2.4_

  - [x] 7.3 Implement `renderFooter(footer)`
    - Populate `<footer>` with a `<p>` containing `footer.attribution`
    - _Requirements: 5.5, 1.9_

  - [ ]* 7.4 Write property test for renderer — Property 3: renderer preserves section order
    - **Property 3: Renderer preserves section order**
    - **Validates: Requirements 1.2**
    - Use fast-check to generate valid arrays of N sections and assert the rendered DOM contains exactly N `<section>` elements whose headings appear in the same order as the input array

  - [ ]* 7.5 Write unit tests for rendering functions
    - Test: `renderHeader` sets `<h1>` text to `owner.name`
    - Test: `renderSections` creates one `<section>` per valid section
    - Test: section with empty body renders title only (no `.section__body` element)
    - Test: section with non-empty body renders a `.section__body` element
    - Test: `renderFooter` sets footer text to `footer.attribution`
    - _Requirements: 1.2, 2.4, 5.1, 5.5_

- [x] 8. Implement app.js — navigation, scroll-spy, and mobile toggle
  - [x] 8.1 Implement `renderNav(sections)`
    - Build a `<ul>` inside `<nav id="site-nav">` with one `<li><a href="#{slug}">{title}</a></li>` per section
    - The first item receives `aria-current="page"` as the initial active state
    - On click, call `highlightNavItem(slug)`, add `.section--entering` class to the target section element (remove it after the animation ends via `animationend` event), and use `element.scrollIntoView({ behavior: 'smooth' })`
    - _Requirements: 4.1, 4.2, 3.5_

  - [x] 8.2 Implement `highlightNavItem(slug)` and `initScrollSpy()`
    - `highlightNavItem(slug)`: remove `aria-current="page"` from all nav links, set `aria-current="page"` on the link whose `href` matches `#{slug}`
    - `initScrollSpy()`: create an `IntersectionObserver` with `rootMargin: '-50% 0px -50% 0px'`; observe each section element; on intersection change, call `highlightNavItem` with the slug of the intersecting section; handle edge cases: above first section → highlight first, below last section → highlight last
    - _Requirements: 4.3, 4.6_

  - [x] 8.3 Implement `initMobileNav()`
    - Select the `.nav-toggle` button and `<nav>` element
    - On button click: toggle `.nav--open` class on `<nav>`, toggle `aria-expanded` between `"true"` and `"false"` on the button
    - Implement focus trap: when nav is open, Tab and Shift+Tab cycle focus only within the nav's focusable elements; Escape closes the nav and returns focus to the toggle button
    - _Requirements: 5.4, 5.6, 6.7_

  - [ ]* 8.4 Write property test for scroll-spy — Property 9: Section_Nav titles correspond exactly to rendered sections
    - **Property 9: Section_Nav titles correspond exactly to rendered sections**
    - **Validates: Requirements 4.1, 4.5**
    - Use fast-check to generate valid configs and assert the set of titles in the nav is identical to the set of titles in `<main>`

  - [ ]* 8.5 Write property test for scroll-spy — Property 10: scroll-spy highlights the correct section for any scroll position
    - **Property 10: Scroll-spy highlights the correct section for any scroll position**
    - **Validates: Requirements 4.3, 4.6**
    - Use fast-check to generate arbitrary sets of section top-edge positions and scroll positions, and assert the scroll-spy logic returns the slug of the section whose top edge is nearest to and above the viewport midpoint (or first/last for edge positions)

  - [ ]* 8.6 Write unit tests for navigation
    - Test: `renderNav` creates one `<a>` per section with correct `href`
    - Test: `highlightNavItem` sets `aria-current="page"` on the correct link and removes it from others
    - Test: scroll above first section highlights first nav item
    - Test: scroll below last section highlights last nav item
    - _Requirements: 4.1, 4.3, 4.6_

- [x] 9. Wire everything together in app.js
  - [x] 9.1 Implement `renderPage(config)` and the `DOMContentLoaded` entry point
    - Write `function renderPage(config)` that calls in order: `renderHeader(config.owner)`, `renderSections(config.sections)`, `renderNav(config.sections)`, `renderFooter(config.footer)`, `initScrollSpy()`, `initMobileNav()`
    - Add a `document.addEventListener('DOMContentLoaded', () => loadConfig('content.json'))` entry point at the bottom of `app.js`
    - Ensure the 3-second watchdog in `loadConfig` is cancelled once `renderPage` is called
    - _Requirements: 1.2, 5.1, 7.1, 7.3_

  - [ ]* 9.2 Write integration smoke tests
    - Test: loading a valid `content.json` renders all 12 sections in `<main>`
    - Test: loading an invalid JSON string calls `showError` and inserts a `role="alert"` element
    - Test: loading a config with a duplicate slug calls `showError`
    - Test: mobile nav toggle opens and closes the nav drawer
    - _Requirements: 1.5, 1.6, 5.4, 5.6_

- [~] 10. Final checkpoint — full integration verification
  - Ensure all tests pass
  - Serve the project from a local static server and verify: all 12 sections render, nav highlights update on scroll, mobile toggle works, gear animations play, reduced-motion halts animations, keyboard navigation traverses all interactive elements in DOM order
  - Ask the user if any questions arise before considering the feature complete

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints (tasks 5 and 10) ensure incremental validation at natural breaks
- Property tests use fast-check (browser-compatible, no build step required via CDN or local copy)
- Unit tests can be run with any browser-compatible test runner (e.g., a simple `test.html` harness or Jasmine via CDN)
- The design document's Correctness Properties section defines 10 properties; all 10 are covered by property test sub-tasks 4.2–4.4, 6.3–6.6, 7.4, 8.4–8.5

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["1.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 4, "tasks": ["3.4", "3.5", "4.2", "4.3", "4.4", "4.5", "4.6"] },
    { "id": 5, "tasks": ["4.7", "6.1"] },
    { "id": 6, "tasks": ["6.2"] },
    { "id": 7, "tasks": ["6.3", "6.4", "6.5", "6.6", "6.7", "7.1"] },
    { "id": 8, "tasks": ["7.2", "7.3"] },
    { "id": 9, "tasks": ["7.4", "7.5", "8.1"] },
    { "id": 10, "tasks": ["8.2", "8.3"] },
    { "id": 11, "tasks": ["8.4", "8.5", "8.6", "9.1"] },
    { "id": 12, "tasks": ["9.2"] }
  ]
}
```
