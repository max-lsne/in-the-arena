function joinWaitlist(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.querySelector('input[type="email"]');
  const button = form.querySelector("button");
  const email = (input.value || "").trim();

  if (!email) return false;

  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = "You're on the list ✓";
  button.style.background =
    "linear-gradient(135deg, #5ee2c8 0%, #7c5cff 100%)";
  input.value = "";

  const meta = document.getElementById("cta-meta");
  if (meta) {
    meta.textContent = "Welcome aboard — we'll be in touch within 48 hours.";
  }

  setTimeout(() => {
    button.disabled = false;
    button.innerHTML = original;
    button.style.background = "";
  }, 4000);

  return false;
}

document.addEventListener("DOMContentLoaded", () => {
  const targets = document.querySelectorAll(
    ".section, .hero-card, .step, .feature, .quote, .plan"
  );
  targets.forEach((el) => el.classList.add("reveal"));

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  targets.forEach((el) => io.observe(el));

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1) {
        const el = document.querySelector(id);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  });
});
