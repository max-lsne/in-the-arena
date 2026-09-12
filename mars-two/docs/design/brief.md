# Design brief: mars-two

Status: awaiting sign-off
Date: 2026-09-12

No front-end code is written until this is approved.

## Subject, audience, job

The subject is an operating system for a holding company that owns eight European B2B
SaaS businesses. It is not a BI tool and not a chat product. Agents run against the
portfolio and produce artefacts a person acts on.

The primary user is a group operator accountable for all eight companies. They open
this at 7am to answer one question: which of these eight needs me today. They read
numbers for hours, they are hostile to decoration, and they have seen every private
equity dashboard that exists.

The secondary user is a portfolio company executive who visits occasionally, sees only
their own company, and needs orientation rather than density.

The interface's job is to make deviation visible and then let someone act on it.
Showing the data is the easy half; the hard half is that eight companies times nine
metrics is seventy-two numbers, and sixty-eight of them are fine.

## Concept: the register

One row per company. Fixed order, always all eight, never paginated. Comparison happens
down aligned columns, which is the thing a grid of cards cannot do.

Steady state carries no colour. A metric sitting inside its expected band renders as
plain ink. Colour appears only where a value has broken out of its band, so the page
can be read by shape before any number is read. The operator learns where Meterpath
sits in the list and stops reading names.

Time lives inside the row as a small inline series rather than in a separate chart
section, because "down 4% this month" and "down every month since March" are different
problems and a single figure hides which one you have.

## One bold element

The portfolio header is a single full-width band showing all eight companies' share of
the EUR 70.0M, as proportional widths in their assigned hues. The band is also the
navigation: select a segment and the register filters to it.

One object doing three jobs. It shows the total, it shows the concentration, and it is
how you move around. Concentration is the thing a holding company actually watches, and
a stacked band states it without a sentence.

Everything below the band is quiet. The band is the only place boldness is spent.

## Colour

Base palette, six values.

| Token | Hex | Role |
| --- | --- | --- |
| `--ground` | `#EDEFF1` | Page ground. Cool, low chroma, restful under long reading |
| `--surface` | `#F8F9FA` | Register rows and panels raised off the ground |
| `--ink` | `#1A2430` | Primary text. Genuinely blue-slate, carrying real chroma |
| `--ink-soft` | `#5A6875` | Labels, column headers, secondary values |
| `--rule` | `#D3D9DE` | Hairlines and column separators |
| `--focus` | `#2B4C7E` | Focus rings, selection, the single interactive accent |

Deviation is signalled by two further values, `#B23A48` for below band and `#2E7D6B`
for above. Neither carries meaning alone: direction is also shown by the value's
position against a drawn band, so the display works without colour vision.

Eight company hues, held at similar lightness so no company looks more important than
another, and separated in hue enough to stay distinguishable in an 8px band segment.

| Company | Hex |
| --- | --- |
| Vaultline | `#3D5A8A` |
| Meterpath | `#9A5B32` |
| Northquay | `#4A7A54` |
| Deskwright | `#7A4A82` |
| Sayline | `#B0763B` |
| Tidyrecord | `#2F7B8C` |
| Roomcast | `#A34A5E` |
| Clausemark | `#5C6470` |

These are a categorical data palette rather than brand colour, so they are governed by
the dataviz rules and validated for contrast against both `--ground` and `--surface`
before build.

## Type

One family: Archivo, variable, using the width axis as the hierarchy device instead of
adding a second typeface.

| Role | Setting |
| --- | --- |
| Portfolio header, the EUR 70.0M figure | Archivo Expanded, 600, tight tracking |
| Company names in the register | Archivo, 500 |
| Column headers | Archivo Condensed, 500, sentence case |
| Values | Archivo, 400, `font-variant-numeric: tabular-nums` |
| Body and artefact prose | Archivo, 400, 62 character measure, 1.6 line height |

Width is doing the work because the content is columns of numbers, where horizontal
space is the scarce dimension and condensing a header is a real solution rather than a
stylistic one. Tabular figures throughout so digits align vertically in a column, which
is what makes a register scannable.

Monospace appears in exactly one place, the agent run trace, where the content is
actually code.

## Layout

Portfolio view.

