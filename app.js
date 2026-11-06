(() => {
  'use strict';

  const body = document.body;
  const motionButton = document.getElementById('mo');
  const menuButton = document.getElementById('menu-toggle');
  const nav = document.getElementById('site-nav');
  const header = document.querySelector('.site-header');
  const rig = document.getElementById('rig');
  const cursor = document.getElementById('cur');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const desktop = matchMedia('(min-width: 821px)');
  const narrowNav = matchMedia('(max-width: 700px)');
  const preferenceKey = 'a2-motion';
  let savedPreference = null;
  try { savedPreference = localStorage.getItem(preferenceKey); } catch { /* Optional preference storage. */ }
  let motion = !reducedMotion.matches && savedPreference !== 'off';
  let pointerX = 0;
  let pointerY = 0;
  let tiltX = 0;
  let tiltY = 0;
  let frame = 0;
  let revealObserver = null;
  const revealTargets = [...document.querySelectorAll('[data-reveal]')];

  body.classList.remove('no-js');
  body.classList.add('js-ready');

  function closeMenu(restoreFocus = false) {
    const wasOpen = body.classList.contains('nav-open');
    body.classList.remove('nav-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Открыть меню');
    if (wasOpen && restoreFocus) menuButton.focus({ preventScroll: true });
  }

  menuButton.addEventListener('click', () => {
    const open = !body.classList.contains('nav-open');
    body.classList.toggle('nav-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) closeMenu();
  });
  header.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!header.contains(document.activeElement)) closeMenu();
    });
  });
  narrowNav.addEventListener('change', () => closeMenu());

  function resetTransforms() {
    rig.style.removeProperty('transform');
    document.querySelectorAll('.art .p').forEach(piece => piece.style.removeProperty('translate'));
    document.querySelector('.glass').style.removeProperty('translate');
    cursor.classList.remove('on', 'big');
  }

  function paint() {
    frame = 0;
    if (!motion || document.hidden) return;
    if (finePointer.matches) cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
    const pointerMotion = desktop.matches && finePointer.matches;
    const hero = document.querySelector('.hero').getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -hero.top / Math.max(1, hero.height)));
    rig.style.transform = `rotateX(${pointerMotion ? tiltX : 0}deg) rotateY(${pointerMotion ? tiltY : progress * 6}deg) rotateZ(${progress * (pointerMotion ? 18 : 12)}deg)`;
    const about = document.querySelector('.about').getBoundingClientRect();
    const ratio = Math.max(-1, Math.min(1, (innerHeight / 2 - about.top) / (innerHeight + about.height)));
    document.querySelectorAll('.art .p').forEach(piece => {
      piece.style.translate = `0 ${-ratio * Number(piece.dataset.s) * (pointerMotion ? 280 : 160)}px`;
    });
    const beyond = document.querySelector('.beyond').getBoundingClientRect();
    const range = pointerMotion ? 35 : 22;
    const glassY = Math.max(-range, Math.min(range, (innerHeight / 2 - beyond.top) * (pointerMotion ? 0.045 : 0.028)));
    document.querySelector('.glass').style.translate = `0 ${glassY}px`;
  }

  function requestPaint() {
    if (!frame && motion && !document.hidden) frame = requestAnimationFrame(paint);
  }

  function setMotion(on, persist = false) {
    motion = Boolean(on);
    body.classList.toggle('motion-on', motion);
    body.classList.toggle('still', !motion);
    document.documentElement.classList.toggle('still', !motion);
    motionButton.textContent = `Движение: ${motion ? 'вкл.' : 'выкл.'}`;
    motionButton.setAttribute('aria-pressed', String(motion));
    if (persist) {
      savedPreference = motion ? 'on' : 'off';
      try { localStorage.setItem(preferenceKey, savedPreference); } catch { /* The page works without storage. */ }
    }
    if (!motion) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      resetTransforms();
      revealObserver?.disconnect();
      revealTargets.forEach(el => el.classList.add('is-visible'));
    } else {
      if (revealObserver) observeReveals(true);
      requestPaint();
    }
  }

  motionButton.addEventListener('click', () => setMotion(!motion, true));
  reducedMotion.addEventListener('change', event => setMotion(!event.matches && savedPreference !== 'off'));
  desktop.addEventListener('change', () => { resetTransforms(); requestPaint(); });
  finePointer.addEventListener('change', () => { resetTransforms(); requestPaint(); });
  setMotion(motion);

  window.addEventListener('pointermove', event => {
    if (!motion || !desktop.matches || !finePointer.matches || event.pointerType === 'touch') return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    tiltX = -(event.clientY / innerHeight - 0.5) * 20;
    tiltY = (event.clientX / innerWidth - 0.5) * 28;
    cursor.classList.add('on');
    requestPaint();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('on'));
  document.querySelectorAll('a, button').forEach(control => {
    control.addEventListener('pointerenter', () => { if (motion && finePointer.matches) cursor.classList.add('big'); });
    control.addEventListener('pointerleave', () => cursor.classList.remove('big'));
  });
  window.addEventListener('scroll', requestPaint, { passive: true });
  window.addEventListener('resize', requestPaint, { passive: true });
  document.addEventListener('visibilitychange', () => {
    body.classList.toggle('page-hidden', document.hidden);
    if (!document.hidden) requestPaint();
  });

  function observeReveals(preserveVisible = false) {
    revealObserver.disconnect();
    revealTargets.forEach(el => {
      el.classList.add('reveal-ready');
      if (!motion) { el.classList.add('is-visible'); return; }
      const bounds = el.getBoundingClientRect();
      const alreadyOnScreen = bounds.top < innerHeight - 24 && bounds.bottom > 0;
      if (preserveVisible && alreadyOnScreen) el.classList.add('is-visible');
      else el.classList.remove('is-visible');
      if (!el.classList.contains('is-visible')) revealObserver.observe(el);
    });
  }

  // All devices share the same reveal system. Without JS or with motion off, content is visible.
  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -24px 0px' });
    observeReveals();
    document.addEventListener('focusin', event => {
      const target = event.target.closest('[data-reveal]');
      if (target) { target.classList.add('is-visible'); revealObserver.unobserve(target); }
    });
  }

  // A short decorative intro cannot block the page if an animation is interrupted.
  const preloader = document.querySelector('.pre');
  if (motion) {
    body.classList.add('is-loading');
    const start = performance.now();
    const count = document.getElementById('cnt');
    const finish = () => { body.classList.remove('is-loading'); preloader.remove(); };
    const timer = setTimeout(finish, 650);
    const tick = now => {
      const progress = Math.min(1, (now - start) / 380);
      count.textContent = String(Math.round(progress * 100));
      if (progress < 1) requestAnimationFrame(tick);
      else { clearTimeout(timer); setTimeout(finish, 90); }
    };
    requestAnimationFrame(tick);
  } else preloader.remove();
})();
