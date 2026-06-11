const puppeteer = require("puppeteer-core");

const URL = process.env.QA_URL || "http://localhost:3031";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, isMobile: false, hasTouch: false },
  { name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];

(async () => {
  for (const vp of VIEWPORTS) {
    // fresh browser per viewport: a wedged software-GL render loop in one
    // page can stall the whole process
    const browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    const issues = [];
    page.on("console", (m) => {
      if (["error", "warning"].includes(m.type())) issues.push(`${m.type()}: ${m.text()}`);
    });
    page.on("pageerror", (e) => issues.push("pageerror: " + e.message));
    page.on("requestfailed", (r) => issues.push(`reqfail: ${r.url()} ${r.failure().errorText}`));

    await page.setViewport(vp);
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    // wait out the boot preloader
    await page
      .waitForFunction(
        () => {
          const p = document.querySelector(".preloader");
          return !p || getComputedStyle(p).display === "none";
        },
        { timeout: 15000 },
      )
      .catch(() => issues.push("preloader never finished"));
    await new Promise((r) => setTimeout(r, 1200));

    const jump = (frac) =>
      page.evaluate(async (f) => {
        const y = Math.round((document.documentElement.scrollHeight - innerHeight) * f);
        // assert per-frame: lenis's raf can snap programmatic scroll back
        for (let i = 0; i < 60 && Math.abs(scrollY - y) > 2; i++) {
          if (window.lenis) {
            window.lenis.resize();
            window.lenis.scrollTo(y, { immediate: true, force: true });
          } else window.scrollTo(0, y);
          await new Promise((r) => requestAnimationFrame(r));
        }
      }, frac);
    await page.evaluate(() => window.ScrollTrigger && window.ScrollTrigger.refresh(true));

    const shotAt = async (frac, name) => {
      await jump(frac);
      await new Promise((r) => setTimeout(r, 1300));
      await jump(frac);
      await new Promise((r) => setTimeout(r, 600));
      await page.screenshot({ path: `/tmp/cp-${vp.name}-${name}.png` });
      console.log(`shot ${name}: scrollY=${await page.evaluate(() => scrollY)}`);
    };

    await shotAt(0, "hero");
    await shotAt(0.4, "steps");
    await shotAt(0.8, "roster");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    const webgl = await page.evaluate(() => {
      const c = document.querySelector(".climb-canvas");
      try {
        return !!(c && (c.getContext("webgl2") || c.getContext("webgl")));
      } catch {
        return false;
      }
    });

    console.log(`== ${vp.name} ==`);
    console.log(`horizontal overflow: ${overflow}px`);
    console.log(`webgl context live: ${webgl}`);
    console.log(issues.length ? "ISSUES:\n  " + issues.join("\n  ") : "console clean");
    await browser.close();
  }
})();
