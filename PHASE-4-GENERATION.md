# Fase 4 — aplicação silenciosa na geração

As preferências locais agora influenciam a geração e o comando existente de
recalcular composição. A interface e as etapas do fluxo permanecem iguais.
Reabrir, renderizar ou recalcular conteúdo durante uma edição não aplica novos
ajustes de aprendizado. Não há serviço externo nem treinamento remoto.

## Escolha e ajustes limitados

`learning-layout.js` avalia alternativas próximas das composições normais.
A preferência deve estar ativa, pronta e ter confiança de pelo menos 0,5 no
mesmo contexto da geração. Preferências com três ou mais exemplos do projeto
têm prioridade sobre as gerais; se esses exemplos locais não sustentam o ajuste,
a preferência geral não o impõe. Nos demais casos, o modelo geral pode atender
um projeto novo, após a concordância de pelo menos três projetos locais.

O algoritmo continua produzindo suas composições normais e conserva a melhor
como alternativa de segurança. O aprendizado cria até três variações limitadas
por composição e acrescenta no máximo 0,6 à classificação. Uma alternativa
precisa manter a pontuação normal a até 0,35 da melhor composição original.
Essa pontuação continua sendo uma heurística de composição, não uma medida de
desempenho comercial ou aprovação do usuário.

Os ajustes máximos, antes de multiplicar pela confiança, são 2,5% do formato
em posição, 10% em escala da caixa ou fonte e 3 graus em rotação. As escalas de
caixas de imagem são uniformes para manter a proporção, sem mudar o encaixe.
Alinhamento usa a preferência categórica confirmada. Tentativas reduzidas são
avaliadas quando a variação completa não cabe com segurança.

## Restrições e fallback

Uma variação é descartada se causar colisões, exceder os limites dos cantos
rotacionados, impedir o texto de caber na fonte proposta ou exceder os limites
de fonte. Camadas manuais, bloqueadas, ocultas, agrupadas ou com conflitos não
recebem ajustes. Regras específicas de posicionamento, alinhamento, margens ou
largura impedem a personalização daquela camada.

Com planejamento ativo, posição, dimensões e rotação permanecem determinadas
pelo plano. Somente fonte e alinhamento de texto podem ser personalizados, com
as mesmas verificações de encaixe e colisões. Caixas planejadas de imagens
continuam exatas. Conteúdo ausente e conflitos existentes mantêm seus avisos.

Se não houver evidência suficiente, o contexto não corresponder, uma memória
for inválida ou todas as variações forem inseguras, o resultado normal permanece.
O modelo geral é consultado localmente antes da geração/recalcular; falhas de
armazenamento não impedem usar as preferências portáteis do projeto.

## Proteção contra realimentação

A geração registra quais métricas recebeu do aprendizado, como metadados
opcionais `applied` na observação de origem. Esses metadados acompanham a memória
no `.split` e na recuperação; não alteram as peças, assets ou exportações PNG/ZIP.

Confirmar uma peça personalizada sem corrigir uma dessas métricas não cria
outro exemplo positivo ou negativo para ela. Assim, repetir geração e exportação
não reforça nem enfraquece a preferência por causa do próprio ajuste automático.
Novos ajustes reais continuam sendo comparados com a composição efetivamente
gerada. Confirmações sem ajustes em métricas não personalizadas conservam o
comportamento anterior. Desfazer/refazer restaura origem, peças e preferências.

Rotações e alinhamentos automáticos guardam também o valor anterior na origem.
Ao recalcular, esses valores são recuperados antes de avaliar outra variação,
desde que o usuário não tenha alterado a métrica. Isso evita acumular o ajuste
automático a cada geração, inclusive depois de reabrir o arquivo.

A memória continua na versão 3 e o `.split` na versão 7, com campos opcionais
validados. Os limites de retenção da fase 3 permanecem. Os testes estão descritos
em `tests/README.md`.

A validação consolidada de compatibilidade, desempenho e qualidade está na
fase 5, descrita em `PHASE-5-VALIDATION.md`.
