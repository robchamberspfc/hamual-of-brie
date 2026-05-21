# Requirements Document

## Introduction

A personal "Manual of Me" website for a community of practice. The site serves as a living guide to how an individual works best — their communication preferences, working style, strengths, quirks, and how to collaborate with them effectively. The visual design uses a futuristic clockwork aesthetic inspired by pocket watches, with animated mechanical elements that lean futuristic rather than steampunk. Content is managed through a JSON configuration file that acts as a lightweight CMS, allowing the owner to add, edit, and reorder sections using Markdown.

## Glossary

- **Manual_of_Me**: The website application that displays a personal working guide
- **Content_Config**: The JSON file that defines all page sections and their Markdown content
- **Section**: A discrete content block within the Manual_of_Me, defined in the Content_Config
- **Clockwork_UI**: The futuristic clockwork visual theme including animated gear and watch-face elements
- **Renderer**: The component responsible for parsing Markdown from Content_Config and rendering it as HTML
- **Section_Nav**: The navigation component that allows users to jump between sections
- **Animation_Engine**: The component responsible for driving Clockwork_UI animations

---

## Requirements

### Requirement 1: Content Configuration System

**User Story:** As a Manual_of_Me owner, I want to define all my page sections and content in a single JSON file, so that I can update my personal guide without touching application code.

#### Acceptance Criteria

1. THE Content_Config SHALL define an ordered array of section objects; each section object SHALL contain a non-empty string `title`, a non-empty string `slug` that is unique within the array, and a string `body` containing Markdown content (which may be empty).
2. WHEN the Manual_of_Me loads, THE Renderer SHALL read the Content_Config and render all valid sections in the exact order they appear in the array.
3. WHEN a section's `body` value is updated in the Content_Config, THE Renderer SHALL reflect the updated content on the next page load without requiring any change to application source code.
4. IF the Content_Config contains a section object where `title` is absent, null, or an empty/whitespace-only string, THEN THE Manual_of_Me SHALL skip that section object and continue rendering the remaining valid sections; the overall configuration SHALL still be considered valid.
5. IF the Content_Config file cannot be parsed as valid JSON, THEN THE Manual_of_Me SHALL display a visible, user-readable error message stating that the configuration is invalid, and SHALL NOT render any section content.
6. IF two or more section objects share the same `slug` value, THEN THE Manual_of_Me SHALL treat the configuration as invalid and display the same error message as criterion 5.
7. THE Content_Config SHALL support an optional `icon` string field per section object; WHEN `icon` is present and non-empty, THE Clockwork_UI SHALL render the associated visual symbol alongside the section title.
8. THE Content_Config SHALL support a top-level `owner` object containing at minimum a `name` string and a `tagline` string, both used to populate the page header.
9. THE Content_Config SHALL support a top-level `footer` object containing at minimum an `attribution` string used to populate the page footer.

---

### Requirement 2: Markdown Rendering

**User Story:** As a Manual_of_Me owner, I want to write my content in Markdown, so that I can format text with headings, lists, emphasis, and links without writing HTML.

#### Acceptance Criteria

1. WHEN a section `body` is provided in Markdown, THE Renderer SHALL convert it to HTML using the following element mappings: `#` → `<h1>`, `##` → `<h2>`, `###` → `<h3>`, `####` → `<h4>`, `- ` / `* ` → `<ul><li>`, `1. ` → `<ol><li>`, `**text**` → `<strong>`, `*text*` → `<em>`, `` `code` `` → `<code>`, fenced code blocks → `<pre><code>`, `> ` → `<blockquote>`, `[text](url)` → `<a>`.
2. THE Renderer SHALL support all Markdown elements listed in criterion 1; any element from that list present in a section body SHALL be rendered to its corresponding HTML element.
3. WHEN a Markdown body contains a hyperlink `[text](url)`, THE Renderer SHALL render it as `<a href="url" target="_blank" rel="noopener noreferrer">text</a>`.
4. IF a section `body` is empty or contains only whitespace, THEN THE Renderer SHALL render the section container with its title heading only and no body content area.
5. THE Renderer SHALL strip any raw `<script>`, `<iframe>`, `<object>`, `<embed>`, and `<form>` tags — and any HTML attribute beginning with `on` (e.g., `onclick`, `onerror`) — from the rendered output before inserting it into the DOM.
6. IF a Markdown body contains raw HTML tags not listed in criterion 5, THE Renderer SHALL escape them as HTML entities rather than rendering them as markup.
7. IF a Markdown body contains a construct that the Renderer does not recognise or cannot parse, THE Renderer SHALL render that construct as plain escaped text rather than throwing an error or omitting the surrounding content.

---

