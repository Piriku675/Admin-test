/**
 * js/app.js — CareerCanvas
 * Self-contained ES module. Paste your Firebase config in the block below.
 */

import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, getDocs, getDoc, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── YOUR Firebase config ─────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function fetchDoc(col, docId) {
  const snap = await getDoc(doc(db, col, docId));
  return snap.exists() ? snap.data() : {};
}
async function fetchCollection(col, ...orderFields) {
  const q    = query(collection(db, col), ...orderFields.map(f => orderBy(f)));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
function ytEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0` : null;
}
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ""; }
function setText(sel, val) { const el = document.querySelector(sel); if (el && val !== undefined) el.textContent = val; }
function setHTML(sel, val) { const el = document.querySelector(sel); if (el && val !== undefined) el.innerHTML = val; }

function applyColors(colors = {}) {
  const root = document.documentElement;
  const map = {
    ink:"--ink", paper:"--paper", warm:"--warm", accent:"--accent",
    muted:"--muted", line:"--line",
    heroText:"--hero-text", navText:"--nav-text", bodyText:"--body-text", footerText:"--footer-text",
    navBg:"--nav-bg", navScrollBg:"--nav-scroll-bg", navScrollBorder:"--nav-scroll-border",
  };
  for (const [key, cssVar] of Object.entries(map)) {
    if (colors[key]) root.style.setProperty(cssVar, colors[key]);
  }
}

// ─── Render: Settings ─────────────────────────────────────────────────────────
function renderSettings(settings) {
  if (settings.siteTitle) document.title = settings.siteTitle;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && settings.siteDesc) metaDesc.setAttribute("content", settings.siteDesc);

  // Favicon
  if (settings.faviconUrl) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = settings.faviconUrl;
  }

  if (settings.colors) applyColors(settings.colors);

  // Nav: logo image or text name
  const logo = document.getElementById("nav-logo");
  if (logo) {
    if (settings._heroLogoUrl) {
      logo.innerHTML = `<img src="${settings._heroLogoUrl}" alt="Logo" class="nav-logo-img" />`;
    } else if (settings.ownerName) {
      // Header name is now editable via bot → Settings → Portfolio name
      const name = settings.portfolioName || settings.ownerName;
      const parts = name.split(" ");
      const first = parts.slice(0, -1).join(" ");
      const last  = parts[parts.length - 1];
      logo.innerHTML = first ? `${first} <span>${last}</span>` : `<span>${last}</span>`;
    }
  }

  if (settings.copyright) {
    const fp = document.querySelector("footer p:first-child");
    if (fp) fp.textContent = settings.copyright;
  }
}

// ─── Render: Hero ─────────────────────────────────────────────────────────────
function renderHero(hero, settings) {
  setText(".hero-tag", hero.tagline || settings?.ownerTagline);
  const nameEl = document.querySelector(".hero-name");
  if (nameEl) nameEl.innerHTML = `${hero.firstName || "Your"}<br/><em>${hero.lastName || "Name"}</em>`;
  setText(".hero-sub", hero.subtitle);
  const ctas = document.querySelector(".hero-ctas");
  if (ctas && hero.cta1Text) {
    ctas.innerHTML = `
      <a href="${hero.cta1Link || '#portfolio'}" class="btn btn-fill">${hero.cta1Text}</a>
      <a href="${hero.cta2Link || '#'}" class="btn btn-ghost cv-download-btn"
         data-cv-label="${hero.cta2Text || 'Download CV'}"
         data-cv-type="${hero.cvFileType || 'PDF'}"
         target="_blank" rel="noopener">${hero.cta2Text || 'Download CV'}</a>`;
  }
}

// ─── Render: About ────────────────────────────────────────────────────────────
function renderAbout(about) {
  setText("#about .eyebrow", about.eyebrow);
  setHTML("#about .section-heading", (about.heading || "").replace(/\\n/g,"<br/>").replace(/\n/g,"<br/>"));
  const bodyEl = document.querySelector(".about-body");
  if (bodyEl && Array.isArray(about.body)) bodyEl.innerHTML = about.body.map(p=>`<p>${p}</p>`).join("");
  const statsCol = document.querySelector(".stats-col");
  if (statsCol && Array.isArray(about.stats)) {
    statsCol.innerHTML = about.stats.map(s=>`
      <div class="stat"><span class="stat-num">${s.value}</span><span class="stat-label">${s.label}</span></div>`).join("");
  }
  const photoWrap = document.getElementById("about-photo-wrap");
  const photoImg  = document.getElementById("about-photo");
  const grid      = document.querySelector(".about-grid");
  if (about.profilePhotoUrl && photoWrap && photoImg) {
    photoImg.src = about.profilePhotoUrl;
    photoWrap.style.display = "";
    if (grid) grid.classList.add("has-photo");
  } else if (photoWrap) {
    photoWrap.style.display = "none";
    if (grid) grid.classList.remove("has-photo");
  }
}

// ─── Render: Portfolio ────────────────────────────────────────────────────────
function renderPortfolio(items, categories) {
  const grid      = document.querySelector(".port-grid");
  const filterRow = document.querySelector(".filter-row");
  if (!grid) return;

  const visible = items.filter(i => i.visible !== false);

  // Use dynamic categories from Firestore if available, else derive from items
  const catList = categories.length
    ? categories.map(c => c.slug)
    : [...new Set(visible.map(i => i.category).filter(Boolean))];

  const catLabel = (slug) => {
    const found = categories.find(c => c.slug === slug);
    return found ? found.label : capitalize(slug);
  };

  if (filterRow) {
    filterRow.innerHTML =
      `<button class="filter-btn active" data-filter="all">All</button>` +
      catList.map(c => `<button class="filter-btn" data-filter="${c}">${catLabel(c)}</button>`).join("");
  }

  grid.innerHTML = visible.sort((a,b) => (a.order||0)-(b.order||0)).map(item => {
    const embedUrl = ytEmbed(item.videoUrl);
    let thumbHTML;
    if (embedUrl) {
      thumbHTML = `<div class="port-video-wrap">
        <iframe src="${embedUrl}" title="${item.title}" allowfullscreen loading="lazy"></iframe></div>`;
    } else if (item.imageUrl) {
      thumbHTML = `<div class="port-thumb"><img src="${item.imageUrl}" alt="${item.title}" loading="lazy" /></div>`;
    } else {
      thumbHTML = `<div class="port-thumb"><div class="port-ph">
        <div class="port-ph-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>
        <span>Coming soon</span></div></div>`;
    }

    const hasDetails = item.description || item.link || item.imageUrl || embedUrl;
    return `
      <article class="port-item reveal" data-category="${item.category||''}" data-id="${item.id}"
               ${hasDetails ? 'style="cursor:pointer"' : ''}>
        ${thumbHTML}
        <div class="port-info">
          <div>
            <div class="port-title">${item.title}</div>
            <div class="port-cat">${catLabel(item.category||'')}</div>
          </div>
          <div class="port-arrow" style="${hasDetails?'':'opacity:.2'}">↗</div>
        </div>
      </article>`;
  }).join("");

  // Store items for modal
  window._portfolioItems = items;
  window._portfolioCategories = categories;
}

// ─── Render: CV ───────────────────────────────────────────────────────────────
function renderCv(entries, skillGroups) {
  const timeline = document.querySelector(".timeline");
  if (timeline && entries.length) {
    timeline.innerHTML = entries.sort((a,b)=>(a.order||0)-(b.order||0)).map((e,i)=>`
      <div class="cv-entry">
        <div class="cv-dot-col">
          <div class="cv-dot"></div>
          ${i < entries.length-1 ? '<div class="cv-line"></div>' : ''}
        </div>
        <div>
          <div class="cv-year">${e.period}</div>
          <div class="cv-body">
            <div class="cv-title">${e.title}</div>
            <div class="cv-place">${e.place}</div>
            <div class="cv-desc">${e.description}</div>
          </div>
        </div>
      </div>`).join("");
  }
  const skillsBlock = document.querySelector(".skills-block");
  if (skillsBlock && skillGroups.length) {
    skillsBlock.innerHTML = skillGroups.sort((a,b)=>(a.order||0)-(b.order||0)).map(g=>`
      <div>
        <div class="skill-group-label">${g.label}</div>
        <div class="skill-tags">${(g.skills||[]).map(s=>`<span class="skill-tag">${s}</span>`).join("")}</div>
      </div>`).join("");
  }
}

// ─── Render: Contact ──────────────────────────────────────────────────────────
function renderContact(contact, settings) {
  setText("#contact .eyebrow", contact.eyebrow);
  setHTML("#contact .section-heading", (contact.heading||"").replace(/\\n/g,"<br/>").replace(/\n/g,"<br/>"));
  setText(".contact-body", contact.body);
  const email = settings.email;
  if (email) {
    const emailEl = document.querySelector(".contact-email");
    if (emailEl) { emailEl.href = `mailto:${email}`; emailEl.textContent = email; }
    const emailBtn = document.querySelector(".contact-ctas .btn-ghost");
    if (emailBtn) emailBtn.href = `mailto:${email}`;
  }
  if (settings.cvUrl) {
    const cvBtn = document.querySelector(".contact-ctas .btn-fill");
    if (cvBtn) {
      cvBtn.href             = settings.cvUrl;
      cvBtn.dataset.cvType   = settings.cvFileType || "PDF";
      cvBtn.dataset.cvLabel  = "Download CV";
      cvBtn.classList.add("cv-download-btn");
    }
  }
  const socialRow = document.querySelector(".social-row");
  if (socialRow) {
    socialRow.innerHTML = ["linkedin","behance","instagram","dribbble"]
      .filter(p => settings.socials?.[p])
      .map(p => `<a href="${settings.socials[p]}" class="social-link" target="_blank" rel="noopener">${capitalize(p)}</a>`)
      .join("");
  }
}

// ─── CV Download popup ────────────────────────────────────────────────────────
function initCvPopup() {
  // Create popup element once
  const popup = document.createElement("div");
  popup.id = "cv-popup";
  popup.innerHTML = `
    <div class="cv-popup-inner">
      <div class="cv-popup-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>
      <div class="cv-popup-title">Downloading CV</div>
      <div class="cv-popup-meta" id="cv-popup-meta">PDF Document</div>
      <div class="cv-popup-actions">
        <button class="btn btn-fill" id="cv-popup-confirm">Download</button>
        <button class="btn btn-ghost" id="cv-popup-cancel">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(popup);

  let pendingUrl = "";

  document.addEventListener("click", e => {
    const btn = e.target.closest(".cv-download-btn");
    if (!btn) return;
    e.preventDefault();
    pendingUrl = btn.href || btn.dataset.href || "#";
    const fileType = btn.dataset.cvType || "PDF";
    document.getElementById("cv-popup-meta").textContent = `${fileType} Document`;
    popup.classList.add("active");
  });

  document.getElementById("cv-popup-confirm").addEventListener("click", () => {
    popup.classList.remove("active");
    if (pendingUrl && pendingUrl !== "#") window.open(pendingUrl, "_blank");
  });
  document.getElementById("cv-popup-cancel").addEventListener("click", () => {
    popup.classList.remove("active");
  });
  popup.addEventListener("click", e => {
    if (e.target === popup) popup.classList.remove("active");
  });
}

