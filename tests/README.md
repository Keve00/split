# Testes do Split

Testes de lógica e compatibilidade, usando Node.js:

```sh
node tests/validate.cjs
```

Teste de integração da memória em Chrome isolado, com Playwright disponível:

```sh
node tests/memory-browser.cjs
node tests/preferences-browser.cjs
node tests/learning-layout-browser.cjs
node tests/evaluation-browser.cjs
```

O teste inicia e encerra seu próprio servidor em `127.0.0.1`, usa perfis temporários
e não acessa campanhas, dados ou perfis pessoais. O caminho padrão do Chrome é
`C:/Program Files/Google/Chrome/Application/chrome.exe`; use `SPLIT_CHROME_PATH`
para outro caminho. Se Playwright não estiver no projeto, configure `NODE_PATH`
para a pasta que contém o pacote.

O teste cobre download real de `.split`, recuperação após recarga, transferência
entre contextos isolados, desfazer/refazer, deduplicação, exportação PNG/ZIP,
limites de retenção, falhas de salvamento/armazenamento e troca de projeto durante
uma exportação. As imagens são geradas em memória pelo exemplo do aplicativo.

Também cobre arrastar uma peça com o mouse, comparação de correções,
desfazer/refazer dos ajustes, troca de texto com o mesmo tamanho, identidade de
imagens após remapeamento, substituição real de imagem e recuperação das
comparações ainda não salvas manualmente. `comparison.test.cjs` testa isolamento
por formato, contexto de planejamento, limites de precisão, regras e conteúdo.

`preferences.test.cjs` cobre confiança gradual, deduplicação por geração,
contradições, confirmação sem ajuste, isolamento por contexto, limites, migração,
portabilidade, certificados locais e agregação entre projetos independentes.
`preferences-browser.cjs` verifica esses modelos com geração, edição, download,
recarga e importação reais, além de desfazer/refazer, falhas de download,
expulsão de projetos antigos, atualização do IndexedDB e armazenamento negado.

`learning-layout.test.cjs` cobre aplicação gradual, prioridade do projeto,
fallback, isolamento por contexto, proteção das camadas, limites rotacionados,
colisões, proporção das imagens, texto, planejamento e proteção contra aprender
com os próprios ajustes automáticos. `learning-layout-browser.cjs` verifica
recalcular, exportar, salvar, importar, recuperar e desfazer/refazer reais, uso
da memória geral em um projeto novo e funcionamento com IndexedDB negado.

Para executar todos os testes de lógica e as quatro suítes do navegador:

```sh
node tests/validate.cjs --full
```

`evaluation.test.cjs` avalia projetos sintéticos reservados, compatibilidade de
versões e metadados inválidos. `evaluation-browser.cjs` repete a avaliação com
fontes reais, mede modelos no limite de retenção e verifica o arraste com histórico
grande. A magnitude dos ajustes restantes e a quantidade de casos com correção
são métricas separadas; a pontuação interna não comprova melhoria de qualidade.
Os relatórios ficam em `tests/results/`. Critérios e limites estão descritos em
`PHASE-5-VALIDATION.md`. Os dados são sintéticos; nenhum arquivo pessoal é usado.
