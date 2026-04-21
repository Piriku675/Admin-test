/**
 * admin/js/admin.js — CareerCanvas Admin Panel
 * Self-contained SPA. Paste your Firebase config below.
 */

import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc,
  getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── YOUR Firebase config ─────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyC_jnnXGuIBsF2dU-sKck-Tu200Gx7FCAU",
  authDomain: "careercanvasv2.firebaseapp.com",
  projectId: "careercanvasv2",
  storageBucket: "careercanvasv2.firebasestorage.app",
  messagingSenderId: "734354241360",
  appId: "1:734354241360:web:020a95e3b17881e2a91e55"
};

const fbApp = initializeApp(firebaseConfig);
const db    = getFirestore(fbApp);

// ─── Firestore helpers ────────────────────────────────────────────────────────
const siteDoc  = (id)  => doc(db, "site", id);
const colQuery = (col) => query(collection(db, col), orderBy("order"));

async function getSD(id)       { const s = await getDoc(siteDoc(id));  return s.exists() ? s.data() : {}; }
async function setSD(id, data) { await setDoc(siteDoc(id), { ...data, updatedAt: serverTimestamp() }, { merge: true }); }
async function getCol(col)     { const s = await getDocs(colQuery(col)); return s.docs.map(d => ({ id: d.id, ...d.data() })); }

// ─── Auth ─────────────────────────────────────────────────────────────────────
const SESSION_KEY = "cc_admin_auth";
const DEFAULT_PW  = "admin123"; // changed via Settings

async function checkPassword(pw) {
  try {
    const d = await getSD("adminAuth");
    const stored = d.password || DEFAULT_PW;
    return pw === stored;
  } catch { return pw === DEFAULT_PW; }
}
function isLoggedIn()  { return sessionStorage.getItem(SESSION_KEY) === "1"; }
function setLoggedIn()  { sessionStorage.setItem(SESSION_KEY, "1"); }
function setLoggedOut() { sessionStorage.removeItem(SESSION_KEY); }

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg, type = "") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className   = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ""; }, 3000);
}

// ─── Save indicator ───────────────────────────────────────────────────────────
let saveTimer;
function showSaving() {
  const el = document.getElementById("save-indicator");
  el.textContent = "Saving…"; el.className = "saving";
}
function showSaved() {
  const el = document.getElementById("save-indicator");
  el.textContent = "Saved ✓"; el.className = "saved";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { el.textContent = ""; el.className = ""; }, 2500);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
let modalSaveFn = null;
function openModal(title, bodyHTML, saveFn) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML    = bodyHTML;
  modalSaveFn = saveFn;
  document.getElementById("modal-overlay").classList.add("active");
  // Focus first input
  setTimeout(() => document.querySelector("#modal-body input,#modal-body textarea")?.focus(), 50);
}
function closeModal() {
  document.getElementById("modal-overlay").classList.remove("active");
  modalSaveFn = null;
}
document.getElementById("modal-close").addEventListener("click",  closeModal);
document.getElementById("modal-cancel").addEventListener("click", closeModal);
document.getElementById("modal-overlay").addEventListener("click", e => { if (e.target.id === "modal-overlay") closeModal(); });
document.getElementById("modal-save").addEventListener("click", async () => {
  if (!modalSaveFn) return;
  try {
    showSaving();
    await modalSaveFn();
    showSaved();
    closeModal();
    toast("Saved successfully", "success");
    renderCurrentSection();
  } catch (e) { toast("Save failed: " + e.message, "error"); console.error(e); }
});

// ─── Section registry ─────────────────────────────────────────────────────────
let currentSection = "portfolio";

const sectionTitles = {
  portfolio: "Portfolio", categories: "Categories", hero: "Hero",
  about: "About", experience: "Experience", skills: "Skills",
  contact: "Contact", colors: "Colors", settings: "Settings",
};

async function renderCurrentSection() {
  const area = document.getElementById("content-area");
  area.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;
  document.getElementById("topbar-title").textContent = sectionTitles[currentSection] || currentSection;
  try {
    switch (currentSection) {
      case "portfolio":   await renderPortfolio(area);   break;
      case "categories":  await renderCategories(area);  break;
      case "hero":        await renderHero(area);        break;
      case "about":       await renderAbout(area);       break;
      case "experience":  await renderExperience(area);  break;
      case "skills":      await renderSkills(area);      break;
      case "contact":     await renderContact(area);     break;
      case "colors":      await renderColors(area);      break;
      case "settings":    await renderSettings(area);    break;
    }
  } catch(e) {
    area.innerHTML = `<div class="card"><p style="color:#DC2626">Error loading section: ${e.message}</p></div>`;
    console.error(e);
  }
}

