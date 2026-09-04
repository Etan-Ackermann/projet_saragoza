const sceneSvgObject = document.querySelector("#scene-object");
const svgNamespace = "http://www.w3.org/2000/svg";

// Calques animes au scroll. Plus le calque est devant, plus il descend.
const parallaxConfig = [
  { selector: "#mt3", distance: 16, scrub: 2.5 },
  { selector: "#mt2", distance: 34, scrub: 1.5 },
  { selector: "#mt1", distance: 58, scrub: 0.6 },
];

const parallaxAnimations = [];

initScene().catch(console.error);

// Attend le SVG externe, puis branche uniquement la parallaxe.
async function initScene() {
  const svg = await waitForSceneSvg();
  const layers = parallaxConfig.map((layer) => prepareParallaxLayer(svg, layer)).filter(Boolean);
  setupParallax(layers);
}

// <object> charge le SVG dans un document separe : il faut attendre son evenement load.
function waitForSceneSvg() {
  return new Promise((resolve, reject) => {
    if (!sceneSvgObject) {
      reject(new Error("Missing #scene-object"));
      return;
    }

    const resolveSvg = () => {
      const svg = getSceneSvg();
      svg ? resolve(svg) : reject(new Error("scene.svg is not available"));
    };

    getSceneSvg()
      ? resolveSvg()
      : sceneSvgObject.addEventListener("load", resolveSvg, { once: true });

    sceneSvgObject.addEventListener("error", () => reject(new Error("Unable to load scene.svg")), { once: true });
  });
}

// Ajoute un wrapper SVG autour du calque pour animer le groupe sans toucher aux paths.
function prepareParallaxLayer(svg, layer) {
  const target = svg.querySelector(layer.selector);
  if (!target) return null;

  const wrapper = document.createElementNS(svgNamespace, "g");
  wrapper.id = `${target.id}-parallax`;
  target.before(wrapper);
  wrapper.append(target);

  return { ...layer, target: wrapper };
}

// GSAP garde le mouvement synchronise avec le scroll de la page.
function setupParallax(layers) {
  if (!window.gsap || !window.ScrollTrigger) {
    console.warn("GSAP ScrollTrigger is not loaded; parallax is disabled.");
    return;
  }

  window.gsap.registerPlugin(window.ScrollTrigger);
  clearParallax();

  layers.forEach((layer) => {
    parallaxAnimations.push(window.gsap.to(layer.target, {
      attr: { transform: `translate(0,${layer.distance})` },
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        scrub: layer.scrub,
      },
    }));
  });
}

// Evite d'empiler plusieurs ScrollTrigger si le SVG est recharge.
function clearParallax() {
  parallaxAnimations.splice(0).forEach((animation) => {
    animation.scrollTrigger?.kill();
    animation.kill();
  });
}

// Recupere la racine <svg> du fichier charge dans <object>.
function getSceneSvg() {
  const svg = sceneSvgObject?.contentDocument?.documentElement;
  return svg?.tagName.toLowerCase() === "svg" ? svg : null;
}