### Requirement 3: Futuristic Clockwork Visual Theme

**User Story:** As a Manual_of_Me owner, I want my site to have a distinctive futuristic clockwork aesthetic, so that it stands out visually and reflects a unique personal brand.

#### Acceptance Criteria

1. THE Clockwork_UI SHALL display at least two animated gear or cog SVG elements as decorative background or framing components visible on the page at all times on desktop viewports.
2. THE Clockwork_UI SHALL include a pocket-watch-inspired circular dial element — containing at minimum a ring of tick marks and a centre point — rendered as a visible design element in the page header or hero area.
3. THE Animation_Engine SHALL animate each gear element with continuous CSS rotation; each gear SHALL have a distinct rotation duration in the range 8 s–60 s, and no two gears SHALL share the same duration.
4. THE Clockwork_UI SHALL use a colour palette drawn exclusively from deep metallics (e.g., dark steel greys), electric blues, cyan, or luminous accent colours; it SHALL NOT use sepia, amber, or brass tones.
5. WHEN a visitor navigates to a section (via Section_Nav click or keyboard activation), THE Animation_Engine SHALL apply a CSS transition of between 200 ms and 400 ms to the newly active section panel (e.g., a fade-in or border-glow effect).
6. WHILE the viewport width is 768 px or greater, THE Clockwork_UI SHALL render all decorative gear elements and the pocket-watch dial at full size and opacity. WHILE the viewport width is less than 768 px, THE Clockwork_UI MAY reduce gear count or size, but SHALL maintain a minimum contrast ratio of 4.5:1 between body text and its background.
7. WHERE a visitor has set `prefers-reduced-motion: reduce`, THE Animation_Engine SHALL set the `animation-duration` and `transition-duration` of all animated elements to `0.01ms`, effectively halting motion while preserving layout.
8. THE Clockwork_UI SHALL render the pocket-watch dial element such that it is visible in the initial viewport without scrolling on desktop viewports (width ≥ 768 px).

---

### Requirement 4: Section Navigation

**User Story:** As a visitor to the Manual_of_Me, I want to navigate between sections quickly, so that I can find the information most relevant to me without scrolling through the entire page.

#### Acceptance Criteria

1. THE Section_Nav SHALL display a list of titles for all sections that the Renderer has rendered (i.e., sections not skipped per Requirement 1 criterion 4).
2. WHEN a visitor clicks a section title in the Section_Nav, THE Manual_of_Me SHALL initiate an animated scroll (not an instant jump) to bring the top of that section into the viewport.
3. WHEN a visitor scrolls the page, THE Section_Nav SHALL apply a distinct visual highlight (e.g., different text colour or background) to the title of the section whose top edge is nearest to and above the vertical midpoint of the viewport; IF two sections are simultaneously visible, THE Section_Nav SHALL highlight the one whose top edge is closest to the top of the viewport.
4. THE Section_Nav SHALL be rendered with `position: sticky` or `position: fixed` so that it remains within the visible viewport at all scroll positions.
5. WHEN the Content_Config is updated with new or removed sections and the page is reloaded, THE Section_Nav SHALL automatically reflect the current section list without requiring changes to application source code.
6. WHEN the visitor has scrolled above the first section (no section occupies the viewport), THE Section_Nav SHALL apply the highlight to the first section title. WHEN the visitor has scrolled below the last section, THE Section_Nav SHALL apply the highlight to the last section title.

---

### Requirement 5: Page Structure and Layout

**User Story:** As a visitor, I want a clear and well-structured page layout, so that I can read the Manual_of_Me comfortably across different devices.

#### Acceptance Criteria

1. THE Manual_of_Me SHALL render a `<header>` element as the first visible element in the page body, containing the owner's name (sourced from `Content_Config.owner.name`) and tagline (sourced from `Content_Config.owner.tagline`, maximum 150 characters); both SHALL be visible without scrolling on initial page load.
2. THE Manual_of_Me SHALL render each section inside a visually distinct container (distinct background colour or visible border) with a minimum of 16 px of vertical spacing between adjacent section containers.
3. WHILE the viewport width is 768 px or greater, THE Manual_of_Me SHALL display the Section_Nav in a sidebar column to the left or right of the main content column, both visible simultaneously.
4. WHILE the viewport width is less than 768 px, THE Manual_of_Me SHALL display the Section_Nav in a collapsed state by default (hidden from view), accessible via a visible toggle control.
5. THE Manual_of_Me SHALL render a `<footer>` element as the last visible element in the page body, containing the attribution text sourced from `Content_Config.footer.attribution`.
6. WHEN a visitor activates the mobile navigation toggle control, THE Section_Nav SHALL toggle between its collapsed (hidden) and expanded (visible) states.

