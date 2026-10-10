# Fase 5 — compatibilidade, desempenho e qualidade

A validação final ganhou uma execução repetível e relatórios locais. Não foram
adicionados controles, telemetria, serviços ou etapas ao aplicativo. Fixtures,
instrumentação e relatórios ficam em `tests/`, fora de `dist`.

## Avaliação com projetos reservados

`fixtures/learning-evaluation.js` define seis contextos sintéticos: logos em
formatos quadrado e vertical, produto em formato horizontal, título, oferta e
CTA em banner. Três projetos independentes fornecem 54 exemplos de treinamento.
A avaliação usa outros 24 projetos com identificadores, conteúdo e assets
distintos; há também variações de resolução, peso e cor.

Cada caso define antes da avaliação uma preferência conhecida de posição,
fonte ou alinhamento. O resultado normal e o personalizado são comparados com
esse alvo. A pontuação interna do algoritmo não é usada como prova de melhoria.
Os indicadores são:

- Quantos casos ainda exigem correção, usando a precisão da comparação existente.
- Magnitude da correção restante, normalizada pelo ajuste necessário sem memória.
- Casos piores, texto que não cabe e extrapolação dos limites rotacionados.
- Resultado idêntico ao padrão quando o contexto não corresponde.

A avaliação exige redução da quantidade de casos com correção e pelo menos
45% de redução da magnitude média, sem nenhum caso pior ou inseguro. O Node usa
medição aproximada de texto; o Chrome repete a avaliação com Figtree e medidas
reais de fonte. Os relatórios contêm resultados individuais para inspeção.

Nos cenários controlados, a magnitude restante diminuiu aproximadamente 72,2%,
e os casos que exigem correção caíram de 24 para 20. São métricas diferentes:
um ajuste menor ainda pode exigir uma intervenção. Esses números não demonstram
preferência visual de pessoas, qualidade de qualquer campanha real nem melhoria
de cliques/conversões. A avaliação humana e o uso real continuam necessários
para confirmar esses benefícios fora dos exemplos sintéticos.

## Compatibilidade e consistência

Os novos testes verificam as versões 1 a 7 do projeto e 1 a 3 da memória,
decodificação após migração, metadados automáticos inválidos e modelos futuros.
A execução completa inclui os testes das fases anteriores: portabilidade,
deduplicação, desfazer/refazer, troca de conteúdo, planejamento, limites,
importação, recuperação, falhas de download e armazenamento indisponível.

## Desempenho e interação

O teste de navegador alterna execuções normais e personalizadas, descarta três
execuções de aquecimento e mede 25 amostras de cada modo. São usados modelos
cheios: 128 preferências do projeto e 256 gerais. Há um caso com uma camada e
um caso de estresse com 15 camadas.

Os limites automatizados são: até 30 ms no percentil 95 da etapa de aprendizado,
até 30 ms de diferença entre as medianas da geração personalizada e padrão,
e até 150 ms no percentil 95 do caso com uma camada. Os tempos totais dos dois
modos também são registrados, sem confundir custo do algoritmo padrão com custo
adicionado pelo aprendizado. O caso de 15 camadas já é mais custoso no algoritmo
padrão; a validação não afirma que toda geração termina em um quadro de tela.

Um arraste real com histórico de pelo menos 256 KiB e no máximo 512 KiB verifica
que não há geração, consolidação de preferências ou registro de eventos durante
os movimentos. O percentil 95 do manipulador deve ficar abaixo de 100 ms.
Os tempos dependem do dispositivo e da carga da máquina; os relatórios guardam
as medidas observadas, não uma promessa de desempenho em qualquer hardware.

## Execução e evidências

`node tests/validate.cjs` executa todos os testes de lógica.
`node tests/validate.cjs --full` acrescenta as quatro suítes de navegador,
com perfis temporários e servidores somente em `127.0.0.1`.

Os relatórios locais são:

- `tests/results/phase-5-quality-node.json`: comparação controlada no Node.
- `tests/results/phase-5-browser.json`: qualidade com fontes reais, tempos,
  histórico usado e contagem de trabalho durante o arraste.
- `tests/results/phase-5-validation-full.json`: resultado agregado da execução
  completa, incluindo falhas. A execução para no primeiro grupo que falha.

As instruções de Playwright e Chrome estão em `tests/README.md`. Falhas de teste
fazem o processo terminar com erro. Nenhum desses arquivos é carregado pelo
aplicativo ou enviado para fora do dispositivo.
