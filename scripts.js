/* ============================================================
   scripts.js — Lógica interativa da página
   ============================================================ */

/**
 * Alterna entre abas da navegação
 * @param {string} id - ID da seção a exibir
 * @param {HTMLElement} btn - Botão clicado
 */
function mostrar(id, btn) {
  document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('ativo'));
  document.getElementById(id).classList.add('ativa');
  btn.classList.add('ativo');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Abre/fecha um card de vocabulário
 * @param {HTMLElement} el - Elemento clicado
 */
function toggle(el) {
  el.classList.toggle('aberto');
}

/**
 * Exibe/oculta caixa de dica ou gabarito em exercícios
 * @param {HTMLElement} btn - Botão clicado
 * @param {string} tipo - 'dica' ou 'gabarito'
 */
function mostrarBox(btn, tipo) {
  const q = btn.closest('.questao');
  const box = q.querySelector('.' + tipo + '-box');
  box.classList.toggle('visivel');
  const icon = tipo === 'dica' ? 'lightbulb' : 'check_circle';
  const label = box.classList.contains('visivel')
    ? 'Ocultar'
    : (tipo === 'dica' ? 'Dica' : 'Gabarito');

  btn.innerHTML = '<span class="icon-wrap"><span class="material-symbols-outlined ui-icon">' + icon + '</span><span>' + label + '</span></span>';
}

/**
 * Gera o calendário anual para o ano informado.
 * @param {number} ano - Ano do calendário
 * @param {string} alvoId - ID do elemento alvo
 */
function renderCalendario(ano, alvoId) {
  const alvo = document.getElementById(alvoId);
  if (!alvo) return;
  const feriados = obterFeriadosJundiaiSP(ano);

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const htmlMeses = meses.map((nomeMes, mesIndex) => {
    const primeiroDia = new Date(ano, mesIndex, 1).getDay();
    const totalDias = new Date(ano, mesIndex + 1, 0).getDate();
    const celulas = [];

    for (let i = 0; i < primeiroDia; i += 1) {
      celulas.push('');
    }
    for (let dia = 1; dia <= totalDias; dia += 1) {
      const dateId = ano + '-' + String(mesIndex + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
      const feriado = feriados[dateId] || '';
      const classeFeriado = feriado ? ' holiday' : '';
      const attrFeriado = feriado ? ' data-holiday="' + feriado + '"' : '';
      const iconeFeriado = feriado ? '<span class="day-holiday" aria-hidden="true">🎉</span>' : '';
      celulas.push(
        '<td class="calendar-day' + classeFeriado + '" data-date="' + dateId + '"' + attrFeriado + '>' +
        '<span class="day-num">' + dia + '</span>' +
        iconeFeriado +
        '<span class="day-note"></span>' +
        '</td>'
      );
    }
    while (celulas.length % 7 !== 0) {
      celulas.push('');
    }

    const linhas = [];
    for (let i = 0; i < celulas.length; i += 7) {
      const semana = celulas.slice(i, i + 7)
        .map(valor => valor ? valor : '<td></td>')
        .join('');
      linhas.push('<tr>' + semana + '</tr>');
    }

    const cabecalho = diasSemana.map(dia => '<th>' + dia + '</th>').join('');

    return (
      '<article class="calendar-month">' +
      '<h4>' + nomeMes + '</h4>' +
      '<table class="calendar-table">' +
      '<thead><tr>' + cabecalho + '</tr></thead>' +
      '<tbody>' + linhas.join('') + '</tbody>' +
      '</table>' +
      '</article>'
    );
  }).join('');

  alvo.innerHTML = htmlMeses;
  ativarAnotacoesCalendario(alvo);
}

/**
 * Ativa edição de anotações no calendário.
 * @param {HTMLElement} alvo - Container do calendário
 */
function ativarAnotacoesCalendario(alvo) {
  const chave = 'calendario-2026-anotacoes';
  const notas = carregarNotas(chave);
  const editor = criarEditorCalendario();
  let diaSelecionado = null;
  let dataSelecionada = '';

  function atualizarDia(celula, texto) {
    const notaEl = celula.querySelector('.day-note');
    if (!notaEl) return;
    notaEl.textContent = texto || '';
    celula.classList.toggle('has-note', Boolean(texto));
    const feriado = celula.dataset.holiday || '';
    const partesTitle = [];
    if (feriado) partesTitle.push('Feriado: ' + feriado);
    if (texto) partesTitle.push('Anotação: ' + texto);
    celula.title = partesTitle.join(' | ');
  }

  alvo.querySelectorAll('.calendar-day').forEach(celula => {
    const dateId = celula.dataset.date;
    atualizarDia(celula, notas[dateId] || '');

    celula.addEventListener('click', () => {
      diaSelecionado = celula;
      dataSelecionada = dateId;
      editor.titulo.textContent = 'Anotação - ' + formatarData(dateId);
      editor.textarea.value = notas[dateId] || '';
      editor.modal.classList.add('aberto');
      editor.textarea.focus();
    });
  });

  editor.salvar.addEventListener('click', () => {
    if (!diaSelecionado || !dataSelecionada) return;
    const texto = editor.textarea.value.trim();

    if (texto) {
      notas[dataSelecionada] = texto;
    } else {
      delete notas[dataSelecionada];
    }

    salvarNotas(chave, notas);
    atualizarDia(diaSelecionado, notas[dataSelecionada] || '');
    fecharEditor(editor);
  });

  editor.fechar.addEventListener('click', () => fecharEditor(editor));
  editor.cancelar.addEventListener('click', () => fecharEditor(editor));
  editor.modal.addEventListener('click', (evento) => {
    if (evento.target === editor.modal) {
      fecharEditor(editor);
    }
  });
}

/**
 * Cria o modal de edição de anotações do calendário.
 * @returns {{modal: HTMLElement, titulo: HTMLElement, textarea: HTMLTextAreaElement, salvar: HTMLButtonElement, cancelar: HTMLButtonElement, fechar: HTMLButtonElement}}
 */
function criarEditorCalendario() {
  const modal = document.createElement('div');
  modal.className = 'calendar-editor';
  modal.innerHTML =
    '<div class="calendar-editor-card">' +
    '<div class="calendar-editor-head">' +
    '<h4 class="calendar-editor-title">Anotação</h4>' +
    '<button type="button" class="calendar-editor-close" aria-label="Fechar">×</button>' +
    '</div>' +
    '<textarea class="calendar-editor-input" rows="5" placeholder="Digite sua anotação..."></textarea>' +
    '<div class="calendar-editor-actions">' +
    '<button type="button" class="subject-btn secondary calendar-editor-cancel">Cancelar</button>' +
    '<button type="button" class="subject-btn calendar-editor-save">Salvar</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(modal);

  return {
    modal,
    titulo: modal.querySelector('.calendar-editor-title'),
    textarea: modal.querySelector('.calendar-editor-input'),
    salvar: modal.querySelector('.calendar-editor-save'),
    cancelar: modal.querySelector('.calendar-editor-cancel'),
    fechar: modal.querySelector('.calendar-editor-close')
  };
}

/**
 * Fecha o modal do editor de calendário.
 * @param {{modal: HTMLElement}} editor - Estrutura do editor
 */
function fecharEditor(editor) {
  editor.modal.classList.remove('aberto');
}

/**
 * Carrega anotações do localStorage.
 * @param {string} chave - Chave de armazenamento
 * @returns {Object<string, string>}
 */
function carregarNotas(chave) {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : {};
  } catch (erro) {
    return {};
  }
}

