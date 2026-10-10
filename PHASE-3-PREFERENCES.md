# Fase 3 — preferências locais por contexto

O aprendizado agora consolida as correções confirmadas em preferências do
projeto e do navegador. Tudo acontece localmente, sem controles adicionais,
requisições externas ou alterações no fluxo de edição. As preferências
passaram a influenciar a geração na fase 4, descrita em `PHASE-4-GENERATION.md`.

## Evidências e confiança

`learning-preferences.js` consolida posição, dimensões relativas, escala da
fonte, rotação e alinhamento. O contexto inclui versão do algoritmo, proporção
do formato, uso de planejamento, papel e tipo da camada, quantidade de elementos,
faixa de tamanho do texto, proporção da imagem, alinhamento inicial e regras.
Textos completos e imagens não são copiados para esse modelo.

Apenas salvar ou exportar confirma uma observação. Ajustes pendentes não elevam
a confiança. Exportar recebe peso 0,6 e salvar recebe 0,4: são sinais indiretos,
não aprovação explícita nem dados de desempenho dos anúncios.

Cada geração fornece no máximo um exemplo por contexto e métrica, mesmo com
vários formatos ou camadas. A confirmação mais recente substitui a anterior;
salvar/exportar repetidamente não aumenta o número de exemplos. Correções
contraditórias e confirmações sem ajustes também entram no cálculo e podem
reduzir a confiança. Mudanças de conteúdo, estilo, regras ou planejamento não
são interpretadas como preferências de composição.

O modelo do projeto exige pelo menos três gerações independentes e confiança
de 0,5 para marcar uma preferência como pronta; sua confiança tem teto de 0,75.
O modelo geral exige pelo menos três projetos independentes e usa teto de 0,9.
Cada projeto contribui com peso máximo de 1 por contexto e métrica, impedindo
que um projeto muito editado domine os demais.

## Portabilidade e memória geral

A memória passa à versão 3 e aceita as versões 1 e 2. Uma sequência de eventos
mantém a ordem das confirmações sem depender do relógio. A abertura recalcula
as estatísticas; valores derivados recebidos no arquivo não são aceitos como
confiança pronta. A versão do `.split` permanece 7.

O projeto guarda evidências compactas e seu modelo junto às peças, no `.split`,
na recuperação e no histórico de desfazer/refazer. Evidências compactas podem
continuar úteis depois que registros brutos antigos forem descartados.

O IndexedDB `split-learning` passa à versão 2, com `projects`, `contributions`
e `general`. Certificados locais registram quais confirmações ocorreram neste
navegador e não são incluídos no `.split`. Importar um arquivo mantém seu
aprendizado próprio, mas não promove automaticamente o histórico importado ao
modelo geral. Salvar/exportar depois da importação autoriza apenas a confirmação
atual. Reabrir ou importar repetidamente não multiplica contribuições.

Desfazer remove a contribuição ativa e refazer restaura a mesma evidência.
Falhas de download restauram também as contribuições gerais. As atualizações
dos três armazenamentos ocorrem na mesma transação; a expulsão de um projeto
antigo remove sua contribuição e recalcula o modelo geral.

## Limites e fluidez

Permanecem os limites de 40 registros brutos, 512 KiB por projeto e 50 projetos
locais. Há até 128 evidências compactas, limitadas a 128 KiB, 128 preferências por
projeto e 256 preferências gerais. Certificados locais também têm retenção
limitada. O modelo geral não acompanha o arquivo do projeto.

A consolidação ocorre nos pontos de confirmação, sem trabalho por movimento
do mouse. Gravações locais continuam assíncronas e enfileiradas. Se o IndexedDB
estiver indisponível, edição e download continuam funcionando e as preferências
do projeto permanecem na sessão e no arquivo salvo.

Os testes e comandos de execução estão em `tests/README.md`.
