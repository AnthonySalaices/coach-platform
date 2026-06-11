"use client";

/**
 * All landing-page theatrics in one client island so the page itself stays a
 * server component: boot-sequence preloader, the WebGL "climb" (ascending
 * particles over a scrolling perspective grid), scramble-decode headline,
 * crosshair cursor, Lenis smooth scroll and [data-reveal] entrances.
 * Everything degrades: reduced-motion gets a static page, no WebGL is fine.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

const PARTICLE_VERT = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uDpr;
varying float vAlpha;

void main() {
  vec3 p = position;
  float h = 9.0;
  // every particle rises at its own pace and wraps back to the bottom
  p.y = mod(p.y + uTime * (0.25 + aSeed * 0.55), h) - 2.5;
  p.x += sin(uTime * (0.3 + aSeed * 0.4) + aSeed * 40.0) * 0.18;
  p.z += cos(uTime * 0.25 + aSeed * 60.0) * 0.12;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float t = (p.y + 2.5) / h;
  // fade in near the floor, burn out near the top
  vAlpha = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.6, 1.0, t));
  vAlpha *= (0.5 + aSeed * 0.5) * 0.55;

  gl_PointSize = (2.0 + aSeed * 3.0) * (12.0 / -mv.z) * uDpr;
  gl_Position = projectionMatrix * mv;
}
`;

const PARTICLE_FRAG = /* glsl */ `
precision mediump float;
uniform vec3 uColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float disk = smoothstep(0.5, 0.12, d);
  gl_FragColor = vec4(uColor, disk * vAlpha);
}
`;

const GRID_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GRID_FRAG = /* glsl */ `
precision mediump float;
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
  // uv.y runs toward the horizon; scroll the grid at the camera
  vec2 g = vec2(vUv.x * 28.0, vUv.y * 28.0 - uTime * 0.55);
  vec2 f = abs(fract(g) - 0.5);
  float line = 1.0 - smoothstep(0.0, 0.06, min(f.x, f.y));
  // fade out with distance + at the side edges
  float depth = 1.0 - smoothstep(0.25, 0.95, vUv.y);
  float edge = 1.0 - smoothstep(0.25, 0.5, abs(vUv.x - 0.5));
  gl_FragColor = vec4(uColor, line * depth * edge * 0.22);
}
`;

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&<>/\\";

