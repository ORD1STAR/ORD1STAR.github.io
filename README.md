# ord1star.github.io

Personal portfolio of **Hannoun Amine Amar**, AI engineer and full-stack developer.

Static site, no build step: `index.html`, `css/style.css`, `js/main.js` and optimised images in `assets/`.
Scroll choreography uses [GSAP](https://gsap.com) with ScrollTrigger (loaded from cdnjs). The hero and the
thesis oscilloscope are drawn on `<canvas>`; the numbers in the findings section are taken from the
[EEG project](https://github.com/ORD1STAR/eeg-motor-intent-decoder)'s result files.

```bash
python -m http.server 8000   # then open http://localhost:8000
```

Respects `prefers-reduced-motion`. Layout is responsive down to phone width.
