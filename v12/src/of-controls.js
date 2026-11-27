// Geometry and drag behavior follow ofApp::drawV11UI/updateRotate.
export function paintMeter(value) {
  const fraction = value / 9;
  const points = [];
  for (let i = 0; i <= 80; i++) {
    const t = Math.min(i / 80, fraction);
    const angle = (135 + 270 * t) * Math.PI / 180;
    points.push(`${points.length ? 'L' : 'M'}${45 + 25 * Math.cos(angle)},${51 + 25 * Math.sin(angle)}`);
    if (i / 80 >= fraction) break;
  }
  document.getElementById('meter-arc').setAttribute('d', points.join(' '));
  const angle = (135 + 270 * fraction) * Math.PI / 180;
  const needle = document.getElementById('meter-needle');
  needle.setAttribute('x2', 45 + 19 * Math.cos(angle));
  needle.setAttribute('y2', 51 + 19 * Math.sin(angle));
}

export function setupOFControls(choose, selected) {
  const dial = document.getElementById('meter-dial');
  let drag;
  dial.addEventListener('pointerdown', event => {
    event.preventDefault();
    dial.focus();
    const box = document.getElementById('meter-knob').getBoundingClientRect();
    const dx = event.clientX - box.left - 45;
    const dy = event.clientY - box.top - 51;
    const radius = Math.hypot(dx, dy);
    let value = selected() / 9;
    if (radius > 6 && radius < 36) {
      let angle = Math.atan2(dy, dx);
      if (angle < Math.PI * .75) angle += Math.PI * 2;
      value = Math.max(0, Math.min(1, (angle - Math.PI * .75) / (Math.PI * 1.5)));
    }
    drag = { y: event.clientY, value };
    dial.setPointerCapture(event.pointerId);
    choose(Math.round(value * 9));
  });
  dial.addEventListener('pointermove', event => {
    if (!drag) return;
    const value = Math.max(0, Math.min(1, drag.value + (drag.y - event.clientY) / 240));
    choose(Math.round(value * 9));
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    dial.addEventListener(name, () => { drag = null; });
  }
  for (const button of document.querySelectorAll('.collapse')) {
    button.onclick = () => {
      const collapsed = button.closest('.gui').classList.toggle('collapsed');
      button.textContent = collapsed ? '+' : '−';
      button.setAttribute('aria-expanded', !collapsed);
    };
  }
  const speaker = '<svg viewBox="0 0 32 28" aria-hidden="true"><path d="M5 11h4l5-4v14l-5-4H5z" fill="currentColor"/><g class="waves" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 9q5 5 0 10M22 6q8 8 0 16"/></g><path class="mute-cross" d="m19 10 8 8m0-8-8 8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  document.getElementById('jing').innerHTML = speaker;
  const volume = document.getElementById('volume');
  const fillVolume = () => volume.parentElement.style.setProperty('--fill', `${volume.value * 100}%`);
  volume.addEventListener('input', fillVolume);
  fillVolume();
  paintMeter(selected());
}
