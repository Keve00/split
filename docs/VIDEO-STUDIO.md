# Vídeo Studio — render no navegador

Disponível na `main` e no GitHub Pages.

**O fluxo não utiliza LLM, chave de API ou serviço de IA.** Templates e regras
determinísticas montam a timeline. GSAP anima as camadas, e WebCodecs com
Mediabunny produz o MP4 no dispositivo do usuário, sem enviar imagens ao servidor.

## Executar a plataforma completa

Para desenvolver, instale Node.js 22+ e execute:

```sh
npm ci
npm run preview
```

Abra `http://127.0.0.1:8001` em Chrome ou Edge atualizado. Este servidor entrega
apenas arquivos estáticos; não tem API de renderização. `PORT` muda sua porta e
`BASE_PATH=/split/` permite testar o mesmo subdiretório usado no GitHub Pages.
O usuário final não precisa instalar Node.js, Chromium ou FFmpeg. A página deve
usar HTTPS (localhost também é permitido) e o navegador deve oferecer codificação
H.264 via WebCodecs na resolução escolhida.

## Criar um vídeo dentro do Split

1. Adicione imagens, logos, ofertas e textos e gere as composições normalmente.
2. Abra **Vídeos**. Também é possível começar pelo exemplo da plataforma.
3. Escolha a composição, duração e estilo geral. Organize as entradas **Em sequência** (com intervalo ajustável) ou **Juntas**.
4. Selecione uma camada na linha do tempo. No painel à direita, ajuste início, fim, entrada, saída, direção, duração, suavização, deslocamento, escala, rotação e opacidade. Zoom e rotação usam o centro do próprio elemento.
5. Use **Testar esta camada**, reproduza em repetição ou clique na régua/arraste o controle de tempo. **Aplicar estilo a todas** copia os efeitos e a intensidade sem mudar os horários ou o centro de cada camada.
6. Clique em **Gerar MP4** e acompanhe o progresso.
7. Quando terminar, clique em **Baixar MP4** na própria área de vídeos.

As faixas mostram o período visível e destacam as animações de entrada e saída.

A biblioteca também inclui **Quicar** (entrada com saltos na direção escolhida),
**Giro 360°**, **Balançar**, **Esticar** e **Expandir** (abertura horizontal).
Os quatro últimos têm versões de entrada e saída. Escala, duração, rotação,
opacidade e direção personalizam os efeitos conforme aplicável. Quicar, Balançar
e Esticar usam curvas próprias para manter o caráter do efeito. Selecionar uma
saída posiciona a prévia no trecho de saída. Os ícones têm descrições ao passar o
mouse ou receber foco pelo teclado.

Marque **Renderizar todos os formatos**, no topo esquerdo, e clique em **Gerar todos**
para gerar um MP4 para cada composição disponível. Os vídeos são processados em
sequência e baixados juntos em um ZIP. Cada formato mantém os ajustes de animação
que já recebeu nesta sessão; formatos ainda não personalizados usam os ajustes da
composição atual, com o centro de cada elemento adaptado ao seu layout. Se algum
formato falhar, o ZIP contém os vídeos concluídos e uma lista dos erros.
Os comandos de sequência, entradas juntas e atualização usam ícones com descrições
ao passar o mouse ou focar com o teclado. Efeitos, suavização e direção usam opções
visuais com ícones e indicação da seleção.

Selecione uma camada pelas faixas ou clique no elemento dentro da prévia. O
contorno acompanha deslocamento, escala e rotação, e o painel de animação acompanha
a seleção. O clique considera a transparência do PNG e seleciona o elemento visível
mais à frente. Clique no fundo para limpar a seleção; as setas do teclado no canvas
alternam entre camadas. O contorno é apenas do editor e não aparece no MP4 ou no ZIP.
Entradas: deslizar, aparecer, zoom, pop, girar + zoom ou sem animação. Saídas:
desaparecer, deslizar, zoom ou sem animação. O fim encerra a visibilidade da camada;
as durações são limitadas ao intervalo disponível para evitar sobreposição.

Escala de entrada e escala de saída são independentes. A escala e a rotação de
entrada funcionam em qualquer entrada animada; a camada chega a 100% e 0° ao
terminar a entrada. A escala de saída funciona em qualquer saída animada e pode
ser editada mesmo com saída sem animação: nesse caso, editar ativa o efeito Zoom. Ao
editar esses valores, a prévia mostra um quadro do trecho afetado. Escolher um
novo efeito aplica os valores iniciais desse efeito; depois personalize os inputs.
Os campos de escala e rotação aceitam digitação livre, inclusive valores decimais,
e atualizam a animação sem recarregar a prévia ou tirar o foco do campo. Enter ou
sair do campo confirma o valor dentro dos limites permitidos.