---

### Requirement 6: Accessibility

**User Story:** As a visitor using assistive technology, I want the Manual_of_Me to be accessible, so that I can navigate and read the content regardless of how I interact with the web.

#### Acceptance Criteria

1. THE Manual_of_Me SHALL use semantic HTML elements — specifically `<header>`, `<nav>`, `<main>`, `<section>`, and `<footer>` — as the structural landmarks of the page.
2. THE Manual_of_Me SHALL provide either an associated `<label>` element or a non-empty `aria-label` attribute on every interactive element (buttons, links, inputs) and every landmark element that does not have a visible text label.
3. WHEN a visitor navigates using only the keyboard (Tab / Shift+Tab), THE Manual_of_Me SHALL traverse interactive elements in DOM source order; each focused element SHALL display a focus indicator with a contrast ratio of at least 3:1 against its adjacent colours (WCAG 2.1 AA).
4. THE Clockwork_UI SHALL ensure all body and heading text meets a contrast ratio of at least 4.5:1 (normal text) or 3:1 (text 18 pt / 14 pt bold or larger) against its background colour.
5. ALL informative images (images that convey meaning) SHALL have a non-empty `alt` attribute describing the image content.
6. ALL purely decorative images and SVG elements SHALL have `alt=""` (for `<img>`) or `aria-hidden="true"` (for inline SVG) so that screen readers ignore them.
7. WHEN a visitor moves keyboard focus into any interactive component, THE Manual_of_Me SHALL allow focus to be moved away from that component using standard keyboard keys (Tab, Shift+Tab, Escape) without requiring a mouse interaction.

---

### Requirement 7: Performance and Loading

**User Story:** As a visitor, I want the Manual_of_Me to load quickly, so that I can access the content without a long wait.

#### Acceptance Criteria

1. WHEN the Manual_of_Me is loaded on a connection of at least 10 Mbps with RTT ≤ 40 ms, and the first section heading and body text are not visible in the viewport within 3 seconds of the initial navigation, THE Manual_of_Me SHALL display a visible error message informing the visitor that content could not be loaded.
2. THE Animation_Engine SHALL implement all animations exclusively using CSS `@keyframes` / `animation` properties or the Web Animations API; it SHALL NOT use `setInterval`, `setTimeout`-based animation loops, or `requestAnimationFrame` loops that recalculate layout-affecting properties on every frame.
3. THE Manual_of_Me SHALL parse and render all section content from the Content_Config during page initialisation (synchronously or as part of the initial render pass); it SHALL NOT defer section content loading to subsequent network requests after the initial HTML is parsed; the page's Cumulative Layout Shift (CLS) score SHALL be ≤ 0.1.
4. IF the Content_Config file cannot be fetched or read during page initialisation (e.g., file not found, network error), THE Manual_of_Me SHALL display a visible error message and SHALL NOT leave the visitor with a blank or silently broken page.

---

### Requirement 8: Default Section Content Template

**User Story:** As a Manual_of_Me owner, I want the Content_Config to ship with a pre-populated set of default sections, so that I can get started immediately by filling in my own content without having to define the structure from scratch.

#### Acceptance Criteria

1. THE Content_Config SHALL ship with exactly 12 pre-defined section objects in the following order: (1) Working hours/days, (2) Communication preferences, (3) Conditions you like to work in, (4) Things you need, (5) Best way to receive feedback, (6) Things you love at work, (7) Things you struggle with, (8) What gets you excited outside of work, (9) Top 5 films, (10) Favourite cheese, (11) Any other interesting fact, (12) Favourite joke.
2. THE Content_Config SHALL assign each of the 12 default sections a `slug` value composed exclusively of lowercase alphanumeric characters and hyphens, derived from the section title (e.g., `working-hours-days`, `communication-preferences`); each slug SHALL be unique within the array and SHALL NOT be empty.
3. THE Content_Config SHALL populate the `body` field of each default section with a non-empty string containing at least one word of instructional or example Markdown text that indicates to the owner what content to provide in that section.
4. THE Content_Config SHALL include at least one pre-filled list item in the `body` of the "Favourite cheese" section (slug: `favourite-cheese`) that explicitly names cheddar; this entry SHALL be present in the shipped default configuration and SHALL NOT be absent.
5. THE Content_Config SHALL conform to the section schema defined in Requirement 1 criterion 1 for all 12 default sections; each section object SHALL contain a non-empty `title`, a unique non-empty `slug`, and a `body` string.
6. IF an owner modifies the Content_Config after initial setup, THE Manual_of_Me SHALL permit the owner to reorder, rename, add, or remove any of the 12 default sections without requiring changes to application source code; the default sections are starting-point content, not locked structure.
