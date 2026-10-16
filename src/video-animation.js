/* Shared by the Split preview and exported Hyperframes compositions. */
'use strict';
(() => {
  function rebuild() {
    window.SplitVideoTimeline?.kill();
    const root = document.querySelector('[data-composition-id]');
    const duration = Number(root.dataset.duration);
    const tl = gsap.timeline({ paused: true });
    const layers = [...root.querySelectorAll('.video-layer')];
    layers.forEach(layer => {
      const start = Number(layer.dataset.start);
      const a = JSON.parse(layer.dataset.animation);
      const vertical = a.direction === 'up' || a.direction === 'down';
      const distance = (Number(root.dataset[vertical ? 'height' : 'width']) * a.distance) / 100;
      const displacement = {
        [vertical ? 'y' : 'x']: distance * (['up', 'left'].includes(a.direction) ? 1 : -1)
      };
      const resting = { scaleX: 1, scaleY: 1, x: 0, y: 0, rotation: 0, opacity: a.opacity };
      const from = { ...resting, opacity: 0, scaleX: a.scale, scaleY: a.scale, rotation: a.rotation };
      if (['slide', 'bounce'].includes(a.enter)) Object.assign(from, displacement);
      if (a.enter === 'spin') from.rotation = a.rotation - 360;
      if (a.enter === 'stretch') Object.assign(from, { scaleX: a.scale * 1.4, scaleY: a.scale * 0.4 });
      if (a.enter === 'expand') Object.assign(from, { scaleX: a.scale * 0.05, scaleY: a.scale });
      tl.set(layer, { ...resting, opacity: 0 }, 0);
      if (a.enter === 'none') tl.set(layer, resting, start);
      else if (a.enter === 'swing') {
        tl.fromTo(
          layer,
          from,
          {
            ...resting,
            rotation: -a.rotation * 0.4,
            duration: a.entryDuration * 0.55,
            ease: 'power2.out',
            immediateRender: false
          },
          start
        );
        tl.to(
          layer,
          { rotation: 0, duration: a.entryDuration * 0.45, ease: 'sine.inOut' },
          start + a.entryDuration * 0.55
        );
      } else
        tl.fromTo(
          layer,
          from,
          {
            ...resting,
            duration: a.entryDuration,
            ease:
              a.enter === 'pop' || a.enter === 'stretch'
                ? 'back.out(1.7)'
                : a.enter === 'bounce'
                  ? 'bounce.out'
                  : a.ease,
            immediateRender: false
          },
          start
        );
      if (a.exit !== 'none') {
        const to = {
          opacity: 0,
          scaleX: a.exitScale,
          scaleY: a.exitScale,
          duration: a.exitDuration,
          ease: 'power1.in'
        };
        if (a.exit === 'slide') for (const [axis, value] of Object.entries(displacement)) to[axis] = -value;
        if (a.exit === 'spin') to.rotation = 360 + a.rotation;
        if (a.exit === 'stretch') Object.assign(to, { scaleX: a.exitScale * 1.4, scaleY: a.exitScale * 0.4 });
        if (a.exit === 'expand') Object.assign(to, { scaleX: a.exitScale * 0.05, scaleY: a.exitScale });
        if (a.exit === 'swing') {
          tl.to(
            layer,
            { rotation: -a.rotation * 0.4, duration: a.exitDuration * 0.35, ease: 'sine.inOut' },
            a.end - a.exitDuration
          );
          tl.to(
            layer,
            { ...to, rotation: a.rotation, duration: a.exitDuration * 0.65 },
            a.end - a.exitDuration * 0.65
          );
        } else tl.to(layer, to, a.end - a.exitDuration);
      }
      // Hide at the end even without an exit, and keep backward seeking deterministic.
      if (a.end < duration) tl.set(layer, { opacity: 0 }, a.end);
    });
    // Explicit hold keeps composition duration independent of layer count.
    tl.to({}, { duration: 0.01 }, duration - 0.01);
    window.SplitVideoTimeline = tl;
    if (window.__timelines) window.__timelines['split-video'] = tl;
    tl.seek(0);
    return tl;
  }
  window.SplitVideoRebuild = rebuild;
  window.SplitVideoReady = Promise.all([...document.images].map(img => img.decode()));
  rebuild();
})();
