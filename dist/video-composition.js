'use strict';
/* Shared composition contract for browser preview, ZIP and server rendering. */
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SplitVideoComposition = api;
})(globalThis, () => {
  const escape = value => String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const choices = {
    enter:['slide','fade','zoom','pop','rotate','bounce','spin','swing','stretch','expand','none'], exit:['none','fade','slide','zoom','spin','swing','stretch','expand'],
    direction:['up','down','left','right'], ease:['power3.out','power1.out','none','back.out(1.7)','bounce.out']
  };
  // One bounded contract for the inspector, portable project and render server.
  function animation(layer, duration, motion = 'slide', strict = false) {
    const raw = layer.animation || {};
    if (strict && (typeof raw !== 'object' || Array.isArray(raw))) throw Error('Animação inválida.');
    const select = (key, fallback) => {
      if (raw[key] === undefined) return fallback;
      if (choices[key].includes(raw[key])) return raw[key];
      if (strict) throw Error(`Opção de animação inválida: ${key}.`);
      return fallback;
    };
    const number = (key, fallback, min, max) => {
      const value = raw[key] === undefined ? fallback : raw[key];
      if (strict && (!Number.isFinite(value) || value < min-1e-6 || value > max+1e-6)) throw Error(`Valor de animação inválido: ${key}.`);
      return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
    };
    const start = Math.min(duration - .1, Math.max(0, layer.start || 0));
    const end = number('end', duration, start + .1, duration);
    const exit = select('exit','none');
    const enter = select('enter', choices.enter.includes(motion) ? motion : 'slide');
    const span = end - start;
    const exitDuration = number('exitDuration', .5, .05, duration);
    const entryDuration = number('entryDuration', .7, .05, duration);
    return {
      enter, exit,
      direction:select('direction','up'), ease:select('ease','power3.out'), end,
      entryDuration:Math.min(entryDuration, exit === 'none' ? span : span / 2),
      exitDuration:Math.min(exitDuration, span / 2),
      distance:number('distance', 4, 0, 100), scale:number('scale', ['zoom','pop','rotate','spin'].includes(enter)?.85:1, .1, 2),
      exitScale:number('exitScale',exit==='zoom'?(raw.scale??.85):1,.1,2),
      rotation:number('rotation', enter==='swing'||exit==='swing'?25:enter==='rotate'?15:0, -180, 180), opacity:number('opacity', 1, .1, 1),
      originX:number('originX', 50, 0, 100), originY:number('originY', 50, 0, 100)
    };
  }
  function html(data, previewBase = '') {
    const {w,h,duration,motion,layers} = data;
    const base = previewBase ? `<base href="${escape(previewBase)}">` : '';
    const markup = layers.map((layer,i)=>{
      const a = animation(layer,duration,motion);
      return `<img id="layer-${i}" ${i?'class="clip video-layer"':'class="clip"'} data-start="${layer.start}" data-duration="${(i?a.end:duration)-layer.start}" data-track-index="${i}" data-animation="${escape(JSON.stringify(a))}" style="${i?'opacity:0;':''}transform-origin:${a.originX}% ${a.originY}%" src="${escape(previewBase?layer.url:layer.path)}" alt="${escape(layer.name)}">`;
    }).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=${w},height=${h}">${base}<style>*{box-sizing:border-box}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}#split-video{width:${w}px;height:${h}px;position:relative;overflow:hidden}img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform-origin:center}</style><script src="vendor/gsap.min.js"></script></head><body><div id="split-video" data-composition-id="split-video" data-start="0" data-duration="${duration}" data-width="${w}" data-height="${h}" data-motion="${motion}">${markup}</div><script src="video-animation.js"></script><script>window.__timelines = {"split-video": window.SplitVideoTimeline};</script></body></html>`;
  }
  return {html, animation, choices};
});
