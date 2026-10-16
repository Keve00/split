/* Interface state that depends on several modules: generate readiness and the current view. */
'use strict';
(() => {
  const button = $('generate');
  // Mirrors the checks at the start of generate(); the click still runs it so the toast explains what is missing.
  function missing() {
    if (!sources.length && !backgroundSource && !solidBackgroundChosen)
      return 'Adicione um elemento ou escolha uma cor de fundo para gerar.';
    if (!chosenFormats().length) return 'Escolha ao menos um formato de saída.';
    return '';
  }
  function updateGenerate() {
    const reason = missing();
    button.setAttribute('aria-disabled', String(!!reason));
    button.title = reason || 'Gerar as composições nos formatos selecionados';
  }
  // Panels that only apply to one format say so in the overview instead of showing stale layers.
  function updateView() {
    document.body.dataset.view = $('overview').hidden ? 'edit' : 'grid';
  }
  const projects = globalThis.SplitProjects;
  if (projects) {
    const prior = projects.changed;
    projects.changed = (...args) => {
      const result = prior(...args);
      updateGenerate();
      updateView();
      return result;
    };
  }
  new MutationObserver(updateView).observe($('overview'), { attributes: true, attributeFilter: ['hidden'] });
  $('defaultBgColor').addEventListener('input', () => requestAnimationFrame(updateGenerate));
  updateGenerate();
  updateView();
})();
