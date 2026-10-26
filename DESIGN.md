---
name: Codeportistas
description: An album of Argentine athletes. Every athlete is a figurita you open to meet them.
colors:
  celeste: "#74acdf"
  celeste-soft: "#dcebf8"
  ink: "#0e1b33"
  action-blue: "#164c8a"
  action-blue-deep: "#0f3a6b"
  action-blue-soft: "#e2eefa"
  sol: "#f6b40e"
  sol-soft: "#fdf1cf"
  on-sol: "#2a1d00"
  ground: "#ffffff"
  ground-muted: "#eef4fa"
  text-muted: "#4b5b73"
  hairline: "#d3e0ec"
  verified: "#1b7a4b"
  verified-soft: "#dcf1e4"
  danger: "#b3261e"
  danger-soft: "#fbe3e1"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 6vw, 5.5rem)"
    fontWeight: 850
    lineHeight: 0.92
    letterSpacing: "-0.005em"
    fontVariation: "'wdth' 62"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 850
    lineHeight: 0.95
    fontVariation: "'wdth' 62"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "'wdth' 62"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  md: "3px"
  lg: "4px"
  xl: "6px"
  2xl: "8px"
  full: "9999px"
spacing:
  gutter-mobile: "16px"
  gutter-desktop: "24px"
  section: "64px"
  section-lg: "80px"
components:
  button-primary:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.ground}"
    rounded: "{rounded.lg}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.action-blue-deep}"
  button-on-celeste:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.lg}"
    padding: "10px 18px"
  button-sol:
    backgroundColor: "{colors.sol}"
    textColor: "{colors.on-sol}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  input:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  figurita-frame:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.xl}"
    padding: "6px"
  figurita-photo:
    backgroundColor: "{colors.celeste}"
    rounded: "{rounded.lg}"
  figurita-name-strip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
---

# Design System: Codeportistas

## Overview

**Creative North Star: "El Álbum"**

Codeportistas is laid out like a sticker album of Argentine athletes. The figurita is the product's object: a photo on a celeste field inside a white frame, with the athlete's name on a navy strip. It appears in the directory, on the profile, on the landing page and in the live signup preview. Everything else is set in the same condensed, sporty voice and gives way to the athletes' own photos and stories.

Celeste owns whole regions (the header band, every page's opening field, the athlete hero), never as a sprinkle of accents. Navy carries type and actions. Sol (the sun's yellow) appears only where someone is being asked to support an athlete: campaigns, the alias, "Campaña activa". The shirt, not the flag: the brand mark is the albiceleste jersey stripes, and there are no flags, suns-as-ornament or national emblems as decoration.

**Key Characteristics:**
- One family (Archivo, by Omnibus-Type of Buenos Aires): condensed and uppercase for display, normal width for reading.
- Celeste fields open every page; white ground below.
- Squared 4px corners, 1px hairlines, almost no shadow.
- Sol is reserved for money and support moments.

## Colors

A committed celeste field, navy ink, and one warm signal (sol) that means "support".

