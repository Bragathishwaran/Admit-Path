/* =====================================================================
   AdmitPath — blog.js
   Blog listing (search, category filter, load-more) and blog details
   (per-article static pages via body[data-slug], TOC, related posts).
   ===================================================================== */
(function () {
  "use strict";
  window.AP = window.AP || {};

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hiddenListingSlugs = new Set([
    "recommendation-letters-that-help",
    "building-a-standout-profile",
    "mastering-common-app-activities",
  ]);

  // Each article has its own static page: blog-<slug>.html
  const postUrl = (slug) => "blog-" + slug + ".html";

  function card(post) {
    return '' +
      '<article class="ap-card ap-card--hover h-100 d-flex flex-column">' +
      '<a href="' + postUrl(post.slug) + '" class="d-block ap-media ap-ratio-16x9">' +
      '<img src="' + esc(post.image) + '" alt="' + esc(post.title) + '" loading="lazy">' +
      '</a>' +
      '<div class="ap-card__body d-flex flex-column flex-grow-1">' +
      '<div class="d-flex align-items-center gap-2 mb-2 small ap-text-muted">' +
      '<span class="ap-badge ap-badge--accent">' + esc(post.category) + '</span>' +
      '<span><i class="bi bi-clock"></i> ' + post.readTime + ' min read</span>' +
      '</div>' +
      '<h3 class="h6"><a href="' + postUrl(post.slug) + '" class="ap-text-primary">' + esc(post.title) + '</a></h3>' +
      '<p class="ap-clamp-2 small">' + esc(post.excerpt) + '</p>' +
      '<div class="mt-auto d-flex align-items-center justify-content-between pt-2 mb-2">' +
      '<span class="small ap-text-muted"><i class="bi bi-person"></i> ' + esc(post.author) + '</span>' +
      '<span class="small ap-text-muted">' + new Date(post.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) + '</span>' +
      '</div>' +
      '<a href="' + postUrl(post.slug) + '" class="btn-ap btn-ap--outline btn-ap--sm align-self-start">Learn more <i class="bi bi-arrow-right ap-flip-rtl"></i></a>' +
      '</div></article>';
  }

  function skeletonCard() {
    return '<div class="ap-card h-100"><div class="ap-media ap-ratio-16x9 ap-skeleton"></div><div class="ap-card__body"><div class="ap-skeleton mb-2" style="height:14px;width:40%"></div><div class="ap-skeleton mb-2" style="height:18px"></div><div class="ap-skeleton" style="height:14px;width:80%"></div></div></div>';
  }

  /* ---------------- Listing ---------------- */
  function initListing() {
    const root = document.querySelector("[data-blog-list]");
    if (!root) return;
    const grid = root.querySelector("[data-blog-grid]");
    const search = root.querySelector("[data-blog-search]");
    const chipsWrap = root.querySelector("[data-blog-categories]");
    const moreWrap = root.querySelector("[data-blog-more]");
    const emptyEl = root.querySelector("[data-blog-empty]");

    let state = { q: "", category: "All", shown: 9, pageSize: 9, all: [] };

    function renderCategories() {
      const cats = AP.api.blogCategories().filter((category) => category !== "Applications");
      chipsWrap.innerHTML = cats.map((c) => '<button type="button" class="ap-chip' + (c === state.category ? " is-active" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + "</button>").join("");
    }

    async function load() {
      grid.innerHTML = Array.from({ length: 9 }).map(skeletonCard).join("");
      const res = await AP.api.listBlog({ q: state.q, category: state.category });
      state.all = res.posts.filter((post) => !hiddenListingSlugs.has(post.slug));
      renderGrid();
    }

    function renderGrid() {
      const list = state.all.slice(0, state.shown);
      grid.innerHTML = list.map(card).join("");
      const hasMore = state.all.length > state.shown;
      if (moreWrap) moreWrap.hidden = !hasMore;
      if (emptyEl) emptyEl.hidden = state.all.length !== 0;
    }

    function bindChips() {
      chipsWrap.addEventListener("click", (e) => {
        const b = e.target.closest("[data-cat]"); if (!b) return;
        state.category = b.getAttribute("data-cat"); state.shown = state.pageSize;
        chipsWrap.querySelectorAll("[data-cat]").forEach((c) => c.classList.toggle("is-active", c === b));
        load();
      });
    }

    let t;
    if (search) search.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => { state.q = search.value; state.shown = state.pageSize; load(); }, 260);
    });
    if (moreWrap) moreWrap.addEventListener("click", () => { state.shown += state.pageSize; renderGrid(); });

    renderCategories(); bindChips(); load();
  }

  /* ---------------- Details ---------------- */
  async function initDetails() {
    const root = document.querySelector("[data-blog-article]");
    if (!root) return;
    const slug = document.body.getAttribute("data-slug") || new URLSearchParams(location.search).get("slug") || "choosing-the-right-college-fit";
    const titleEl = root.querySelector("[data-article-title]");
    const metaEl = root.querySelector("[data-article-meta]");
    const imgEl = root.querySelector("[data-article-image]");
    const bodyEl = root.querySelector("[data-article-body]");
    const tocEl = root.querySelector("[data-article-toc]");
    const relatedEl = root.querySelector("[data-article-related]");
    const authorEl = root.querySelector("[data-article-author]");

    try {
      const post = await AP.api.getPost(slug);
      document.title = post.title + " | AdmitPath Blog";
      titleEl.textContent = post.title;
      root.querySelector("[data-article-category]").textContent = post.category;
      metaEl.innerHTML = '<i class="bi bi-person"></i> ' + esc(post.author) + ' &nbsp;·&nbsp; <i class="bi bi-calendar3"></i> ' + new Date(post.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
      imgEl.src = post.image; imgEl.alt = post.title;
      bodyEl.innerHTML = post.content;
      if (authorEl) authorEl.querySelector("[data-author-name]").textContent = post.author;

      // TOC from h2 ids
      const heads = bodyEl.querySelectorAll("h2[id]");
      tocEl.innerHTML = '<h3 class="h6 mb-3">On this page</h3><ul class="list-unstyled small m-0">' +
        Array.from(heads).map((h) => '<li class="mb-2"><a href="#' + h.id + '" class="ap-text-muted"><i class="bi bi-dot"></i> ' + esc(h.textContent) + "</a></li>").join("") +
        "</ul>";
      if (!heads.length) tocEl.innerHTML = "";

      const related = await AP.api.relatedPosts(slug, 3);
      relatedEl.innerHTML = related.map(card).join("");

      // Share links
      const url = encodeURIComponent(location.href), tt = encodeURIComponent(post.title);
      root.querySelectorAll("[data-share]").forEach((a) => {
        const net = a.getAttribute("data-share");
        if (net === "x") a.href = "https://twitter.com/intent/tweet?url=" + url + "&text=" + tt;
        if (net === "li") a.href = "https://www.linkedin.com/sharing/share-offsite/?url=" + url;
        if (net === "fb") a.href = "https://www.facebook.com/sharer/sharer.php?u=" + url;
        if (net === "copy") a.addEventListener("click", (e) => { e.preventDefault(); navigator.clipboard && navigator.clipboard.writeText(location.href); AP.ui.toast("Link copied to clipboard.", "success", 2200); });
      });
    } catch (err) {
      root.innerHTML = '<div class="ap-empty"><img src="assets/images/placeholders/empty-state.svg" alt=""><h2 class="h4">Article not found</h2><p>The article you are looking for does not exist or may have been moved.</p><a href="blog.html" class="btn-ap btn-ap--primary mt-2">Back to blog</a></div>';
    }
  }

  document.addEventListener("DOMContentLoaded", () => { initListing(); initDetails(); });
})();
