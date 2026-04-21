/**
 * Firebase Seed Script
 * Run once to populate Firestore with initial site content.
 * Usage: node firebase/seed.js
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or serviceAccountKey.json in same dir
 */

const admin = require("firebase-admin");
const path  = require("path");
const fs    = require("fs");

// Load service account — tries Secret File, env var, then local file
let serviceAccount;

const secretPath = "/etc/secrets/serviceAccountKey.json";
if (fs.existsSync(secretPath)) {
  console.log("🔑  Using Secret File:", secretPath);
  serviceAccount = JSON.parse(fs.readFileSync(secretPath, "utf8").trim());
} else if (process.env.FIREBASE_SERVICE_KEY && process.env.FIREBASE_SERVICE_KEY.trim().length > 0) {
  console.log("🔑  Using FIREBASE_SERVICE_KEY env var");
  let cleaned = process.env.FIREBASE_SERVICE_KEY.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  cleaned = cleaned.replace(/\\n/g, "\n");
  serviceAccount = JSON.parse(cleaned);
} else {
  // Try multiple local paths
  const localPaths = [
    path.join(__dirname, "serviceAccountKey.json"),
    path.join(__dirname, "..", "serviceAccountKey.json"),
    path.join(__dirname, "..", "bot", "serviceAccountKey.json"),
    path.join(process.cwd(), "serviceAccountKey.json"),
  ];
  let found = false;
  for (const p of localPaths) {
    if (fs.existsSync(p)) {
      console.log("🔑  Using local file:", p);
      serviceAccount = JSON.parse(fs.readFileSync(p, "utf8"));
      found = true;
      break;
    }
  }
  if (!found) {
    console.error("❌  No credentials found. Tried:");
    console.error("      • /etc/secrets/serviceAccountKey.json");
    console.error("      • FIREBASE_SERVICE_KEY env var");
    console.error("      • Local serviceAccountKey.json in firebase/, project root, bot/");
    console.error("\n  Place serviceAccountKey.json next to seed.js or set the env var.");
    process.exit(1);
  }
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ─── SEED DATA ───────────────────────────────────────────────────────────────

const seedData = {

  // ── Site-wide settings ──────────────────────────────────────────────────────
  settings: {
    siteTitle:    "Alex Morgan — Creative Professional",
    siteDesc:     "Alex Morgan is a Creative Professional based in Your City, Your Country.",
    ownerName:    "Alex Morgan",
    ownerTagline: "Creative Professional",
    ownerLocation:"Your City, Your Country",
    email:        "hello@example.com",
    cvUrl:        "https://drive.google.com/uc?export=download&id=YOUR_GOOGLE_DRIVE_FILE_ID",
    cvFileType:   "PDF",
    portfolioName: "Alex Morgan",
    faviconUrl:   "",            // optional — set via bot
    socials: {
      linkedin:  "https://www.linkedin.com/in/yourprofile",
      behance:   "https://www.behance.net/yourprofile",
      instagram: "https://www.instagram.com/yourprofile",
      dribbble:  "https://dribbble.com/yourprofile",
    },
    colors: {
      ink:    "#111010",
      paper:  "#F5F2ED",
      warm:   "#EDE9E1",
      accent: "#C8441B",
      muted:  "#8A8578",
      line:   "#D9D5CC",
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },

  // ── Hero section ────────────────────────────────────────────────────────────
  hero: {
    tagline:  "Creative Professional",
    firstName:"Alex",
    lastName: "Morgan",
    subtitle: "Your City, Your Country",
    cta1Text: "See my work",
    cta1Link: "#portfolio",
    cta2Text: "Download CV",
    cta2Link: "https://drive.google.com/uc?export=download&id=YOUR_GOOGLE_DRIVE_FILE_ID",
    logoUrl:  "",            // optional nav logo image URL
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },

  // ── About section ───────────────────────────────────────────────────────────
  about: {
    eyebrow:  "About me",
    heading:  "Design that\nconnects.",
    body: [
      "Creative professional passionate about crafting work that connects with audiences. Delivering thoughtful designs and content that engage people and support brand growth.",
      "With experience across multiple disciplines, I bring both technical skill and creative vision to every project.",
    ],
    stats: [
      { value: "4+",   label: "Years experience" },
      { value: "10+",  label: "Tools mastered"   },
      { value: "100%", label: "Creative output"  },
    ],
    profilePhotoUrl: "",   // set via bot — external URL
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },

  // ── Contact section ─────────────────────────────────────────────────────────
  contact: {
    eyebrow:    "Get in touch",
    heading:    "Let's work\ntogether.",
    body:       "Have a project in mind? I'd love to hear about it.",
    updatedAt:  admin.firestore.FieldValue.serverTimestamp(),
  },

  // ── Admin auth ──────────────────────────────────────────────────────────────
  adminAuth: {
    password:  "admin123",    // change this immediately via Settings in admin panel
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    copyright: "© 2026 Alex Morgan. All rights reserved.",
    credit:    "Designed & built by Alex Morgan",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
};

// ── Portfolio items (sub-collection) ─────────────────────────────────────────
const portfolioItems = [
  {
    id:       "proj-01",
    order:    1,
    title:    "Brand Identity",
    category: "branding",
    imageUrl: "",          // set via bot after upload
    videoUrl: "",          // YouTube URL — will be embedded if present
    description:"",
    link:     "",
    visible:  true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id:       "proj-02",
    order:    2,
    title:    "Magazine Layout",
    category: "print",
    imageUrl: "",
    videoUrl: "",
    description:"",
    link:     "",
    visible:  true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id:       "proj-03",
    order:    3,
    title:    "Social Campaign",
    category: "digital",
    imageUrl: "",
    videoUrl: "",
    description:"",
    link:     "",
    visible:  true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id:       "proj-04",
    order:    4,
    title:    "Logo & Mark",
    category: "identity",
    imageUrl: "",
    videoUrl: "",
    description:"",
    link:     "",
    visible:  true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id:       "proj-05",
    order:    5,
    title:    "Packaging Design",
    category: "branding",
    imageUrl: "",
    videoUrl: "",
    description:"",
    link:     "",
    visible:  true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
];


// ── Categories (dynamic portfolio filters) ───────────────────────────────────
const categoryItems = [
  { id: "cat-branding",  order: 1, label: "Branding",  slug: "branding"  },
  { id: "cat-print",     order: 2, label: "Print",     slug: "print"     },
  { id: "cat-digital",   order: 3, label: "Digital",   slug: "digital"   },
  { id: "cat-identity",  order: 4, label: "Identity",  slug: "identity"  },
];

// ── CV Timeline entries (sub-collection) ─────────────────────────────────────
const cvEntries = [
  {
    id:          "cv-01",
    order:       1,
    period:      "2024 – Present",
    title:       "Senior Creative",
    place:       "Creative Agency Name",
    description: "Led creative projects and delivered high-quality work across digital and print media, supporting brand growth and audience engagement.",
    updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id:          "cv-02",
    order:       2,
    period:      "2021 – 2023",
    title:       "Graphic Designer",
    place:       "Freelance",
    description: "Designed logos and branding materials for clients, gaining hands-on experience across industry-standard tools on diverse branding and print projects.",
    updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
  },
];

// ── Skills (sub-collection) ──────────────────────────────────────────────────
const skillGroups = [
  {
    id:     "skills-design",
    order:  1,
    label:  "Design Tools",
    skills: ["Adobe Illustrator","Adobe Photoshop","Adobe InDesign","Adobe Premiere Pro","Figma","Canva"],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id:     "skills-creative",
    order:  2,
    label:  "Creative Skills",
    skills: ["Branding","Typography","Copywriting","Logo Design","Print Design"],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id:     "skills-digital",
    order:  3,
    label:  "Digital & Media",
    skills: ["Social Media Management","Meta Business Suite","Website Management","Radio Broadcasting"],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
];

// ─── WRITE TO FIRESTORE ───────────────────────────────────────────────────────

async function seed() {
  console.log("🌱  Seeding Firestore...\n");

  // Top-level documents
  for (const [docId, data] of Object.entries(seedData)) {
    await db.collection("site").doc(docId).set(data, { merge: true });
    console.log(`  ✓  site/${docId}`);
  }

  // Portfolio sub-collection
  for (const item of portfolioItems) {
    const { id, ...data } = item;
    await db.collection("portfolio").doc(id).set(data, { merge: true });
    console.log(`  ✓  portfolio/${id}  (${item.title})`);
  }

  // CV timeline sub-collection
  for (const entry of cvEntries) {
    const { id, ...data } = entry;
    await db.collection("cv").doc(id).set(data, { merge: true });
    console.log(`  ✓  cv/${id}  (${entry.title})`);
  }

  // Categories
  for (const cat of categoryItems) {
    const { id, ...data } = cat;
    await db.collection("categories").doc(id).set({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    console.log(`  ✓  categories/${id}  (${cat.label})`);
  }

  // Skills sub-collection
  for (const group of skillGroups) {
    const { id, ...data } = group;
    await db.collection("skills").doc(id).set(data, { merge: true });
    console.log(`  ✓  skills/${id}  (${group.label})`);
  }

  console.log("\n✅  Seed complete.");
  process.exit(0);
}

seed().catch(err => { console.error("❌  Seed failed:", err); process.exit(1); });
