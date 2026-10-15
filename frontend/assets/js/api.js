/* =====================================================================
   AdmitPath — api.js
   ---------------------------------------------------------------------
   Shared API client. In the full-stack build API.request() hits the
   FastAPI backend. In this front-end-only build every endpoint is served
   by a localStorage-backed store that mirrors the documented REST surface
   (see docs/API_DOCUMENTATION.md).

   SECURITY NOTE: this client-side store is for demonstration only. It is
   replaced by FastAPI + SQLAlchemy + Argon2 in the full-stack project and
   must never be used to guard real data.
   ===================================================================== */
(function () {
  "use strict";

  const DB_KEY = "admitpath.db.v1";
  const SESSION_KEY = "admitpath.session.v1";
  let memoryDB = null; // fallback when localStorage is unavailable

  /* ---------------- helpers ---------------- */
  const uid = (p) => (p || "id") + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const delay = (ms) => new Promise((r) => setTimeout(r, ms == null ? 320 : ms));
  const obf = (s) => "ap1:" + btoa(unescape(encodeURIComponent("admitpath:" + s)));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const emailRe = /^(?!.*\.\.)[A-Z0-9](?:[A-Z0-9.!#$%&'*+/=?^_`{|}~-]*[A-Z0-9])?@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;
  const nameRe = /^\p{L}+(?: \p{L}+)*$/u;
  const mobileRe = /^[0-9]{10}$/;
  const digitsRe = /^[0-9]+$/;

  function validDateOnly(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
    const date = new Date(value + "T00:00:00Z");
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function rejectInvalid(errors) {
    if (Object.keys(errors).length) throw ApiError("Please correct the highlighted fields and try again.", 422, errors);
  }
  function requiredText(value) { return typeof value === "string" && value.trim().length > 0; }

  function lsGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function lsSet(key, val) {
    try { window.localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }
  function lsDel(key) {
    try { window.localStorage.removeItem(key); } catch (e) {}
  }

  /* ---------------- seed data ---------------- */
  function seed() {
    const now = Date.now();
    const day = 86400000;
    const iso = (offset) => new Date(now + offset * day).toISOString().slice(0, 10);

    const users = AP.config.demoAccounts.map((a, i) => ({
      id: "usr_" + (i + 1),
      name: a.name,
      email: a.email.toLowerCase(),
      mobile: "98765432" + (10 + i),
      role: a.role,
      passwordHash: obf(a.password),
      avatar: "",
      createdAt: new Date(now - (30 - i) * day).toISOString(),
    }));

    const counselors = [
      { id: "cns_1", userId: "usr_2", name: "Dr. Meera Nair", title: "Senior Admissions Strategist", specializations: ["Ivy League", "Essays", "Interviews"], experience: 12, university: "Harvard University", location: "Bengaluru, India", languages: ["English", "Hindi", "Malayalam"], rating: 4.9, studentsCount: 240, photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80", bio: "Meera has guided 240+ students into top-tier US universities with a focus on authentic storytelling." },
      { id: "cns_2", name: "Rahul Iyer", title: "STEM & Engineering Admissions Coach", specializations: ["STEM", "Scholarships", "UK Universities"], experience: 9, university: "Imperial College London", location: "Mumbai, India", languages: ["English", "Hindi", "Tamil"], rating: 4.8, studentsCount: 180, photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=500&q=80", bio: "Rahul specialises in competitive STEM applications and merit scholarship strategy." },
      { id: "cns_3", name: "Sara Khan", title: "Liberal Arts & Profile Mentor", specializations: ["Liberal Arts", "Essays", "Profile Building"], experience: 8, university: "Wellesley College", location: "Delhi, India", languages: ["English", "Hindi", "Urdu"], rating: 4.9, studentsCount: 150, photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=500&q=80", bio: "Sara helps students build distinctive profiles for selective liberal arts colleges." },
      { id: "cns_4", name: "David Fernandes", title: "Test Prep & Strategy Lead", specializations: ["Test Prep", "Applications", "Canada"], experience: 11, university: "University of Toronto", location: "Goa, India", languages: ["English", "Konkani", "Portuguese"], rating: 4.7, studentsCount: 210, photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=500&q=80", bio: "David blends standardised-test strategy with holistic application planning." },
      { id: "cns_5", name: "Ananya Rao", title: "Financial Aid & Scholarships Advisor", specializations: ["Financial Aid", "Scholarships", "Europe"], experience: 7, university: "ETH Zurich", location: "Hyderabad, India", languages: ["English", "Telugu", "German"], rating: 4.8, studentsCount: 130, photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80", bio: "Ananya maps funding options and negotiates aid packages for families." },
      { id: "cns_6", name: "James Peterson", title: "Global Admissions Consultant", specializations: ["Ivy League", "Athletics", "Australia"], experience: 15, university: "University of Melbourne", location: "Remote", languages: ["English"], rating: 4.9, studentsCount: 300, photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80", bio: "James advises international applicants across three continents." },
    ];

    const services = [
      { id: "svc_1", icon: "bi-diagram-3", name: "College Application Strategy", summary: "A personalised roadmap that aligns your goals, profile and target universities.", price: "Included", features: ["Profile assessment", "School-fit analysis", "12-month roadmap", "Deadline tracker"] },
      { id: "svc_2", icon: "bi-pencil-square", name: "Personal Statement & Essay Coaching", summary: "One-to-one coaching to craft authentic, memorable essays in your own voice.", price: "From ₹9,999", features: ["Brainstorming sessions", "Unlimited drafts", "Line-by-line feedback", "Final polish"] },
      { id: "svc_3", icon: "bi-flag", name: "University Selection", summary: "Build a balanced list of reach, match and safety schools that fit you.", price: "Included", features: ["Ranking analysis", "Campus culture fit", "Cost comparison", "Final list review"] },
      { id: "svc_4", icon: "bi-cash-coin", name: "Scholarship Guidance", summary: "Identify and apply to scholarships that reduce the cost of your degree.", price: "Included", features: ["Funding search", "Essay support", "Application tracking", "Interview prep for awards"] },
      { id: "svc_5", icon: "bi-mic", name: "Interview Preparation", summary: "Mock interviews and feedback so you walk in confident and prepared.", price: "From ₹4,999", features: ["Mock sessions", "Video feedback", "Question bank", "Confidence coaching"] },
      { id: "svc_6", icon: "bi-clipboard-check", name: "Application Review", summary: "A complete quality review of every document before you hit submit.", price: "From ₹6,999", features: ["Document audit", "Consistency check", "Error detection", "Submit-readiness report"] },
    ];

    const blogPosts = [
      { id: "post_1", slug: "choosing-the-right-college-fit", title: "Choosing the Right College: Fit Beats Rankings", category: "College Selection", author: "Dr. Meera Nair", date: iso(-3), readTime: 6, featured: true, image: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80", excerpt: "Rankings tell one story, but fit decides whether you thrive. Here is how to build a list that actually suits you.", tags: ["college selection", "fit", "rankings"] },
      { id: "post_2", slug: "essay-writing-that-sounds-like-you", title: "Essay Writing That Actually Sounds Like You", category: "Essays", author: "Sara Khan", date: iso(-6), readTime: 7, featured: false, image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80", excerpt: "The best personal statements reveal character through small, specific moments. Learn a framework for authentic essays.", tags: ["essays", "writing", "personal statement"] },
      { id: "post_3", slug: "application-deadline-planner", title: "The Application Deadline Planner Every Student Needs", category: "Deadlines", author: "Rahul Iyer", date: iso(-10), readTime: 5, featured: false, image: "https://images.unsplash.com/photo-1506784365847-bbad939e9335?auto=format&fit=crop&w=1200&q=80", excerpt: "Never miss a deadline again. A month-by-month planner for early action, regular decision and rolling admissions.", tags: ["deadlines", "planning", "timeline"] },
      { id: "post_4", slug: "scholarships-worth-your-time", title: "How to Find Scholarships Worth Your Time", category: "Scholarships", author: "Ananya Rao", date: iso(-14), readTime: 8, featured: false, image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80", excerpt: "Not every scholarship is worth the application. Here is a filter for high-value, low-competition awards.", tags: ["scholarships", "financial aid", "funding"] },
      { id: "post_5", slug: "recommendation-letters-that-help", title: "Recommendation Letters That Actually Help", category: "Applications", author: "James Peterson", date: iso(-19), readTime: 6, featured: false, image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80", excerpt: "Who should write your letters, when to ask, and how to make it easy for them to advocate for you.", tags: ["recommendations", "applications", "letters"] },
      { id: "post_6", slug: "acing-your-admissions-interview", title: "Acing Your Admissions Interview", category: "Interviews", author: "David Fernandes", date: iso(-24), readTime: 5, featured: false, image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80", excerpt: "Interviews reward preparation and genuine curiosity. Practice these question patterns and stories.", tags: ["interviews", "preparation", "confidence"] },
      { id: "post_7", slug: "building-a-standout-profile", title: "Building a Standout Extracurricular Profile", category: "Applications", author: "Sara Khan", date: iso(-29), readTime: 7, featured: false, image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80", excerpt: "Depth beats breadth. Learn how to show impact and leadership across a few meaningful activities.", tags: ["profile", "extracurriculars", "leadership"] },
      { id: "post_8", slug: "understanding-financial-aid", title: "Understanding Financial Aid Offers", category: "Scholarships", author: "Ananya Rao", date: iso(-33), readTime: 6, featured: false, image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&q=80", excerpt: "Decode grants, loans, work-study and net cost so you can compare offers apple to apple.", tags: ["financial aid", "scholarships", "cost"] },
      { id: "post_9", slug: "mastering-common-app-activities", title: "Mastering the Common App Activities Section", category: "Applications", author: "James Peterson", date: iso(-35), readTime: 5, featured: false, image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80", excerpt: "Transform your extracurriculars into compelling entries with action, impact, and clarity.", tags: ["common app", "activities", "applications"] },
    ];

    // Rich content for the featured + default article (blog-details)
    const articleContent = `
      <p class="lead">Rankings can be a useful starting point, but they are a poor finishing point. The students who thrive are the ones who chose a place where they could grow — academically, socially and personally.</p>
      <h2 id="why-fit-matters">Why fit matters more than prestige</h2>
      <p>A strong program at a school that matches your learning style, budget and goals will almost always beat a prestigious name that leaves you stretched and unhappy. Fit has four dimensions worth evaluating.</p>
      <h2 id="academic-fit">Academic fit</h2>
      <p>Look beyond the headline ranking to the department you actually want. Course catalogs, class sizes, research opportunities and faculty accessibility matter far more than an overall number.</p>
      <blockquote class="ap-rounded ap-bg-lavender p-3 my-3"><p class="mb-0">The right question is not "Is this the best college?" but "Is this the best college <strong>for me</strong>?"</p></blockquote>
      <h2 id="financial-fit">Financial fit</h2>
      <p>Net cost — not sticker price — should drive your decision. Run each school's net price calculator early and compare aid offers like for like.</p>
      <h2 id="social-fit">Social and cultural fit</h2>
      <p>Campus culture, location, size and student life shape your day-to-day happiness. If you can, visit, or talk to current students online.</p>
      <h2 id="building-your-list">Building a balanced list</h2>
      <p>Aim for a list where roughly 25% are reach schools, 50% are match schools and 25% are safety schools. Every school on the list should be one you would genuinely be happy to attend.</p>
      <h2 id="next-steps">Next steps</h2>
      <p>Start by writing down your non-negotiables, then research programs that meet them. A counselor can help you pressure-test the list before you commit.</p>
    `;
    blogPosts.forEach((p) => { p.content = articleContent; });

    const testimonials = [
      { id: "tst_1", name: "Riya M.", detail: "Class of 2025 · Sample profile", destination: "Admitted to a top-20 US university", quote: "My counselor helped me find a story I was proud to tell. The process felt manageable instead of overwhelming.", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80" },
      { id: "tst_2", name: "Karthik S.", detail: "Class of 2024 · Sample profile", destination: "Engineering scholarship recipient", quote: "The scholarship guidance honestly saved my family more than the cost of the program many times over.", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80" },
      { id: "tst_3", name: "Fatima A.", detail: "Class of 2025 · Sample profile", destination: "Liberal arts college admit", quote: "Practising interviews with real feedback made all the difference. I walked in calm and confident.", photo: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=200&q=80" },
      { id: "tst_4", name: "Daniel O.", detail: "Class of 2023 · Sample profile", destination: "UK university offer holder", quote: "Clear deadlines, honest advice and a counselor who actually replied. Highly recommend.", photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80" },
    ];

    /* Demo student's working data */
    const applications = [
      { id: "app_1", userId: "usr_1", university: "Massachusetts Institute of Technology", program: "B.Sc. Computer Science", country: "USA", deadline: iso(45), status: "In Progress", createdAt: new Date(now - 20 * day).toISOString() },
      { id: "app_2", userId: "usr_1", university: "University of Toronto", program: "B.Sc. Engineering Science", country: "Canada", deadline: iso(70), status: "In Progress", createdAt: new Date(now - 12 * day).toISOString() },
      { id: "app_3", userId: "usr_1", university: "University of Edinburgh", program: "B.Sc. Artificial Intelligence", country: "UK", deadline: iso(95), status: "Planning", createdAt: new Date(now - 5 * day).toISOString() },
    ];

    const checklistItems = [];
    const mk = (appId, title, status, priority, duedays, category) => {
      checklistItems.push({ id: uid("chk"), applicationId: appId, userId: "usr_1", title, status, priority, dueDate: iso(duedays), category });
    };
    mk("app_1", "Complete personal statement first draft", "Completed", "High", -5, "Essays");
    mk("app_1", "Request recommendation letters", "Completed", "High", -3, "Recommendations");
    mk("app_1", "Upload official transcripts", "In Progress", "High", 6, "Documents");
    mk("app_1", "Draft MIT supplementary essays", "In Progress", "High", 12, "Essays");
    mk("app_1", "Prepare for alumni interview", "Pending", "Medium", 25, "Interviews");
    mk("app_1", "Submit financial aid forms (CSS Profile)", "Pending", "High", 20, "Financial Aid");
    mk("app_2", "Shortlist engineering programs", "Completed", "Medium", -8, "Planning");
    mk("app_2", "Write Why-Canada essay", "In Progress", "High", 15, "Essays");
    mk("app_2", "Proofread application form", "Pending", "Medium", 30, "Documents");
    mk("app_3", "Research AI department faculty", "In Progress", "Low", 18, "Planning");

    const essays = [
      { id: "ess_1", userId: "usr_1", applicationId: "app_1", title: "Personal Statement — 'The Repair Shop'", version: 3, fileName: "personal-statement-v3.docx", status: "Feedback Ready", wordCount: 648, submittedAt: new Date(now - 2 * day).toISOString() },
      { id: "ess_2", userId: "usr_1", applicationId: "app_1", title: "MIT — Why Computer Science", version: 1, fileName: "mit-why-cs-v1.pdf", status: "In Review", wordCount: 320, submittedAt: new Date(now - 1 * day).toISOString() },
      { id: "ess_3", userId: "usr_1", applicationId: "app_2", title: "Toronto — Engineering Community", version: 2, fileName: "toronto-engineering-v2.docx", status: "Revision Requested", wordCount: 410, submittedAt: new Date(now - 6 * day).toISOString() },
    ];

    const essayFeedback = [
      { id: uid("fbk"), essayId: "ess_1", counselorId: "cns_1", category: "Storytelling", comment: "Beautiful opening image. The repair shop metaphor is memorable — keep it and let it return at the end.", createdAt: new Date(now - 1 * day).toISOString() },
      { id: uid("fbk"), essayId: "ess_1", counselorId: "cns_1", category: "Structure", comment: "Consider moving your 'why this major' paragraph slightly earlier so the reader sees purpose sooner.", createdAt: new Date(now - 1 * day).toISOString() },
      { id: uid("fbk"), essayId: "ess_1", counselorId: "cns_1", category: "Clarity", comment: "A couple of sentences in paragraph 3 are run-on. Break them up for rhythm.", createdAt: new Date(now - 1 * day).toISOString() },
      { id: uid("fbk"), essayId: "ess_3", counselorId: "cns_1", category: "Grammar", comment: "Tense shifts in the middle section — stay in past tense when describing the project.", createdAt: new Date(now - 4 * day).toISOString() },
    ];

    const meetings = [
      { id: "mtg_1", studentId: "usr_1", counselorId: "cns_1", date: iso(2), time: "16:00", duration: 45, topic: "Personal statement review", status: "Confirmed", mode: "Video call", notes: "Bring the latest draft of the personal statement." },
      { id: "mtg_2", studentId: "usr_1", counselorId: "cns_1", date: iso(9), time: "10:30", duration: 30, topic: "MIT application strategy", status: "Scheduled", mode: "Video call", notes: "Discuss supplementary essays and interview prep." },
      { id: "mtg_3", studentId: "usr_1", counselorId: "cns_1", date: iso(-7), time: "15:00", duration: 45, topic: "Initial strategy call", status: "Completed", mode: "Video call", notes: "Set the 12-month roadmap." },
      { id: "mtg_4", studentId: "usr_1", counselorId: "cns_5", date: iso(-14), time: "11:00", duration: 30, topic: "Scholarship planning", status: "Completed", mode: "Phone", notes: "Reviewed merit scholarship deadlines." },
    ];

    const contactInquiries = [
      { id: uid("inq"), name: "Sample Inquiry", email: "sample.inquiry@example.com", mobile: "9000000000", subject: "Program enquiry", category: "General", message: "This is a seeded demo inquiry.", consent: true, status: "New", createdAt: new Date(now - 4 * day).toISOString() },
    ];

    const subscribedAt = new Date(now - 20 * day).toISOString();
    const newsletterSubscribers = [{ id: uid("sub"), email: "sample.subscriber@example.com", createdAt: subscribedAt }];

    const notifications = [
      { id: uid("ntf"), userId: "usr_1", icon: "bi-chat-left-text", text: "Dr. Meera Nair left feedback on your personal statement.", time: new Date(now - 1 * day).toISOString(), read: false },
      { id: uid("ntf"), userId: "usr_1", icon: "bi-calendar-check", text: "Reminder: Personal statement review call in 2 days.", time: new Date(now - 6 * 3600000).toISOString(), read: false },
      { id: uid("ntf"), userId: "usr_1", icon: "bi-flag", text: "Your MIT application is 60% complete.", time: new Date(now - 2 * day).toISOString(), read: true },
    ];

    return {
      users, counselors, services, blogPosts, testimonials, applications, checklistItems,
      essays, essayFeedback, meetings, contactInquiries, newsletterSubscribers, notifications,
      bookings: [], meta: { seededAt: now },
    };
  }

  /* ---------------- store ---------------- */
  const store = {
    db: null,
    load() {
      if (this.db) return this.db;
      const raw = lsGet(DB_KEY);
      if (raw) {
        try { this.db = JSON.parse(raw); } catch (e) { this.db = seed(); }
      } else {
        this.db = seed();
        this.persist();
      }
      return this.db;
    },
    persist() {
      if (!lsSet(DB_KEY, JSON.stringify(this.db))) memoryDB = JSON.stringify(this.db);
    },
    reset() { this.db = seed(); this.persist(); },
    save() { this.persist(); },
  };

  /* ---------------- session ---------------- */
  const session = {
    get() {
      const raw = lsGet(SESSION_KEY);
      if (!raw) return null;
      try {
        const s = JSON.parse(raw);
        if (s.expiry && Date.now() > s.expiry) { this.clear(); return null; }
        return s;
      } catch (e) { return null; }
    },
    set(user) {
      const token = "tok_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      const s = { userId: user.id, role: user.role, name: user.name, email: user.email, token, expiry: Date.now() + 24 * 60 * 60 * 1000 };
      lsSet(SESSION_KEY, JSON.stringify(s));
      return s;
    },
    clear() { lsDel(SESSION_KEY); },
  };

  /* ---------------- errors ---------------- */
  function ApiError(message, status, errors) {
    const e = new Error(message);
    e.name = "ApiError";
    e.status = status || 400;
    e.errors = errors || null;
    return e;
  }

  /* ---------------- dispatch (the "API") ---------------- */
  const user = () => session.get();

  /* Demo preview: dashboard pages open directly. When no one is signed in we
     fall back to the seeded demo student so the pages render real sample data
     instead of bouncing the visitor to the login page. */
  function previewSession() {
    const db = store.load();
    const u = (db.users || []).find((x) => x.role === "STUDENT") || (db.users || [])[0];
    if (!u) return null;
    return { userId: u.id, role: u.role, name: u.name, email: u.email, token: "preview", preview: true };
  }

  function requireUser(role) {
    const s = session.get() || previewSession();
    if (!s) throw ApiError("Authentication required.", 401);
    if (role && s.role !== role) throw ApiError("You do not have permission to perform this action.", 403);
    return s;
  }

  const api = {
    session,
    previewSession,

    _error: ApiError,

    /* ---- AUTH ---- */
    async register(payload) {
      await delay();
      payload = payload || {};
      const db = store.load();
      const name = String(payload.name || "").trim().replace(/ {2,}/g, " ");
      const email = String(payload.email || "").trim().toLowerCase();
      const mobile = String(payload.mobile || "").trim();
      const errors = {};
      if (!nameRe.test(name)) errors.name = "Enter a valid name using letters and spaces only.";
      if (!emailRe.test(email) || email.length > 254) errors.email = "Enter a valid email address.";
      if (!mobileRe.test(mobile)) errors.mobile = "Enter a valid 10-digit mobile number.";
      if (typeof payload.password !== "string" || payload.password.length < 8 || !/[A-Za-z]/.test(payload.password) || !/[0-9]/.test(payload.password)) errors.password = "Use at least 8 characters including a letter and a number.";
      rejectInvalid(errors);
      if (db.users.some((u) => u.email === email)) {
        throw ApiError("An account with this email already exists.", 409, { email: "This email is already registered." });
      }
      const u = {
        id: uid("usr"), name, email, mobile,
        role: "STUDENT", passwordHash: obf(payload.password), avatar: "", createdAt: new Date().toISOString(),
      };
      db.users.push(u);
      store.save();
      return { id: u.id, name: u.name, email: u.email, role: u.role };
    },

    async login(email, password) {
      await delay();
      const db = store.load();
      const normalizedEmail = String(email || "").trim().toLowerCase();
      if (!emailRe.test(normalizedEmail) || typeof password !== "string" || !password) throw ApiError("Invalid email or password.", 401);
      const u = db.users.find((x) => x.email === normalizedEmail);
      if (!u || u.passwordHash !== obf(password)) {
        throw ApiError("Invalid email or password.", 401);
      }
      const s = session.set(u);
      return { token: s.token, role: u.role, name: u.name, email: u.email, id: u.id };
    },

    async logout() { await delay(120); session.clear(); return { ok: true }; },

    async me() {
      const s = session.get() || previewSession();
      if (!s) return null;
      const db = store.load();
      const u = db.users.find((x) => x.id === s.userId);
      if (!u) return null;
      return { id: u.id, name: u.name, email: u.email, mobile: u.mobile, role: u.role };
    },

    /* ---- ACCOUNT SETTINGS ---- */
    async updateProfile(payload) {
      await delay();
      const s = requireUser();
      const db = store.load();
      const u = db.users.find((x) => x.id === s.userId);
      if (!u) throw ApiError("Account not found.", 404);
      payload = payload || {};
      const name = String(payload.name || "").trim().replace(/ {2,}/g, " ");
      const email = String(payload.email || "").trim().toLowerCase();
      const mobile = String(payload.mobile || "").trim();
      const errors = {};
      if (!nameRe.test(name)) errors.name = "Enter a valid name using letters and spaces only.";
      if (!emailRe.test(email) || email.length > 254) errors.email = "Enter a valid email address.";
      if (mobile && !mobileRe.test(mobile)) errors.mobile = "Enter a valid 10-digit mobile number.";
      if (db.users.some((x) => x.email === email && x.id !== u.id)) errors.email = "This email is already registered.";
      rejectInvalid(errors);
      u.name = name;
      u.email = email;
      u.mobile = mobile;
      store.save();
      session.set(u);
      return { id: u.id, name: u.name, email: u.email, mobile: u.mobile, role: u.role };
    },
    async changePassword(currentPassword, newPassword) {
      await delay();
      const s = requireUser();
      const db = store.load();
      const u = db.users.find((x) => x.id === s.userId);
      if (!u) throw ApiError("Account not found.", 404);
      const errors = {};
      if (u.passwordHash !== obf(String(currentPassword || ""))) errors.currentPassword = "Your current password is incorrect.";
      if (typeof newPassword !== "string" || newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) errors.newPassword = "Use at least 8 characters including a letter and a number.";
      else if (currentPassword === newPassword) errors.newPassword = "Choose a password different from your current one.";
      rejectInvalid(errors);
      u.passwordHash = obf(newPassword);
      store.save();
      return { ok: true };
    },
    getSettings() {
      const s = session.get();
      const db = store.load();
      const u = s && db.users.find((x) => x.id === s.userId);
      return clone(Object.assign({ emailNotifications: true, deadlineReminders: true, essayFeedback: true, newsletter: false, theme: "light", direction: "ltr" }, (u && u.settings) || {}));
    },
    async saveSettings(patch) {
      await delay(120);
      const s = requireUser();
      const db = store.load();
      const u = db.users.find((x) => x.id === s.userId);
      if (!u) throw ApiError("Account not found.", 404);
      u.settings = Object.assign({}, u.settings || {}, patch || {});
      store.save();
      return clone(u.settings);
    },

    async forgotPassword(email) {
      await delay();
      const normalizedEmail = String(email || "").trim();
      if (normalizedEmail.length > 254 || !emailRe.test(normalizedEmail)) throw ApiError("Please enter a valid email address.", 422, { email: "Enter a valid email address." });
      // Always resolve (do not reveal whether the email exists).
      return { message: "If an account exists for that email, a reset link has been sent." };
    },

    async resetPassword(token, password) {
      await delay();
      if (!token) throw ApiError("Invalid or expired reset token.", 400);
      return { message: "Password updated. You can now sign in." };
    },

    /* ---- NEWSLETTER + CONTACT ---- */
    async subscribeNewsletter(em) {
      await delay();
      const db = store.load();
      const email = String(em || "").trim().toLowerCase();
      if (email.length > 254 || !emailRe.test(email)) throw ApiError("Please enter a valid email address.", 422, { email: "Enter a valid email address with a domain." });
      if (db.newsletterSubscribers.some((s) => s.email === email)) {
        return { message: "You're already subscribed — thanks!", duplicate: true };
      }
      db.newsletterSubscribers.push({ id: uid("sub"), email, createdAt: new Date().toISOString() });
      store.save();
      return { message: "Subscribed! Check your inbox soon.", duplicate: false };
    },

    async createContact(payload) {
      await delay();
      payload = payload || {};
      const name = String(payload.name || "").trim().replace(/ {2,}/g, " ");
      const email = String(payload.email || "").trim().toLowerCase();
      const mobile = String(payload.mobile || "").trim();
      const subject = String(payload.subject || "").trim();
      const message = String(payload.message || "").trim();
      const errors = {};
      if (!nameRe.test(name)) errors.name = "Enter a valid name using letters and spaces only.";
      if (!emailRe.test(email) || email.length > 254) errors.email = "Enter a valid email address.";
      if (!mobileRe.test(mobile)) errors.mobile = "Enter a valid 10-digit mobile number.";
      if (!requiredText(subject)) errors.subject = "This field is required.";
      if (!requiredText(message)) errors.message = "This field is required.";
      if (payload.consent !== true) errors.consent = "Consent is required.";
      rejectInvalid(errors);
      const db = store.load();
      const rec = Object.assign({ id: uid("inq"), status: "New", createdAt: new Date().toISOString() }, payload, { name, email, mobile, subject, message, consent: true });
      db.contactInquiries.push(rec);
      store.save();
      return { id: rec.id, message: "Thanks — your message has been received. Our team will reply within one business day." };
    },

    /* ---- COUNSELORS ---- */
    async listCounselors(params) {
      await delay(200);
      const db = store.load();
      let list = clone(db.counselors);
      const q = (params && params.q || "").toLowerCase().trim();
      const spec = params && params.specialization;
      if (q) list = list.filter((c) => (c.name + " " + c.title + " " + c.specializations.join(" ")).toLowerCase().includes(q));
      if (spec && spec !== "All") list = list.filter((c) => c.specializations.includes(spec));
      return list;
    },
    async getCounselor(id) {
      await delay(160);
      const db = store.load();
      const c = db.counselors.find((x) => x.id === id);
      if (!c) throw ApiError("Counselor not found.", 404);
      return clone(c);
    },

    /* ---- SERVICES ---- */
    async listServices() { await delay(120); return clone(store.load().services); },

    /* ---- BLOG ---- */
    async listBlog(params) {
      await delay(200);
      const db = store.load();
      let list = clone(db.blogPosts).sort((a, b) => new Date(b.date) - new Date(a.date));
      const seededPosts = seed().blogPosts;
      seededPosts.forEach((post) => {
        if (!list.some((existing) => existing.slug === post.slug)) list.push(post);
      });
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      const q = (params && params.q || "").toLowerCase().trim();
      const cat = params && params.category;
      if (cat && cat !== "All") list = list.filter((p) => p.category === cat);
      if (q) list = list.filter((p) => (p.title + " " + p.excerpt + " " + p.tags.join(" ")).toLowerCase().includes(q));
      const featured = list.filter((p) => p.featured);
      return { posts: list, featured: featured[0] || list[0] || null, total: list.length };
    },
    async getPost(slug) {
      await delay(200);
      const db = store.load();
      const p = db.blogPosts.find((x) => x.slug === slug) || seed().blogPosts.find((x) => x.slug === slug);
      if (!p) throw ApiError("Article not found.", 404);
      return clone(p);
    },
    async relatedPosts(slug, limit) {
      const db = store.load();
      const cur = db.blogPosts.find((x) => x.slug === slug);
      const list = db.blogPosts.filter((p) => p.slug !== slug && (!cur || p.category === cur.category));
      const fallback = db.blogPosts.filter((p) => p.slug !== slug);
      return clone((list.length ? list : fallback).slice(0, limit || 3));
    },
    blogCategories() {
      return ["All", ...Array.from(new Set(store.load().blogPosts.map((p) => p.category)))];
    },

    /* ---- APPLICATIONS ---- */
    async listApplications() {
      await delay(160);
      const s = requireUser();
      const db = store.load();
      return clone(db.applications.filter((a) => a.userId === s.userId));
    },
    async createApplication(payload) {
      await delay();
      const s = requireUser("STUDENT");
      const db = store.load();
      const app = Object.assign({ id: uid("app"), userId: s.userId, status: "Planning", createdAt: new Date().toISOString() }, payload);
      db.applications.push(app);
      store.save();
      return clone(app);
    },
    async dashboard() {
      await delay(180);
      const s = requireUser();
      const db = store.load();
      const apps = db.applications.filter((a) => a.userId === s.userId);
      const appIds = apps.map((a) => a.id);
      const items = db.checklistItems.filter((i) => appIds.includes(i.applicationId));
      const done = items.filter((i) => i.status === "Completed").length;
      const essays = db.essays.filter((e) => e.userId === s.userId);
      const meetings = db.meetings.filter((m) => m.studentId === s.userId);
      const upcoming = meetings.filter((m) => m.status !== "Completed" && m.status !== "Cancelled");
      return {
        user: { id: s.userId, name: s.name },
        stats: {
          applications: apps.length,
          checklistDone: done,
          checklistTotal: items.length,
          progress: items.length ? Math.round((done / items.length) * 100) : 0,
          essays: essays.length,
          meetings: upcoming.length,
        },
        recentApplications: clone(apps).slice(0, 4),
        upcomingDeadlines: clone(items).filter((i) => i.status !== "Completed").sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5),
        upcomingMeetings: clone(upcoming).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 4),
        activity: clone(db.notifications.filter((n) => n.userId === s.userId)).slice(0, 5),
      };
    },

    /* ---- CHECKLIST ---- */
    async listChecklist(applicationId) {
      await delay(150);
      const s = requireUser();
      const db = store.load();
      let items = db.checklistItems.filter((i) => i.userId === s.userId);
      if (applicationId && applicationId !== "all") items = items.filter((i) => i.applicationId === applicationId);
      return clone(items);
    },
    async createChecklistItem(payload) {
      await delay();
      const s = requireUser("STUDENT");
      const db = store.load();
      payload = payload || {};
      const title = String(payload.title || "").trim();
      const errors = {};
      if (!db.applications.some((app) => app.id === payload.applicationId && app.userId === s.userId)) errors.applicationId = "Choose a valid application.";
      if (!title || title.length > 200 || /[\u0000-\u001F\u007F]/.test(title)) errors.title = "Enter a valid task title (up to 200 characters).";
      if (!validDateOnly(payload.dueDate)) errors.dueDate = "Choose a valid due date.";
      if (payload.priority != null && !["High", "Medium", "Low"].includes(payload.priority)) errors.priority = "Choose a valid priority.";
      rejectInvalid(errors);
      const item = Object.assign({ id: uid("chk"), userId: s.userId, status: "Pending", priority: "Medium" }, payload, { createdAt: new Date().toISOString() });
      item.title = title;
      db.checklistItems.push(item);
      store.save();
      return clone(item);
    },
    async updateChecklistItem(id, patch) {
      await delay(160);
      const s = requireUser();
      const db = store.load();
      const item = db.checklistItems.find((i) => i.id === id);
      if (!item) throw ApiError("Checklist item not found.", 404);
      if (item.userId !== s.userId) throw ApiError("You can only edit your own checklist items.", 403);
      patch = patch || {};
      const errors = {};
      if (Object.keys(patch).some((key) => !["title", "dueDate", "priority", "category", "status"].includes(key))) errors.form = "Unsupported task update.";
      if (patch.title != null && (!requiredText(patch.title) || patch.title.trim().length > 200 || /[\u0000-\u001F\u007F]/.test(patch.title))) errors.title = "Enter a valid task title.";
      if (patch.dueDate != null && !validDateOnly(patch.dueDate)) errors.dueDate = "Choose a valid due date.";
      if (patch.priority != null && !["High", "Medium", "Low"].includes(patch.priority)) errors.priority = "Choose a valid priority.";
      if (patch.status != null && !["Pending", "In Progress", "Completed"].includes(patch.status)) errors.status = "Choose a valid task status.";
      if (patch.category != null && (!requiredText(patch.category) || patch.category.length > 80)) errors.category = "Choose a valid category.";
      rejectInvalid(errors);
      Object.assign(item, patch);
      store.save();
      return clone(item);
    },
    async deleteChecklistItem(id) {
      await delay(140);
      const s = requireUser();
      const db = store.load();
      const idx = db.checklistItems.findIndex((i) => i.id === id);
      if (idx === -1) throw ApiError("Checklist item not found.", 404);
      if (db.checklistItems[idx].userId !== s.userId) throw ApiError("Not allowed.", 403);
      db.checklistItems.splice(idx, 1);
      store.save();
      return { ok: true };
    },

    /* ---- ESSAYS ---- */
    async listEssays() {
      await delay(160);
      const s = requireUser();
      const db = store.load();
      return clone(db.essays.filter((e) => e.userId === s.userId));
    },
    async createEssay(payload) {
      await delay();
      const s = requireUser("STUDENT");
      const db = store.load();
      payload = payload || {};
      const title = String(payload.title || "").trim();
      const hasWordCount = payload.wordCount !== "" && payload.wordCount != null;
      const rawWordCount = hasWordCount ? String(payload.wordCount) : "0";
      const wordCount = Number(rawWordCount);
      const errors = {};
      if (!db.applications.some((app) => app.id === payload.applicationId && app.userId === s.userId)) errors.applicationId = "Choose a valid application.";
      if (!title || title.length > 200 || /[\u0000-\u001F\u007F]/.test(title)) errors.title = "Enter a valid essay title.";
      if (!digitsRe.test(rawWordCount) || !Number.isInteger(wordCount) || (hasWordCount && wordCount < 1) || wordCount > 10000) errors.wordCount = "Word count must be a whole number from 1 to 10,000.";
      const fileSize = Number(payload.fileSize);
      if (!Number.isFinite(fileSize) || fileSize < 0 || fileSize > AP.config.essayUpload.maxSizeMb * 1024 * 1024) errors.fileName = "Choose a file no larger than " + AP.config.essayUpload.maxSizeMb + " MB.";
      rejectInvalid(errors);
      const ext = (payload.fileName || "").split(".").pop().toLowerCase();
      const allowed = AP.config.essayUpload.allowedExtensions;
      if (!payload.fileName || !allowed.includes(ext)) throw ApiError("Unsupported file type. Allowed: " + allowed.join(", ").toUpperCase() + ".", 422, { fileName: "Unsupported file type." });
      const essay = {
        id: uid("ess"), userId: s.userId, applicationId: payload.applicationId, title,
        version: 1, fileName: payload.fileName, status: "In Review",
        wordCount, submittedAt: new Date().toISOString(),
      };
      db.essays.push(essay);
      store.save();
      return clone(essay);
    },
    async getEssayFeedback(essayId) {
      await delay(160);
      const s = requireUser();
      const db = store.load();
      const essay = db.essays.find((e) => e.id === essayId);
      if (!essay) throw ApiError("Essay not found.", 404);
      if (essay.userId !== s.userId && s.role === "STUDENT") throw ApiError("You can only view your own essays.", 403);
      return clone(db.essayFeedback.filter((f) => f.essayId === essayId));
    },
    async addEssayFeedback(essayId, payload) {
      await delay();
      const s = requireUser();
      // Only students can view; counselors/admin not needed in student-only version
      // but keep original check logic simplified - students cannot post feedback
      if (s.role === "STUDENT") throw ApiError("Students cannot post counselor feedback.", 403);
      const db = store.load();
      const fb = Object.assign({ id: uid("fbk"), essayId, counselorId: payload.counselorId || "cns_1", createdAt: new Date().toISOString() }, payload);
      db.essayFeedback.push(fb);
      const essay = db.essays.find((e) => e.id === essayId);
      if (essay) essay.status = "Feedback Ready";
      store.save();
      return clone(fb);
    },

    /* ---- MEETINGS ---- */
    async listMeetings() {
      await delay(160);
      const s = requireUser();
      const db = store.load();
      const key = "studentId";
      const myId = s.userId;
      return clone(db.meetings.filter((m) => m[key] === myId));
    },
    async availability(counselorId, date) {
      await delay(180);
      const slots = ["09:00", "10:00", "11:30", "14:00", "15:30", "16:00", "17:30"];
      const db = store.load();
      const s = session.get();
      const taken = db.meetings.filter((m) => m.counselorId === counselorId && m.date === date && m.status !== "Cancelled").map((m) => m.time);
      const mine = s ? db.meetings.filter((m) => m.studentId === s.userId && m.date === date && m.status !== "Cancelled").map((m) => m.time) : [];
      return slots.map((t) => ({ time: t, available: !taken.includes(t) && !mine.includes(t) }));
    },
    async bookMeeting(payload) {
      await delay();
      const s = requireUser("STUDENT");
      const db = store.load();
      payload = payload || {};
      const errors = {};
      const validCounselor = db.counselors.some((c) => c.id === payload.counselorId);
      const validDate = validDateOnly(payload.date) && payload.date >= new Date().toISOString().slice(0, 10);
      const validTime = ["09:00", "10:00", "11:30", "14:00", "15:30", "16:00", "17:30"].includes(payload.time);
      if (!validCounselor) errors.counselorId = "Choose a valid counselor.";
      if (!validDate) errors.date = "Choose a valid date.";
      if (!validTime) errors.time = "Choose an available time slot.";
      if (![30, 45, 60].includes(Number(payload.duration))) errors.duration = "Choose a valid meeting duration.";
      if (!requiredText(payload.topic) || String(payload.topic).length > 200) errors.topic = "Enter a meeting topic.";
      if (!['Video call', 'Phone', 'In-person'].includes(payload.mode)) errors.mode = "Choose a valid meeting mode.";
      rejectInvalid(errors);
      const clash = db.meetings.some((m) => m.counselorId === payload.counselorId && m.date === payload.date && m.time === payload.time && m.status !== "Cancelled")
        || db.meetings.some((m) => m.studentId === s.userId && m.date === payload.date && m.time === payload.time && m.status !== "Cancelled");
      if (clash) throw ApiError("That slot is no longer available. Please pick another time.", 409);
      const mtg = Object.assign({ id: uid("mtg"), studentId: s.userId, status: "Scheduled" }, payload, { createdAt: new Date().toISOString() });
      db.meetings.push(mtg);
      store.save();
      return clone(mtg);
    },
    async rescheduleMeeting(id, date, time) {
      await delay();
      const s = requireUser();
      const db = store.load();
      const m = db.meetings.find((x) => x.id === id);
      if (!m) throw ApiError("Meeting not found.", 404);
      if (m.studentId !== s.userId) throw ApiError("Not allowed.", 403);
      const errors = {};
      const validDate = validDateOnly(date) && date >= new Date().toISOString().slice(0, 10);
      const validTime = ["09:00", "10:00", "11:30", "14:00", "15:30", "16:00", "17:30"].includes(time);
      if (!validDate) errors.date = "Choose a valid date.";
      if (!validTime) errors.time = "Choose a valid time slot.";
      const clash = db.meetings.some((other) => other.id !== id && other.counselorId === m.counselorId && other.date === date && other.time === time && other.status !== "Cancelled");
      if (clash) errors.time = "That slot is no longer available.";
      rejectInvalid(errors);
      m.date = date; m.time = time; m.status = "Scheduled";
      store.save();
      return clone(m);
    },
    async cancelMeeting(id) {
      await delay();
      const s = requireUser();
      const db = store.load();
      const m = db.meetings.find((x) => x.id === id);
      if (!m) throw ApiError("Meeting not found.", 404);
      if (m.studentId !== s.userId) throw ApiError("Not allowed.", 403);
      m.status = "Cancelled";
      store.save();
      return clone(m);
    },



    /* ---- MISC ---- */
    async listTestimonials() { await delay(80); return clone(store.load().testimonials); },
    notifications() {
      const s = session.get();
      const db = store.load();
      if (!s) return [];
      return clone(db.notifications.filter((n) => n.userId === s.userId));
    },
  };

  /* Expose */
  AP.store = store;
  AP.session = session;
  AP.api = api;
  AP.util = { uid, obf, clone, emailRe, delay };
  AP.ApiError = ApiError;
})();
