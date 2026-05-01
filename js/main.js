function bootSidraSky() {
  const stage = document.getElementById("morphStage");
  const caption = document.getElementById("shapeCaption");
  const engine = new window.StarMorphEngine(stage, caption);
  const ui = new window.SidraUI();

  engine.init();
  ui.init(engine);

  window.SidraSky = {
    engine,
    ui,
    content: window.SIDRA_SKY_CONTENT
  };
}

if (document.getElementById("morphStage")) {
  bootSidraSky();
} else if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootSidraSky, { once: true });
} else {
  bootSidraSky();
}
