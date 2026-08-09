# Print Labels

A small, dependency-free web app for printing labels onto pre-cut **HERMA A4**
label sheets using any browser's print dialog. Open the page, load some data,
pick a HERMA format, and print.

It works for anything you'd put on a small label: pantry jars and freezer
portions, address and mailing labels, file folders and archive boxes, kids'
belongings, workshop bins, name badges, batch numbers, seedling tags, and more.

> **Try it online:** <https://pattespatte.github.io/print-labels/>

## Run locally

Just open `index.html` — no server, no build step, no dependencies:

```bash
open index.html      # macOS
xdg-open index.html  # Linux
```

It also deploys cleanly to GitHub Pages as a set of static files.

## Getting data in

There are two ways to load labels:

1. **Demo data** — click the *Demo data* button in the **Data** panel to load a
   bundled sample covering several common use cases. (Works when the app is
   served over HTTP, e.g. on GitHub Pages. Under `file://` fetch is blocked by
   the browser, so use the drop zone instead.)
2. **Import a JSON file** — drop or pick a `.json` file in the **Data** panel.

The expected JSON shape is one of:

```json
[
  { "name": "Smoked paprika", "line2": "Pimentón de la Vera", "line3": "Best by 2027-04" }
]
```

```json
{
  "format": "5027",
  "items": [
    { "name": "Invoices", "line2": "2026", "line3": "Jan – Jun" }
  ]
}
```

A single object is also accepted (treated as a one-item list). The `{format,
items}` wrapper optionally selects the HERMA format; otherwise choose it in the
**Sheet** panel.

You can also import a previously exported **project file** (see below) to resume
a session — import recognises the project format and restores everything.

### Field naming convention

Each label has up to four text lines. The simplest convention is `name` for the
heading plus `line2`, `line3`, `line4` for the rest:

```json
{ "name": "Anna Lindberg", "line2": "Skogsvägen 12", "line3": "113 42 Stockholm", "line4": "Sweden" }
```

The app isn't tied to these names though — the **Auto mapping** button (and
first-import auto-detect) also recognises common alternatives like `title`,
`label`, `product`, `category`, `type`, `variety`, `date`, `note`, and nested
paths such as `growing.days_to_harvest`. Any field the import discovers can be
mapped manually in the **Field mapping** panel.

## Field mapping

After import, map object fields to up to four label lines in the **Field
mapping** panel. Each line has its own font size and bold toggle, and can take
either a field path (including dotted nested paths like
`growing.days_to_harvest`) or literal free text.

**Auto mapping** seeds the mapper from whatever fields it recognises — it picks a
heading line, a subtitle/category line, a date/detail line, and a note line.

## Printing

Click **Print**. In the browser dialog:

- Paper size: **A4**
- Margins: **None** (the app positions labels in mm from the sheet edge)
- Turn off headers and footers

Use the **Calibration grid** toggle to print a sheet with an outline around every
label slot — useful to verify alignment on a new printer before using real label
sheets.

## Reusing a partial sheet

Set **Skip first N labels** to leave the first N slots empty, so you can feed a
sheet that already has some labels printed on it.

## Export / Import project

**Export project** saves the full session — format, skip-N, grid, field mapping,
and every item with its quantity and selection — to a `.json` file. Re-importing
that file restores the exact preview. Use it for backups or to move a session
between machines (since imported items are not saved by the browser).

## Adding a HERMA format

Edit `formats.js` and add an entry to `window.FORMATS`, then add its id to
`window.FORMAT_ORDER`. Each entry needs (all in millimetres):

| Field | Meaning |
|-------|---------|
| `pageW_mm` / `pageH_mm` | Sheet size (A4 = 210 × 297) |
| `cols` / `rows` | Labels per row / per column |
| `labelW_mm` / `labelH_mm` | Die-cut label size |
| `marginTop_mm` / `marginLeft_mm` | Sheet edge to first label |
| `pitchX_mm` / `pitchY_mm` | Distance between label starts |
| `cornerRadius_mm` | Visual outline radius |

`5027` and `4336` have verified, empirically-tuned pitch values. Formats flagged
`// VERIFY` have correct label sizes but **unconfirmed margins and pitch** —
confirm against an official HERMA template or a calibration grid printout before
relying on them.

## License

MIT — see [LICENSE](LICENSE).

## Repository

<https://github.com/pattespatte/print-labels/>