// ─── Project detail modal ─────────────────────────────────────────────────────
function initProjectModal() {
  const modal = document.createElement("div");
  modal.id = "project-modal";
  modal.innerHTML = `
    <div class="proj-modal-inner">
      <button class="proj-modal-close" aria-label="Close">✕</button>
      <div class="proj-modal-media" id="proj-modal-media"></div>
      <div class="proj-modal-body">
        <div class="proj-modal-cat" id="proj-modal-cat"></div>
        <h2 class="proj-modal-title" id="proj-modal-title"></h2>
        <p class="proj-modal-desc" id="proj-modal-desc"></p>
        <div class="proj-modal-dims" id="proj-modal-dims"></div>
        <a class="btn btn-fill proj-modal-link" id="proj-modal-link" target="_blank" rel="noopener" style="display:none">View Project ↗</a>
      </div>
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector(".proj-modal-close").addEventListener("click", () => modal.classList.remove("active"));
  modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("active"); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") modal.classList.remove("active"); });

  document.addEventListener("click", e => {
    const card = e.target.closest(".port-item");
    if (!card) return;
    const itemId = card.dataset.id;
    const items  = window._portfolioItems || [];
    const cats   = window._portfolioCategories || [];
    const item   = items.find(i => i.id === itemId);
    if (!item) return;

    const embedUrl = ytEmbed(item.videoUrl);
    const mediaEl  = document.getElementById("proj-modal-media");
    const catFound = cats.find(c => c.slug === item.category);
    const catLabel = catFound ? catFound.label : capitalize(item.category || "");

    if (embedUrl) {
      mediaEl.innerHTML = `<div class="proj-modal-video">
        <iframe src="${embedUrl}" title="${item.title}" allowfullscreen></iframe></div>`;
    } else if (item.imageUrl) {
      mediaEl.innerHTML = `<img src="${item.imageUrl}" alt="${item.title}" />`;
      // Show recommended dims hint
      document.getElementById("proj-modal-dims").textContent = "Recommended: 1200 × 900px (4:3)";
    } else {
      mediaEl.innerHTML = `<div class="proj-modal-placeholder">No image set</div>`;
      document.getElementById("proj-modal-dims").textContent = "Recommended: 1200 × 900px (4:3)";
    }

    document.getElementById("proj-modal-cat").textContent   = catLabel;
    document.getElementById("proj-modal-title").textContent = item.title;
    document.getElementById("proj-modal-desc").textContent  = item.description || "";

    const linkEl = document.getElementById("proj-modal-link");
    if (item.link) { linkEl.href = item.link; linkEl.style.display = ""; }
    else { linkEl.style.display = "none"; }

    modal.classList.add("active");
  });
}

// ─── Interactions ─────────────────────────────────────────────────────────────
function initInteractions() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", e => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      const offset = document.querySelector("nav").offsetHeight;
      window.scrollTo({ top: target.offsetTop - offset, behavior: "smooth" });
      if (window.closeMenu) closeMenu();
    });
  });

  const nav      = document.getElementById("nav");
  const sections = [...document.querySelectorAll("section[id]")];
  const navLinks = document.querySelectorAll(".nav-links a");

  function onScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 40);
    let cur = "";
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) cur = s.id; });
    navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${cur}`));
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const burger = document.querySelector(".burger");
  const drawer = document.querySelector(".drawer");
  function closeMenu() {
    burger.classList.remove("open"); drawer.classList.remove("open");
    burger.setAttribute("aria-expanded","false"); document.body.style.overflow = "";
  }
  window.closeMenu = closeMenu;
  burger.addEventListener("click", () => {
    const open = drawer.classList.contains("open");
    if (open) { closeMenu(); } else {
      burger.classList.add("open"); drawer.classList.add("open");
      burger.setAttribute("aria-expanded","true"); document.body.style.overflow = "hidden";
    }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });

  document.addEventListener("click", e => {
    if (!e.target.classList.contains("filter-btn")) return;
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    const f = e.target.dataset.filter;
    document.querySelectorAll(".port-item").forEach(item => {
      item.classList.toggle("hidden", f !== "all" && item.dataset.category !== f);
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e,i) => {
      if (e.isIntersecting) { setTimeout(() => e.target.classList.add("in"), i*60); observer.unobserve(e.target); }
    });
  }, { threshold: 0.06, rootMargin: "0px 0px -32px 0px" });
  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
}

