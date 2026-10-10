# Fase 2 — comparação de ajustes consolidados

A memória local agora distingue mudanças de composição de mudanças de contexto.
O resultado são candidatos a correção, sem atribuir aprovação e sem modificar
a pontuação ou as escolhas do algoritmo de layout.

## Comparação por formato

`learning-comparison.js` compara a versão atual com a geração mais recente do
mesmo formato. Registra diferenças proporcionais de posição e dimensão,
tamanho de fonte, rotação e alinhamento. Diferenças menores que `0.000001` em
geometria e `0.01` em fonte/rotação são ignoradas.

Cada comparação informa a geração de origem, as mudanças, o contexto e a
quantidade de candidatos elegíveis. Salvar e exportar guardam essas comparações
nos registros existentes. Salvar a mesma geometria depois de uma nova geração
representa uma observação vinculada à nova origem.

Conteúdo, estilo, estrutura, estado de bloqueio/visibilidade/grupo, regras,
fundo, planejamento e dimensões são verificados separadamente. Uma mudança
nesses contextos impede considerar os deslocamentos da composição como
candidatos a preferência, pois podem ser consequências da mudança de briefing.
Posições já manuais ou protegidas na geração inicial também não produzem
candidatos elegíveis. Sem origem ou conteúdo verificável, a comparação é
conservadora e não sugere uma correção confiável.

## Identidade do conteúdo

Textos usam assinaturas compactas para detectar substituições, inclusive com
o mesmo número de caracteres, sem armazenar a redação original na memória.
Essas assinaturas são detectores de alteração, não criptografia.

Cada imagem recebe um identificador de conteúdo associado ao objeto carregado.
Esse identificador é salvo nos assets do `.split` e registrado novamente na
decodificação. Assim, remapear o identificador interno do asset ao reabrir o
arquivo não equivale a trocar o conteúdo. Carregar uma substituição gera outra
identidade, mesmo quando suas dimensões são iguais. Reenviar o mesmo arquivo
como uma nova imagem também conta conservadoramente como substituição.

## Fluxo silencioso

As comparações correntes ficam em `learning.drafts`: uma versão consolidada por
formato, substituída a cada ajuste posterior. Não há registro por movimento de
mouse. A consolidação usa a recuperação já existente, após a pausa de edição e
fora do arraste, além dos pontos de salvamento e histórico do editor.

Desfazer/refazer restaura as comparações junto com as peças. Reverter os ajustes
até a geometria gerada remove o candidato corrente. Uma nova geração redefine
a origem e limpa os candidatos correntes apenas nos formatos regenerados.
Remover um formato também remove sua comparação corrente.

As exportações capturam sua origem e contexto ao começar. Uma geração posterior
durante a exportação não muda essa referência. Trocar de projeto durante uma
exportação impede acrescentar seu registro ao projeto novo.

## Persistência e compatibilidade

A memória usa versão 2; a memória da fase 1 migra preservando identificadores e
registros. Os históricos antigos não têm assinaturas de conteúdo suficientes
para inferir correções confiáveis; uma nova geração estabelece uma origem
completa. O `.split` continua na versão 7, com metadados opcionais de identidade
de conteúdo nos assets. As versões antigas do projeto continuam aceitas.

As comparações acompanham o `.split`, IndexedDB e recuperação automática.
Os limites de 40 registros, 512 KiB por projeto e 50 projetos locais permanecem.
Ao limitar o histórico, a retenção prioriza as gerações de origem ainda ativas.
Comparações cujo registro de origem foi descartado também são removidas. Se o
limite impedir manter uma origem, a próxima comparação não presume uma origem.

A consolidação de preferências foi acrescentada na fase 3, descrita em
`PHASE-3-PREFERENCES.md`, que também atualiza a memória para a versão 3.
A influência na geração pertence à fase 4. A interface não recebeu controles
adicionais.
