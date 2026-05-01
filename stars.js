(function exposeStarEngine() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  class MorphStar {
    constructor(id, stage, bounds) {
      this.id = id;
      this.el = document.createElement("div");
      this.el.className = "star";
      this.reset(bounds, true);
      stage.appendChild(this.el);
    }

    reset(bounds, firstRun) {
      this.x = random(0, bounds.width);
      this.y = random(0, bounds.height);
      this.vx = random(-0.05, 0.05);
      this.vy = random(-0.035, 0.035);
      this.targetX = null;
      this.targetY = null;
      this.size = random(1.2, 3.4) * bounds.densityScale;
      this.opacity = random(0.42, 0.96);
      this.glow = random(0.28, 0.86);
      this.freeSpeed = random(0.025, 0.12) * bounds.motionScale;
      this.twinklePhase = random(0, Math.PI * 2);
      this.twinkleSpeed = random(0.0012, 0.0035);
      this.driftAngle = random(0, Math.PI * 2);
      this.isInShape = false;
      this.color = Math.random() > 0.72 ? "#ffddb0" : Math.random() > 0.55 ? "#d8fbff" : "#f8f9fa";
      this.el.style.setProperty("--size", `${this.size}px`);
      this.el.style.setProperty("--star-color", this.color);
      if (firstRun) this.render(0);
    }

    setTarget(x, y) {
      this.targetX = x;
      this.targetY = y;
      this.isInShape = true;
      this.el.classList.add("is-shaped");
    }

    release() {
      this.targetX = null;
      this.targetY = null;
      this.isInShape = false;
      this.vx += random(-0.24, 0.24);
      this.vy += random(-0.18, 0.18);
      this.el.classList.remove("is-shaped");
    }

    update(delta, bounds, pointer) {
      const dt = clamp(delta, 8, 34) / 16.67;
      this.twinklePhase += this.twinkleSpeed * delta;

      if (this.isInShape && this.targetX !== null && this.targetY !== null) {
        const stiffness = reducedMotion ? 0.012 : 0.018;
        const damping = reducedMotion ? 0.84 : 0.875;
        this.vx += (this.targetX - this.x) * stiffness * dt;
        this.vy += (this.targetY - this.y) * stiffness * dt;
        this.vx *= damping;
        this.vy *= damping;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      } else {
        const drift = this.freeSpeed * dt;
        this.driftAngle += 0.00018 * delta;
        this.x += Math.cos(this.driftAngle) * drift * 14 + this.vx * dt;
        this.y += Math.sin(this.driftAngle * 0.83) * drift * 8 + this.vy * dt;
        this.vx *= 0.992;
        this.vy *= 0.992;

        if (pointer.active) {
          const dx = this.x - pointer.x;
          const dy = this.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < pointer.radius && distance > 0.01) {
            const force = (1 - distance / pointer.radius) * 0.42;
            this.vx += (dx / distance) * force;
            this.vy += (dy / distance) * force;
          }
        }

        if (this.x < -24) this.x = bounds.width + 20;
        if (this.x > bounds.width + 24) this.x = -20;
        if (this.y < -24) this.y = bounds.height + 20;
        if (this.y > bounds.height + 24) this.y = -20;
      }
    }

    render() {
      const twinkle = 0.76 + Math.sin(this.twinklePhase) * 0.24;
      const opacity = clamp(this.opacity * twinkle + (this.isInShape ? 0.18 : 0), 0.2, 1);
      const scale = this.isInShape ? 1.28 + Math.sin(this.twinklePhase * 0.8) * 0.06 : 1;
      this.el.style.opacity = opacity.toFixed(3);
      this.el.style.setProperty("--opacity", opacity.toFixed(3));
      this.el.style.setProperty("--glow", (this.glow + (this.isInShape ? 0.3 : 0)).toFixed(3));
      this.el.style.transform = `translate3d(${this.x.toFixed(2)}px, ${this.y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
    }
  }

  class StarMorphEngine {
    constructor(stage, captionEl) {
      this.stage = stage;
      this.captionEl = captionEl;
      this.stars = [];
      this.width = 0;
      this.height = 0;
      this.lastTime = performance.now();
      this.rafId = null;
      this.currentShapeIndex = -1;
      this.timers = [];
      this.pointer = {
        active: false,
        x: 0,
        y: 0,
        radius: window.matchMedia("(max-width: 680px)").matches ? 84 : 140
      };
      this.sequence = [
        { key: "SDRA", generator: window.SidraShapes.generateSDRAPoints, delay: 20000, hold: 10000 },
        { key: "HEART", generator: window.SidraShapes.generateHeartPoints, delay: 50000, hold: 10000 },
        { key: "SIDRA", generator: window.SidraShapes.generateSIDRAPoints, delay: 52000, hold: 10000 },
        { key: "INFINITY", generator: window.SidraShapes.generateInfinityPoints, delay: 48000, hold: 10000 }
      ];
      this.onResize = this.onResize.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerLeave = this.onPointerLeave.bind(this);
      this.tick = this.tick.bind(this);
    }

    init() {
      this.onResize();
      this.createStars();
      this.bindEvents();
      this.rafId = requestAnimationFrame(this.tick);
    }

    bindEvents() {
      window.addEventListener("resize", this.onResize, { passive: true });
      window.addEventListener("pointermove", this.onPointerMove, { passive: true });
      window.addEventListener("pointerleave", this.onPointerLeave, { passive: true });
    }

    onPointerMove(event) {
      this.pointer.active = true;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
    }

    onPointerLeave() {
      this.pointer.active = false;
    }

    getStarCount() {
      const width = window.innerWidth;
      if (reducedMotion) return width < 640 ? 90 : 150;
      if (width < 390) return 125;
      if (width < 680) return 160;
      if (width < 1024) return 230;
      if (width < 1500) return 320;
      return 390;
    }

    getBoundsMeta() {
      const width = window.innerWidth;
      return {
        width: this.width,
        height: this.height,
        densityScale: width < 680 ? 0.86 : width > 1500 ? 1.14 : 1,
        motionScale: reducedMotion ? 0.18 : width < 680 ? 0.72 : 1
      };
    }

    createStars() {
      const targetCount = this.getStarCount();
      const bounds = this.getBoundsMeta();
      while (this.stars.length < targetCount) {
        this.stars.push(new MorphStar(this.stars.length, this.stage, bounds));
      }
      while (this.stars.length > targetCount) {
        const star = this.stars.pop();
        star.el.remove();
      }
    }

    onResize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.pointer.radius = this.width < 680 ? 84 : 140;
      this.createStars();
    }

    getShapeBounds() {
      const maxWidth = Math.min(this.width * 0.84, 980);
      const maxHeight = Math.min(this.height * (this.width < 640 ? 0.28 : 0.34), 330);
      const shapeWidth = maxWidth;
      const shapeHeight = Math.max(160, maxHeight);
      const x = (this.width - shapeWidth) / 2;
      const y = this.height * (this.width < 640 ? 0.27 : 0.28);
      return { x, y, width: shapeWidth, height: shapeHeight, padding: 10 };
    }

    convertPoints(points, bounds) {
      return points.map((point) => ({
        x: bounds.x + point.x,
        y: bounds.y + point.y
      }));
    }

    morphTo(shape) {
      const bounds = this.getShapeBounds();
      const localPoints = shape.generator(this.stars.length, {
        width: bounds.width,
        height: bounds.height,
        padding: bounds.padding
      });
      const points = this.convertPoints(localPoints, bounds);
      this.stars.forEach((star, index) => {
        const point = points[index % points.length];
        star.setTarget(point.x, point.y);
      });
      this.showCaption(window.SIDRA_SKY_CONTENT.morphCaptions[shape.key]);
    }

    release() {
      this.hideCaption();
      this.stars.forEach((star) => star.release());
    }

    showCaption(text) {
      this.captionEl.textContent = text;
      this.captionEl.classList.add("is-visible");
    }

    hideCaption() {
      this.captionEl.classList.remove("is-visible");
    }

    startSequence() {
      this.clearTimers();
      this.scheduleNext(0, this.sequence[0].delay);
    }

    scheduleNext(index, delay) {
      this.timers.push(
        window.setTimeout(() => {
          this.currentShapeIndex = index;
          const shape = this.sequence[index];
          this.morphTo(shape);
          this.timers.push(
            window.setTimeout(() => {
              this.release();
              const nextIndex = (index + 1) % this.sequence.length;
              this.scheduleNext(nextIndex, this.sequence[nextIndex].delay);
            }, shape.hold)
          );
        }, delay)
      );
    }

    triggerNextShape() {
      this.clearTimers();
      const nextIndex = (this.currentShapeIndex + 1) % this.sequence.length;
      this.currentShapeIndex = nextIndex;
      const shape = this.sequence[nextIndex];
      this.morphTo(shape);
      this.timers.push(
        window.setTimeout(() => {
          this.release();
          const following = (nextIndex + 1) % this.sequence.length;
          this.scheduleNext(following, this.sequence[following].delay);
        }, shape.hold)
      );
    }

    clearTimers() {
      this.timers.forEach((timer) => window.clearTimeout(timer));
      this.timers = [];
    }

    tick(time) {
      const delta = time - this.lastTime;
      this.lastTime = time;
      const bounds = this.getBoundsMeta();
      this.stars.forEach((star) => {
        star.update(delta, bounds, this.pointer);
        star.render();
      });
      this.rafId = requestAnimationFrame(this.tick);
    }

    destroy() {
      this.clearTimers();
      if (this.rafId) cancelAnimationFrame(this.rafId);
      window.removeEventListener("resize", this.onResize);
      window.removeEventListener("pointermove", this.onPointerMove);
      window.removeEventListener("pointerleave", this.onPointerLeave);
    }
  }

  window.MorphStar = MorphStar;
  window.StarMorphEngine = StarMorphEngine;
})();