### Primary
- **Celeste** (#74acdf): the field color. The header band, each page's opening section, the figurita photo ground, the "¿Sos atleta?" close. Text on it is ink.
- **Ink Navy** (#0e1b33): all body type, figurita name strips, the money/trust section, buttons that sit on celeste.
- **Action Blue** (#164c8a): primary buttons, links and focus rings on white ground. Deepens to #0f3a6b on hover.

### Secondary
- **Sol** (#f6b40e) / **Sol Soft** (#fdf1cf): campaigns, alias copy button, "Campaña activa" ribbon, the "Cómo te pueden bancar" group. Nothing else.

### Neutral
- **Ground** (#ffffff), **Ground Muted** (#eef4fa): page and alternate section backgrounds.
- **Muted Text** (#4b5b73): secondary copy, hints. 7:1 on white.
- **Hairline** (#d3e0ec): borders and dividers.
- **Verified** (#1b7a4b) and **Danger** (#b3261e), each with a soft tint, used only for state.

Dark theme (`data-theme="dark"` or the OS preference): ground #0a1322, surface #0f1b2e, celeste deepens to #2b5f91 with near-white text on it, action blue becomes #8cc3f0 with dark text, and sol stays #f6b40e.

### Named Rules
**The Sol Means Money Rule.** Sol appears only where a supporter is asked to help. Using it for decoration teaches people to ignore it.

**The Field, Not Accent Rule.** Celeste is applied to whole regions. A celeste chip on a white page is the wrong scale.

## Typography

**Display Font:** Archivo, variable `wdth` axis at 62% (with ui-sans-serif fallback)
**Body Font:** Archivo at normal width

**Character:** Condensed heavy capitals read like a sports page masthead or a jersey number. The same family at normal width keeps forms and stories calm.

### Hierarchy
- **Display** (850, 2.75–5.5rem, 0.92): page h1s (every h1 is condensed uppercase by default in `globals.css`) and athlete names.
- **Headline** (850, 2.25–3.25rem): section headings, via the `.display` utility.
- **Title** (800, 1.375rem, uppercase): dashboard group titles (`.group-title`) and figurita names.
- **Body** (400, 1rem–1.125rem, 1.6): stories and descriptions, max 68ch.
- **Label** (600, 0.875rem): form labels (`.field-label`); hints are 0.8125rem muted (`.field-hint`).

### Named Rules
**The No Kicker Rule.** No eyebrow labels above headings. The heading carries itself. "Paso 1 de 2" is the one exception, because the step count is information.

## Layout

Containers are `max-w-6xl` for public pages, `max-w-4xl` for the dashboard and `max-w-5xl` for admin, with 16px gutters on phones and 24px from `sm`. Sections breathe at 64–80px vertically. The directory is a 2/3/4-column album grid. The profile is a two-column layout from `lg` with a sticky support panel. On phones the panel follows the story, so the story still comes first. Signup puts the form beside a sticky live figurita preview; on phones the preview stacks above the form.

## Elevation & Depth

Flat by default. The only shadow belongs to the figurita: a soft two-layer lift that makes it feel like a card on a table. Depth elsewhere comes from tonal fields (celeste, ink, sol-soft) and 1px hairlines.

### Shadow Vocabulary
- **Figurita lift** (`box-shadow: 0 1px 2px rgb(14 27 51 / 0.06), 0 8px 24px -12px rgb(14 27 51 / 0.25)`): figuritas only.

## Shapes

Squared printed-card corners: 4px on controls and inner panels, 6px on the figurita frame and grouped containers. Pills (`rounded-full`) only for status chips and verification dots.

## Components

- **Figurita** (`components/figurita.tsx`): 3:4 photo on celeste (initials when no photo), sport tag top-left, verified check top-right, a sol "Campaña activa" ribbon, and a navy name strip. On hover in the album it lifts 6px and tilts ±1.5° (alternating), and stays still under reduced motion.
- **Buttons** (`.btn` + `.btn-primary` / `.btn-secondary` / `.btn-sol` / `.btn-verified` / `.btn-danger`, `.btn-sm`): 4px corners, 650 weight, 1px press-down. On celeste regions buttons are ink (`bg-ink text-on-ink`).
- **Inputs** (`.input`, `.input-sm`): white, 1px hairline, action-blue border plus a 3px soft focus halo. The Instagram field uses a fused "@" prefix.
- **Instagram embed** (`components/instagram-embed.tsx`): Instagram's own `/embed/` iframe, 540px tall, framed in a hairline box.
- **Admin nav** (`components/admin-nav.tsx`): underline tabs on a muted band, plus Spanish status pills (En revisión / Publicado / Rechazado / Suspendido).

## Do's and Don'ts

- **Do** open each page with a celeste field and put the page's action inside it.
- **Do** keep the athlete's photo, name and story larger than anything the platform says.
- **Don't** use flags, the Sol de Mayo, or national emblems as ornament.
- **Don't** use sol outside support/money moments.
- **Don't** add eyebrow labels, gradient text, glass, or same-size icon-card rows.
- **Don't** invent stats, totals raised or testimonials. There are none yet.
