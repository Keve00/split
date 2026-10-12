/* Shared by the Split preview and exported Hyperframes compositions. */
'use strict';
(() => {
  const root = document.querySelector('[data-composition-id]');
  const duration = Number(root.dataset.duration);
  const motion = root.dataset.motion;
  const tl = gsap.timeline({paused: true});
  const layers = [...root.querySelectorAll('.video-layer')];
  layers.forEach((layer, i) => {
    const start = Number(layer.dataset.start);
    const from = motion === 'zoom' ? {scale: .92, opacity: 0} :
      motion === 'slide' ? {y: Number(root.dataset.height) * .035, opacity: 0} : {opacity: 0};
    tl.fromTo(layer, from, {scale: 1, y: 0, opacity: 1, duration: .7, ease: 'power3.out'}, start);
  });
  // Explicit hold keeps composition duration independent of layer count.
  tl.to({}, {duration: .01}, duration - .01);
  window.SplitVideoTimeline = tl;
  window.SplitVideoReady = Promise.all([...document.images].map(img => img.decode()));
  tl.seek(0);
})();
