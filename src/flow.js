/* Guided flow: progress through the steps, readability alerts per format and a review mode for phones. */
'use strict';
globalThis.SplitFlow = (() => {
  // Text smaller than this, in output pixels, is hard to read on most placements.
  const MIN_TEXT_PX = 10;
  const reviewQuery = window.matchMedia('(max-width: 760px)');
  const reviewKey = 'split.edit-on-phone';
  const measure = document.createElement('canvas').getContext('2d');
  let exported = false;

  function issues(out) {
    const found = [];
    for (const l of out.layers) {
      if (l.hidden || l.role === 'reference') continue;
      if (l.type !== 'image' && l.text) {
        const size = textMetrics(measure, l, out).size;
        if (size < MIN_TEXT_PX) found.push({ kind: 'small', text: `${l.name}: texto com ${size} px` });
      }
      const corners = rotatedCorners(l, out);
      const outside = corners.some(p => p.x < -0.005 || p.y < -0.005 || p.x > 1.005 || p.y > 1.005);
      if (outside) found.push({ kind: 'outside', text: `${l.name}: parte fora da peça` });
      else if (l.layoutConflict)
        found.push({ kind: 'overlap', text: `${l.name}: sobreposição ou fora da área planejada` });
    }
    return found;
  }

  function summary(list) {
    return list.length === 1 ? '1 alerta' : `${list.length} alertas`;
  }

  // Steps 1, 2, 4 and 5 are required; Layout is optional and never blocks progress.
  function steps() {
    const hasContent = sources.length > 0 || !!backgroundSource || solidBackgroundChosen;
    const formats = chosenFormats().length;
    const flagged = outputs.filter(out => issues(out).length).length;
    return [
      {
        id: 'elements',
        label: 'Elementos',
        done: hasContent,
        detail: sources.length
          ? `${sources.length} ${sources.length === 1 ? 'elemento' : 'elementos'}`
          : hasContent
            ? 'Só o fundo'
            : 'Adicione conteúdo'
      },
      {
        id: 'formats',
        label: 'Formatos',
        done: formats > 0,
        detail: formats
          ? `${formats} ${formats === 1 ? 'selecionado' : 'selecionados'}`
          : 'Escolha ao menos 1'
      },
      {
        id: 'layout',
        label: 'Layout',
        optional: true,
        done: true,
        detail: globalThis.SplitBlueprint?.enabled() ? 'Plano ativo · opcional' : 'Automático · opcional'
      },
      {
        id: 'review',
        label: 'Gerar e revisar',
        done: outputs.length > 0,
        warn: flagged > 0,
        detail: outputs.length
          ? `${outputs.length} peças${flagged ? ` · ${flagged} com alertas` : ''}`
          : 'Gere as composições'
      },
      { id: 'export', label: 'Exportar', done: exported, detail: 'PNG · ZIP · MP4' }
    ];
  }

  function renderSteps() {
    const list = $('flowSteps').querySelector('ol');
    const all = steps(),
      current = all.find(step => !step.done && !step.optional)?.id;
    list.replaceChildren(
      ...all.map((step, index) => {
        const item = document.createElement('li'),
          button = document.createElement('button');
        const state = step.id === current ? 'current' : step.done ? 'done' : 'todo';
        item.className = `flow-step is-${state}${step.optional ? ' is-optional' : ''}${step.warn ? ' has-warning' : ''}`;
        button.type = 'button';
        button.dataset.step = step.id;
        if (state === 'current') button.setAttribute('aria-current', 'step');
        const number = document.createElement('span'),
          text = document.createElement('span'),
          title = document.createElement('strong'),
          detail = document.createElement('small');
        number.className = 'flow-number';
        number.textContent = state === 'done' && !step.optional ? '✓' : String(index + 1);
        number.setAttribute('aria-hidden', 'true');
        title.textContent = step.label;
        detail.textContent = step.detail;
        text.append(title, detail);
        button.append(number, text);
        button.setAttribute(
          'aria-label',
          `Etapa ${index + 1}: ${step.label}. ${step.detail}.${state === 'done' ? ' Concluída.' : ''}`
        );
        button.onclick = () => go(step.id);
        item.append(button);
        return item;
      })
    );
  }

  // changed() fires on every pointer move while dragging; refresh the steps at most once per frame.
  let stepsFrame = 0;
  function scheduleSteps() {
    if (stepsFrame) return;
    stepsFrame = requestAnimationFrame(() => {
      stepsFrame = 0;
      renderSteps();
    });
  }

  function reveal(panelId, focusSelector) {
    const panel = $(panelId);
    if (panel.classList.contains('collapsed')) panel.querySelector('.panel-collapse').click();
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    panel.querySelector(focusSelector)?.focus({ preventScroll: true });
  }

  function go(id) {
    if (id === 'elements') reveal('panel-assets', '.asset-button');
    else if (id === 'formats') reveal('panel-formats', '#formats input');
    else if (id === 'layout') $('planLayout').click();
    else if (id === 'review') {
      if (outputs.length) setView('grid');
      else $('generate').click();
    } else if (id === 'export') {
      if (!outputs.length) {
        toast('Gere as composições antes de exportar.');
        return;
      }
      setView('grid');
      $('exportAll').focus();
    }
  }

  function reviewMode() {
    let editAnyway = false;
    try {
      editAnyway = sessionStorage.getItem(reviewKey) === '1';
    } catch {}
    return reviewQuery.matches && !editAnyway;
  }

  function applyReviewMode() {
    const active = reviewMode();
    document.body.classList.toggle('review-mode', active);
    $('reviewBanner').hidden = !active;
    if (active && !$('editor').hidden) setView('grid');
  }

  function decorateCards() {
    const review = document.body.classList.contains('review-mode');
    for (const card of $('cards').children) {
      const out = outputs.find(o => o.id === card.dataset.format);
      if (!out) continue;
      const list = issues(out),
        info = card.querySelector('.card-footer > div');
      if (list.length) {
        const badge = document.createElement('button');
        badge.type = 'button';
        badge.className = 'card-alerts';
        badge.textContent = `⚠ ${summary(list)}`;
        badge.title = list.map(issue => issue.text).join('\n');
        badge.setAttribute(
          'aria-label',
          `${out.name}: ${summary(list)}. ${list.map(i => i.text).join('. ')}`
        );
        badge.onclick = () => (review ? toast(list.map(i => i.text).join(' · ')) : openFormat(out.id));
        info.append(badge);
      }
      if (review) {
        const action = card.querySelector('.card-footer > button');
        action.textContent = 'Baixar PNG';
        action.onclick = () => {
          activeId = out.id;
          exportOne();
        };
        const preview = card.querySelector('.preview');
        preview.onclick = null;
        preview.setAttribute('aria-label', out.name);
        preview.tabIndex = -1;
      }
    }
  }

  function editorNotice() {
    const out = current(),
      notice = $('legibilityNotice');
    const list = out ? issues(out) : [];
    notice.hidden = !list.length;
    notice.textContent = list.length ? `⚠ ${summary(list)}: ${list.map(i => i.text).join(' · ')}` : '';
  }

  const priorCards = renderCards;
  renderCards = function () {
    priorCards();
    decorateCards();
  };
  const priorEditor = renderEditor;
  renderEditor = function () {
    priorEditor();
    editorNotice();
  };
  const projects = globalThis.SplitProjects;
  if (projects) {
    const prior = projects.changed;
    projects.changed = (...args) => {
      const result = prior(...args);
      scheduleSteps();
      return result;
    };
  }
  for (const id of ['exportAll', 'downloadOne', 'renderVideo'])
    $(id).addEventListener('click', () => {
      exported = true;
      scheduleSteps();
    });
  $('editOnPhone').onclick = () => {
    try {
      sessionStorage.setItem(reviewKey, '1');
    } catch {}
    applyReviewMode();
    renderCards();
  };
  reviewQuery.addEventListener('change', () => {
    applyReviewMode();
    renderCards();
  });
  applyReviewMode();
  renderCards();
  renderSteps();
  return { issues, steps, go, reviewMode, MIN_TEXT_PX };
})();