/**
 * Salva anotações no localStorage.
 * @param {string} chave - Chave de armazenamento
 * @param {Object<string, string>} notas - Mapa de notas
 */
function salvarNotas(chave, notas) {
  localStorage.setItem(chave, JSON.stringify(notas));
}

/**
 * Formata data YYYY-MM-DD para DD/MM/YYYY.
 * @param {string} dateId - Data no formato ISO curto
 * @returns {string}
 */
function formatarData(dateId) {
  const partes = dateId.split('-');
  return partes[2] + '/' + partes[1] + '/' + partes[0];
}

/**
 * Retorna o mapa de feriados de Jundiaí/SP por data ISO (YYYY-MM-DD).
 * @param {number} ano - Ano de referência
 * @returns {Object<string, string>}
 */
function obterFeriadosJundiaiSP(ano) {
  if (ano !== 2026) return {};
  return {
    '2026-01-01': 'Confraternização Universal',
    '2026-04-03': 'Paixão de Cristo',
    '2026-04-21': 'Tiradentes',
    '2026-05-01': 'Dia do Trabalho',
    '2026-06-04': 'Corpus Christi',
    '2026-07-09': 'Revolução Constitucionalista de 1932',
    '2026-08-15': 'Padroeira de Jundiaí (Nossa Senhora do Desterro)',
    '2026-09-07': 'Independência do Brasil',
    '2026-10-12': 'Nossa Senhora Aparecida',
    '2026-11-02': 'Finados',
    '2026-11-15': 'Proclamação da República',
    '2026-11-20': 'Dia da Consciência Negra',
    '2026-12-25': 'Natal'
  };
}

/**
 * Atualiza badges da Home conforme conteúdo real das seções.
 * Se a seção tiver apenas placeholder, mantém "Em breve".
 * Se tiver conteúdo adicional, muda para "Disponível".
 */
function atualizarStatusMaterias() {
  const cards = document.querySelectorAll('#inicio .subject-card');

  cards.forEach((card) => {
    const botao = card.querySelector('.subject-btn');
    const badge = card.querySelector('.subject-badge');
    if (!botao || !badge) return;

    const onclick = botao.getAttribute('onclick') || '';
    const match = onclick.match(/mostrar\('([^']+)'/);
    const sectionId = match ? match[1] : '';
    if (!sectionId || sectionId === 'biologia') return;

    const secao = document.getElementById(sectionId);
    if (!secao) return;

    const placeholder = secao.querySelector('.placeholder-card');
    const temConteudoReal = !(placeholder && secao.children.length <= 2);

    if (temConteudoReal) {
      badge.textContent = 'Disponível';
      badge.classList.remove('neutro');
      botao.classList.remove('secondary');
      if (!botao.textContent.trim().toLowerCase().startsWith('abrir')) {
        botao.textContent = 'Abrir seção';
      }
    } else {
      badge.textContent = 'Em breve';
      badge.classList.add('neutro');
    }
  });
}