Os ajustes são mantidos por composição enquanto a página estiver aberta, inclusive
ao fechar o Studio, trocar de formato ou atualizar os assets. Recarregar a página
encerra essa sessão; baixe o ZIP para guardar os ajustes. O manifesto versão 2
inclui todas as configurações por camada. O arquivo `.split` ainda não as inclui.

Não é necessário baixar um ZIP nem executar comandos para cada vídeo. A opção
**Exportar projeto editável** permanece disponível para continuar fora do Split.

## Como funciona

O navegador prepara o fundo com os mesmos algoritmos locais da peça e captura
cada camada visível como PNG transparente. Isso preserva os recortes, rotações,
proporções e fontes do editor. A timeline posicionável adiciona o movimento.

Ao clicar em **Gerar MP4**, um iframe interno monta a mesma composição da prévia.
A timeline GSAP avança exatamente um quadro por vez. As imagens, suas matrizes de
transformação, pivôs e opacidade são compostas em canvas, depois codificadas em
H.264 e empacotadas como MP4 por Mediabunny. A exportação usa 30 fps e respeita a
fila interna do codificador para não acumular todos os quadros em memória.
O botão **Cancelar renderização** interrompe o processamento e mantém os ajustes.
O iframe temporário, a timeline e as URLs das camadas são liberados ao terminar.

O servidor antigo permanece como opção para projetos Hyperframes e pode ser
iniciado com `npm run hyperframes-server`. Esse fluxo separado requer FFmpeg e Chromium. A interface
atual não consulta sua API nem depende dele para gerar vídeos.

## Hospedagem

O diretório `dist/` contém tudo que o GitHub Pages precisa: editor, prévia,
renderizador e bibliotecas locais. A codificação ocorre no navegador; nenhum
processo Node.js ou API precisa ficar hospedado. Caminhos relativos permitem
publicar em `/split/` ou outro subdiretório. A biblioteca é carregada somente ao
renderizar. A configuração existente publica `dist/` a partir de `main`.

## Limites atuais

- Vídeo sem áudio, fundo estático e animação por camada; exportação individual ou em lote.
- Durações de 6, 10, 15 ou 20 segundos.
- A resolução e o codec disponíveis dependem do navegador e do dispositivo.
- O lote é processado em sequência; os MP4s concluídos ficam em memória até montar o ZIP.
- O tempo de render depende do computador. Mantenha a aba aberta durante o processo.
- Textos rasterizados: edite no Split e atualize a prévia para mudar o conteúdo.
- As configurações do vídeo ainda não são incluídas no arquivo `.split`.

## Projeto editável

O ZIP contém assets, HTML, animação, GSAP local e manifesto. Para renderizá-lo
manualmente, extraia todos os arquivos e execute na pasta:

```sh
npx hyperframes@0.8.150 preview
npx hyperframes@0.8.150 render --fps 30 --output video.mp4
```

## Validação

```sh
node tests/validate.cjs
node tests/video-animation.test.cjs
node tests/video-motion.test.cjs
node tests/video-batch.test.cjs
node tests/video-studio-browser.cjs
node tests/video-render-browser.cjs
```

Os testes de navegador precisam de Playwright disponível em `NODE_PATH` e
`SPLIT_CHROME_PATH` apontando para Chromium com codificador H.264 disponível.
O teste de renderização entrega apenas arquivos estáticos sob `/split/` e verifica
que não há solicitações à API de render. `ffprobe` é usado somente para inspecionar
o arquivo baixado, conferindo duração, dimensões e fps. O teste da prévia
cobre imagem enviada, texto, camadas ocultas, seek determinístico, ZIP e mobile.
Também verifica efeitos por camada, cópia de estilos sem alterar horários,
opacidade, pivôs, preservação na sessão e exportação das opções no ZIP. O teste
de MP4 exercita entrada com rotação e saída animada. A validação do servidor
rejeita opções desconhecidas, números não finitos e intervalos inválidos.

Referências: [Mediabunny](https://mediabunny.dev/), [Hyperframes](https://github.com/heygen-com/hyperframes),
[GSAP Standard License](https://gsap.com/standard-license/). Hyperframes 0.8.150
está fixado no lockfile. GSAP 3.15.0 está em `dist/vendor/gsap.min.js`, com aviso de
licença original preservado. Mediabunny 1.61.4 está fixado no lockfile e seu bundle
local está em `dist/vendor/mediabunny.min.js`, com licença MPL-2.0 preservada.
