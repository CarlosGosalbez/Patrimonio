# UI/UX Pro Max - Design Intelligence Skill

> Comprehensive design guide for web and mobile applications. Contains 50+ styles, 161 color palettes, 57 font pairings, 161 product types with reasoning rules, 99 UX guidelines, and 25 chart types across 10 technology stacks.

---

name: ui-ux-pro-max
description: "UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, and HTML/CSS). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, and mobile app. Elements: button, modal, navbar, sidebar, card, table, form, and chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neomorphism, bento grid, dark mode, responsive, skeuomorphism, and flat design. Topics: color systems, accessibility, animation, layout, typography, font pairing, spacing, interaction states, shadow, and gradient. Integrations: shadcn/ui MCP for component search and examples."

---

## When to Apply

This Skill should be used when the task involves **UI structure, visual design decisions, interaction patterns, or user experience quality control**.

### Must Use

This Skill must be invoked in the following situations:

- Designing new pages (Landing Page, Dashboard, Admin, SaaS, Mobile App)
- Creating or refactoring UI components (buttons, modals, forms, tables, charts, etc.)
- Choosing color schemes, typography systems, spacing standards, or layout systems
- Reviewing UI code for user experience, accessibility, or visual consistency
- Implementing navigation structures, animations, or responsive behavior
- Making product-level design decisions (style, information hierarchy, brand expression)
- Improving perceived quality, clarity, or usability of interfaces

### Recommended

This Skill is recommended in the following situations:

- UI looks "not professional enough" but the reason is unclear
- Receiving feedback on usability or experience
- Pre-launch UI quality optimization
- Aligning cross-platform design (Web / iOS / Android)
- Building design systems or reusable component libraries

### Skip

This Skill is not needed in the following situations:

- Pure backend logic development
- Only involving API or database design
- Performance optimization unrelated to the interface
- Infrastructure or DevOps work
- Non-visual scripts or automation tasks

**Decision criteria**: If the task will change how a feature **looks, feels, moves, or is interacted with**, this Skill should be used.

---

## Prerequisites

Check if Python is installed:

```bash
python3 --version || python --version
```

If Python is not installed, install it based on user's OS:

**macOS:**

```bash
brew install python3
```

**Ubuntu/Debian:**

```bash
sudo apt update && sudo apt install python3
```

**Windows:**

```powershell
winget install Python.Python.3.12
```

---

## How to Use This Skill

### Step 1: Analyze User Requirements

Extract key information from user request:

- **Product type**: Entertainment (social, video, music, gaming), Tool (scanner, editor, converter), Productivity (task manager, notes, calendar), or hybrid
- **Target audience**: C-end consumer users; consider age group, usage context (commute, leisure, work)
- **Style keywords**: playful, vibrant, minimal, dark mode, content-first, immersive, etc.
- **Stack**: React Native (this project's only tech stack)

### Step 2: Generate Design System (REQUIRED)

**Always start with `--design-system`** to get comprehensive recommendations with reasoning:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

This command:

1. Searches domains in parallel (product, style, color, landing, typography)
2. Applies reasoning rules from `ui-reasoning.csv` to select best matches
3. Returns complete design system: pattern, style, colors, typography, effects
4. Includes anti-patterns to avoid

**Example:**

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness service" --design-system -p "Serenity Spa"
```

### Step 2b: Persist Design System (Master + Overrides Pattern)

To save the design system for **hierarchical retrieval across sessions**, add `--persist`:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
```

This creates:

- `design-system/MASTER.md` — Global Source of Truth with all design rules
- `design-system/pages/` — Folder for page-specific overrides

**With page-specific override:**

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name" --page "dashboard"
```

This also creates:

- `design-system/pages/dashboard.md` — Page-specific deviations from Master

**How hierarchical retrieval works:**

1. When building a specific page (e.g., "Checkout"), first check `design-system/pages/checkout.md`
2. If the page file exists, its rules **override** the Master file
3. If not, use `design-system/MASTER.md` exclusively

### Step 3: Supplement with Detailed Searches (as needed)

After getting the design system, use domain searches to get additional details:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
```

**When to use detailed searches:**

| Need                     | Domain         | Example                                               |
| ------------------------ | -------------- | ----------------------------------------------------- |
| Product type patterns    | `product`      | `--domain product "entertainment social"`             |
| More style options       | `style`        | `--domain style "glassmorphism dark"`                 |
| Color palettes           | `color`        | `--domain color "entertainment vibrant"`              |
| Font pairings            | `typography`   | `--domain typography "playful modern"`                |
| Chart recommendations    | `chart`        | `--domain chart "real-time dashboard"`                |
| UX best practices        | `ux`           | `--domain ux "animation accessibility"`               |
| Alternative fonts        | `typography`   | `--domain typography "elegant luxury"`                |
| Individual Google Fonts  | `google-fonts` | `--domain google-fonts "sans serif popular variable"` |
| Landing structure        | `landing`      | `--domain landing "hero social-proof"`                |
| React Native perf        | `react`        | `--domain react "rerender memo list"`                 |
| App interface a11y       | `web`          | `--domain web "accessibilityLabel touch safe-areas"`  |
| AI prompt / CSS keywords | `prompt`       | `--domain prompt "minimalism"`                        |

### Step 4: Stack Guidelines (React Native)

Get React Native implementation-specific best practices:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack react-native
```

---

## Rule Categories by Priority

_For human/AI reference: follow priority 1→10 to decide which rule category to focus on first; use `--domain <Domain>` to query details when needed._

| Priority | Category            | Impact   | Domain                | Key Checks (Must Have)                                                | Anti-Patterns (Avoid)                                                |
| -------- | ------------------- | -------- | --------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1        | Accessibility       | CRITICAL | `ux`                  | Contrast 4.5:1, Alt text, Keyboard nav, Aria-labels                   | Removing focus rings, Icon-only buttons without labels               |
| 2        | Touch & Interaction | CRITICAL | `ux`                  | Min size 44×44px, 8px+ spacing, Loading feedback                      | Reliance on hover only, Instant state changes (0ms)                  |
| 3        | Performance         | HIGH     | `ux`                  | WebP/AVIF, Lazy loading, Reserve space (CLS < 0.1)                    | Layout thrashing, Cumulative Layout Shift                            |
| 4        | Style Selection     | HIGH     | `style`, `product`    | Match product type, Consistency, SVG icons (no emoji)                 | Mixing flat & skeuomorphic randomly, Emoji as icons                  |
| 5        | Layout & Responsive | HIGH     | `ux`                  | Mobile-first breakpoints, Viewport meta, No horizontal scroll         | Horizontal scroll, Fixed px container widths, Disable zoom           |
| 6        | Typography & Color  | MEDIUM   | `typography`, `color` | Base 16px, Line-height 1.5, Semantic color tokens                     | Text < 12px body, Gray-on-gray, Raw hex in components                |
| 7        | Animation           | MEDIUM   | `ux`                  | Duration 150–300ms, Motion conveys meaning, Spatial continuity        | Decorative-only animation, Animating width/height, No reduced-motion |
| 8        | Forms & Feedback    | MEDIUM   | `ux`                  | Visible labels, Error near field, Helper text, Progressive disclosure | Placeholder-only label, Errors only at top, Overwhelm upfront        |
| 9        | Navigation Patterns | HIGH     | `ux`                  | Predictable back, Bottom nav ≤5, Deep linking                         | Overloaded nav, Broken back behavior, No deep links                  |
| 10       | Charts & Data       | LOW      | `chart`               | Legends, Tooltips, Accessible colors                                  | Relying on color alone to convey meaning                             |

---

## Quick Reference

_(Full reference available via search command)_

Common critical rules you must check before any UI delivery:

### Accessibility (CRITICAL)

- Text contrast ≥ 4.5:1 ratio
- Alt text for all images
- Keyboard navigation support
- Visible focus states
- ARIA labels for icon buttons

### Touch & Interaction (CRITICAL)

- Touch targets ≥ 44×44px minimum
- 8px spacing between targets
- Loading feedback for async actions
- Don't rely on hover-only interactions

### Typography

- Base font size ≥ 16px
- Line height: 1.5–1.75 for body text
- Use semantic color tokens

### Color

- Define semantic tokens (primary, accent, error, etc.)
- Support both light and dark modes
- Never convey meaning by color alone

---

## Common Anti-Patterns to Avoid

### Icons & Visual Elements

- ❌ **No emojis as icons** — Use SVG (Heroicons, Lucide, react-native-vector-icons)
- ❌ **Missing cursor:pointer** — All clickable elements need it
- ❌ **Layout-shifting hovers** — Avoid transforms that shift layout bounds

### Interaction

- ❌ **No tap feedback** — Provide visual response (ripple/opacity) within 80-150ms
- ❌ **Invisible disabled states** — Use reduced opacity + semantic disabled props

### Light/Dark Mode

- ❌ **Low contrast text** — Maintain 4.5:1 minimum in both themes
- ❌ **Weak modal scrim** — Use 40-60% black scrim for modals

### Layout

- ❌ **Safe area violations** — Respect notch, status bar, gesture bar
- ❌ **Random spacing** — Use 4/8dp consistent rhythm

---

## Pre-Delivery Checklist

Before delivering UI code, verify:

### Visual Quality

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent family
- [ ] Pressed-state visuals don't shift layout
- [ ] Semantic theme tokens used consistently

### Interaction

- [ ] Touch targets ≥ 44×44px (iOS) / 48×48dp (Android)
- [ ] Micro-interactions 150-300ms with native easing
- [ ] Screen reader labels are descriptive
- [ ] No gesture conflicts

### Light/Dark Mode

- [ ] Text contrast ≥ 4.5:1 in both modes
- [ ] Dividers visible in both modes
- [ ] Both themes tested

### Layout

- [ ] Safe areas respected
- [ ] Tested on small phone, large phone, tablet (portrait + landscape)
- [ ] 4/8dp spacing rhythm maintained

### Accessibility

- [ ] Images have accessibility labels
- [ ] Form fields have labels and error messages
- [ ] Reduced motion and dynamic text size supported

---

## Example Workflow

**User request:** "Build a finance dashboard for tracking expenses"

### Step 1: Analyze Requirements

- Product type: Tool (finance tracker)
- Target audience: Personal finance users
- Style keywords: professional, minimal, data-focused
- Stack: React Native

### Step 2: Generate Design System (REQUIRED)

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "finance tracker professional data dashboard" --design-system -p "Finance Tracker"
```

**Output:** Complete design system with pattern, style, colors, typography, effects, and anti-patterns.

### Step 3: Supplement with Detailed Searches (as needed)

```bash
# Get chart recommendations for financial data
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "financial trends monthly" --domain chart

# Get UX best practices for data-heavy interfaces
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "data table performance virtualize" --domain ux
```

### Step 4: Stack Guidelines

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "list performance navigation" --stack react-native
```

**Then:** Synthesize design system + detailed searches and implement the design following all the recommendations.

---

## Tips for Better Results

### Query Strategy

- Use **multi-dimensional keywords** — combine product + industry + tone: `"entertainment social vibrant"` not just `"app"`
- Try different keywords: `"playful neon"` → `"vibrant dark"` → `"content-first minimal"`
- Use `--design-system` first, then `--domain` to deep-dive
- Always add `--stack react-native` for implementation guidance

### Common Sticking Points

| Problem                        | What to Do                                        |
| ------------------------------ | ------------------------------------------------- |
| Can't decide on style/color    | Re-run `--design-system` with different keywords  |
| Dark mode contrast issues      | Check Accessibility rules for color contrast      |
| Animations feel unnatural      | Use spring-physics timing (150-300ms)             |
| Form UX is poor                | Check Forms & Feedback rules                      |
| Navigation confusing           | Check Navigation Patterns rules                   |
| Layout breaks on small screens | Use mobile-first approach with proper breakpoints |

---

## Output Formats

The `--design-system` flag supports two output formats:

```bash
# ASCII box (default) - best for terminal display
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system

# Markdown - best for documentation
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system -f markdown
```