/**
 * Prepara abas internas movendo seções já existentes para dentro da matéria.
 * @param {string} parentId - ID da matéria principal
 * @param {string} shellId - ID do contêiner onde o conteúdo será renderizado
 * @param {string[]} paneIds - IDs das seções a mover
 * @param {string} paneClass - Classe CSS das abas internas
 */
function prepararAbasInternas(parentId, shellId, paneIds, paneClass) {
  const parent = document.getElementById(parentId);
  const shell = document.getElementById(shellId);
  if (!parent || !shell) return;

  paneIds.forEach((paneId) => {
    const pane = document.getElementById(paneId);
    if (!pane) return;

    pane.classList.remove('secao', 'ativa');
    pane.classList.add(paneClass);
    shell.appendChild(pane);
  });
}

/**
 * Alterna abas internas de uma matéria.
 * @param {string} sectionId - ID da matéria principal
 * @param {string} paneId - ID da aba a abrir
 * @param {HTMLElement} btn - Botão clicado
 * @param {string} paneClass - Classe das abas internas
 * @param {string} placeholderId - ID do placeholder inicial
 * @param {string} shellId - ID do contêiner de conteúdo
 */
function mostrarAbaMateria(sectionId, paneId, btn, paneClass, placeholderId, shellId) {
  const secao = document.getElementById(sectionId);
  if (!secao) return;

  secao.querySelectorAll('.' + paneClass).forEach((pane) => {
    pane.classList.remove('ativa');
  });

  secao.querySelectorAll('.hist-tab-card').forEach((tab) => {
    tab.classList.remove('ativa');
  });

  const destino = secao.querySelector('#' + paneId);
  if (destino) destino.classList.add('ativa');
  if (btn) btn.classList.add('ativa');

  const placeholder = secao.querySelector('#' + placeholderId);
  if (placeholder) placeholder.style.display = 'none';

  const shell = secao.querySelector('#' + shellId);
  if (shell) {
    shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

atualizarStatusMaterias();
renderCalendario(2026, 'calendario-2026');
prepararAbasInternas('biologia', 'bio-conteudo', ['vocabulario', '1lei', '2lei', 'especial', 'exercicios', 'videos'], 'bio-pane');
prepararAbasInternas('matematica', 'mat-conteudo', ['mat-vocabulario', 'mat-1-conteudo', 'mat-2-conteudo', 'mat-extras', 'mat-exercicios', 'mat-videos'], 'mat-pane');

/**
 * Alterna abas internas da seção de História.
 * @param {string} paneId - ID da aba interna
 * @param {HTMLElement} btn - Botão da aba
 */
function mostrarAbaHistoria(paneId, btn) {
  const secao = document.getElementById('historia');
  if (!secao) return;

  secao.querySelectorAll('.hist-pane').forEach((pane) => {
    pane.classList.remove('ativa');
  });

  secao.querySelectorAll('.hist-tab-card').forEach((tab) => {
    tab.classList.remove('ativa');
  });

  const destino = secao.querySelector('#' + paneId);
  if (destino) destino.classList.add('ativa');
  if (btn) btn.classList.add('ativa');

  const placeholder = secao.querySelector('#hist-placeholder');
  if (placeholder) placeholder.style.display = 'none';

  const shell = secao.querySelector('#hist-conteudo');
  if (shell) {
    shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Alterna abas internas da seção de Química.
 * @param {string} paneId - ID da aba interna
 * @param {HTMLElement} btn - Botão da aba
 */
function mostrarAbaQuimica(paneId, btn) {
  mostrarAbaMateria('quimica', paneId, btn, 'chem-pane', 'quim-placeholder', 'quim-conteudo');
}

/**
 * Alterna abas internas da seção de Biologia.
 * @param {string} paneId - ID da aba interna
 * @param {HTMLElement} btn - Botão da aba
 */
function mostrarAbaBiologia(paneId, btn) {
  mostrarAbaMateria('biologia', paneId, btn, 'bio-pane', 'bio-placeholder', 'bio-conteudo');
}

/**
 * Alterna abas internas da seção de Matemática.
 * @param {string} paneId - ID da aba interna
 * @param {HTMLElement} btn - Botão da aba
 */
function mostrarAbaMatematica(paneId, btn) {
  mostrarAbaMateria('matematica', paneId, btn, 'mat-pane', 'mat-placeholder', 'mat-conteudo');
}

/**
 * Alterna abas internas da seção de Física.
 * @param {string} paneId - ID da aba interna
 * @param {HTMLElement} btn - Botão da aba
 */
function mostrarAbaFisica(paneId, btn) {
  mostrarAbaMateria('fisica', paneId, btn, 'fis-pane', 'fis-placeholder', 'fis-conteudo');
}
