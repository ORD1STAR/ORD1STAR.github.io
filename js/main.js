(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('js'); return; }
  gsap.registerPlugin(ScrollTrigger);

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAU = Math.PI * 2;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- recording clock + scroll progress ---------- */
  var t0 = performance.now();
  var clockEl = $('#clock');
  var progress = $('.progress i');
  function tick() {
    var s = (performance.now() - t0) / 1000;
    var m = Math.floor(s / 60), r = s - m * 60;
    clockEl.textContent = (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r.toFixed(1);
  }
  if (!reduce) setInterval(tick, 100); else tick();
  function updProgress() {
    var h = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = 'scaleX(' + (h > 0 ? scrollY / h : 0) + ')';
  }
  addEventListener('scroll', updProgress, { passive: true });
  updProgress();

  /* ---------- EEG signal model (shared) ---------- */
  function sig(ch, t) {
    var env = 0.55 + 0.45 * Math.sin(TAU * 0.11 * t + ch * 1.3);
    var a = Math.sin(TAU * (9.4 + ch * 0.37) * t + ch * 1.7) * env;
    var b = 0.34 * Math.sin(TAU * (21 + ch * 1.1) * t + ch * 3.1);
    var c = 0.26 * Math.sin(TAU * 2.6 * t + ch);
    var n = 0.17 * Math.sin(TAU * 47.3 * t + ch * 7.7) + 0.11 * Math.sin(TAU * 83.1 * t + ch * 2.9);
    return a + b + c + n;
  }

  /* ---------- hero canvas ---------- */
  var hero = { cv: $('#eeg'), amp: 1, visible: true, my: -999 };
  hero.ctx = hero.cv.getContext('2d');
  var names = ['Fz', 'Cz', 'Pz', 'C3', 'C4', 'Oz'];
  var events = [];
  function heroSize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    hero.W = hero.cv.clientWidth; hero.H = hero.cv.clientHeight;
    hero.cv.width = hero.W * dpr; hero.cv.height = hero.H * dpr;
    hero.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawHero(now) {
    var ctx = hero.ctx, W = hero.W, H = hero.H;
    var t = reduce ? 14 : (now - t0) / 1000 + 8;
    var speed = Math.max(60, W / 14);
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(103,232,249,.25)'); g.addColorStop(0.5, 'rgba(103,232,249,.7)'); g.addColorStop(1, 'rgba(103,232,249,1)');
    ctx.lineWidth = 1.4; ctx.lineJoin = 'round';
    var top = H * 0.16, span = H * 0.72, amp0 = Math.min(46, H * 0.052) * hero.amp;
    for (var i = 0; i < names.length; i++) {
      var by = top + span * i / (names.length - 1);
      var boost = 1 + 1.6 * Math.exp(-Math.pow((hero.my - by) / 110, 2));
      ctx.beginPath();
      for (var x = 0; x <= W; x += 2) {
        var tt = t - (W - x) / speed;
        var burst = 0;
        for (var e = 0; e < events.length; e++) { var d = (tt - events[e]) / 0.55; burst += 2.4 * Math.exp(-d * d); }
        var y = by - sig(i, tt) * amp0 * boost * (1 + burst * (i === 1 || i === 3 ? 1 : 0.4));
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = g; ctx.stroke();
      ctx.fillStyle = 'rgba(140,145,166,.7)'; ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.fillText(names[i], W - 34, by - 12);
    }
    for (var k = 0; k < events.length; k++) {
      var ex = W - (t - events[k]) * speed;
      if (ex < -10 || ex > W) continue;
      ctx.strokeStyle = 'rgba(255,180,84,.55)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ex, top - 26); ctx.lineTo(ex, top + span + 26); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,180,84,.85)'; ctx.fillText('cue', ex + 6, top - 30);
      ctx.lineWidth = 1.4;
    }
  }
  var nextEvent = 3;
  function heroLoop(now) {
    if (hero.visible) {
      var t = (now - t0) / 1000 + 8;
      if (t > nextEvent + 8) { events.push(t); nextEvent = t; if (events.length > 6) events.shift(); }
      drawHero(now);
    }
    requestAnimationFrame(heroLoop);
  }
  heroSize(); addEventListener('resize', heroSize);
  if (reduce) { events.push(13.2); drawHero(performance.now()); }
  else {
    requestAnimationFrame(heroLoop);
    $('.hero').addEventListener('pointermove', function (e) { hero.my = e.clientY - $('.hero').getBoundingClientRect().top; });
    $('.hero').addEventListener('pointerleave', function () { hero.my = -999; });
    new IntersectionObserver(function (en) { hero.visible = en[0].isIntersecting; }).observe($('.hero'));
  }

  /* ---------- intro ---------- */
  var intro = gsap.timeline({ delay: 0.15, defaults: { ease: 'power4.out' } });
  intro.to('h1 .ln > span', { y: 0, duration: 1.25, stagger: 0.14 })
       .to('[data-hero]', { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, '-=0.8');
  gsap.set('[data-hero]', { y: 14 });
  gsap.to('.hero-inner', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to(hero, { amp: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('#eeg', { opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

  /* ---------- reveals ---------- */
  $$('.sec-head > *, .thesis-copy > .eyebrow, .thesis-copy > h2, .thesis-copy > .thesis-desc, .work-head > *, .contact > *, .more, .rows li, .tl li').forEach(function (el) { el.setAttribute('data-reveal', ''); });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 92%', once: true,
    onEnter: function (b) {
      gsap.to(b, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09, overwrite: true });
      b.forEach(function (el) { if (el.classList.contains('card')) el.classList.add('in'); });
      b.forEach(function (el) { $$('[data-count]', el).forEach(countUp); });
    }
  });
  function countUp(el) {
    if (el.dataset.done) return; el.dataset.done = 1;
    var end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10);
    if (reduce) { el.textContent = end.toFixed(dec); return; }
    var o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.6, ease: 'power3.out', onUpdate: function () { el.textContent = o.v.toFixed(dec); } });
  }

  /* ---------- thesis: stages + scope ---------- */
  var scope = { cv: $('#scopeCanvas'), mode: 0, since: performance.now(), visible: false };
  scope.ctx = scope.cv.getContext('2d');
  var stageLis = $$('#stages li'), labels = ['01 · record', '02 · window', '03 · describe', '04 · decode', '05 · doubt it', '06 · replay live'];
  var foots = ['30 ch · 500 Hz · 28 recordings', '2 s window · 0.5 s hop · causal', 'covariance · tangent space', 'AUC · held-out participants', 'null model vs observed', 'LSL stream · 17–19 ms'];
  function setStage(i) {
    if (i === scope.mode && stageLis[i].classList.contains('on')) return;
    scope.mode = i; scope.since = performance.now();
    stageLis.forEach(function (li, k) { li.classList.toggle('on', k === i); });
    $('#scopeLabel').textContent = labels[i]; $('#scopeFoot').textContent = foots[i];
  }
  function scopeSize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    scope.W = scope.cv.clientWidth; scope.H = scope.cv.clientHeight;
    scope.cv.width = scope.W * dpr; scope.cv.height = scope.H * dpr;
    scope.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function ease(x) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3); }
  function traces(ctx, W, H, t, n, amp) {
    var chn = ['Fz', 'Cz', 'Pz', 'C3', 'C4', 'Oz'];
    for (var i = 0; i < n; i++) {
      var by = H * (0.14 + 0.72 * i / (n - 1));
      ctx.beginPath();
      for (var x = 0; x <= W; x += 2) {
        var y = by - sig(i, t - (W - x) / 140) * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(103,232,249,.85)'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.fillStyle = 'rgba(140,145,166,.8)'; ctx.fillText(chn[i], 12, by - 12);
    }
  }
  function drawScope(now) {
    var ctx = scope.ctx, W = scope.W, H = scope.H, m = scope.mode;
    var t = reduce ? 20 : (now - t0) / 1000, st = (now - scope.since) / 1000;
    ctx.clearRect(0, 0, W, H); ctx.font = '11px "IBM Plex Mono", monospace';
    if (m === 0) { traces(ctx, W, H, t, 6, H * 0.04); }
    else if (m === 1) {
      traces(ctx, W, H, t, 6, H * 0.04);
      var ww = W * 0.38, wx = W * 0.5 - ww / 2;
      ctx.fillStyle = 'rgba(255,180,84,.09)'; ctx.fillRect(wx, 6, ww, H - 12);
      ctx.strokeStyle = 'rgba(255,180,84,.85)'; ctx.lineWidth = 1.2; ctx.strokeRect(wx, 6, ww, H - 12);
      ctx.strokeStyle = 'rgba(255,180,84,.3)'; ctx.setLineDash([3, 5]);
      var hop = ww / 4, off = ((t * 140) % hop);
      for (var q = 0; q < 12; q++) { var hx = wx + ww - q * hop - off; if (hx > 0 && hx < W) { ctx.beginPath(); ctx.moveTo(hx, 6); ctx.lineTo(hx, H - 6); ctx.stroke(); } }
      ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,180,84,.95)'; ctx.fillText('2 s window', wx + 8, 22);
    } else if (m === 2) {
      var cx = [W * 0.2, W * 0.5, W * 0.8], cy = H * 0.5;
      for (var k = 0; k < 3; k++) {
        var ang = t * (0.25 + k * 0.12) + k, ra = (28 + 22 * (k === 1 ? 1.5 : 1)) * (0.8 + 0.2 * Math.sin(t + k)) * (W / 520);
        var rb = ra * (0.38 + 0.12 * Math.sin(t * 0.7 + k));
        ctx.save(); ctx.translate(cx[k], cy); ctx.rotate(ang);
        ctx.beginPath(); ctx.ellipse(0, 0, ra * ease(st * 1.2 + k * 0.1), rb * ease(st * 1.2 + k * 0.1), 0, 0, TAU);
        ctx.strokeStyle = 'rgba(103,232,249,.9)'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.fillStyle = 'rgba(103,232,249,.07)'; ctx.fill(); ctx.restore();
        ctx.fillStyle = 'rgba(140,145,166,.8)'; ctx.fillText('C' + (k + 1), cx[k] - 8, cy + ra + 30);
      }
      ctx.strokeStyle = 'rgba(255,180,84,.7)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(cx[0], cy - 70); ctx.lineTo(cx[2], cy - 70); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,180,84,.95)'; ctx.fillText('re-centre to a causal reference', W * 0.5 - 100, cy - 80);
    } else if (m === 3) {
      var rows = [['Riemann fusion', 0.671], ['ShallowConvNet', 0.666], ['EEGNet', 0.631], ['Ensemble', 0.707]];
      var x0 = W * 0.3, x1 = W * 0.92, lo = 0.4, hi = 0.8;
      var X = function (v) { return x0 + (v - lo) / (hi - lo) * (x1 - x0); };
      ctx.strokeStyle = 'rgba(255,180,84,.8)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(X(0.5), 20); ctx.lineTo(X(0.5), H - 24); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,180,84,.95)'; ctx.fillText('chance 0.5', X(0.5) + 6, 18);
      rows.forEach(function (r, i) {
        var y = H * (0.2 + i * 0.19), p = ease(st * 1.1 - i * 0.12);
        ctx.fillStyle = 'rgba(140,145,166,.9)'; ctx.fillText(r[0], 14, y + 4);
        ctx.fillStyle = 'rgba(103,232,249,' + (i === 3 ? '.95' : '.55') + ')'; ctx.fillRect(X(0.5), y - 9, (X(r[1]) - X(0.5)) * p, 18);
        ctx.fillStyle = '#e9ebf2'; ctx.fillText(r[1].toFixed(3), X(0.5) + (X(r[1]) - X(0.5)) * p + 8, y + 4);
      });
    } else if (m === 4) {
      var mu = 0.489, sd = 0.04, a0 = 0.35, a1 = 0.8, px = function (v) { return 24 + (v - a0) / (a1 - a0) * (W - 48); }, base = H * 0.78;
      ctx.beginPath();
      for (var xx = 24; xx <= W - 24; xx += 2) {
        var v = a0 + (xx - 24) / (W - 48) * (a1 - a0), yv = Math.exp(-0.5 * Math.pow((v - mu) / sd, 2));
        var yy = base - yv * H * 0.5 * ease(st * 1.3);
        if (xx === 24) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.strokeStyle = 'rgba(140,145,166,.9)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.lineTo(W - 24, base); ctx.lineTo(24, base); ctx.fillStyle = 'rgba(140,145,166,.12)'; ctx.fill();
      ctx.fillStyle = 'rgba(255,180,84,.14)'; ctx.fillRect(px(0.60), 28, px(0.64) - px(0.60), base - 28);
      var ox = px(0.671) * 1; ctx.strokeStyle = 'rgba(103,232,249,.95)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ox, base); ctx.lineTo(ox, base - (base - 40) * ease(st * 1.2 - 0.2)); ctx.stroke();
      ctx.fillStyle = 'rgba(140,145,166,.95)'; ctx.fillText('drift-null  0.489', px(0.489) - 44, base + 18);
      ctx.fillStyle = 'rgba(103,232,249,.95)'; ctx.fillText('observed 0.671', ox - 30, 34);
      ctx.fillStyle = 'rgba(255,180,84,.95)'; ctx.fillText('after review ~0.60–0.64', px(0.60) - 20, base + 18);
    } else {
      var mid = H * 0.5;
      ctx.strokeStyle = 'rgba(140,145,166,.4)'; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
      var per = 90, offx = (t * 60) % per;
      for (var tk = -1; tk < W / per + 1; tk++) {
        var tx = W - 20 - (tk * per) + offx - W + 20; tx = (tk * per) - offx;
        ctx.strokeStyle = 'rgba(103,232,249,.7)'; ctx.beginPath(); ctx.moveTo(tx, mid - 12); ctx.lineTo(tx, mid + 12); ctx.stroke();
      }
      var on = Math.floor(t * 0.7) % 2 === 0, bx = W * 0.62;
      ctx.fillStyle = on ? 'rgba(255,180,84,.95)' : 'rgba(140,145,166,.9)';
      ctx.font = '600 28px "Bricolage Grotesque", sans-serif'; ctx.fillText(on ? 'ACTIVE' : 'idle', bx, mid - 46);
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.strokeStyle = 'rgba(255,180,84,.9)'; ctx.beginPath(); ctx.moveTo(bx, mid + 34); ctx.lineTo(bx + 52, mid + 34); ctx.stroke();
      ctx.fillStyle = 'rgba(255,180,84,.95)'; ctx.fillText('17–19 ms per decision', bx, mid + 54);
      ctx.fillStyle = 'rgba(140,145,166,.9)'; ctx.fillText('decision every 0.5 s', 14, H - 12);
    }
  }
  function scopeLoop(now) { if (scope.visible) drawScope(now); requestAnimationFrame(scopeLoop); }
  scopeSize(); addEventListener('resize', scopeSize);
  new IntersectionObserver(function (en) { scope.visible = en[0].isIntersecting; }).observe($('.scope'));
  setStage(0);
  if (reduce) { scope.visible = true; drawScope(performance.now()); } else requestAnimationFrame(scopeLoop);

  var mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', function () {
    ScrollTrigger.create({
      trigger: '.thesis-pin', start: 'top top', end: '+=2600', pin: true, scrub: true,
      onUpdate: function (s) { setStage(Math.min(5, Math.floor(s.progress * 6))); }
    });
  });
  mm.add('(max-width: 900px)', function () {
    stageLis.forEach(function (li, i) {
      ScrollTrigger.create({ trigger: li, start: 'top 60%', end: 'bottom 60%', onToggle: function (s) { if (s.isActive) setStage(i); } });
    });
  });

  /* ---------- work: horizontal reel ---------- */
  mm.add('(min-width: 901px)', function () {
    var track = $('#track');
    var dist = function () { return Math.max(0, track.scrollWidth - innerWidth + 40); };
    var tween = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: '.work-pin', start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.6, invalidateOnRefresh: true }
    });
    $$('.shot img').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: img, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    });
  });

  /* ---------- marquee ---------- */
  if (!reduce) {
    var mqs = $$('.mq-in').map(function (el) { return { el: el, x: 0, dir: parseFloat(el.parentNode.dataset.dir) }; });
    var vel = 0;
    ScrollTrigger.create({ onUpdate: function (s) { vel = gsap.utils.clamp(-2200, 2200, s.getVelocity()); } });
    gsap.ticker.add(function (time, dt) {
      var boost = vel * 0.03; vel *= 0.9;
      mqs.forEach(function (m) {
        var half = m.el.scrollWidth / 2;
        m.x += (m.dir * 45 + boost * m.dir) * dt / 1000;
        if (m.x <= -half) m.x += half; if (m.x > 0) m.x -= half;
        m.el.style.transform = 'translate3d(' + m.x + 'px,0,0) skewX(' + (-boost * 0.12) + 'deg)';
      });
    });
  }

  /* ---------- timeline ---------- */
  var tl = $('#tl'); var fill = document.createElement('div'); fill.className = 'fill'; tl.appendChild(fill);
  gsap.to(fill, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 65%', scrub: true } });
  $$('#tl li').forEach(function (li) {
    ScrollTrigger.create({ trigger: li, start: 'top 68%', onEnter: function () { li.classList.add('on'); }, onLeaveBack: function () { li.classList.remove('on'); } });
  });

  /* ---------- copy email ---------- */
  var copy = $('#copy'), state = $('#copyState');
  copy.addEventListener('click', function () {
    var email = copy.dataset.email;
    function done(ok) { state.textContent = ok ? 'copied' : 'select it'; setTimeout(function () { state.textContent = 'copy'; }, 1800); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(email).then(function () { done(true); }, function () { done(false); });
    else done(false);
  });

  addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
