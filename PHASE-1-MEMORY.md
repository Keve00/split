# Fase 1 — registros locais e portabilidade

Implementação da base do aprendizado silencioso. A seleção e a pontuação dos
layouts continuam usando o algoritmo existente. Não há controles adicionais.

## Registros

`learning-memory.js` mantém uma memória versionada com `projectId`, `revisionId`
e registros com identificadores próprios. Geração, reorganização, carregamento
do exemplo e aplicação de adaptação registram as composições resultantes.
Salvar projeto e exportar registram as versões utilizadas; repetições da mesma
composição para a mesma ação são deduplicadas dentro do histórico retido.
Esses eventos são observações, sem inferir aprovação ou preferência nesta fase.

Os registros contêm formato, composição, presença de planejamento, geometria
proporcional, tipo/papel de cada camada, tamanho do texto, proporção da imagem,
alinhamento, rotação e estado de edição. Não contêm textos completos, nomes,
imagens nem arquivos duplicados. Cada registro informa a versão do algoritmo.
Falhas de salvamento e exportação não acrescentam observações de sucesso.

## Persistência

- O `.split` versão 7 e a recuperação local incluem `learning`.
- Versões 1 a 6 continuam aceitas e recebem uma memória vazia com identificadores
  novos. Salvar o arquivo migrado torna esses identificadores portáveis; abrir
  novamente o arquivo antigo original inicia outra migração.
- A base IndexedDB `split-learning` guarda uma cópia da memória de até 50 projetos,
  separada da recuperação `split-projects`.
- Cada projeto retém até 40 registros e 512 KiB de metadados. Os registros mais
  antigos são removidos primeiro. Até 50 projetos representam cerca de 25 MiB
  de metadados serializados, além do overhead do navegador.
- O arquivo aberto é a referência para a memória daquele projeto. O histórico
  do navegador não sobrescreve nem mescla automaticamente versões importadas.
- Desfazer/refazer restaura a memória junto com o estado do editor, inclusive ao
  alternar projetos. Não cria outra observação de geração.
- PNG e ZIP de imagens não incorporam metadados de aprendizado.

Dados de memória inválidos ou de versão desconhecida são descartados, preservando
um identificador de projeto válido quando possível. A validação normal do projeto
e dos assets continua obrigatória. Falhas de IndexedDB são isoladas e não impedem
geração, edição ou download; nesse caso a memória continua disponível na sessão
e nos arquivos `.split` salvos.

## Fluidez e próximos passos

A gravação local é assíncrona. O acompanhamento das alterações compara apenas
os identificadores da memória, sem copiar todo o histórico a cada movimento.
Os registros são capturados nos pontos de geração/salvamento/exportação.

A comparação de correções foi acrescentada na fase 2, descrita em
`PHASE-2-COMPARISON.md`. A consolidação entre projetos foi acrescentada na fase 3,
descrita em `PHASE-3-PREFERENCES.md`. A influência sobre os layouts pertence à
fase 4.

As instruções de execução e o escopo dos testes estão em `tests/README.md`.
