# UI/UX Pro Max Skill — Patrimio Installation

> Comprehensive UI/UX design intelligence skill with 161 industry rules, 67 UI styles, and BM25 search engine for design recommendations.

## Installation Status

✅ **Installed and configured for Patrimio project**

- **Version:** 2.0+
- **Python:** 3.12.10
- **Location:** `.claude/skills/ui-ux-pro-max/`
- **Configured agents:** project-orchestrator

## Directory Structure

```
.claude/skills/ui-ux-pro-max/
├── SKILL.md                 # Main skill documentation
├── README.md                # This file
├── scripts/
│   ├── core.py              # BM25 search engine
│   ├── design_system.py     # Design system generator
│   └── search.py            # CLI interface
└── data/
    ├── styles.csv           # 50+ UI styles
    ├── colors.csv           # 161 color palettes
    ├── products.csv         # 161 product types
    ├── typography.csv       # 57 font pairings
    ├── ui-reasoning.csv     # 161 reasoning rules
    ├── ux-guidelines.csv    # 99 UX guidelines
    ├── charts.csv           # 25 chart types
    ├── landing.csv          # Landing page patterns
    ├── google-fonts.csv     # 1923+ Google Fonts
    ├── react-performance.csv
    ├── app-interface.csv
    └── stacks/
        └── react-native.csv # React Native guidelines
```

## Quick Start

### Generate Design System for Patrimio

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py "finance dashboard professional" --design-system -p "Patrimio"
```

### Persist Design System (Master + Overrides)

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py "finance dashboard" --design-system --persist -p "Patrimio"
```

Creates:

- `design-system/patrimio/MASTER.md` — Global design rules
- `design-system/patrimio/pages/` — Page-specific overrides

### Domain-Specific Searches

```bash
# Find color palettes for finance apps
python .claude/skills/ui-ux-pro-max/scripts/search.py "finance professional trust" --domain color

# Get UX best practices for charts
python .claude/skills/ui-ux-pro-max/scripts/search.py "chart accessibility tooltip" --domain ux

# React Native performance tips
python .claude/skills/ui-ux-pro-max/scripts/search.py "list performance virtualize" --stack react-native
```

## Usage from Agents

The **project-orchestrator** agent automatically loads this skill when working on UI/UX tasks.

To explicitly invoke the skill in a request:

```
@project-orchestrator Quiero diseñar la pantalla de dashboard con las mejores prácticas UI/UX
```

The orchestrator will:

1. Read SKILL.md to understand design system generation workflow
2. Execute `search.py` with appropriate parameters
3. Apply recommendations to the implementation

## Available Domains

| Domain         | Description                    | Example Query                       |
| -------------- | ------------------------------ | ----------------------------------- |
| `style`        | UI design styles               | "glassmorphism dark modern"         |
| `color`        | Color palettes by product type | "finance professional trust"        |
| `typography`   | Font pairings                  | "elegant professional serif"        |
| `product`      | Product type patterns          | "finance dashboard analytics"       |
| `ux`           | UX best practices              | "accessibility keyboard navigation" |
| `chart`        | Data visualization             | "financial trend line chart"        |
| `landing`      | Landing page patterns          | "saas conversion cta hero"          |
| `google-fonts` | Individual fonts               | "sans serif variable popular"       |

## Stack-Specific Guidelines

Currently configured for:

- **react-native** — Patrimio's stack (stored in `data/stacks/react-native.csv`)

## Testing the Installation

Run the test command used during installation:

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py "finance dashboard professional" --design-system -p "Patrimio" -f markdown
```

Expected output: Complete design system with pattern, style, colors, typography, effects, and anti-patterns.

## Troubleshooting

### Python not found

```powershell
winget install Python.Python.3.12
```

### Import errors

Ensure you're running from project root:

```bash
cd C:\Users\Carlos\WebstormProjects\Patrimio
python .claude/skills/ui-ux-pro-max/scripts/search.py --help
```

### Missing CSV files

Re-download from source:

```powershell
$baseUrl = "https://raw.githubusercontent.com/nextlevelbuilder/ui-ux-pro-max-skill/main/src/ui-ux-pro-max/data"
Invoke-WebRequest -Uri "$baseUrl/styles.csv" -OutFile ".claude\skills\ui-ux-pro-max\data\styles.csv"
```

## Source Repository

https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

## License

MIT (as per source repository)

---

**Installed on:** 2026-04-07  
**Installed by:** GitHub Copilot (project-orchestrator agent)  
**For project:** Patrimio PWA