function reObserveReveals() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e,i) => {
      if (e.isIntersecting) { setTimeout(() => e.target.classList.add("in"), i*60); observer.unobserve(e.target); }
    });
  }, { threshold: 0.06, rootMargin: "0px 0px -32px 0px" });
  document.querySelectorAll(".reveal:not(.in)").forEach(el => observer.observe(el));
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  try {
    const [settings, hero, about, contact, portfolioItems, cvEntries, skillGroups, categories] = await Promise.all([
      fetchDoc("site",      "settings"),
      fetchDoc("site",      "hero"),
      fetchDoc("site",      "about"),
      fetchDoc("site",      "contact"),
      fetchCollection("portfolio", "order"),
      fetchCollection("cv",        "order"),
      fetchCollection("skills",    "order"),
      fetchCollection("categories","order"),
    ]);

    settings._heroLogoUrl = hero.logoUrl || "";

    renderSettings(settings);
    renderHero(hero, settings);
    renderAbout(about);
    renderPortfolio(portfolioItems, categories);
    renderCv(cvEntries, skillGroups);
    renderContact(contact, settings);

  } catch (err) {
    console.error("CareerCanvas: failed to load data:", err);
  } finally {
    const loader = document.getElementById("site-loader");
    if (loader) loader.classList.add("hidden");
    initInteractions();
    initCvPopup();
    initProjectModal();
    reObserveReveals();
  }
}

boot();
