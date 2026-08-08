# Print Labels

A small, dependency-free web app for printing plant labels onto pre-cut HERMA A4
label sheets using a laser printer. Open `index.html`, import a JSON file of plant
data, choose a HERMA format, and print through your browser's print dialog.

Built as the browser-based successor to the `scripts/print_labels.py` workflow.

## Run locally

Just open `index.html` — no server, no build step, no dependencies:

```bash
open index.html      # macOS
xdg-open index.html  # Linux
```

It also deploys cleanly to GitHub Pages as a set of static files.

## Importing data

Use the **Data** panel to drop or pick a JSON file. The expected shape is a JSON
**array of objects**, for example the `seeds.json` from the gardening repo:

```json
[
  { "plant_name": "Tomato", "plant_name_swedish": "Tomat", "variety": "Vilma",
    "growing": { "days_to_harvest": 65 } }
]
```

A single object is also accepted (treated as a one-item list).

You can also import a previously exported **project file** (see below) to resume
a session — import recognises the project format and restores everything.

## Field mapping

After import, map object fields to up to four label lines in the **Field mapping**
panel. Each line has its own font size and bold toggle, and can take either a
field path (including dotted nested paths like `growing.days_to_harvest`) or
literal free text.

The **Plant labels preset** seeds the mapper for the `seeds.json` shape:
Swedish name (bold), variety, days to harvest, and a free-text line.

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

## Repository

<https://github.com/pattespatte/print-labels/>