```
+--------------------------------------------------------------------------+
|  Portfolio                                          Thu 12 Sep, 07:14     |
|                                                                          |
|  EUR 70.0M ARR                                                           |
|  [Meterpath  ][Vaultline ][Deskwright][Northquay][Roomcast][Say][Cla][Ti] |
|                                                                          |
+--------------------------------------------------------------------------+
|            ARR      Net rev ret   Gross margin   Pipeline    Open risks   |
+--------------------------------------------------------------------------+
| Vaultline  12.0M    ~~~~~~-~ 104%  ~~~~~~~~ 81%  ~~~-~~~~   2             |
| Meterpath  14.5M    ~~~~-___  91%  ~~~~~~~~ 74%  ~~~~~~~~   5             |
| Northquay   8.2M    ~~~~~~~~ 108%  ~~~~~~~~ 88%  ~~~~~~~~   1             |
| Deskwright 11.0M    ~~~~~~~~ 101%  ~~~~~~~~ 79%  ~~~~~~~~   -             |
| Sayline     6.4M    ~~~~~~~~ 112%  ~~~~~~~~ 83%  ~~__~~~~   3             |
| Tidyrecord  5.1M    ~~~~~~~~  99%  ~~~~~~~~ 76%  ~~~~~~~~   1             |
| Roomcast    7.3M    ~~~~~~~~ 103%  ~~~~~~~~ 85%  ~~~~~~~~   -             |
| Clausemark  5.5M    ~~~~~~~~ 106%  ~~~~~~~~ 80%  ~~~~~~~~   2             |
+--------------------------------------------------------------------------+
|  Needs a decision                                                        |
|  Meterpath  Net revenue retention below band for a fourth month   [open] |
|  Sayline    Pipeline coverage fell to 2.1x from 3.4x              [open] |
+--------------------------------------------------------------------------+
```

The inline series sits in the same cell as the value. Underscores mark months outside
the band. Nothing is coloured except those.

Agent artefact view. Evidence is not behind a disclosure; it is the right-hand column,
because an artefact whose evidence is hidden gets trusted without being checked.

```
+-----------------------------------+--------------------------------------+
| Contract to billing, Meterpath    |  Evidence                            |
| Run 4417, 12 Sep 07:02, 41s       |                                      |
|                                   |  contract MTR-2231 s.4.2             |
| Four contracts are billing below  |  "annual uplift of 4% on each         |
| their contracted amount. Total    |   anniversary"                       |
| EUR 128,400 annualised.           |  -> invoice 88201, 88794, 89310      |
|                                   |     no uplift applied                |
| MTR-2231  uplift not applied      |                                      |
|           EUR 41,200              |  metric: contracted_vs_billed        |
|                                   |  computed in SQL, 3 invoices         |
| MTR-2890  seat growth unbilled    |                                      |
|           EUR 52,900              |  contract MTR-2890 s.2.1             |
|                                   |  seats 400 -> 520 on 2026-03-01      |
| [Draft the billing correction]    |  billed 400 through 2026-09          |
+-----------------------------------+--------------------------------------+
```

Error analysis view. This is a working surface rather than a report, so failures are
listed and opened, with the grader's verdict next to the agent's output.

```
+--------------------------------------------------------------------------+
| Evals / contract-to-billing / run 4417      precision 0.91  recall 0.83   |
+--------------------------------------------------------------------------+
| case          planted              agent said            grader           |
| MTR-2231      uplift 41,200        uplift 41,200         match            |
| MTR-2890      seats 52,900         seats 52,900          match            |
| MTR-3102      currency 18,700      not found             miss     [open]  |
| MTR-4455      -                    discount 9,100        false pos [open] |
+--------------------------------------------------------------------------+
```

## Motion

One orchestrated moment. When an agent run completes, the register rows it affected
resolve in place, once. No entrance animation on sections, no hover transition on rows,
no transitions on the band. Motion that answers a click stays: opening an artefact,
expanding a case.

`prefers-reduced-motion` removes the resolve and lands the new state directly.

## What was rejected, and why

A grid of eight company cards. This is the default and it fails twice: it is the
SaaS-card-kit look that reads as generated, and it is functionally worse, because
values in separate cards are not on a common axis and cannot be compared by eye.

A KPI tile row across the top, big number with small label and a gradient accent. The
most common dashboard opening and the one explicitly worth avoiding. The stacked ARR
band replaces it and carries more information in less height.

A dark control-room interface with a bright accent. Tempting for an operations product
and wrong for a surface people read numbers on for hours.

Cream ground, high-contrast serif display, terracotta accent. A recognisable generated
look, and unrelated to the subject.

Monospace for all data labels. The instinct behind it is right, that digits should
align. Tabular figures in a proportional face solve that without the costume.

Numbered markers on sections. The content is not a sequence, so numbering it would
assert a structure that is not there.

A left sidebar with a top bar and a card grid. The default admin shell. The ARR band
absorbs the navigation, which removes a whole chrome layer.

## Quality floor

Responsive to 400px, where the register reflows to one company per screen with the
columns stacked. Visible keyboard focus on every interactive element. Reduced motion
respected. Contrast validated for all eight company hues against both grounds. The
register is a real table with real headers, so it is navigable by screen reader.

## Sign-off

Approve, or name the axis you want changed. The concept, the palette and the type can
each be revised independently.
