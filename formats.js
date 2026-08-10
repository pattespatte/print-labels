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

    // --- AVERY Zweckform / A4 codes. Geometry sourced from published Word template
    // presets and template sites (PieterPost, openlabelmaker, hlabels.com, LabelPlanet
    // cross-reference guide). L7911-10 and L7651 reuse the HERMA 4346 / 5027 die cuts
    // (same dimensions, per-sheet count, and grid); the AVERY codes are listed separately
    // so users can match the package code in their hand. Margins/pitch here match the
    // published presets but are not empirically printer-calibrated the way 5027/4336 are.
    "L7911-10": {
      // Avery Zweckform L7911 / L7636 (also sold as 7636-10, L7636-25). Same die cut
      // as HERMA 4346: 48/sheet, 45.7 x 21.2 mm, 4 cols x 12 rows. Dimensions and grid
      // confirmed by hlabels.com, LabelPlanet LP48-45, and Avery's own template page.
      id: "L7911-10",
      name: "AVERY L7911-10 / L7636 · 45.7×21.2mm · 48/sheet",
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
    "L7160": {
      // 21/sheet, 63.5 x 38.1 mm, 3 cols x 7 rows. Word preset: side 0.86 cm,
      // top 1.51 cm, pitch 6.64 cm x 3.81 cm (PieterPost). The standard A4 address label.
      id: "L7160",
      name: "AVERY L7160 · 63.5×38.1mm · 21/sheet",
      pageW_mm: 210,
      pageH_mm: 297,
      cols: 3,
      rows: 7,
      labelW_mm: 63.5,
      labelH_mm: 38.1,
      marginTop_mm: 15.1,
      marginLeft_mm: 8.6,
      pitchX_mm: 66.4,
      pitchY_mm: 38.1,
      cornerRadius_mm: 2.5,
    },
    "L7163": {
      // 14/sheet, 99.1 x 38.1 mm, 2 cols x 7 rows. Word preset: side 0.61 cm,
      // top 1.51 cm, pitch 10.2 cm x 3.81 cm (PieterPost / openlabelmaker).
      id: "L7163",
      name: "AVERY L7163 · 99.1×38.1mm · 14/sheet",
      pageW_mm: 210,
      pageH_mm: 297,
      cols: 2,
      rows: 7,
      labelW_mm: 99.1,
      labelH_mm: 38.1,
      marginTop_mm: 15.1,
      marginLeft_mm: 6.1,
      pitchX_mm: 102.0,
      pitchY_mm: 38.1,
      cornerRadius_mm: 2.5,
    },
    "L7651": {
      // 65/sheet, 38.1 x 21.2 mm, 5 cols x 13 rows. Same die cut as HERMA 5027.
      // HERMA 5027 has an empirically tuned pitchX override (39.5mm) for the user's
      // printer; this AVERY entry keeps the nominal symmetric geometry instead —
      // recalibrate if you see horizontal drift across columns.
      id: "L7651",
      name: "AVERY L7651 · 38.1×21.2mm · 65/sheet",
      pageW_mm: 210,
      pageH_mm: 297,
      cols: 5,
      rows: 13,
      labelW_mm: 38.1,
      labelH_mm: 21.2,
      marginTop_mm: 6.0,
      marginLeft_mm: 10.0,
      pitchX_mm: 38.1,
      pitchY_mm: 21.2,
      cornerRadius_mm: 2,
    },
    "L7165": {
      // 8/sheet, 99.1 x 67.7 mm, 2 cols x 4 rows. Word preset: side 0.47 cm,
      // top 1.3 cm, pitch 10.16 cm x 6.77 cm (howtodotechystuff). Vertical pitch 67.7mm
      // is tight: top 13 + 3×67.7 + 67.7 = 284.8mm, ~12mm bottom edge — fits.
      id: "L7165",
      name: "AVERY L7165 · 99.1×67.7mm · 8/sheet",
      pageW_mm: 210,
      pageH_mm: 297,
      cols: 2,
      rows: 4,
      labelW_mm: 99.1,
      labelH_mm: 67.7,
      marginTop_mm: 13.0,
      marginLeft_mm: 4.7,
      pitchX_mm: 101.6,
      pitchY_mm: 67.7,
      cornerRadius_mm: 3,
    },
    "L7169": {
      // 4/sheet, 99.1 x 139 mm, 2 cols x 2 rows. Word preset: side 0.95 cm,
      // top 0.46 cm, pitch 13.9 cm x 10.16 cm (howtodotechystuff). Note the preset's
      // LW/HP and LH/VP are swapped relative to the landscape label orientation; we
      // use width 99.1 x height 139 in portrait (matches the L7169 product pages).
      id: "L7169",
      name: "AVERY L7169 · 99.1×139mm · 4/sheet",
      pageW_mm: 210,
      pageH_mm: 297,
      cols: 2,
      rows: 2,
      labelW_mm: 99.1,
      labelH_mm: 139.0,
      marginTop_mm: 9.5,
      marginLeft_mm: 4.6,
      pitchX_mm: 101.6,
      pitchY_mm: 139.0,
      cornerRadius_mm: 3,
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
    // AVERY Zweckform / A4 codes — curated common set.
    "L7911-10",
    "L7160",
    "L7163",
    "L7651",
    "L7165",
    "L7169",
  ];
})();
