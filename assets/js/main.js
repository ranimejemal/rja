// Ranime Jemal Agency — site interactions
(function () {
  // Menu
  var body = document.body;
  document.querySelectorAll("[data-menu-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = body.getAttribute("data-menu-status") === "open";
      body.setAttribute("data-menu-status", open ? "closed" : "open");
      btn.setAttribute("aria-expanded", String(!open));
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") body.setAttribute("data-menu-status", "closed");
  });

  // Reveal on scroll
  var items = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is--in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("is--in"); });
  }

  // Year
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Hero clock
  var clock = document.querySelector("[data-clock]");
  if (clock) {
    var tick = function () {
      var d = new Date();
      clock.textContent = d.toLocaleDateString("en-GB") + " " + d.toLocaleTimeString("en-GB");
    };
    tick();
    setInterval(tick, 1000);
  }
})();
