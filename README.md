# Split

Editor web para transformar imagens, textos, logos, ofertas e botões em peças publicitárias de vários formatos.

![Interface do Split com seis formatos de peças publicitárias e painéis de edição](docs/split-overview.jpg)


## Acessar o app

[**Abrir Split no GitHub Pages**](https://keve00.github.io/split/)

## Executar com vídeo integrado

Nesta branch experimental, o app inclui um servidor de renderização Hyperframes.
Instale **Node.js 22+** e **FFmpeg**, depois:

```sh
git clone --branch experiment/video-studio https://github.com/Keve00/split.git
cd split
npm ci
npm start
```

Abra http://127.0.0.1:8000. Na primeira renderização, o Hyperframes pode baixar o
Chromium necessário. Gere as composições, abra **Vídeos · LAB** e clique em
**Gerar MP4**. Aguarde o progresso e use **Baixar MP4** na própria plataforma.
Não são necessárias chaves de API, LLMs ou comandos manuais para cada vídeo.

O editor de imagens e a prévia também podem rodar apenas como site estático:
`python -m http.server 8000 --directory dist`. A geração integrada de MP4 requer
`npm start`, pois o GitHub Pages não executa Hyperframes, Chromium e FFmpeg.

## Como usar

Nesta branch, há também o [experimento Vídeo Studio](docs/VIDEO-STUDIO.md): animação dos assets, renderização integrada e download de MP4 com Hyperframes, sem LLM. Acesse pelo botão **Vídeos · LAB**. A versão pública continua na `main`.

1. Adicione um fundo ou escolha uma cor chapada. Carregue as imagens de logo, texto, oferta e botão ou escreva os textos no editor.
2. Selecione formatos de saída; cadastre tamanhos personalizados e salve seleções em perfis.
3. Clique em **Gerar composições** e ajuste os diagramas de posição para peças horizontais, superhorizontais, verticais e superverticais.
4. Edite cada peça: mova, redimensione proporcionalmente, gire, agrupe, alinhe, oculte e bloqueie camadas. Use Ctrl+Z para desfazer.
5. Ajuste o fundo, o foco e seu zoom. Exporte um PNG ou todos os formatos em ZIP.
6. Salve um arquivo `.split` para guardar imagens, formatos, diagramas e ajustes da campanha.

A geração de layouts e as adaptações de fundo acontecem no navegador, com algoritmos locais e OpenCV. Não utilizam LLMs ou modelos de geração de imagens.

## Dados e exportação

- Perfis, preferências e recuperação automática são locais ao navegador. O repositório não armazena campanhas nem imagens enviadas pelos usuários.
- Quando você clica em **Gerar MP4**, as camadas da peça vão para o servidor Hyperframes do Split. O servidor local trabalha em pastas temporárias e remove os arquivos depois de 30 minutos; não usa modelos nem envia campanhas a serviços de IA.
- O arquivo `.split` contém os dados e as imagens necessários para reabrir a campanha em outro navegador.
- O PNG mantém exatamente as dimensões escolhidas em pixels. O controle de DPI grava a densidade de impressão e não aumenta a quantidade de pixels.
- Elementos fora da peça são recortados na exportação.

## Atalhos

- Ctrl + rolagem sobre o canvas: zoom da visualização.
- Espaço + arraste: navegar no canvas.
- Shift + clique: selecionar várias camadas.
- Alt + redimensionamento: redimensionar pelo centro.
- Ctrl+Z / Ctrl+Shift+Z: desfazer / refazer.

## Estrutura

A interface está em `dist/`; o servidor de vídeo fica em `server/`:

- `index.html`, `styles.css`, `workspace.css`: interface e temas.
- `app.js`, `editing.js`, `rotation.js`, `alignment.js`: canvas e edição.
- `layout.js`, `blueprint.js`, `adaptation.js`: composição e planejamento.
- `background.js`, `synthesis.js`, `feather.js`: adaptação e suavização do fundo.
- `project-codec.js`, `projects.js`, `format-profiles.js`: projetos e perfis.
- `output-density.js`: densidade DPI dos PNGs.
- `video-studio.js`, `video-composition.js`, `video-animation.js`: autoria, prévia e contrato de vídeo.
- `server/video-server.cjs`: fila e renderização integrada de MP4 com Hyperframes.
- `fonts/` e `vendor/`: fontes Figtree e OpenCV, com suas licenças.

## Hospedagem estática

Publique o conteúdo de `dist/` em qualquer hospedagem estática. Não há etapa de compilação para o editor estático. Para gerar MP4 integrado, execute o servidor em `server/video-server.cjs` com `npm start`.

O GitHub Pages já está ativo em https://keve00.github.io/split/. O workflow `.github/workflows/pages.yml` publica `dist/` automaticamente quando o app muda na branch `main`. Também é possível iniciar uma publicação manual pela aba Actions.

## Recursos de terceiros

- Figtree: `dist/fonts/OFL.txt`.
- OpenCV: `dist/vendor/OpenCV-LICENSE.txt`.

Versão inicial deste repositório: código publicado no Split em 8 de outubro de 2026.
