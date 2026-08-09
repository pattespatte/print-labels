/*
 * app.js — print-labels main application logic.
 *
 * Loaded as a classic <script> (see index.html). No ES modules, no build step.
 * Works under file:// — uses FileReader (not fetch) for import and avoids import.
 *
 * Module structure (all on a single app object):
 *   Layout       — pure geometry/positioning (Phase 1)
 *   LabelRender  — draw one label, font-fit (Phase 2)
 *   SheetRender  — draw a full sheet/page (Phase 2)
 *   Fields       — discover field paths from imported data (Phase 3)
 *   Project      — serialize/load full project state (Phase 3)
 *   UI           — wire DOM, render preview, import/export (Phases 3-4)
 */
(function () {
  "use strict";

  const STORAGE_KEY = "print-labels:state";
  const PROJECT_TYPE = "print-labels-project";
  const PROJECT_VERSION = 1;
  const PX_PER_MM = 96 / 25.4; // CSS px per mm at 96dpi

  // ---------------------------------------------------------------
  // Layout — pure geometry. Every positioning function lives here.
  // ---------------------------------------------------------------
  const Layout = {
    slotsPerPage(format) {
      return format.cols * format.rows;
    },
    pageOf(format, slotIndex) {
      return Math.floor(slotIndex / Layout.slotsPerPage(format));
    },
    // Top-left corner of a slot, in mm, relative to the page origin (top-left).
    slotPosition(format, slotIndex) {
      const perPage = Layout.slotsPerPage(format);
      const indexOnPage = slotIndex % perPage;
      const col = indexOnPage % format.cols;
      const row = Math.floor(indexOnPage / format.cols);
      const pitchX = format.pitchX_mm ?? format.labelW_mm;
      const pitchY = format.pitchY_mm ?? format.labelH_mm;
      return {
        x_mm: format.marginLeft_mm + col * pitchX,
        y_mm: format.marginTop_mm + row * pitchY,
      };
    },
    // Expand selected items by quantity into a flat list of full item objects.
    expandItems(items) {
      const out = [];
      for (const it of items) {
        if (!it.selected) continue;
        const q = Math.max(1, parseInt(it.qty, 10) || 1);
        for (let i = 0; i < q; i++) out.push(it);
      }
      return out;
    },
    // Build pages of slot payloads. Each page is an array of length
    // slotsPerPage; each slot is either null or a full item object
    // ({raw, lines, qty, selected}) so resolveLines can see frozen lines.
    fillSheet(format, items, skipN) {
      const perPage = Layout.slotsPerPage(format);
      const expanded = Layout.expandItems(items);
      const pages = [];
      let page = new Array(perPage).fill(null);
      let cursor = skipN; // first slot index on page 0

      // Skip may cross into later pages.
      while (cursor >= perPage) {
        pages.push(page);
        page = new Array(perPage).fill(null);
        cursor -= perPage;
      }

      for (const item of expanded) {
        if (cursor >= perPage) {
          pages.push(page);
          page = new Array(perPage).fill(null);
          cursor = 0;
        }
        page[cursor] = item;
        cursor++;
      }
      pages.push(page); // always push the (possibly empty) final page
      return pages;
    },
  };

  // ---------------------------------------------------------------
  // App state.
  // ---------------------------------------------------------------
  const state = {
    items: [], // [{ raw, qty, selected }]
    mapping: emptyMapping(), // [{ path, sizePt, bold, literal }]
    formatId: "5027",
    skipN: 0,
    grid: false,
    trueSize: false,
    fields: [], // discovered paths
  };

  function emptyMapping() {
    return [
      { path: "", sizePt: 7, bold: true, literal: "" },
      { path: "", sizePt: 6, bold: false, literal: "" },
      { path: "", sizePt: 6, bold: false, literal: "" },
      { path: "", sizePt: 6, bold: false, literal: "" },
    ];
  }

  function getFormat() {
    return window.FORMATS[state.formatId] || window.FORMATS[window.FORMAT_ORDER[0]];
  }

  // ---------------------------------------------------------------
  // Fields — discover paths in imported data (Phase 3).
  // ---------------------------------------------------------------
  const Fields = {
    discoverPaths(items) {
      const set = new Set();
      for (const item of items) {
        walk(item, "", set, /*depth*/ 0);
      }
      return Array.from(set).sort();
    },
  };

  function walk(value, prefix, set, depth) {
    if (depth > 4) return; // safety cap
    if (value === null || typeof value !== "object") return;
    for (const key of Object.keys(value)) {
      const v = value[key];
      const path = prefix ? prefix + "." + key : key;
      if (Array.isArray(v)) {
        set.add(path + "[0]");
        if (v[0] && typeof v[0] === "object") walk(v[0], path + "[0]", set, depth + 1);
      } else if (v && typeof v === "object") {
        // only recurse into objects; add the object path too so users can pick it
        // (its toString would be "[object Object]" but they may want a child).
        walk(v, path, set, depth + 1);
      } else if (v !== null && v !== undefined && v !== "") {
        set.add(path);
      }
    }
  }

  // Resolve a dotted/bracket path against an object. Returns "" if missing.
  function resolvePath(obj, path) {
    if (!path) return "";
    const parts = path
      .replace(/\[(\d+)\]/g, ".$1")
      .split(".")
      .filter(Boolean);
    let cur = obj;
    for (const p of parts) {
      if (cur === null || cur === undefined) return "";
      cur = cur[p];
    }
    if (cur === null || cur === undefined) return "";
    return String(cur);
  }

  // Resolve a single item into up-to-4 label lines.
  // If the item carries frozen `lines` (manual entry), use them directly and
  // bypass the field mapper — typed text is taken verbatim. Otherwise apply the
  // current mapping to the item's `raw` data.
  function resolveLines(item) {
    if (item.lines) {
      return item.lines.map((ln) => ({
        text: (ln && ln.text) || "",
        sizePt: ln.sizePt,
        bold: !!ln.bold,
      }));
    }
    const raw = item.raw || {};
    return state.mapping.map((m) => {
      let text = "";
      if (m.literal) text = m.literal;
      else if (m.path) {
        text = resolvePath(raw, m.path);
      }
      return { text: text || "", sizePt: m.sizePt, bold: !!m.bold };
    });
  }

  // ---------------------------------------------------------------
  // Project — serialize/load full state (Phase 3, task 3.5).
  // ---------------------------------------------------------------
  const Project = {
    serialize() {
      return {
        _type: PROJECT_TYPE,
        version: PROJECT_VERSION,
        exportedAt: new Date().toISOString(),
        formatId: state.formatId,
        skipN: state.skipN,
        grid: state.grid,
        mapping: JSON.parse(JSON.stringify(state.mapping)),
        items: state.items.map((i) => {
          const out = { qty: i.qty, selected: i.selected };
          if (i.lines) out.lines = i.lines;
          else out.raw = i.raw;
          return out;
        }),
      };
    },
    load(parsed) {
      if (parsed.version !== PROJECT_VERSION) {
        console.warn(
          "print-labels: project version mismatch (got",
          parsed.version,
          "expected",
          PROJECT_VERSION,
          ") — attempting best-effort load"
        );
      }
      if (window.FORMATS[parsed.formatId]) state.formatId = parsed.formatId;
      state.skipN = Math.max(0, parseInt(parsed.skipN, 10) || 0);
      state.grid = !!parsed.grid;
      if (Array.isArray(parsed.mapping) && parsed.mapping.length === 4) {
        state.mapping = parsed.mapping.map((m) => ({
          path: m.path || "",
          sizePt: Number(m.sizePt) || 6,
          bold: !!m.bold,
          literal: m.literal || "",
        }));
      }
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      state.items = items.map((i) => {
        const item = {
          qty: Math.max(1, parseInt(i.qty, 10) || 1),
          selected: i.selected !== false, // default true unless explicitly false
        };
        if (Array.isArray(i.lines)) item.lines = i.lines;
        else item.raw = i.raw || {};
        return item;
      });
    },
    download() {
      const obj = Project.serialize();
      const json = JSON.stringify(obj, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const a = document.createElement("a");
      a.href = url;
      a.download = "print-labels-project-" + today + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  };

  // ===============================================================
  // Everything below is UI wiring, filled in across Phases 2-5.
  // Kept as stubs at Phase 1 so the file is coherent and runnable.
  // ===============================================================

  const UI = {
    LabelRender: {
      // Phase 2, task 2.1
      draw(parent, label, format, opts) {
        // label: { lines: [{text,sizePt,bold}] } OR null (empty slot)
        // opts: { grid }
        const div = document.createElement("div");
        div.className = "label";
        div.style.width = format.labelW_mm + "mm";
        div.style.height = format.labelH_mm + "mm";
        if (format.cornerRadius_mm) {
          div.style.borderRadius = format.cornerRadius_mm + "mm";
        }
        if (label === null) {
          div.classList.add("empty");
          if (opts && opts.grid) div.classList.add("grid-on");
          parent.appendChild(div);
          return;
        }
        if (opts && opts.grid) div.classList.add("grid-on");
        const maxW_mm = format.labelW_mm - 2; // 1mm padding each side
        for (const line of label.lines) {
          if (!line.text) continue;
          const span = document.createElement("div");
          span.className = "line";
          span.textContent = line.text;
          const fit = UI.LabelRender.fitText(
            line.text,
            line.sizePt,
            line.bold,
            maxW_mm
          );
          span.style.fontSize = fit.sizePt + "pt";
          span.style.fontWeight = line.bold ? "700" : "400";
          span.textContent = fit.text;
          div.appendChild(span);
        }
        parent.appendChild(div);
      },
      // Phase 2, task 2.3 — canvas-based measurement (avoids DOM thrash).
      _measureCtx: null,
      _measure(text, fontPx, bold) {
        if (!UI.LabelRender._measureCtx) {
          const c = document.createElement("canvas");
          UI.LabelRender._measureCtx = c.getContext("2d");
        }
        const ctx = UI.LabelRender._measureCtx;
        ctx.font =
          (bold ? "700 " : "400 ") + fontPx + 'px -apple-system, "Segoe UI", Roboto, sans-serif';
        return (ctx.measureText(text).width / PX_PER_MM); // → mm
      },
      _cache: new Map(),
      fitText(text, sizePt, bold, maxW_mm) {
        const cacheKey = text + "|" + sizePt + "|" + bold + "|" + maxW_mm.toFixed(2);
        if (UI.LabelRender._cache.has(cacheKey)) {
          return UI.LabelRender._cache.get(cacheKey);
        }
        let size = sizePt;
        const minSize = 4;
        while (size > minSize) {
          const fontPx = size * (96 / 72); // pt → px
          const w = UI.LabelRender._measure(text, fontPx, bold);
          if (w <= maxW_mm) {
            const result = { text, sizePt: size };
            UI.LabelRender._cache.set(cacheKey, result);
            return result;
          }
          size -= 0.5;
        }
        // floor reached — truncate with ellipsis
        const fontPx = minSize * (96 / 72);
        let t = text;
        while (t.length && UI.LabelRender._measure(t + "…", fontPx, bold) > maxW_mm) {
          t = t.slice(0, -1);
        }
        const result = { text: t + "…", sizePt: minSize };
        UI.LabelRender._cache.set(cacheKey, result);
        return result;
      },
    },

    SheetRender: {
      // Phase 2, task 2.2
      drawPage(format, pageSlots, opts) {
        const sheet = document.createElement("div");
        sheet.className = "sheet";
        sheet.style.width = format.pageW_mm + "mm";
        sheet.style.height = format.pageH_mm + "mm";
        for (let i = 0; i < pageSlots.length; i++) {
          const item = pageSlots[i];
          const pos = Layout.slotPosition(format, i);
          // resolveLines takes the full item (handles frozen lines OR raw+mapping).
          const label = item === null ? null : { lines: resolveLines(item) };
          // draw() appends a .label to a parent; we create a positioned wrapper.
          // Simpler: let draw append to sheet, then set position.
          const beforeCount = sheet.children.length;
          UI.LabelRender.draw(sheet, label, format, opts);
          const el = sheet.children[beforeCount];
          el.style.left = pos.x_mm + "mm";
          el.style.top = pos.y_mm + "mm";
        }
        return sheet;
      },
    },

    // ---- DOM wiring ----
    el: {},

    init() {
      // Only boot on the real app page (has #preview). The dev test.html loads
      // app.js too but has no app DOM; skip wiring in that case.
      if (!document.getElementById("preview")) return;
      const $ = (id) => document.getElementById(id);
      UI.el = {
        fileInput: $("file-input"),
        dropZone: $("drop-zone"),
        demoBtn: $("demo-btn"),
        exportBtn: $("export-btn"),
        ioStatus: $("io-status"),
        itemsList: $("items-list"),
        selectAll: $("select-all"),
        selectNone: $("select-none"),
        mapperRows: $("mapper-rows"),
        presetPlant: $("preset-plant"),
        clearMapping: $("clear-mapping"),
        addItem: $("add-item"),
        clearAll: $("clear-all"),
        itemEditor: $("item-editor"),
        editorSave: $("editor-save"),
        editorCancel: $("editor-cancel"),
        editorQty: $("editor-qty"),
        printBtnHeader: $("print-btn-header"),
        modalBackdrop: $("modal-backdrop"),
        modalTitle: $("modal-title"),
        modalBody: $("modal-body"),
        modalCancel: $("modal-cancel"),
        modalConfirm: $("modal-confirm"),
        formatSelect: $("format-select"),
        skipN: $("skip-n"),
        gridToggle: $("grid-toggle"),
        scaleToggle: $("scale-toggle"),
        formatMeta: $("format-meta"),
        preview: $("preview"),
        printBtn: $("print-btn"),
      };
      UI.loadPersisted();
      UI.buildFormatSelect();
      UI.buildMapperRows();
      UI.bind();
      UI.renderItems();
      UI.renderPreview();
    },

    buildFormatSelect() {
      const sel = UI.el.formatSelect;
      sel.innerHTML = "";
      for (const id of window.FORMAT_ORDER) {
        const f = window.FORMATS[id];
        if (!f) continue;
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = f.name;
        sel.appendChild(opt);
      }
      sel.value = state.formatId;
    },

    buildMapperRows() {
      const host = UI.el.mapperRows;
      host.innerHTML = "";
      state.mapping.forEach((m, idx) => {
        const row = document.createElement("div");
        row.className = "mapper-row";
        const sel = document.createElement("select");
        sel.dataset.idx = idx;
        sel.dataset.kind = "path";
        const none = document.createElement("option");
        none.value = "";
        none.textContent = "— none —";
        sel.appendChild(none);
        for (const p of state.fields) {
          const o = document.createElement("option");
          o.value = p;
          o.textContent = p;
          sel.appendChild(o);
        }
        sel.value = m.path;
        sel.addEventListener("change", (e) => {
          state.mapping[idx].path = e.target.value;
          UI.persist();
          UI.renderPreview();
        });

        const sizeIn = document.createElement("input");
        sizeIn.type = "number";
        sizeIn.min = "4";
        sizeIn.max = "20";
        sizeIn.value = m.sizePt;
        sizeIn.dataset.idx = idx;
        sizeIn.dataset.kind = "size";
        sizeIn.title = "font size (pt)";
        sizeIn.addEventListener("change", (e) => {
          state.mapping[idx].sizePt = Number(e.target.value) || 6;
          UI.persist();
          UI.renderPreview();
        });

        const boldLbl = document.createElement("label");
        const boldCb = document.createElement("input");
        boldCb.type = "checkbox";
        boldCb.checked = m.bold;
        boldCb.dataset.idx = idx;
        boldCb.dataset.kind = "bold";
        boldCb.addEventListener("change", (e) => {
          state.mapping[idx].bold = e.target.checked;
          UI.persist();
          UI.renderPreview();
        });
        boldLbl.appendChild(boldCb);
        boldLbl.appendChild(document.createTextNode("B"));

        const lit = document.createElement("input");
        lit.type = "text";
        lit.placeholder = "literal text";
        lit.value = m.literal;
        lit.dataset.idx = idx;
        lit.dataset.kind = "literal";
        lit.addEventListener("change", (e) => {
          state.mapping[idx].literal = e.target.value;
          UI.persist();
          UI.renderPreview();
        });

        const lineno = document.createElement("span");
        lineno.className = "lineno";
        lineno.textContent = String(idx + 1);

        row.appendChild(lineno);
        row.appendChild(sel);
        const controls = document.createElement("div");
        controls.style.display = "flex";
        controls.style.gap = "4px";
        controls.style.alignItems = "center";
        controls.appendChild(sizeIn);
        controls.appendChild(boldLbl);
        row.appendChild(controls);
        row.appendChild(lit);
        host.appendChild(row);
      });
    },

    bind() {
      UI.el.formatSelect.addEventListener("change", (e) => {
        state.formatId = e.target.value;
        UI.persist();
        UI.renderPreview();
      });
      UI.el.skipN.addEventListener("change", (e) => {
        state.skipN = Math.max(0, parseInt(e.target.value, 10) || 0);
        UI.persist();
        UI.renderPreview();
      });
      UI.el.gridToggle.addEventListener("change", (e) => {
        state.grid = e.target.checked;
        UI.persist();
        UI.renderPreview();
      });
      UI.el.scaleToggle.addEventListener("change", (e) => {
        state.trueSize = e.target.checked;
        UI.renderPreview();
      });

      UI.el.fileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) UI.importFile(file);
      });
      ["dragenter", "dragover"].forEach((ev) =>
        UI.el.dropZone.addEventListener(ev, (e) => {
          e.preventDefault();
          e.stopPropagation();
          UI.el.dropZone.classList.add("dragover");
        })
      );
      ["dragleave", "drop"].forEach((ev) =>
        UI.el.dropZone.addEventListener(ev, (e) => {
          e.preventDefault();
          e.stopPropagation();
          UI.el.dropZone.classList.remove("dragover");
        })
      );
      UI.el.dropZone.addEventListener("drop", (e) => {
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) UI.importFile(file);
      });

      UI.el.exportBtn.addEventListener("click", () => Project.download());
      UI.el.demoBtn.addEventListener("click", UI.loadDemo);

      UI.el.selectAll.addEventListener("click", () => {
        state.items.forEach((i) => (i.selected = true));
        UI.renderItems();
        UI.renderPreview();
      });
      UI.el.selectNone.addEventListener("click", () => {
        state.items.forEach((i) => (i.selected = false));
        UI.renderItems();
        UI.renderPreview();
      });

      UI.el.presetPlant.addEventListener("click", UI.applyAutoMapping);
      UI.el.clearMapping.addEventListener("click", () => {
        state.mapping = emptyMapping();
        UI.buildMapperRows();
        UI.persist();
        UI.renderPreview();
      });

      UI.el.addItem.addEventListener("click", () => UI.openEditor());
      UI.el.clearAll.addEventListener("click", () =>
        UI.confirmModal({
          title: "Clear all items?",
          body:
            "This removes all imported and manual items, the field mapping, and the " +
            "skip-N setting. Format choice and grid toggle are kept. This cannot be undone.",
          confirmLabel: "Clear all",
          onConfirm: UI.clearAll,
        })
      );
      UI.el.editorCancel.addEventListener("click", () => UI.closeEditor());
      UI.el.editorSave.addEventListener("click", () => UI.saveManualItem());

      UI.el.printBtn.addEventListener("click", UI.print);
      UI.el.printBtnHeader.addEventListener("click", UI.print);

      // Modal wiring (reusable). Cancel = dismiss; backdrop click = dismiss.
      UI.el.modalCancel.addEventListener("click", UI.closeModal);
      UI.el.modalBackdrop.addEventListener("click", (e) => {
        if (e.target === UI.el.modalBackdrop) UI.closeModal();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !UI.el.modalBackdrop.hidden) UI.closeModal();
      });
    },

    // --- Reusable confirm modal ---
    // Usage: UI.confirmModal({ title, body, confirmLabel, onConfirm })
    _modalOnConfirm: null,
    confirmModal(opts) {
      UI.el.modalTitle.textContent = opts.title || "Are you sure?";
      UI.el.modalBody.textContent = opts.body || "";
      UI.el.modalConfirm.textContent = opts.confirmLabel || "Confirm";
      // Rebind the confirm handler each time (one-shot).
      UI._modalOnConfirm = opts.onConfirm || null;
      UI.el.modalConfirm.onclick = () => {
        const fn = UI._modalOnConfirm;
        UI.closeModal();
        if (fn) fn();
      };
      UI.el.modalBackdrop.hidden = false;
      UI.el.modalConfirm.focus();
    },

    closeModal() {
      UI.el.modalBackdrop.hidden = true;
      UI._modalOnConfirm = null;
    },

    clearAll() {
      state.items = [];
      state.mapping = emptyMapping();
      state.skipN = 0;
      state.fields = [];
      UI.el.skipN.value = 0;
      UI.el.ioStatus.textContent = "";
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        /* ignore */
      }
      UI.buildMapperRows();
      UI.renderItems();
      UI.renderPreview();
    },

    // ---- Manual label entry ----
    // A manual item stores frozen `lines: [{text,sizePt,bold}]`. Line 1 is bold
    // and slightly larger by default, mirroring the plant preset. These bypass
    // the field mapper (typed text is taken verbatim).
    openEditor(lines, qty) {
      const editor = UI.el.itemEditor;
      editor.hidden = false;
      const inputs = editor.querySelectorAll('input[data-line]');
      const defaults = [
        { text: "", sizePt: 7, bold: true },
        { text: "", sizePt: 6, bold: false },
        { text: "", sizePt: 6, bold: false },
        { text: "", sizePt: 6, bold: false },
      ];
      const src = lines || defaults;
      inputs.forEach((inp, i) => {
        inp.value = (src[i] && src[i].text) || "";
      });
      UI.el.editorQty.value = qty || 1;
      inputs[0].focus();
    },

    closeEditor() {
      UI.el.itemEditor.hidden = true;
    },

    saveManualItem() {
      const editor = UI.el.itemEditor;
      const inputs = editor.querySelectorAll('input[data-line]');
      const lines = [
        { text: inputs[0].value, sizePt: 7, bold: true },
        { text: inputs[1].value, sizePt: 6, bold: false },
        { text: inputs[2].value, sizePt: 6, bold: false },
        { text: inputs[3].value, sizePt: 6, bold: false },
      ];
      if (!lines.some((ln) => ln.text)) {
        // empty — ignore
        UI.closeEditor();
        return;
      }
      const qty = Math.max(1, parseInt(UI.el.editorQty.value, 10) || 1);
      state.items.push({ lines, qty, selected: true });
      UI.closeEditor();
      UI.renderItems();
      UI.renderPreview();
    },

    // Load the bundled demo dataset (sample.json). Works when served over HTTP
    // (e.g. GitHub Pages). Under file:// fetch is blocked by CORS — use the
    // drop zone / file picker instead.
    loadDemo() {
      UI.el.ioStatus.textContent = "Loading demo data…";
      UI.el.ioStatus.style.color = "var(--ink)";
      fetch("sample.json")
        .then((res) => {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then((data) => UI.ingestData(data, "demo data"))
        .catch((err) => {
          UI.el.ioStatus.textContent =
            "Could not load demo data (use the drop zone instead): " + err.message;
          UI.el.ioStatus.style.color = "var(--danger)";
        });
    },

    // Shared ingestion core used by both file import and the demo button.
    // `parsed` is already JSON-parsed; `sourceLabel` is a human description
    // (a filename, or "demo data") used in the status line.
    ingestData(parsed, sourceLabel) {
      // Recognize a saved project file (round-trip with Export).
      if (parsed && parsed._type === PROJECT_TYPE) {
        Project.load(parsed);
        UI.el.ioStatus.textContent =
          "Loaded project: " + state.items.length + " items.";
        UI.el.ioStatus.style.color = "var(--accent)";
      } else {
        let arr = parsed;
        let formatFromWrapper = null;
        // A data file may wrap items and declare the HERMA format to use:
        //   { "format": "5027", "items": [ {...}, {...} ] }
        if (
          parsed &&
          !Array.isArray(parsed) &&
          typeof parsed === "object" &&
          Array.isArray(parsed.items)
        ) {
          arr = parsed.items;
          if (parsed.format && window.FORMATS[parsed.format]) {
            formatFromWrapper = parsed.format;
          }
        } else if (Array.isArray(parsed)) {
          // plain array — use as-is
        } else if (parsed && typeof parsed === "object") {
          arr = [parsed]; // single object → one-item list
        } else {
          UI.el.ioStatus.textContent =
            "Expected a JSON array of objects, a {format, items} object, or a print-labels project file.";
          UI.el.ioStatus.style.color = "var(--danger)";
          return;
        }
        state.items = arr.map((entry) => {
          // An entry may already carry frozen `lines` (manual-style) or be
          // a raw data object resolved through the field mapper.
          const item = { qty: 1, selected: true };
          if (entry && typeof entry === "object" && Array.isArray(entry.lines)) {
            item.lines = entry.lines;
          } else {
            item.raw = entry;
          }
          return item;
        });
        if (formatFromWrapper) {
          state.formatId = formatFromWrapper;
          UI.el.formatSelect.value = formatFromWrapper;
        }
        const fmtNote = formatFromWrapper ? " (format: " + formatFromWrapper + ")" : "";
        UI.el.ioStatus.textContent =
          "Loaded " + state.items.length + " items from " + sourceLabel + "." + fmtNote;
        UI.el.ioStatus.style.color = "var(--accent)";
      }
      state.fields = Fields.discoverPaths(state.items.map((i) => i.raw));
      // First-run help: if no mapping is configured yet (all paths empty),
      // auto-apply the generic mapping so imported data is visible immediately.
      // The user can still change or clear it afterwards.
      const mappingIsEmpty = state.mapping.every(
        (m) => !m.path && !m.literal
      );
      if (mappingIsEmpty && state.fields.length > 0) {
        UI.applyAutoMapping();
      } else {
        UI.buildMapperRows();
      }
      UI.renderItems();
      UI.renderPreview();
    },

    importFile(file) {
      const reader = new FileReader();
      reader.onload = () => {
        let parsed;
        try {
          parsed = JSON.parse(reader.result);
        } catch (err) {
          UI.el.ioStatus.textContent = "Could not parse JSON: " + err.message;
          UI.el.ioStatus.style.color = "var(--danger)";
          return;
        }
        UI.ingestData(parsed, file.name);
      };
      reader.onerror = () => {
        UI.el.ioStatus.textContent = "Could not read file.";
        UI.el.ioStatus.style.color = "var(--danger)";
      };
      reader.readAsText(file);
    },

    itemLabel(item, idx) {
      // Manual items: show the first non-empty typed line.
      if (item.lines) {
        for (const ln of item.lines) {
          if (ln && ln.text) return ln.text;
        }
        return "(empty)";
      }
      const raw = item.raw || {};
      const candidates = [
        "plant_name_swedish",
        "plant_name",
        "name",
        "title",
        "label",
      ];
      for (const k of candidates) {
        if (raw[k]) return raw[k];
      }
      return "#" + idx;
    },

    renderItems() {
      const host = UI.el.itemsList;
      host.innerHTML = "";
      UI.el.exportBtn.disabled = state.items.length === 0;
      if (state.items.length === 0) {
        host.innerHTML = '<p class="status-msg" style="padding:16px">No items loaded.</p>';
        return;
      }
      state.items.forEach((it, idx) => {
        const row = document.createElement("div");
        row.className = "item-row";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = it.selected;
        cb.addEventListener("change", (e) => {
          it.selected = e.target.checked;
          UI.renderPreview();
        });
        const name = document.createElement("div");
        name.className = "name";
        name.textContent = UI.itemLabel(it, idx);
        name.title = it.lines ? "Manual entry" : "Imported";
        const qty = document.createElement("input");
        qty.type = "number";
        qty.min = "1";
        qty.value = it.qty;
        qty.title = "quantity";
        qty.addEventListener("change", (e) => {
          it.qty = Math.max(1, parseInt(e.target.value, 10) || 1);
          UI.renderPreview();
        });
        const rm = document.createElement("button");
        rm.type = "button";
        rm.textContent = "✕";
        rm.title = "remove";
        rm.style.padding = "2px 6px";
        rm.addEventListener("click", () => {
          state.items.splice(idx, 1);
          UI.renderItems();
          UI.renderPreview();
        });
        row.appendChild(cb);
        row.appendChild(name);
        row.appendChild(qty);
        row.appendChild(rm);
        host.appendChild(row);
      });
    },

    // Generic field mapping: detect common field names and lay them out across
    // the four label lines. Tries general-purpose keys first (name/title/label/
    // product, category/type/variety, date/note) and falls back to plant-specific
    // keys (plant_name*, growing.days_to_harvest) so older data files still map.
    applyAutoMapping() {
      const has = (p) => state.fields.indexOf(p) !== -1;
      const pick = (candidates) => candidates.find(has) || "";
      const m = emptyMapping();
      // Line 1 — the heading. Largest, bold.
      m[0].path = pick([
        "name", "title", "label", "product", "item",
        "plant_name_swedish", "plant_name", "plant_name_english",
      ]);
      m[0].sizePt = 7;
      m[0].bold = true;
      // Line 2 — subtitle / category / variety.
      m[1].path = pick([
        "line2", "category", "type", "variety", "brand", "address",
      ]);
      m[1].sizePt = 6;
      // Line 3 — a date or third detail.
      m[2].path = pick([
        "line3", "date", "made", "best_before", "contents",
        "growing.days_to_harvest",
      ]);
      m[2].sizePt = 6;
      // Line 4 — free note or remaining generic line.
      m[3].path = pick(["line4", "note", "notes", "description"]);
      m[3].sizePt = 6;
      state.mapping = m;
      UI.buildMapperRows();
      UI.persist();
      UI.renderPreview();
    },

    renderPreview() {
      const fmt = getFormat();
      // Format meta line.
      UI.el.formatMeta.textContent =
        fmt.name + " · " + fmt.labelW_mm + "×" + fmt.labelH_mm + "mm";

      const host = UI.el.preview;
      host.innerHTML = "";
      UI.el.printBtn.disabled = true;

      const selectedCount = state.items.reduce(
        (n, i) => n + (i.selected ? 1 : 0),
        0
      );
      if (state.items.length === 0) {
        host.innerHTML = '<p class="status-msg">Import a JSON file to begin.</p>';
        return;
      }
      if (selectedCount === 0) {
        host.innerHTML =
          '<p class="status-msg">Select at least one item to preview.</p>';
        return;
      }

      const perPage = Layout.slotsPerPage(fmt);
      if (state.skipN >= perPage) {
        host.innerHTML =
          '<p class="status-msg">Skip-N is ≥ labels per sheet — the first sheet would be blank.</p>';
        return;
      }

      const pages = Layout.fillSheet(fmt, state.items, state.skipN);
      UI.el.printBtn.disabled = false;

      // Compute screen scale to fit pane width (~assume pane ≈ 760px).
      const paneWpx = host.parentElement.clientWidth - 32;
      const sheetWpx = fmt.pageW_mm * PX_PER_MM;
      const scale = state.trueSize ? 1 : Math.min(1, paneWpx / sheetWpx);

      pages.forEach((pageSlots, pageIdx) => {
        const wrap = document.createElement("div");
        wrap.className = "sheet-wrap";
        if (scale < 1) wrap.style.transform = "scale(" + scale + ")";
        const sheet = UI.SheetRender.drawPage(fmt, pageSlots, { grid: state.grid });
        wrap.appendChild(sheet);
        host.appendChild(wrap);
        if (pages.length > 1) {
          const lbl = document.createElement("div");
          lbl.className = "page-label";
          lbl.textContent = "Page " + (pageIdx + 1) + " of " + pages.length;
          host.appendChild(lbl);
        }
      });
    },

    print() {
      // Lift the preview into a print-root wrapper so @media print can show only it.
      let root = document.querySelector(".print-root");
      if (root) root.remove();
      root = document.createElement("div");
      root.className = "print-root";
      const clone = UI.el.preview.cloneNode(true);
      // Reset transforms for print.
      clone.querySelectorAll(".sheet-wrap").forEach((w) => (w.style.transform = ""));
      root.appendChild(clone);
      document.body.appendChild(root);
      window.print();
      // Clean up after.
      setTimeout(() => root.remove(), 1000);
    },

    // ---- localStorage persistence (Phase 5) ----
    persist() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            formatId: state.formatId,
            skipN: state.skipN,
            grid: state.grid,
            mapping: state.mapping,
            // items intentionally NOT persisted (may be large)
          })
        );
      } catch (e) {
        /* private mode / disabled storage — ignore */
      }
    },

    loadPersisted() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const s = JSON.parse(raw);
        if (s.formatId && window.FORMATS[s.formatId]) state.formatId = s.formatId;
        if (typeof s.skipN === "number") state.skipN = s.skipN;
        if (typeof s.grid === "boolean") state.grid = s.grid;
        if (Array.isArray(s.mapping) && s.mapping.length === 4) {
          state.mapping = s.mapping;
        }
      } catch (e) {
        /* ignore corrupt state */
      }
      UI.el.skipN.value = state.skipN;
      UI.el.gridToggle.checked = state.grid;
    },
  };

  // ---------------------------------------------------------------
  // Boot.
  // ---------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", UI.init);

  // Expose for debugging and for the unit test page.
  window.PrintLabels = { Layout, Fields, Project, UI, state, resolveLines };
})();