function decode(el: HTMLElement, delay: number) {
  const finalText = el.dataset.text ?? el.textContent ?? "";
  const len = finalText.length;
  const obj = { p: 0 };
  gsap.to(obj, {
    p: 1,
    duration: 0.9,
    delay,
    ease: "power2.out",
    onUpdate() {
      const settled = Math.floor(obj.p * len);
      let out = "";
      for (let i = 0; i < len; i++) {
        const ch = finalText[i]!;
        if (i < settled || ch === " " || ch === "\n") out += ch;
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
    },
    onComplete() {
      el.textContent = finalText;
    },
  });
}

export function LandingFx() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preloaderRef = useRef<HTMLDivElement>(null);
  const preBarRef = useRef<HTMLDivElement>(null);
  const preLogRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const cleanups: Array<() => void> = [];

    document.body.classList.add("landing");
    cleanups.push(() => document.body.classList.remove("landing"));

    // ---------- smooth scroll ----------
    if (finePointer && !reduceMotion) {
      const lenis = new Lenis({ duration: 1.05 });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      // exposed for the .qa harness (programmatic scroll must go through lenis)
      (window as unknown as Record<string, unknown>).lenis = lenis;
      cleanups.push(() => {
        gsap.ticker.remove(raf);
        lenis.destroy();
      });
    }
    (window as unknown as Record<string, unknown>).ScrollTrigger =
      ScrollTrigger;

    // ---------- crosshair cursor ----------
    const cursor = cursorRef.current;
    if (cursor && finePointer && !reduceMotion) {
      document.body.classList.add("no-cursor");
      const move = (e: PointerEvent) => {
        gsap.to(cursor, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.18,
          ease: "power3.out",
        });
        const onTarget = (e.target as HTMLElement | null)?.closest(
          "a, button, summary, [role=button]",
        );
        cursor.classList.toggle("lock", Boolean(onTarget));
      };
      window.addEventListener("pointermove", move);
      cleanups.push(() => {
        window.removeEventListener("pointermove", move);
        document.body.classList.remove("no-cursor");
      });
    } else if (cursor) {
      cursor.style.display = "none";
    }

    // ---------- webgl: the climb ----------
    const canvas = canvasRef.current;
    let renderer: THREE.WebGLRenderer | null = null;
    if (canvas && !reduceMotion) {
      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
      } catch {
        renderer = null;
      }
    }
    if (renderer && canvas) {
      renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 40);
      camera.position.set(0, 0.6, 6);
      camera.lookAt(0, 0.8, 0);

      // Follow the (possibly admin-overridden) brand accent.
      const accentHex = getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim();
      const volt = new THREE.Color(accentHex || "#c9f73a");

      const COUNT = 1200;
      const pos = new Float32Array(COUNT * 3);
      const seed = new Float32Array(COUNT);
      for (let i = 0; i < COUNT; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 14;
        pos[i * 3 + 1] = Math.random() * 9;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
        seed[i] = Math.random();
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      pGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
      const pUniforms = {
        uTime: { value: 0 },
        uColor: { value: volt },
        uDpr: { value: 1 },
      };
      const pMat = new THREE.ShaderMaterial({
        vertexShader: PARTICLE_VERT,
        fragmentShader: PARTICLE_FRAG,
        uniforms: pUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      scene.add(new THREE.Points(pGeo, pMat));

      const gGeo = new THREE.PlaneGeometry(46, 30);
      const gUniforms = {
        uTime: { value: 0 },
        uColor: { value: volt },
      };
      const gMat = new THREE.ShaderMaterial({
        vertexShader: GRID_VERT,
        fragmentShader: GRID_FRAG,
        uniforms: gUniforms,
        transparent: true,
        depthWrite: false,
      });
      const grid = new THREE.Mesh(gGeo, gMat);
      grid.rotation.x = -Math.PI / 2;
      grid.position.y = -2.2;
      grid.position.z = -6;
      scene.add(grid);

      const mouse = { x: 0, y: 0 };
      const onMouse = (e: PointerEvent) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener("pointermove", onMouse);

      const resize = () => {
        pUniforms.uDpr.value = Math.min(window.devicePixelRatio, 2);
        renderer!.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer!.setSize(window.innerWidth, window.innerHeight, false);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener("resize", resize);

      // ambient particles dim once the hero is scrolled past
      const fadeST = ScrollTrigger.create({
        start: 0,
        end: () => window.innerHeight,
        onUpdate(self) {
          canvas.style.opacity = String(1 - self.progress * 0.92);
        },
      });

      let rafId = 0;
      let last = performance.now();
      const tick = () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        pUniforms.uTime.value += dt;
        gUniforms.uTime.value += dt;
        camera.position.x += (mouse.x * 0.4 - camera.position.x) * 0.04;
        camera.position.y += (0.6 - mouse.y * 0.25 - camera.position.y) * 0.04;
        camera.lookAt(0, 0.8, 0);
        renderer!.render(scene, camera);
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);

      cleanups.push(() => {
        cancelAnimationFrame(rafId);
        fadeST.kill();
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onMouse);
        pGeo.dispose();
        pMat.dispose();
        gGeo.dispose();
        gMat.dispose();
        renderer!.dispose();
      });
    }

    // ---------- boot preloader -> reveals ----------
    const pre = preloaderRef.current;
    const revealHero = () => {
      document.querySelectorAll<HTMLElement>("[data-decode]").forEach((el, i) => {
        if (reduceMotion) return;
        el.dataset.text = el.textContent ?? "";
        decode(el, i * 0.12);
      });
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: reduceMotion ? 0 : 0.8,
            ease: "power3.out",
            delay: (parseInt(el.dataset.reveal ?? "0", 10) || 0) * 0.08,
            scrollTrigger: { trigger: el, start: "top 90%" },
          },
        );
      });
    };

    if (pre && !reduceMotion && !sessionStorage.getItem("booted")) {
      sessionStorage.setItem("booted", "1");
      const lines = [
        "ESTABLISHING UPLINK…",
        "LOADING COACH ROSTER…",
        "CALIBRATING RANK SENSORS…",
        "READY. WELCOME BACK, PLAYER.",
      ];
      const tl = gsap.timeline({
        onComplete() {
          gsap.to(pre, {
            yPercent: -100,
            duration: 0.55,
            ease: "power4.inOut",
            onComplete() {
              pre.style.display = "none";
              revealHero();
            },
          });
        },
      });
      lines.forEach((line, i) => {
        tl.call(
          () => {
            if (preLogRef.current) preLogRef.current.textContent = line;
            if (preBarRef.current)
              preBarRef.current.style.width = `${((i + 1) / lines.length) * 100}%`;
          },
          [],
          i * 0.28,
        );
      });
      tl.to({}, { duration: 0.45 }, ">");
    } else {
      if (pre) pre.style.display = "none";
      revealHero();
    }

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="climb-canvas" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
      <div ref={cursorRef} className="crosshair" aria-hidden="true">
        <span className="ch-ring" />
        <span className="ch-dot" />
      </div>
      <div ref={preloaderRef} className="preloader" aria-hidden="true">
        <div className="pre-inner">
          <div className="pre-brand">⚡ BOOT SEQUENCE</div>
          <div className="pre-track">
            <div ref={preBarRef} className="pre-bar" />
          </div>
          <div ref={preLogRef} className="pre-log">
            ESTABLISHING UPLINK…
          </div>
        </div>
      </div>
    </>
  );
}
