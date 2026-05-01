(function exposeSidraUI() {
  function normalizeGateName(value) {
    return value.trim().toLowerCase().replace(/[ًٌٍَُِّْ]/g, "");
  }

  class SidraUI {
    constructor() {
      this.content = window.SIDRA_SKY_CONTENT;
      this.discovered = new Set();
      this.typewriterTimer = null;
      this.toastTimer = null;
      this.meteorTimer = null;
      this.engine = null;
      this.elements = {
        welcomeScreen: document.getElementById("welcomeScreen"),
        skyExperience: document.getElementById("skyExperience"),
        gateForm: document.getElementById("gateForm"),
        gateName: document.getElementById("gateName"),
        gateButton: document.getElementById("gateButton"),
        gateHint: document.getElementById("gateHint"),
        constellationMap: document.getElementById("constellationMap"),
        pathA: document.getElementById("constellationPathA"),
        pathB: document.getElementById("constellationPathB"),
        counter: document.getElementById("discoveryCounter"),
        modalLayer: document.getElementById("modalLayer"),
        modalTitle: document.getElementById("modalTitle"),
        modalKicker: document.getElementById("modalKicker"),
        modalBody: document.getElementById("modalBody"),
        finaleLayer: document.getElementById("finaleLayer"),
        finaleText: document.getElementById("finaleText"),
        finaleRestartButton: document.getElementById("finaleRestartButton"),
        keepSkyButton: document.getElementById("keepSkyButton"),
        longMessageButton: document.getElementById("longMessageButton"),
        restartButton: document.getElementById("restartButton"),
        morphButton: document.getElementById("morphButton"),
        musicButton: document.getElementById("musicButton"),
        audio: document.getElementById("skyAudio"),
        toast: document.getElementById("toast"),
        meteorLayer: document.getElementById("meteorLayer")
      };
      this.onResize = this.onResize.bind(this);
    }

    init(engine) {
      this.engine = engine;
      this.setupAudio();
      this.renderConstellation();
      this.bindEvents();
      this.enableGate();
      this.updateCounter();
      this.scheduleMeteor();
    }

    enableGate() {
      this.elements.gateName.disabled = false;
      this.elements.gateButton.disabled = false;
    }

    setupAudio() {
      if (this.content.musicSrc) {
        this.elements.audio.src = new URL(this.content.musicSrc, window.location.href).href;
        this.elements.audio.loop = true;
        this.elements.audio.preload = "metadata";
        this.elements.audio.load();
      }
    }

    bindEvents() {
      this.elements.gateForm.addEventListener("submit", (event) => {
        event.preventDefault();
        this.tryOpenSky();
      });

      this.elements.longMessageButton.addEventListener("click", () => {
        this.openModal("رسالة طويلة", "من القلب", this.content.longMessage);
      });

      this.elements.restartButton.addEventListener("click", () => {
        this.restartJourney(false);
      });

      this.elements.finaleRestartButton.addEventListener("click", () => {
        this.restartJourney(false);
        this.elements.finaleLayer.hidden = true;
      });

      this.elements.keepSkyButton.addEventListener("click", () => {
        localStorage.setItem("sidra-sky-kept", new Date().toISOString());
        this.showToast("احتفظت السماء بمكانها هنا، باسم سدرا.");
      });

      this.elements.morphButton.addEventListener("click", () => {
        this.engine.triggerNextShape();
      });

      this.elements.musicButton.addEventListener("click", () => this.toggleMusic());

      document.querySelectorAll("[data-close-modal]").forEach((button) => {
        button.addEventListener("click", () => this.closeModal());
      });

      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          this.closeModal();
          this.elements.finaleLayer.hidden = true;
        }
      });

      window.addEventListener("resize", this.onResize, { passive: true });
    }

    tryOpenSky() {
      const value = this.elements.gateName.value;
      const normalizedValue = normalizeGateName(value);
      const accepted = this.content.acceptedGateNames.some(
        (name) => normalizeGateName(name) === normalizedValue
      );

      if (!normalizedValue) {
        this.elements.gateHint.textContent = "اكتبي اسمها بهدوء… والسماء بتفتح.";
        return;
      }

      if (!accepted) {
        this.elements.gateHint.textContent = "هذه السماء تعرف اسماً واحداً فقط…";
        this.elements.gateName.select();
        return;
      }

      this.openSky();
    }

    openSky() {
      this.elements.welcomeScreen.classList.add("is-hidden");
      this.elements.skyExperience.classList.remove("is-locked");
      this.elements.gateHint.textContent = "";
      window.setTimeout(() => {
        this.elements.welcomeScreen.setAttribute("aria-hidden", "true");
      }, 900);
      this.engine.startSequence();
    }

    restartJourney(showGate) {
      this.discovered.clear();
      this.elements.finaleLayer.hidden = true;
      document.querySelectorAll(".constellation-star").forEach((star) => {
        star.classList.remove("is-discovered");
      });
      this.updateCounter();
      this.engine.release();
      this.engine.startSequence();
      this.showToast("رجعت الرحلة لأول ضوء.");

      if (showGate) {
        this.elements.welcomeScreen.classList.remove("is-hidden");
        this.elements.welcomeScreen.removeAttribute("aria-hidden");
        this.elements.skyExperience.classList.add("is-locked");
      }
    }

    toggleMusic() {
      const audio = this.elements.audio;
      if (!this.content.musicSrc) {
        this.showToast("زر الموسيقى جاهز. ضعي رابط الملف في js/messages.js.");
        return;
      }

      if (audio.paused) {
        audio
          .play()
          .then(() => {
            this.elements.musicButton.classList.add("is-active");
            this.showToast("الموسيقى بدأت بهدوء.");
          })
          .catch((error) => {
            const mediaError = audio.error;
            const missingOrUnsupported =
              error.name === "NotSupportedError" ||
              (mediaError && mediaError.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);

            if (missingOrUnsupported) {
              this.showToast("مسار الأغنية غير صحيح أو الملف غير مدعوم. تأكد من musicSrc.");
              return;
            }

            this.showToast("المتصفح رفض تشغيل الصوت حالياً. جرّبي الضغط مرة أخرى.");
          });
      } else {
        audio.pause();
        this.elements.musicButton.classList.remove("is-active");
        this.showToast("هدأت الموسيقى.");
      }
    }

    renderConstellation() {
      const points = this.content.constellation;
      this.elements.constellationMap
        .querySelectorAll(".constellation-star")
        .forEach((node) => node.remove());

      points.forEach((point, index) => {
        const button = document.createElement("button");
        button.className = "constellation-star";
        button.type = "button";
        button.dataset.label = point.label;
        button.dataset.id = point.id;
        button.setAttribute("aria-label", `نجمة ${point.label}`);
        button.style.left = `${point.x}%`;
        button.style.top = `${point.y}%`;
        button.style.setProperty("--node-size", `${index === points.length - 1 ? 23 : 17 + (index % 3)}px`);
        button.addEventListener("click", () => this.openConstellationMessage(point));
        button.addEventListener("pointerenter", () => button.classList.add("is-hovered"));
        button.addEventListener("pointerleave", () => button.classList.remove("is-hovered"));
        this.elements.constellationMap.appendChild(button);
      });

      this.updateConstellationLines();
    }

    updateConstellationLines() {
      const points = window.SidraShapes.generateConstellationPoints({ width: 1000, height: 620 });
      const pathA = points
        .slice(0, 9)
        .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
        .join(" ");
      const pathB = [points[4], points[13], points[8], points[12], points[9], points[10], points[11], points[7]]
        .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
        .join(" ");
      this.elements.pathA.setAttribute("d", pathA);
      this.elements.pathB.setAttribute("d", pathB);
    }

    openConstellationMessage(point) {
      this.discovered.add(point.id);
      const star = document.querySelector(`.constellation-star[data-id="${point.id}"]`);
      if (star) star.classList.add("is-discovered");
      this.updateCounter();
      this.openModal(point.label, "رسالة من نجمة", point.message);

      if (this.discovered.size === this.content.constellation.length) {
        window.setTimeout(() => this.showFinale(), 650);
      }
    }

    updateCounter() {
      this.elements.counter.textContent = `اكتشفتِ ${this.discovered.size} من ${this.content.constellation.length} نجمة`;
    }

    openModal(title, kicker, message) {
      this.elements.modalKicker.textContent = kicker;
      this.elements.modalTitle.textContent = title;
      this.elements.modalBody.textContent = message;
      this.elements.modalLayer.hidden = false;
      document.body.style.overflow = "hidden";
    }

    closeModal() {
      this.elements.modalLayer.hidden = true;
      document.body.style.overflow = "";
    }

    showFinale() {
      this.closeModal();
      this.elements.finaleLayer.hidden = false;
      this.typeText(this.content.finaleMessage);
    }

    typeText(text) {
      window.clearInterval(this.typewriterTimer);
      this.elements.finaleText.textContent = "";
      let index = 0;
      const speed = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 36;
      this.typewriterTimer = window.setInterval(() => {
        this.elements.finaleText.textContent = text.slice(0, index);
        index += 1;
        if (index > text.length) window.clearInterval(this.typewriterTimer);
      }, speed);
    }

    showToast(message) {
      window.clearTimeout(this.toastTimer);
      this.elements.toast.textContent = message;
      this.elements.toast.classList.add("is-visible");
      this.toastTimer = window.setTimeout(() => {
        this.elements.toast.classList.remove("is-visible");
      }, 3200);
    }

    scheduleMeteor() {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) return;
      const delay = 3800 + Math.random() * 7200;
      this.meteorTimer = window.setTimeout(() => {
        this.createMeteor();
        this.scheduleMeteor();
      }, delay);
    }

    createMeteor() {
      const meteor = document.createElement("span");
      meteor.className = "meteor";
      meteor.style.setProperty("--meteor-x", `${30 + Math.random() * 78}vw`);
      meteor.style.setProperty("--meteor-duration", `${2.8 + Math.random() * 1.6}s`);
      this.elements.meteorLayer.appendChild(meteor);
      window.setTimeout(() => meteor.remove(), 5200);
    }

    onResize() {
      this.updateConstellationLines();
    }
  }

  window.SidraUI = SidraUI;
})();
