(function () {
  "use strict";
  const source =
      document.currentScript && document.currentScript.src
        ? document.currentScript.src
        : new URL("buhowise-shell.js", location.href).href,
    root = new URL(".", source),
    url = (p) => new URL(p, root).href;
  function nav() {
    let n = document.querySelector("nav.navbar");
    if (!n) {
      n = document.createElement("nav");
      document.body.prepend(n);
    }
    n.className = "navbar navbar-expand-lg sticky-top navbar-dark";
    n.innerHTML = `<div class="container"><a class="navbar-brand" href="${url("index.html")}"><img src="${url("img/BuhoWiselogo.png")}" alt="BuhoWise Logo"></a><button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menuPrincipal" aria-controls="menuPrincipal" aria-expanded="false" aria-label="Toggle navigation"><span class="navbar-toggler-icon"></span></button><div class="collapse navbar-collapse" id="menuPrincipal"><ul class="navbar-nav ms-auto text-center align-items-center gap-2 py-3 py-lg-0"><li class="nav-item"><a class="nav-link" href="${url("index.html")}">Home</a></li><li class="nav-item"><a class="nav-link" href="${url("subjects.html")}">Subjects</a></li><li class="nav-item"><a class="nav-link" href="${url("teacherss.html")}">Teachers</a></li><li class="nav-item"><a class="nav-link" href="${url("index.html#about")}">About Us</a></li><li class="nav-item ms-lg-2 mt-2 mt-lg-0"><a class="btn btn-nav-account" href="#">Choose Avatar</a></li></ul></div></div>`;
  }
  function footer() {
    let f = document.querySelector("footer");
    if (!f) {
      f = document.createElement("footer");
      document.body.append(f);
    }
    f.innerHTML = `<div class="container"><div class="row g-4 text-center text-md-start mb-5"><div class="col-md-6"><h4 class="mb-3">BuhoWise</h4><p>Making education accessible, engaging, and inclusive for every learner in El Salvador. Learning Without Limits.</p></div><div class="col-md-3"><h5>Quick Links</h5><ul class="list-unstyled"><li><a href="${url("index.html")}" class="text-decoration-none text-white-50">Home</a></li><li><a href="${url("subjects.html")}" class="text-decoration-none text-white-50">Subjects</a></li><li><a href="${url("teacherss.html")}" class="text-decoration-none text-white-50">Teachers</a></li><li><a href="${url("profile.html")}" class="text-decoration-none text-white-50">My Profile</a></li></ul></div><div class="col-md-3"><h5>Support</h5><ul class="list-unstyled"><li><a href="#" class="text-decoration-none text-white-50 bw-footer-accessibility">Accessibility Tools</a></li><li><a href="${url("math-support.html")}" class="text-decoration-none text-white-50">Mathematics Support</a></li><li><a href="${url("language-support.html")}" class="text-decoration-none text-white-50">Language Arts Support</a></li></ul></div></div><hr><p class="text-center text-white-50 pt-3 mb-0">&copy; 2026 BuhoWise. All Rights Reserved.</p></div>`;
    f.querySelector(".bw-footer-accessibility").dataset.bwAccessibility = "toggle-panel";
  }
  function accessibility() {
    let b = document.querySelector(".accessibility-btn");
    if (!b) {
      b = document.createElement("button");
      document.body.append(b);
    }
    b.className = "accessibility-btn";
    b.type = "button";
    b.setAttribute("aria-label", "Accessibility Menu");
    b.setAttribute("aria-controls", "accessibilityPanel");
    b.setAttribute("aria-expanded", "false");
    b.removeAttribute("onclick");
    b.dataset.bwAccessibility = "toggle-panel";
    b.innerHTML = '<i class="bi bi-universal-access"></i>';
    let p = document.getElementById("accessibilityPanel");
    if (!p) {
      p = document.createElement("div");
      p.id = "accessibilityPanel";
      document.body.append(p);
    }
    p.className = "accessibility-panel";
    p.innerHTML = `<h5 class="mb-3 text-center"><i class="bi bi-sliders me-2"></i>Accessibility Tools</h5><div class="accessibility-grid"><button type="button" data-bw-accessibility="read"><i class="bi bi-volume-up"></i> Read</button><button type="button" data-bw-accessibility="stop"><i class="bi bi-volume-mute"></i> Stop</button><button type="button" data-bw-accessibility="text-up"><i class="bi bi-zoom-in"></i> Text +</button><button type="button" data-bw-accessibility="text-down"><i class="bi bi-zoom-out"></i> Text -</button><button type="button" data-bw-accessibility="dark"><i class="bi bi-moon"></i> Dark</button><button type="button" data-bw-accessibility="contrast"><i class="bi bi-circle-half"></i> Contrast</button><button type="button" data-bw-accessibility="dyslexia"><i class="bi bi-fonts"></i> Dyslexia</button><button type="button" class="btn-reset" data-bw-accessibility="reset"><i class="bi bi-arrow-counterclockwise"></i> Reset</button></div>`;
    document.dispatchEvent(new CustomEvent("buhowise:accessibility-ready"));
  }
  function init() {
    nav();
    footer();
    accessibility();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
