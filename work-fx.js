(() => {
  const section = document.getElementById('work');
  if (!section) return;

  const items = [...section.querySelectorAll('.work-item')];

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );

  if (
    reducedMotion.matches ||
    !('IntersectionObserver' in window)
  ) {
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.1
    }
  );

  section.classList.add('js-reveal');

  items.forEach(item => {
    observer.observe(item);
  });
})();