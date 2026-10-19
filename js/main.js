(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('js'); return; }
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

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
  if (!reduce) setInterval(tick, 200); else tick();
  function updProgress() {
    var h = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = 'scaleX(' + (h > 0 ? scrollY / h : 0) + ')';
  }
  addEventListener('scroll', updProgress, { passive: true });
  updProgress();

  /* ---------- calm, slow EEG-like signal (shared) ---------- */
  var SLOW = 0.17;
  function sig(ch, t) {
    var u = t * SLOW;
    var env = 0.6 + 0.4 * Math.sin(TAU * 0.05 * u * 4 + ch * 1.3);
    var a = Math.sin(TAU * (9.2 + ch * 0.45) * u + ch * 1.7) * env;
    var b = 0.28 * Math.sin(TAU * (19 + ch * 1.3) * u + ch * 3.1);
    var c = 0.22 * Math.sin(TAU * 3.1 * u + ch);
    var n = 0.05 * Math.sin(TAU * 41.3 * u + ch * 7.7);
    return a + b + c + n;
  }

  /* ---------- hero: cursor-lit grid, decoding headline, terminal ---------- */
  var heroEl = $('.hero');
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    var hx = 0, hy = 0, hq = false;
    heroEl.addEventListener('pointermove', function (e) {
      var r = heroEl.getBoundingClientRect(); hx = e.clientX - r.left; hy = e.clientY - r.top;
      if (!hq) { hq = true; requestAnimationFrame(function () { heroEl.style.setProperty('--mx', hx + 'px'); heroEl.style.setProperty('--my', hy + 'px'); hq = false; }); }
    });
  }

  function scramble(el, dur) {
    var nodes = [];
    (function walk(n) { Array.prototype.forEach.call(n.childNodes, function (c) {
      if (c.nodeType === 3 && c.nodeValue.trim()) nodes.push({ n: c, t: c.nodeValue });
      else if (c.nodeType === 1) walk(c); }); })(el);
    var chars = '01/\\<>[]{}#%$&*+=?', start = performance.now();
    function frame(now) {
      var p = Math.min(1, (now - start) / dur);
      nodes.forEach(function (o) {
        var out = '';
        for (var i = 0; i < o.t.length; i++) {
          var ch = o.t[i];
          out += (ch === ' ' || i / o.t.length < p * 1.2 - 0.1) ? ch : chars[Math.floor(Math.random() * chars.length)];
        }
        o.n.nodeValue = out;
      });
      if (p < 1) requestAnimationFrame(frame); else nodes.forEach(function (o) { o.n.nodeValue = o.t; });
    }
    requestAnimationFrame(frame);
  }

  function runTerm() {
    var term = $('#term'), ps = $$('p', term), cmds = $$('.cmd', term);
    if (reduce) { cmds.forEach(function (c) { c.textContent = c.dataset.t; }); ps.forEach(function (p) { p.style.opacity = 1; }); return; }
    var i = 0;
    function next() {
      if (i >= cmds.length) return;
      var cmd = cmds[i], line = cmd.parentNode, out = line.nextElementSibling, text = cmd.dataset.t, k = 0;
      line.style.opacity = 1;
      (function type() {
        cmd.textContent = text.slice(0, ++k);
        if (k < text.length) setTimeout(type, 42 + Math.random() * 40);
        else setTimeout(function () { out.style.opacity = 1; i++; setTimeout(next, 380); }, 220);
      })();
    }
    next();
  }

  gsap.set('[data-hero]', { y: 14 });
  var intro = gsap.timeline({ delay: 0.15, defaults: { ease: 'power4.out' } });
  intro.to('h1 .ln > span', { y: 0, duration: 1.2, stagger: 0.14 })
       .to('[data-hero]', { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, '-=0.8')
       .add(function () { setTimeout(runTerm, 250); }, '-=0.3');
  if (!reduce) { $$('h1 .ln > span').forEach(function (el, i) { setTimeout(function () { scramble(el, 1000); }, 250 + i * 160); }); }
  gsap.to('.hero-inner', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.term', { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-bg', { opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

  /* ---------- headings: masked line reveal; section rules ---------- */
  $$('h2').forEach(function (h) {
    var parts = h.innerHTML.split(/<br\s*\/?>/i);
    h.innerHTML = parts.map(function (p) { return '<span class="ln"><span>' + p + '</span></span>'; }).join('');
    ScrollTrigger.create({
      trigger: h, start: 'top 88%', once: true,
      onEnter: function () { gsap.to($$('.ln > span', h), { y: 0, duration: 1.1, ease: 'power4.out', stagger: 0.12 }); }
    });
  });
  $$('main > section:not(.hero)').forEach(function (sec) {
    var rule = document.createElement('div'); rule.className = 'rule'; rule.innerHTML = '<i></i>';
    sec.insertBefore(rule, sec.firstChild);
    gsap.to($('i', rule), { scaleX: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top 95%', end: 'top 35%', scrub: true } });
  });

  /* ---------- reveals ---------- */
  $$('.sec-head > .eyebrow, .sec-head > .sec-sub, .thesis-copy > .eyebrow, .thesis-copy > .thesis-desc, .work-head > .eyebrow, .contact > *:not(h2), .rows li, .tl li').forEach(function (el) { el.setAttribute('data-reveal', ''); });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 94%', once: true,
    onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07, overwrite: true }); }
  });

  /* ---------- thesis: stages + scope ---------- */
  var scope = { cv: $('#scopeCanvas'), mode: -1, since: performance.now(), visible: false, last: 0 };
  scope.ctx = scope.cv.getContext('2d');
  var stageLis = $$('#stages li');
  var labels = ['01 · record', '02 · window', '03 · describe', '04 · decode', '05 · doubt it', '06 · replay live', '07 · verdict'];
  var foots = ['30 ch · 500 Hz · 28 recordings', '2 s window · 0.5 s hop · causal', 'covariance · tangent space', 'AUC · held-out participants', 'null model vs observed', 'LSL stream · 17–19 ms', 'reported as measured'];
  var N_STAGES = stageLis.length;
  function setStage(i) {
    if (i === scope.mode) return;
    scope.mode = i; scope.since = performance.now();
    stageLis.forEach(function (li, k) { li.classList.toggle('on', k === i); });
    $('#scopeLabel').textContent = labels[i]; $('#scopeFoot').textContent = foots[i];
    var li = stageLis[i], det = $('#stageDetail');
    if (det) {
      var ps = $$('p', li);
      $('.sd-text', det).textContent = ps[0] ? ps[0].textContent : '';
      $('.sd-stat', det).textContent = ps[1] ? ps[1].textContent : '';
    }
  }
  function stageFor(p) { return p >= 0.8 ? N_STAGES - 1 : Math.min(N_STAGES - 2, Math.floor(p / 0.8 * (N_STAGES - 1))); }
  function scopeSize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
      for (var x = 0; x <= W + 3; x += 3) {
        var y = by - sig(i, t - (W - x) / 55) * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(103,232,249,.7)'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.fillStyle = 'rgba(140,145,166,.7)'; ctx.fillText(chn[i], 12, by - 12);
    }
  }
  function drawScope(now) {
    var ctx = scope.ctx, W = scope.W, H = scope.H, m = scope.mode;
    var t = reduce ? 40 : (now - t0) / 1000 + 20, st = (now - scope.since) / 1000;
    ctx.clearRect(0, 0, W, H); ctx.font = '11px "IBM Plex Mono", monospace'; ctx.lineWidth = 1;
    if (m === 0) { traces(ctx, W, H, t, 6, H * 0.04); }
    else if (m === 1) {
      traces(ctx, W, H, t, 6, H * 0.04);
      var ww = W * 0.38, wx = W * 0.5 - ww / 2;
      ctx.fillStyle = 'rgba(255,180,84,.09)'; ctx.fillRect(wx, 6, ww, H - 12);
      ctx.strokeStyle = 'rgba(255,180,84,.85)'; ctx.lineWidth = 1.2; ctx.strokeRect(wx, 6, ww, H - 12);
      ctx.strokeStyle = 'rgba(255,180,84,.3)'; ctx.setLineDash([3, 5]);
      var hop = ww / 4, off = ((t * 55) % hop);
      for (var q = 0; q < 12; q++) { var hx = wx + ww - q * hop - off; if (hx > 0 && hx < W) { ctx.beginPath(); ctx.moveTo(hx, 6); ctx.lineTo(hx, H - 6); ctx.stroke(); } }
      ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,180,84,.95)'; ctx.fillText('2 s window', wx + 8, 22);
    } else if (m === 2) {
      var cx = [W * 0.2, W * 0.5, W * 0.8], cy = H * 0.5;
      for (var k = 0; k < 3; k++) {
        var ang = t * (0.06 + k * 0.03) + k, ra = (28 + 22 * (k === 1 ? 1.5 : 1)) * (0.85 + 0.15 * Math.sin(t * 0.3 + k)) * (W / 520);
        var rb = ra * (0.4 + 0.1 * Math.sin(t * 0.2 + k)), e = ease(st * 1.2 + k * 0.1);
        ctx.save(); ctx.translate(cx[k], cy); ctx.rotate(ang);
        ctx.beginPath(); ctx.ellipse(0, 0, ra * e, rb * e, 0, 0, TAU);
        ctx.strokeStyle = 'rgba(103,232,249,.9)'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.fillStyle = 'rgba(103,232,249,.07)'; ctx.fill(); ctx.restore();
        ctx.fillStyle = 'rgba(140,145,166,.8)'; ctx.fillText('C' + (k + 1), cx[k] - 8, cy + ra + 30);
      }
      ctx.strokeStyle = 'rgba(255,180,84,.7)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(cx[0], cy - 70); ctx.lineTo(cx[2], cy - 70); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,180,84,.95)'; ctx.fillText('re-centre to a causal reference', W * 0.5 - 100, cy - 80);
    } else if (m === 3) {
      var rows = [['Riemann fusion', 0.671], ['ShallowConvNet', 0.666], ['EEGNet', 0.631], ['Ensemble', 0.707]];
      var x0 = W * 0.3, x1 = W * 0.92, lo = 0.4, hi = 0.8, X = function (v) { return x0 + (v - lo) / (hi - lo) * (x1 - x0); };
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
      var ox = px(0.671); ctx.strokeStyle = 'rgba(103,232,249,.95)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ox, base); ctx.lineTo(ox, base - (base - 40) * ease(st * 1.2 - 0.2)); ctx.stroke();
      ctx.fillStyle = 'rgba(140,145,166,.95)'; ctx.fillText('drift-null  0.489', px(0.489) - 44, base + 18);
      ctx.fillStyle = 'rgba(103,232,249,.95)'; ctx.fillText('observed 0.671', ox - 30, 34);
      ctx.fillStyle = 'rgba(255,180,84,.95)'; ctx.fillText('after review ~0.60–0.64', px(0.60) - 20, base + 18);
    } else if (m === 5) {
      var mid = H * 0.5;
      ctx.strokeStyle = 'rgba(140,145,166,.4)'; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
      var per = 90, offx = (t * 22) % per;
      for (var tk = -1; tk < W / per + 1; tk++) {
        var tx = (tk * per) - offx;
        ctx.strokeStyle = 'rgba(103,232,249,.7)'; ctx.beginPath(); ctx.moveTo(tx, mid - 12); ctx.lineTo(tx, mid + 12); ctx.stroke();
      }
      var on = Math.floor(t * 0.35) % 2 === 0, bx = W * 0.62;
      ctx.fillStyle = on ? 'rgba(255,180,84,.95)' : 'rgba(140,145,166,.9)';
      ctx.font = '600 28px "Bricolage Grotesque", sans-serif'; ctx.fillText(on ? 'ACTIVE' : 'idle', bx, mid - 46);
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.strokeStyle = 'rgba(255,180,84,.9)'; ctx.beginPath(); ctx.moveTo(bx, mid + 34); ctx.lineTo(bx + 52, mid + 34); ctx.stroke();
      ctx.fillStyle = 'rgba(255,180,84,.95)'; ctx.fillText('17–19 ms per decision', bx, mid + 54);
      ctx.fillStyle = 'rgba(140,145,166,.9)'; ctx.fillText('decision every 0.5 s', 14, H - 12);
    } else {
      /* verdict: three honest meters */
      var lo2 = 0.3, hi2 = 0.9, xa = W * 0.08, wa = W * 0.84, XX = function (v) { return xa + (v - lo2) / (hi2 - lo2) * wa; };
      var items = [
        { y: 0.2, t: '3-class balanced accuracy', v: 0.385, mark: 0.333, ml: 'chance 0.333', note: '0.385' },
        { y: 0.5, t: 'push vs walk, AUC', v: 0.514, v2: 0.811, ml: 'EEG 0.514', ml2: 'timestamp only 0.811', note: '' },
        { y: 0.8, t: 'brain switch, AUC', v: 0.707, band: [0.60, 0.64], ml: 'after review ~0.60–0.64', note: '0.707' }
      ];
      items.forEach(function (it, i) {
        var y = H * it.y, p = ease(st * 1.1 - i * 0.18);
        ctx.fillStyle = 'rgba(140,145,166,.95)'; ctx.fillText(it.t, xa, y - 22);
        ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(xa, y - 5, wa, 10);
        if (it.band) { ctx.fillStyle = 'rgba(255,180,84,.25)'; ctx.fillRect(XX(it.band[0]), y - 12, XX(it.band[1]) - XX(it.band[0]), 24); }
        ctx.fillStyle = 'rgba(103,232,249,.9)'; ctx.fillRect(xa, y - 5, (XX(it.v) - xa) * p, 10);
        if (it.v2) { ctx.fillStyle = 'rgba(255,180,84,.9)'; ctx.fillRect(xa, y + 9, (XX(it.v2) - xa) * p, 4); }
        if (it.mark) { ctx.strokeStyle = 'rgba(255,180,84,.95)'; ctx.beginPath(); ctx.moveTo(XX(it.mark), y - 14); ctx.lineTo(XX(it.mark), y + 14); ctx.stroke(); }
        ctx.fillStyle = '#e9ebf2';
        if (it.note) ctx.fillText(it.note, xa + (XX(it.v) - xa) * p + 8, y + 3);
        ctx.fillStyle = 'rgba(255,180,84,.95)';
        if (it.ml) ctx.fillText(it.ml, XX(it.mark || (it.band ? it.band[0] : it.v)) + 6, y + 28);
        if (it.ml2) ctx.fillText(it.ml2, XX(it.v2) - 120, y - 12);
      });
    }
  }
  function scopeLoop(now) { if (scope.visible && !document.hidden && now - scope.last > 33) { scope.last = now; drawScope(now); } requestAnimationFrame(scopeLoop); }
  scopeSize(); addEventListener('resize', scopeSize);
  new IntersectionObserver(function (en) { scope.visible = en[0].isIntersecting; }).observe($('.scope'));
  setStage(0);
  if (reduce) { scope.visible = true; drawScope(performance.now()); } else requestAnimationFrame(scopeLoop);

  var mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', function () {
    ScrollTrigger.create({
      trigger: '.thesis-pin', start: 'top top', end: '+=3600', pin: true, scrub: true, anticipatePin: 1,
      onUpdate: function (s) { setStage(stageFor(s.progress)); }
    });
  });
  mm.add('(max-width: 900px)', function () {
    stageLis.forEach(function (li, i) {
      ScrollTrigger.create({ trigger: li, start: 'top 60%', end: 'bottom 60%', onToggle: function (s) { if (s.isActive) setStage(i); } });
    });
  });

  /* ---------- projects: horizontal reel ---------- */
  mm.add('(min-width: 901px)', function () {
    var track = $('#track');
    var dist = function () { return Math.max(0, track.scrollWidth - innerWidth + 40); };
    var tween = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: '.work-pin', start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true }
    });
    $$('.shot img').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: img, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    });
  });

  /* ---------- marquee ---------- */
  if (!reduce) {
    var mqs = $$('.mq-in').map(function (el) { return { el: el, x: 0, dir: parseFloat(el.parentNode.dataset.dir) }; });
    var vel = 0;
    ScrollTrigger.create({ onUpdate: function (s) { vel = gsap.utils.clamp(-1800, 1800, s.getVelocity()); } });
    gsap.ticker.add(function (time, dt) {
      var boost = vel * 0.02; vel *= 0.9;
      mqs.forEach(function (m) {
        var half = m.el.scrollWidth / 2;
        m.x += (m.dir * 40 + boost * m.dir) * dt / 1000;
        if (m.x <= -half) m.x += half; if (m.x > 0) m.x -= half;
        m.el.style.transform = 'translate3d(' + m.x + 'px,0,0) skewX(' + (-boost * 0.08) + 'deg)';
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

  /* ---------- keep pin positions right once layout settles ---------- */
  var refresh = function () { ScrollTrigger.refresh(); };
  addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  $$('img').forEach(function (im) { if (!im.complete) im.addEventListener('load', refresh, { once: true }); });
})();