// ─── PORTFOLIO ────────────────────────────────────────────────────────────────
async function renderPortfolio(area) {
  const [items, cats] = await Promise.all([getCol("portfolio"), getCol("categories")]);
  const catMap = Object.fromEntries(cats.map(c => [c.slug, c.label]));

  area.innerHTML = `
    <div class="section-top">
      <div><div class="section-title">Portfolio</div><div class="section-sub">${items.length} project${items.length!==1?"s":""}</div></div>
      <button class="btn-primary" id="add-project">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Project
      </button>
    </div>
    <div id="portfolio-list"></div>`;

  const list = document.getElementById("portfolio-list");

  if (!items.length) {
    list.innerHTML = `<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg><p>No projects yet. Add your first one.</p></div>`;
  } else {
    list.innerHTML = items.sort((a,b)=>(a.order||0)-(b.order||0)).map(item => `
      <div class="item-row" data-id="${item.id}">
        <div class="item-thumb">
          ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" />` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`}
        </div>
        <div class="item-info">
          <div class="item-name">${item.title}</div>
          <div class="item-meta">${catMap[item.category] || item.category || "—"} ${item.videoUrl ? "· 🎬 Video" : ""}</div>
        </div>
        <span class="badge ${item.visible!==false ? 'badge-green' : 'badge-grey'}">${item.visible!==false ? "Visible" : "Hidden"}</span>
        <div class="item-actions">
          <button class="btn-icon edit-item" data-id="${item.id}" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger del-item" data-id="${item.id}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </div>`).join("");
  }

  document.getElementById("add-project").onclick = () => openProjectModal(null, cats);
  list.querySelectorAll(".edit-item").forEach(btn => {
    btn.onclick = () => { const item = items.find(i => i.id === btn.dataset.id); openProjectModal(item, cats); };
  });
  list.querySelectorAll(".del-item").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("Delete this project? This cannot be undone.")) return;
      showSaving();
      await deleteDoc(doc(db, "portfolio", btn.dataset.id));
      showSaved(); toast("Project deleted", "success");
      renderCurrentSection();
    };
  });
}

