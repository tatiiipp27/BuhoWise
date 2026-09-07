(function () {
  "use strict";
  const source =
      document.currentScript && document.currentScript.src
        ? document.currentScript.src
        : new URL("buhowise-shell.js", location.href).href,
    root = new URL(".", source),
    url = (p) => new URL(p, root).href;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function loadingScreen() {
    requestAnimationFrame(function () {
      window.setTimeout(function () {
        document.documentElement.classList.add("bw-page-ready");
      }, 1500);
    });

    document.addEventListener("click", function (event) {
      const link = event.target.closest("a[href]");
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const rawHref = link.getAttribute("href") || "";
      if (rawHref.trim().startsWith("#") || link.classList.contains("bw-avatar-trigger") || link.dataset.bwAccessibility) return;
      const destination = new URL(link.href, location.href);
      if (destination.origin !== location.origin || destination.protocol === "mailto:" || destination.protocol === "tel:" || link.target === "_blank" || link.hasAttribute("download")) return;
      if (destination.pathname === location.pathname && destination.search === location.search && destination.hash) return;
      event.preventDefault();
      location.href = destination.href;
    });

    window.addEventListener("pageshow", function (event) {
      if (!event.persisted) return;
      document.documentElement.classList.remove("bw-page-ready");
      window.setTimeout(function () {
        document.documentElement.classList.add("bw-page-ready");
      }, 1500);
    });
  }

  function accessibilityFoundation() {
    let main = document.querySelector("main");
    if (main && !main.id) main.id = "main-content";
    if (main && !document.querySelector(".bw-skip-link")) {
      const skip = document.createElement("a");
      skip.className = "bw-skip-link";
      skip.href = "#" + main.id;
      skip.textContent = "Skip to main content";
      document.body.prepend(skip);
    }
    document.querySelectorAll("i.bi").forEach(function (icon) { icon.setAttribute("aria-hidden", "true"); });
  }
  function nav() {
    let n = document.querySelector("nav.navbar");
    if (!n) {
      n = document.createElement("nav");
      document.body.prepend(n);
    }
    n.className = "navbar navbar-expand-lg sticky-top navbar-dark";
    n.innerHTML = `
      <div class="container">
        <a class="navbar-brand" href="${url("index.html")}">
          <img
            src="${url("img/BuhoWise-logo-navbar-straight.png")}" 
            alt="BuhoWise Logo"
          >
        </a>

        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#menuPrincipal"
          aria-controls="menuPrincipal"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="menuPrincipal">
          <ul class="navbar-nav ms-auto text-center align-items-center gap-2 py-3 py-lg-0">
            <li class="nav-item">
              <a class="nav-link" href="${url("index.html")}">Home</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="${url("subjects.html")}">Subjects</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="${url("teacherss.html")}">Teachers</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="${url("about.html")}">About Us</a>
            </li>
            <li class="nav-item ms-lg-2 mt-2 mt-lg-0">
              <a class="btn bw-change-role" href="${url("index1.html")}">
                <i class="bi bi-arrow-left-right" aria-hidden="true"></i>
                <span>Change Role</span>
              </a>
            </li>
            <li class="nav-item ms-lg-2 mt-2 mt-lg-0">
              <a class="btn btn-nav-account" href="#">Choose Avatar</a>
            </li>
          </ul>
        </div>
      </div>
    `;

    const changeRoleButton = n.querySelector(".bw-change-role");
    if (changeRoleButton) {
      changeRoleButton.addEventListener("click", function () {
        try {
          localStorage.removeItem("buhowiseRole");
        } catch (error) {}
      });
    }
  }
  function footer() {
    let f = document.querySelector("footer");
    if (!f) {
      f = document.createElement("footer");
      document.body.append(f);
    }
    f.innerHTML = `
      <div class="container">
        <div class="row g-4 text-center text-md-start mb-5">
          <div class="col-md-6">
            <h4 class="mb-3">BuhoWise</h4>
            <p>
              Making education accessible, engaging, and inclusive for every learner
              in El Salvador. Learning Without Limits.
            </p>
          </div>

          <div class="col-md-3">
            <h5>Quick Links</h5>
            <ul class="list-unstyled">
              <li>
                <a href="${url("index.html")}" class="text-decoration-none text-white-50">Home</a>
              </li>
              <li>
                <a href="${url("subjects.html")}" class="text-decoration-none text-white-50">Subjects</a>
              </li>
              <li>
                <a href="${url("teacherss.html")}" class="text-decoration-none text-white-50">Teachers</a>
              </li>
              <li>
                <a href="${url("about.html")}" class="text-decoration-none text-white-50">About Us</a>
              </li>
              <li>
                <a href="${url("profile.html")}" class="text-decoration-none text-white-50">My Profile</a>
              </li>
            </ul>
          </div>

          <div class="col-md-3">
            <h5>Support</h5>
            <ul class="list-unstyled">
              <li>
                <a href="#" class="text-decoration-none text-white-50 bw-footer-accessibility">
                  Accessibility Tools
                </a>
              </li>
              <li>
                <a href="${url("math-support.html")}" class="text-decoration-none text-white-50">
                  Mathematics Support
                </a>
              </li>
              <li>
                <a href="${url("language-support.html")}" class="text-decoration-none text-white-50">
                  Language Arts Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        <hr>
        <p class="text-center text-white-50 pt-3 mb-0">
          &copy; 2026 BuhoWise. All Rights Reserved.
        </p>
      </div>
    `;
    f.querySelector(".bw-footer-accessibility").dataset.bwAccessibility = "toggle-panel";
  }
  function accessibility() {
    if (window.BuhoWiseAccessibilityUI) {
      window.BuhoWiseAccessibilityUI.ensure();
    }
  }
  function init() {
    loadingScreen();
    accessibilityFoundation();
    nav();
    footer();
    accessibility();
    accessibilityFoundation();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
