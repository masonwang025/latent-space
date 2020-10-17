const DURATION = 15;
const TOTAL = 30;
const PXRT = window.devicePixelRatio;

const MOUSE = {
  x: 0,
  y: 0,
  init: function () {
    window.addEventListener("mousemove", MOUSE.onMouseMove, false);
    window.addEventListener("touchmove", MOUSE.onMouseMove, false);
  },
  onMouseMove: function (_e) {
    var e = MOUSE.unify(_e);
    MOUSE.x = e.x + 380;
    MOUSE.y = e.y + 190;
  },
  unify: function (e) {
    return e.changedTouches ? e.changedTouches[0] : e;
  },
};

const dist = function (x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
};

const constrain = function (n, low, high) {
  return Math.max(Math.min(n, high), low);
};

const map = function (n, start1, stop1, start2, stop2, withinBounds) {
  var newval = ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
  if (!withinBounds) {
    return newval;
  }
  if (start2 < stop2) {
    return constrain(newval, start2, stop2);
  } else {
    return constrain(newval, stop2, start2);
  }
};

var RAF = {
  elements: [],
  init: function () {
    this.animate();
  },
  add: function (obj) {
    this.elements.push(obj);
  },
  remove: function (obj) {
    var index = this.elements.indexOf(obj);
    this.elements.splice(index, 1);
  },
  animate: function () {
    requestAnimationFrame(RAF.animate);
    RAF.render();
  },
  render: function () {
    var time = new Date().getTime() * 0.005;
    for (var index = 0; index < this.elements.length; index++) {
      var element = this.elements[index];
      element.render(time);
    }
  },
};

class Vector {
  constructor(_x, _y) {
    this.x = _x;
    this.y = _y;
    this.x0 = this.x;
    this.y0 = this.y;
    this.vibe = 0.42;
  }
  curveTo(to) {
    return {
      x: (this.x + to.x) / 2,
      y: (this.y + to.y) / 2,
    };
  }

  draw(ctx, to, delta) {
    if (delta) this.vibrate(delta);
    var ep = this.curveTo(to);
    ctx.quadraticCurveTo(this.x, this.y, ep.x, ep.y);
  }

  vibrate(delta) {
    this.x -= Math.cos(delta) * this.vibe;
    this.y += Math.sin(delta) * this.vibe;
    this.repulse();
  }

  repulse() {
    var limit = 1000;
    var force = 0.2;
    var force2 = 1;
    var dx = MOUSE.x - this.x;
    var dy = MOUSE.y - this.y;
    var angle = Math.atan2(dx, dy);
    var dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
    var displacement = limit / dist;
    this.x -= Math.sin(angle) * displacement * force2; // force
    this.y -= Math.cos(angle) * displacement * force2; // force
    this.x += (this.x0 - this.x) * force;
    this.y += (this.y0 - this.y) * force;
  }
}

class Blob {
  constructor(args) {
    this.diameter = args.diameter;
    this.diameter0 = this.diameter;
    this.sides = args.sides;
    this.center = args.center;
    this.vertexs = [];
    this.canvas = args.canvas;
    this.alpha = args.alpha;
    this.alpha0 = this.alpha;
    this.maxDiameter = args.maxDiameter;
    this.dps = (Math.PI * 2) / this.sides;

    let angle, _d, x, y, _v, _lW;
    this.vertexs = [];

    for (let idx = 0; idx < this.sides; idx++) {
      angle = this.dps * idx;

      _d =
        idx % 4 === 0
          ? map(
              this.diameter,
              0,
              this.maxDiameter,
              this.diameter,
              this.diameter * 0.75
            )
          : this.diameter;
      x = Math.sin(angle) * _d + this.center.x;
      y = Math.cos(angle) * _d + this.center.y;
      _v = new Vector(x, y);
      this.vertexs.push(_v);
    }
  }

  onResize(_center, _max) {
    this.center = _center;
    this.maxDiameter = _max;
  }

  render(time, ctx, isCenter = false, randoms) {
    let _alpha = isCenter ? 1 : 0;

    let _rgb = Math.abs(Math.sin(this.diameter / 150 - time / 4));
    let _rcanal = map(_rgb, 0, 1, 0, 20);
    let _gcanal = map(_rgb, 0, 1, 69, 63);
    let _bcanal = map(_rgb, 0, 1, 50, 122);

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${_rcanal}, ${_gcanal}, ${_bcanal}, ${_alpha})`;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    let _lW = Math.abs(Math.sin(this.diameter / TOTAL - time) + 10);
    ctx.lineWidth = _lW;
    var _current = this.vertexs[this.vertexs.length - 1];
    var _next = this.vertexs[0];
    var _first = this.vertexs[0];
    var _start = _current.curveTo(_next);
    ctx.moveTo(_start.x, _start.y);
    for (let ix = 1; ix < this.vertexs.length; ix++) {
      _current = this.vertexs[ix];
      _next.draw(ctx, _current, time + ix * 2);
      _next = _current;
    }
    _next.draw(ctx, _first, time * 2);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

class App {
  constructor() {
    this.sides = 18;
    this.blobs = [];
  }
  initApp() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.main = document.querySelector("#waves-hero2");
    this.main.appendChild(this.canvas);
    this.onResize();

    this.center = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
    };
    let _delay = DURATION / TOTAL;
    for (var i = 0; i < TOTAL; i++) {
      let args = {
        diameter: this.diameter * i,
        sides: this.sides,
        center: this.center,
        canvas: this.canvas,
        alpha: 0.7,
        maxDiameter: this.maxDiameter,
      };
      let _blob = new Blob(args);
      this.blobs.push(_blob);
    }
    let argsCenterBlob = {
      diameter: 20,
      sides: this.sides,
      center: this.center,
      canvas: this.canvas,
      alpha: 1,
      maxDiameter: this.maxDiameter,
    };
    this.centerBlob = new Blob(argsCenterBlob);
    this.addEvents();
  }

  addEvents() {
    window.addEventListener("resize", (e) => this.onResize(e), false);
  }

  onResize(e) {
    this.bounds = this.main.getBoundingClientRect();
    this.maxDiameter =
      (Math.sqrt(
        Math.pow(this.bounds.width / 2, 2) + Math.pow(this.bounds.height / 2, 2)
      ) +
        200) *
      PXRT;
    this.diameter = this.maxDiameter / TOTAL;
    this.canvas.style.width = `${this.bounds.width}px`;
    this.canvas.style.height = `${this.bounds.height}px`;
    this.canvas.width = this.bounds.width * PXRT;
    this.canvas.height = this.bounds.height * PXRT;
    this.center = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
    };
    this.center = {
      x: this.bounds.width / 2,
      y: this.bounds.height / 2,
    };
    this.blobs.forEach((el, idx) => {
      el.onResize(this.center, this.maxDiameter);
    });
  }

  render(time) {
    // Create gradient
    var grd = this.ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      0,
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.maxDiameter
    );

    grd.addColorStop(0, "#001d38");
    grd.addColorStop(1, "#000");
    // Fill with gradient
    this.ctx.fillStyle = grd;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.blobs.forEach((el, idx) => {
      let randoms = [];
      for (let idx2 = 0; idx2 < el.sides; idx2++) {
        randoms[idx2] = Math.random() * 2;
      }
      el.render(time, this.ctx, true, randoms);
      el.diameter += 1;
    });

    this.centerBlob.render(time, this.ctx);
    this.ctx.fill();
  }
}

window.addEventListener(
  "DOMContentLoaded",
  () => {
    const app = new App();
    app.initApp();
    RAF.init();
    RAF.add(app);
  },
  false
);
