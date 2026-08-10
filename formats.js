/*
 * formats.js — HERMA A4 label format catalog.
 *
 * Loaded as a classic <script> (NOT an ES module) because the app must work when
 * opened via file://, where ES module imports and fetch() are blocked by CORS.
 * Exposes the catalog on window.FORMATS and the UI order on window.FORMAT_ORDER.
 *
 * Field reference (all in millimetres):
 *   id              — HERMA product code (e.g. "5027"); used as the state key
 *   name            — human-readable label shown in the format selector
 *   pageW_mm        — sheet width  (A4 = 210)
 *   pageH_mm        — sheet height (A4 = 297)
 *   cols            — labels per row
 *   rows            — labels per column
 *   labelW_mm       — die-cut label width
 *   labelH_mm       — die-cut label height
 *   marginTop_mm    — gap from the top edge of the sheet to the top of row 0
 *   marginLeft_mm   — gap from the left edge of the sheet to the left of column 0
 *   pitchX_mm       — horizontal distance between the start of one label and the next
 *                     (= label width + horizontal gap). Defaults to labelW_mm if omitted,
 *                     but several formats use a MANUAL OVERRIDE to correct alignment drift.
 *   pitchY_mm       — vertical distance between the start of one label and the next.
 *                     Manual override where noted.
 *   cornerRadius_mm — visual only; drawn in the preview outline.
 *
 * Source authority: scripts/print_labels.py from the 2026--gardening repo. The 5027 and
 * 4336 pitch values are empirical overrides copied from that script to correct drift on
 * the user's printer. Formats flagged // VERIFY have dimensions and per-sheet counts from
 * openlabelmaker.com / hlabels.com but their margins and pitch are UNCONFIRMED — confirm
 * against an official HERMA template (or a calibration-grid printout) before relying on them.
 */
(function () {
  "use strict";

  window.FORMATS = {
    "5027": {
      id: "5027",
      name: "HERMA 5027 · 38.1×21.2mm · 65/sheet",
      pageW_mm: 210,
      pageH_mm: 297,
      cols: 5,
      rows: 13,
      labelW_mm: 38.1,
      labelH_mm: 21.2,
      marginTop_mm: 6.0,
      marginLeft_mm: 10.0,
      // MANUAL OVERRIDE (from print_labels.py): standard pitch ~38.0mm shifts the
      // rightmost column; spread +1.5mm across 4 gaps → pitch 39.5mm.
      pitchX_mm: 39.5,
      pitchY_mm: 21.2,
      cornerRadius_mm: 2,
    },
    "4336": {
      id: "4336",
      name: "HERMA 4336 · 35.6×16.9mm · 80/sheet",
      pageW_mm: 210,
      pageH_mm: 297,
      cols: 5,
      rows: 16,
      labelW_mm: 35.6,
      labelH_mm: 16.9,
      marginTop_mm: 2.0,
      marginLeft_mm: 10.0,
      // MANUAL OVERRIDE (from print_labels.py): col 0 at 10mm, col 4 at 167mm
      // → (167-10)/4 = 39.25mm pitch. Rows tightened from 18.31mm to 17.78mm.
      pitchX_mm: 39.25,
      pitchY_mm: 17.78,
      cornerRadius_mm: 1.5,
    },

    // --- VERIFY: margins/pitch below unconfirmed against official HERMA templates ---
    "4344": {
      // VERIFY: 189/sheet. cols/rows split assumed 9×21 from 25.4mm pitch; confirm.
      id: "4344",
      name: "HERMA 4344 · 25.4×10mm · 189/sheet",
      pageW_mm: 210,
      pageH_mm: 297,
      cols: 9,
      rows: 21,
      labelW_mm: 25.4,
      labelH_mm: 10,
      marginTop_mm: 10.7,
      marginLeft_mm: 4.75,
      pitchX_mm: 22.4,
      pitchY_mm: 13.5,
      cornerRadius_mm: 1,
    },
    "4346": {
      // 48/sheet confirmed (4×12). pitchX 48.26 and pitchY 23.99 retained; with
      // marginLeft 9.6 the columns sit at 9.6/9.9 mm (symmetric). The previous
      // marginTop 13.5 pushed the last row 1.6 mm past the sheet edge (13.5 +
      // 11×23.99 + 21.167 = 298.6 mm). Corrected to 6.0, which mirrors the
      // horizontal symmetry: top 6.0 / bottom 5.9 mm. Still derive-from-symmetry,
      // not an official HERMA template — confirm with a ruler before relying on it.
      id: "4346",
      name: "HERMA 4346 · 45.7×21.2mm · 48/sheet",
      pageW_mm: 210,
      pageH_mm: 297,
      cols: 4,
      rows: 12,
      labelW_mm: 45.72,
      labelH_mm: 21.167,
      marginTop_mm: 6.0,
      marginLeft_mm: 9.6,
      pitchX_mm: 48.26,
      pitchY_mm: 23.99,
      cornerRadius_mm: 2,
    },
    "4474": {
      // VERIFY: 40/sheet. cols/rows assumed 4×10; confirm margins and pitch.
      id: "4474",
      name: "HERMA 4474 · 48.5×25.4mm · 40/sheet",
      pageW_mm: 210,
      pageH_mm: 297,
      cols: 4,
      rows: 10,
      labelW_mm: 48.5,
      labelH_mm: 25.4,
      marginTop_mm: 10.7,
      marginLeft_mm: 7.75,
      pitchX_mm: 48.75,
      pitchY_mm: 27.77,
      cornerRadius_mm: 2,
    },
    "4632": {
      // VERIFY: 24/sheet. cols/rows assumed 3×8; confirm margins and pitch.
      id: "4632",
      name: "HERMA 4632 · 63.5×33.9mm · 24/sheet",
      pageW_mm: 210,
      pageH_mm: 297,
      cols: 3,
      rows: 8,
      labelW_mm: 63.5,
      labelH_mm: 33.9,
      marginTop_mm: 13.5,
      marginLeft_mm: 7.35,
      pitchX_mm: 65.1,
      pitchY_mm: 34.0,
      cornerRadius_mm: 2.5,
    },
    "4360": {
      // VERIFY: 21/sheet. cols/rows assumed 3×7; confirm margins and pitch.
      id: "4360",
      name: "HERMA 4360 · 63.5×38.1mm · 21/sheet",
      pageW_mm: 210,
      pageH_mm: 297,
      cols: 3,
      rows: 7,
      labelW_mm: 63.5,
      labelH_mm: 38.1,
      marginTop_mm: 13.5,
      marginLeft_mm: 7.35,
      pitchX_mm: 65.1,
      pitchY_mm: 38.1,
      cornerRadius_mm: 2.5,
    },
    "4428": {
      id: "4428",
      name: "HERMA 4428 · full A4 · 1/sheet",
      pageW_mm: 210,
      pageH_mm: 297,
      cols: 1,
      rows: 1,
      labelW_mm: 210,
      labelH_mm: 297,
      marginTop_mm: 0,
      marginLeft_mm: 0,
      pitchX_mm: 210,
      pitchY_mm: 297,
      cornerRadius_mm: 0,
    },
    // --- end VERIFY block ---
  };

  // Order in which formats appear in the UI. User's own formats first.
  window.FORMAT_ORDER = [
    "5027",
    "4336",
    "4344",
    "4346",
    "4474",
    "4632",
    "4360",
    "4428",
  ];
})();
