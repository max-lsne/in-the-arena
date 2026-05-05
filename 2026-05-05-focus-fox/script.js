// FocusFox landing — small interactions

// Smooth scroll for in-page anchors
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', id);
    }
  });
});

// Waitlist form — fake success state, no network calls
function wireWaitlist(form) {
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const btn = form.querySelector('button');
    const value = (input.value || '').trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!valid) {
      input.focus();
      input.style.color = '#ff7aa3';
      setTimeout(() => (input.style.color = ''), 900);
      return;
    }
    form.classList.add('success');
    btn.textContent = "You're in ✓";
    btn.disabled = true;
    input.value = '';
    input.placeholder = "We'll email " + value + " when your slot opens";
    setTimeout(() => {
      form.classList.remove('success');
      btn.disabled = false;
      btn.textContent = 'Get early access';
      input.placeholder = 'you@working.com';
    }, 4500);
  });
}
wireWaitlist(document.getElementById('waitlist'));
wireWaitlist(document.getElementById('waitlist2'));

// Reveal-on-scroll
const revealTargets = document.querySelectorAll(
  '.feature, .steps li, .plan, .quote-card, .metrics-grid > div, .faq details'
);
revealTargets.forEach((el) => el.classList.add('reveal'));

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -40px 0px', threshold: 0.1 }
  );
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('visible'));
}

// Tiny "live" tick on the active focus slot
const liveBadge = document.querySelector('.badge-on');
if (liveBadge) {
  let dots = 0;
  setInterval(() => {
    dots = (dots + 1) % 4;
    liveBadge.textContent = 'Live' + '.'.repeat(dots);
  }, 700);
}
