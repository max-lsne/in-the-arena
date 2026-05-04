(() => {
  const handleSignup = (form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const button = form.querySelector('button');
      const originalLabel = button.textContent;
      const email = input.value.trim();
      if (!email) return;
      button.disabled = true;
      button.textContent = 'Saving...';
      setTimeout(() => {
        button.textContent = "You're on the list ✓";
        input.value = '';
        setTimeout(() => {
          button.disabled = false;
          button.textContent = originalLabel;
        }, 2400);
      }, 600);
    });
  };

  document.querySelectorAll('form.signup').forEach(handleSignup);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll('.step, .feature, .plan, .quote').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
})();
