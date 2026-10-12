'use strict';
/* Shared composition contract for browser preview, ZIP and server rendering. */
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SplitVideoComposition = api;
})(globalThis, () => {
  const escape = value => String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function html(data, previewBase = '') {
    const {w,h,duration,motion,layers} = data;
    const base = previewBase ? `<base href="${escape(previewBase)}">` : '';
    const markup = layers.map((layer,i)=>`<img id="layer-${i}" ${i?'class="clip video-layer"':'class="clip"'} data-start="${layer.start}" data-duration="${duration-layer.start}" data-track-index="${i}" src="${escape(previewBase?layer.url:layer.path)}" alt="${escape(layer.name)}">`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=${w},height=${h}">${base}<style>*{box-sizing:border-box}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}#split-video{width:${w}px;height:${h}px;position:relative;overflow:hidden}img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform-origin:center}</style><script src="vendor/gsap.min.js"></script></head><body><div id="split-video" data-composition-id="split-video" data-start="0" data-duration="${duration}" data-width="${w}" data-height="${h}" data-motion="${motion}">${markup}</div><script src="video-animation.js"></script><script>window.__timelines = {"split-video": window.SplitVideoTimeline};</script></body></html>`;
  }
  return {html};
});