function openProjectModal(item, cats) {
  const isNew = !item;
  const body = `
    <div class="field"><label>Title</label><input id="m-title" value="${item?.title||''}" placeholder="Project name" /></div>
    <div class="field-row">
      <div class="field"><label>Category</label>
        <select id="m-cat">
          ${cats.map(c => `<option value="${c.slug}" ${item?.category===c.slug?'selected':''}>${c.label}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>Order</label><input id="m-order" type="number" value="${item?.order||1}" min="1" /></div>
    </div>
    <div class="field"><label>Image URL</label><input id="m-img" value="${item?.imageUrl||''}" placeholder="https://..." />
      <div class="field-hint">Recommended: 1200 × 900px (4:3 ratio)</div></div>
    <div class="field"><label>YouTube Video URL</label><input id="m-video" value="${item?.videoUrl||''}" placeholder="https://youtube.com/watch?v=..." /></div>
    <div class="field"><label>Project Link</label><input id="m-link" value="${item?.link||''}" placeholder="https://..." /></div>
    <div class="field"><label>Description</label><textarea id="m-desc">${item?.description||''}</textarea></div>
    <div class="toggle-wrap">
      <label class="toggle"><input type="checkbox" id="m-vis" ${item?.visible!==false?'checked':''}><span class="toggle-slider"></span></label>
      <span class="toggle-label">Visible on site</span>
    </div>`;

  openModal(isNew ? "Add Project" : "Edit Project", body, async () => {
    const data = {
      title:       document.getElementById("m-title").value.trim(),
      category:    document.getElementById("m-cat").value,
      order:       parseInt(document.getElementById("m-order").value) || 1,
      imageUrl:    document.getElementById("m-img").value.trim(),
      videoUrl:    document.getElementById("m-video").value.trim(),
      link:        document.getElementById("m-link").value.trim(),
      description: document.getElementById("m-desc").value.trim(),
      visible:     document.getElementById("m-vis").checked,
    };
    if (!data.title) throw new Error("Title is required");
    const id = item?.id || `proj-${Date.now()}`;
    await setDoc(doc(db, "portfolio", id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  });
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
async function renderCategories(area) {
  const cats = await getCol("categories");
  area.innerHTML = `
    <div class="section-top">
      <div><div class="section-title">Categories</div><div class="section-sub">Portfolio filter categories</div></div>
      <button class="btn-primary" id="add-cat">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Category
      </button>
    </div>
    <div class="card"><p style="font-size:13px;color:var(--text2);margin-bottom:16px">Categories appear as filter buttons on the portfolio section. The slug is used internally as the filter ID.</p>
    <div id="cat-list"></div></div>`;

  const list = document.getElementById("cat-list");
  list.innerHTML = cats.length ? cats.map(c => `
    <div class="item-row">
      <div class="item-info">
        <div class="item-name">${c.label}</div>
        <div class="item-meta">slug: <code>${c.slug}</code></div>
      </div>
      <div class="item-actions">
        <button class="btn-icon edit-cat" data-id="${c.id}" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon danger del-cat" data-id="${c.id}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
        </button>
      </div>
    </div>`).join("") : `<div class="empty-state"><p>No categories yet.</p></div>`;

  document.getElementById("add-cat").onclick = () => openCatModal(null, cats.length);
  list.querySelectorAll(".edit-cat").forEach(btn => {
    btn.onclick = () => { const c = cats.find(x => x.id === btn.dataset.id); openCatModal(c, cats.length); };
  });
  list.querySelectorAll(".del-cat").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("Delete this category?")) return;
      await deleteDoc(doc(db, "categories", btn.dataset.id));
      toast("Category deleted", "success"); renderCurrentSection();
    };
  });
}

function openCatModal(cat, count) {
  openModal(cat ? "Edit Category" : "Add Category", `
    <div class="field"><label>Label (display name)</label><input id="m-label" value="${cat?.label||''}" placeholder="e.g. Photography" /></div>
    <div class="field"><label>Slug (filter ID)</label><input id="m-slug" value="${cat?.slug||''}" placeholder="e.g. photography" />
      <div class="field-hint">Lowercase letters and hyphens only. Auto-generated from label if left blank.</div></div>
    <div class="field"><label>Order</label><input id="m-order" type="number" value="${cat?.order||count+1}" min="1" /></div>`,
  async () => {
    const label = document.getElementById("m-label").value.trim();
    let   slug  = document.getElementById("m-slug").value.trim();
    if (!label) throw new Error("Label is required");
    if (!slug)  slug = label.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Slug must be lowercase letters and hyphens only");
    const id    = cat?.id || `cat-${slug}-${Date.now()}`;
    const order = parseInt(document.getElementById("m-order").value) || count + 1;
    await setDoc(doc(db, "categories", id), { label, slug, order, updatedAt: serverTimestamp() }, { merge: true });
  });
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
async function renderHero(area) {
  const d = await getSD("hero");
  area.innerHTML = `
    <div class="section-top"><div class="section-title">Hero Section</div></div>
    <div class="card">
      <div class="card-title">Name & Identity</div>
      <div class="field-row">
        <div class="field"><label>First Name</label><input class="hero-f" data-field="firstName" value="${d.firstName||''}" /></div>
        <div class="field"><label>Last Name</label><input class="hero-f" data-field="lastName" value="${d.lastName||''}" /></div>
      </div>
      <div class="field"><label>Tagline</label><input class="hero-f" data-field="tagline" value="${d.tagline||''}" /></div>
      <div class="field"><label>Subtitle (location / role)</label><input class="hero-f" data-field="subtitle" value="${d.subtitle||''}" /></div>
    </div>
    <div class="card">
      <div class="card-title">Call-to-Action Buttons</div>
      <div class="field-row">
        <div class="field"><label>CTA 1 Text</label><input class="hero-f" data-field="cta1Text" value="${d.cta1Text||''}" /></div>
        <div class="field"><label>CTA 1 Link</label><input class="hero-f" data-field="cta1Link" value="${d.cta1Link||''}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>CTA 2 Text</label><input class="hero-f" data-field="cta2Text" value="${d.cta2Text||''}" /></div>
        <div class="field"><label>CTA 2 Link (CV URL)</label><input class="hero-f" data-field="cta2Link" value="${d.cta2Link||''}" /></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Navigation Logo</div>
      <div class="field"><label>Logo Image URL (leave blank to show text name)</label><input class="hero-f" data-field="logoUrl" value="${d.logoUrl||''}" placeholder="https://..." /></div>
      <div class="field-hint" style="margin-top:-8px">Recommended height: 32–40px. PNG with transparent background works best.</div>
    </div>
    <button class="btn-primary" id="save-hero">Save Hero</button>`;

  document.getElementById("save-hero").onclick = async () => {
    const data = {};
    area.querySelectorAll(".hero-f").forEach(el => { data[el.dataset.field] = el.value.trim(); });
    showSaving();
    await setSD("hero", data);
    showSaved(); toast("Hero saved", "success");
  };
}

// ─── ABOUT ────────────────────────────────────────────────────────────────────
async function renderAbout(area) {
  const d = await getSD("about");
  const stats = d.stats || [{value:"",label:""},{value:"",label:""},{value:"",label:""}];
  area.innerHTML = `
    <div class="section-top"><div class="section-title">About Section</div></div>
    <div class="card">
      <div class="card-title">Header</div>
      <div class="field-row">
        <div class="field"><label>Eyebrow</label><input id="a-eyebrow" value="${d.eyebrow||''}" /></div>
        <div class="field"><label>Heading</label><input id="a-heading" value="${(d.heading||'').replace(/\n/g,'\\n')}" />
          <div class="field-hint">Use \n for a line break</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Bio</div>
      <div class="field"><label>Paragraph 1</label><textarea id="a-para0">${d.body?.[0]||''}</textarea></div>
      <div class="field"><label>Paragraph 2</label><textarea id="a-para1">${d.body?.[1]||''}</textarea></div>
    </div>
    <div class="card">
      <div class="card-title">Stats</div>
      <div class="stats-row">
        ${[0,1,2].map(i => `
          <div class="stat-card">
            <label>Stat ${i+1} Value</label>
            <input id="a-sv${i}" value="${stats[i]?.value||''}" placeholder="4+" />
            <label style="margin-top:8px">Label</label>
            <input id="a-sl${i}" value="${stats[i]?.label||''}" placeholder="Years experience" />
          </div>`).join("")}
      </div>
    </div>
    <div class="card">
      <div class="card-title">Profile Photo</div>
      <div class="field"><label>Profile Photo URL</label><input id="a-photo" value="${d.profilePhotoUrl||''}" placeholder="https://..." />
        <div class="field-hint">Recommended: portrait orientation, min 400px wide</div></div>
    </div>
    <button class="btn-primary" id="save-about">Save About</button>`;

  document.getElementById("save-about").onclick = async () => {
    const stats = [0,1,2].map(i => ({
      value: document.getElementById(`a-sv${i}`).value.trim(),
      label: document.getElementById(`a-sl${i}`).value.trim(),
    }));
    showSaving();
    await setSD("about", {
      eyebrow:         document.getElementById("a-eyebrow").value.trim(),
      heading:         document.getElementById("a-heading").value.replace(/\\n/g,"\n"),
      body:            [document.getElementById("a-para0").value.trim(), document.getElementById("a-para1").value.trim()],
      stats,
      profilePhotoUrl: document.getElementById("a-photo").value.trim(),
    });
    showSaved(); toast("About saved", "success");
  };
}

// ─── EXPERIENCE ───────────────────────────────────────────────────────────────
async function renderExperience(area) {
  const entries = await getCol("cv");
  area.innerHTML = `
    <div class="section-top">
      <div><div class="section-title">Experience</div><div class="section-sub">${entries.length} entr${entries.length!==1?"ies":"y"}</div></div>
      <button class="btn-primary" id="add-cv">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Entry
      </button>
    </div>
    <div id="cv-list"></div>`;

  const list = document.getElementById("cv-list");
  list.innerHTML = entries.length ? entries.sort((a,b)=>(a.order||0)-(b.order||0)).map(e => `
    <div class="item-row">
      <div class="item-info">
        <div class="item-name">${e.title}</div>
        <div class="item-meta">${e.place} · ${e.period}</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon edit-cv" data-id="${e.id}" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon danger del-cv" data-id="${e.id}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
        </button>
      </div>
    </div>`).join("") : `<div class="empty-state"><p>No experience entries yet.</p></div>`;

  document.getElementById("add-cv").onclick = () => openCvModal(null, entries.length);
  list.querySelectorAll(".edit-cv").forEach(btn => { btn.onclick = () => { openCvModal(entries.find(e=>e.id===btn.dataset.id), entries.length); }; });
  list.querySelectorAll(".del-cv").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("Delete this entry?")) return;
      await deleteDoc(doc(db, "cv", btn.dataset.id));
      toast("Deleted","success"); renderCurrentSection();
    };
  });
}

function openCvModal(entry, count) {
  openModal(entry ? "Edit Experience" : "Add Experience", `
    <div class="field"><label>Job Title</label><input id="m-title" value="${entry?.title||''}" placeholder="Senior Designer" /></div>
    <div class="field"><label>Company / Place</label><input id="m-place" value="${entry?.place||''}" placeholder="Company Name" /></div>
    <div class="field-row">
      <div class="field"><label>Period</label><input id="m-period" value="${entry?.period||''}" placeholder="2023 – Present" /></div>
      <div class="field"><label>Order</label><input id="m-order" type="number" value="${entry?.order||count+1}" min="1" /></div>
    </div>
    <div class="field"><label>Description</label><textarea id="m-desc">${entry?.description||''}</textarea></div>`,
  async () => {
    const title = document.getElementById("m-title").value.trim();
    if (!title) throw new Error("Title is required");
    const id = entry?.id || `cv-${Date.now()}`;
    await setDoc(doc(db, "cv", id), {
      title, place: document.getElementById("m-place").value.trim(),
      period: document.getElementById("m-period").value.trim(),
      description: document.getElementById("m-desc").value.trim(),
      order: parseInt(document.getElementById("m-order").value)||count+1,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}

// ─── SKILLS ───────────────────────────────────────────────────────────────────
async function renderSkills(area) {
  const groups = await getCol("skills");
  area.innerHTML = `
    <div class="section-top">
      <div><div class="section-title">Skills</div></div>
      <button class="btn-primary" id="add-group">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Group
      </button>
    </div>
    <div id="skills-list"></div>`;

  const list = document.getElementById("skills-list");
  list.innerHTML = groups.sort((a,b)=>(a.order||0)-(b.order||0)).map(g => `
    <div class="card" data-gid="${g.id}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="card-title" style="margin:0">${g.label}</div>
        <div style="display:flex;gap:6px">
          <button class="btn-ghost btn-sm edit-group" data-id="${g.id}">Rename</button>
          <button class="btn-danger btn-sm del-group" data-id="${g.id}">Delete group</button>
        </div>
      </div>
      <div class="skill-tags-edit" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
        ${(g.skills||[]).map(s => `
          <span class="badge badge-grey" style="display:inline-flex;align-items:center;gap:5px">${s}
            <button style="background:none;border:none;cursor:pointer;font-size:13px;color:#9CA3AF;line-height:1" data-gid="${g.id}" data-skill="${s}" class="rem-skill">×</button>
          </span>`).join("")}
      </div>
      <div style="display:flex;gap:8px">
        <input class="new-skill-input" data-gid="${g.id}" placeholder="Add skill…" style="flex:1;padding:7px 10px;border:1px solid var(--border2);border-radius:6px;font-size:13px;outline:none" />
        <button class="btn-ghost btn-sm add-skill" data-gid="${g.id}">Add</button>
      </div>
    </div>`).join("") || `<div class="empty-state"><p>No skill groups yet.</p></div>`;

  document.getElementById("add-group").onclick = () => openModal("Add Skill Group", `
    <div class="field"><label>Group Label</label><input id="m-label" placeholder="Design Tools" /></div>
    <div class="field"><label>Order</label><input id="m-order" type="number" value="${groups.length+1}" /></div>`,
    async () => {
      const label = document.getElementById("m-label").value.trim();
      if (!label) throw new Error("Label required");
      await setDoc(doc(db,"skills",`sg-${Date.now()}`), { label, skills:[], order: parseInt(document.getElementById("m-order").value)||groups.length+1, updatedAt:serverTimestamp() });
    });

  list.querySelectorAll(".edit-group").forEach(btn => {
    const g = groups.find(x=>x.id===btn.dataset.id);
    btn.onclick = () => openModal("Rename Group", `<div class="field"><label>Label</label><input id="m-label" value="${g.label}" /></div>`, async () => {
      await updateDoc(doc(db,"skills",g.id), { label: document.getElementById("m-label").value.trim(), updatedAt:serverTimestamp() });
    });
  });
  list.querySelectorAll(".del-group").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("Delete this skill group?")) return;
      await deleteDoc(doc(db,"skills",btn.dataset.id));
      toast("Deleted","success"); renderCurrentSection();
    };
  });
  list.querySelectorAll(".rem-skill").forEach(btn => {
    btn.onclick = async () => {
      const g = groups.find(x=>x.id===btn.dataset.gid);
      const updated = (g.skills||[]).filter(s=>s!==btn.dataset.skill);
      showSaving();
      await updateDoc(doc(db,"skills",g.id), { skills:updated, updatedAt:serverTimestamp() });
      showSaved(); renderCurrentSection();
    };
  });
  list.querySelectorAll(".add-skill").forEach(btn => {
    btn.onclick = async () => {
      const inp = list.querySelector(`.new-skill-input[data-gid="${btn.dataset.gid}"]`);
      const val = inp.value.trim();
      if (!val) return;
      const g = groups.find(x=>x.id===btn.dataset.gid);
      const updated = [...(g.skills||[]), val];
      showSaving();
      await updateDoc(doc(db,"skills",g.id), { skills:updated, updatedAt:serverTimestamp() });
      showSaved(); toast("Skill added","success"); renderCurrentSection();
    };
  });
  // Enter key on skill input
  list.querySelectorAll(".new-skill-input").forEach(inp => {
    inp.addEventListener("keydown", e => { if (e.key==="Enter") list.querySelector(`.add-skill[data-gid="${inp.dataset.gid}"]`).click(); });
  });
}

// ─── CONTACT ──────────────────────────────────────────────────────────────────
async function renderContact(area) {
  const [contact, settings] = await Promise.all([getSD("contact"), getSD("settings")]);
  area.innerHTML = `
    <div class="section-top"><div class="section-title">Contact Section</div></div>
    <div class="card">
      <div class="card-title">Section Text</div>
      <div class="field-row">
        <div class="field"><label>Eyebrow</label><input id="c-eyebrow" value="${contact.eyebrow||''}" /></div>
        <div class="field"><label>Heading</label><input id="c-heading" value="${(contact.heading||'').replace(/\n/g,'\\n')}" /></div>
      </div>
      <div class="field"><label>Body text</label><input id="c-body" value="${contact.body||''}" /></div>
    </div>
    <div class="card">
      <div class="card-title">Contact Details</div>
      <div class="field-row">
        <div class="field"><label>Email</label><input id="c-email" value="${settings.email||''}" /></div>
        <div class="field"><label>CV URL</label><input id="c-cvurl" value="${settings.cvUrl||''}" /></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Social Links</div>
      <div class="field-row">
        <div class="field"><label>LinkedIn</label><input id="c-linkedin" value="${settings.socials?.linkedin||''}" placeholder="https://linkedin.com/in/..." /></div>
        <div class="field"><label>Behance</label><input id="c-behance"  value="${settings.socials?.behance||''}"  placeholder="https://behance.net/..." /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Instagram</label><input id="c-instagram" value="${settings.socials?.instagram||''}" placeholder="https://instagram.com/..." /></div>
        <div class="field"><label>Dribbble</label><input id="c-dribbble"   value="${settings.socials?.dribbble||''}"   placeholder="https://dribbble.com/..." /></div>
      </div>
    </div>
    <button class="btn-primary" id="save-contact">Save Contact</button>`;

  document.getElementById("save-contact").onclick = async () => {
    showSaving();
    await Promise.all([
      setSD("contact", {
        eyebrow: document.getElementById("c-eyebrow").value.trim(),
        heading: document.getElementById("c-heading").value.replace(/\\n/g,"\n"),
        body:    document.getElementById("c-body").value.trim(),
      }),
      setSD("settings", {
        email:  document.getElementById("c-email").value.trim(),
        cvUrl:  document.getElementById("c-cvurl").value.trim(),
        socials: {
          linkedin:  document.getElementById("c-linkedin").value.trim(),
          behance:   document.getElementById("c-behance").value.trim(),
          instagram: document.getElementById("c-instagram").value.trim(),
          dribbble:  document.getElementById("c-dribbble").value.trim(),
        },
      }),
    ]);
    showSaved(); toast("Contact saved","success");
  };
}

// ─── COLORS ───────────────────────────────────────────────────────────────────
const COLOR_DEFS = [
  { key:"paper",           label:"Paper",            desc:"Main background",          group:"Backgrounds" },
  { key:"warm",            label:"Warm",             desc:"Alternate section bg",      group:"Backgrounds" },
  { key:"accent",          label:"Accent",           desc:"Buttons, highlights",       group:"Backgrounds" },
  { key:"line",            label:"Line",             desc:"Borders & dividers",        group:"Backgrounds" },
  { key:"ink",             label:"Ink",              desc:"Primary headings",          group:"Text" },
  { key:"muted",           label:"Muted",            desc:"Labels & secondary text",   group:"Text" },
  { key:"heroText",        label:"Hero Text",        desc:"Hero name color",           group:"Text" },
  { key:"navText",         label:"Nav Text",         desc:"Navigation link color",     group:"Text" },
  { key:"bodyText",        label:"Body Text",        desc:"Paragraph text",            group:"Text" },
  { key:"footerText",      label:"Footer Text",      desc:"Footer text color",         group:"Text" },
  { key:"navBg",           label:"Nav Background",   desc:"Top nav background",        group:"Nav" },
  { key:"navScrollBg",     label:"Nav Scroll Bg",    desc:"Nav bg when scrolled",      group:"Nav" },
  { key:"navScrollBorder", label:"Nav Scroll Border",desc:"Nav border when scrolled",  group:"Nav" },
];

const DEFAULT_COLORS = {
  ink:"#111010", paper:"#F5F2ED", warm:"#EDE9E1", accent:"#C8441B",
  muted:"#8A8578", line:"#D9D5CC", heroText:"#111010", navText:"#8A8578",
  bodyText:"#4A4540", footerText:"#8A8578",
  navBg:"#F5F2ED", navScrollBg:"rgba(245,242,237,.95)", navScrollBorder:"#D9D5CC",
};

async function renderColors(area) {
  const s = await getSD("settings");
  const colors = s.colors || {};
  const groups = [...new Set(COLOR_DEFS.map(c=>c.group))];

  area.innerHTML = `
    <div class="section-top">
      <div><div class="section-title">Colors</div><div class="section-sub">13 color variables — changes apply on next site load</div></div>
      <button class="btn-ghost" id="reset-colors">Reset to defaults</button>
    </div>
    ${groups.map(group => `
      <div class="card">
        <div class="card-title">${group}</div>
        <div class="color-grid">
          ${COLOR_DEFS.filter(c=>c.group===group).map(c => {
            const val = colors[c.key] || DEFAULT_COLORS[c.key] || "#000000";
            const isRgba = val.startsWith("rgba");
            return `
              <div class="color-field">
                <div class="color-swatch" style="background:${val}">
                  ${!isRgba ? `<input type="color" class="color-picker" data-key="${c.key}" value="${val}" />` : ''}
                </div>
                <div class="color-info">
                  <div class="color-name">${c.label}</div>
                  <div class="color-desc">${c.desc}</div>
                </div>
                <input class="color-hex" data-key="${c.key}" value="${val}" placeholder="#000000" />
              </div>`;
          }).join("")}
        </div>
      </div>`).join("")}
    <button class="btn-primary" id="save-colors">Save All Colors</button>`;

  // Sync color picker → hex input and swatch
  area.querySelectorAll(".color-picker").forEach(picker => {
    picker.addEventListener("input", () => {
      const hex = area.querySelector(`.color-hex[data-key="${picker.dataset.key}"]`);
      const sw  = picker.closest(".color-swatch");
      hex.value        = picker.value;
      sw.style.background = picker.value;
    });
  });
  // Sync hex → swatch
  area.querySelectorAll(".color-hex").forEach(hex => {
    hex.addEventListener("input", () => {
      const sw = hex.closest(".color-field").querySelector(".color-swatch");
      if (/^#[0-9A-Fa-f]{3,8}$/.test(hex.value)) sw.style.background = hex.value;
    });
  });

  document.getElementById("save-colors").onclick = async () => {
    const updated = {};
    area.querySelectorAll(".color-hex").forEach(hex => { updated[hex.dataset.key] = hex.value.trim(); });
    showSaving();
    await setSD("settings", { colors: updated });
    showSaved(); toast("Colors saved","success");
  };

  document.getElementById("reset-colors").onclick = async () => {
    if (!confirm("Reset all colors to defaults?")) return;
    showSaving();
    await setSD("settings", { colors: DEFAULT_COLORS });
    showSaved(); toast("Colors reset","success"); renderCurrentSection();
  };
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
async function renderSettings(area) {
  const d = await getSD("settings");
  area.innerHTML = `
    <div class="section-top"><div class="section-title">Settings</div></div>
    <div class="card">
      <div class="card-title">Site Identity</div>
      <div class="field"><label>Site Title (browser tab)</label><input id="s-title" value="${d.siteTitle||''}" /></div>
      <div class="field"><label>Site Description (meta)</label><input id="s-desc"  value="${d.siteDesc||''}" /></div>
      <div class="field-row">
        <div class="field"><label>Owner Name</label><input id="s-owner" value="${d.ownerName||''}" /></div>
        <div class="field"><label>Portfolio Header Name</label><input id="s-portname" value="${d.portfolioName||d.ownerName||''}" />
          <div class="field-hint">Shown in the nav bar</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Assets</div>
      <div class="field"><label>Favicon URL</label><input id="s-favicon" value="${d.faviconUrl||''}" placeholder="https://... (.ico or .png)" /></div>
      <div class="field-row">
        <div class="field"><label>CV File Type Label</label><input id="s-cvtype" value="${d.cvFileType||'PDF'}" placeholder="PDF" />
          <div class="field-hint">Shown in the download popup</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Admin Password</div>
      <div class="field"><label>New Password</label><input type="password" id="s-pw" placeholder="Leave blank to keep current" />
        <div class="field-hint">Used to log in to this admin panel</div></div>
    </div>
    <button class="btn-primary" id="save-settings">Save Settings</button>`;

  document.getElementById("save-settings").onclick = async () => {
    showSaving();
    const updates = {
      siteTitle:     document.getElementById("s-title").value.trim(),
      siteDesc:      document.getElementById("s-desc").value.trim(),
      ownerName:     document.getElementById("s-owner").value.trim(),
      portfolioName: document.getElementById("s-portname").value.trim(),
      faviconUrl:    document.getElementById("s-favicon").value.trim(),
      cvFileType:    document.getElementById("s-cvtype").value.trim() || "PDF",
    };
    await setSD("settings", updates);
    const pw = document.getElementById("s-pw").value.trim();
    if (pw) await setDoc(siteDoc("adminAuth"), { password: pw, updatedAt: serverTimestamp() }, { merge: true });
    showSaved(); toast("Settings saved","success");
  };
}

// ─── NAV + ROUTING ────────────────────────────────────────────────────────────
function initNav() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
      item.classList.add("active");
      currentSection = item.dataset.section;
      renderCurrentSection();
      // Close sidebar on mobile
      if (window.innerWidth <= 768) document.getElementById("sidebar").classList.remove("open");
    });
  });

  document.getElementById("menu-toggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
  document.getElementById("sidebar-close").addEventListener("click", () => {
    document.getElementById("sidebar").classList.remove("open");
  });
  document.getElementById("logout-btn").addEventListener("click", () => {
    setLoggedOut(); location.reload();
  });
}

// ─── LOGIN FLOW ───────────────────────────────────────────────────────────────
function initLogin() {
  const form  = document.getElementById("login-form");
  const input = document.getElementById("password-input");
  const error = document.getElementById("login-error");
  const btn   = document.getElementById("login-btn");

  // Toggle password visibility
  document.getElementById("pw-toggle").addEventListener("click", () => {
    input.type = input.type === "password" ? "text" : "password";
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    error.textContent = "";
    btn.disabled      = true;
    btn.textContent   = "Checking…";

    const ok = await checkPassword(input.value);
    if (ok) {
      setLoggedIn();
      document.getElementById("login-screen").style.display = "none";
      document.getElementById("app").style.display = "flex";
      initNav();
      renderCurrentSection();
    } else {
      error.textContent = "Incorrect password";
      input.value       = "";
      input.focus();
    }
    btn.disabled    = false;
    btn.textContent = "Sign In";
  });
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
if (isLoggedIn()) {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "flex";
  initNav();
  renderCurrentSection();
} else {
  initLogin();
}
