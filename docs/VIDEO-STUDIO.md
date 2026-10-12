# Vídeo Studio — Hyperframes integrado

Branch: `experiment/video-studio`, criada a partir da versão atual de `main`.

**O fluxo não utiliza LLM, chave de API ou serviço de IA.** Templates e regras
determinísticas montam a timeline. Hyperframes, Chromium e FFmpeg produzem o MP4.

## Executar a plataforma completa

Instale Node.js 22+ e FFmpeg, depois:

```sh
git switch experiment/video-studio
npm ci
npm start
```

Abra `http://127.0.0.1:8000`. Na primeira renderização, o Hyperframes pode baixar
Chromium. Se já houver um navegador compatível, configure
`HYPERFRAMES_BROWSER_PATH` com seu executável. `PORT` muda a porta do servidor.

## Criar um vídeo dentro do Split

1. Adicione imagens, logos, ofertas e textos e gere as composições normalmente.
2. Abra **Vídeos · LAB**. Também é possível começar pelo exemplo da plataforma.
3. Escolha a composição, duração e movimento: sequência, zoom suave ou fade.
4. Assista à prévia ou arraste a posição na linha do tempo.
5. Clique em **Gerar MP4** e acompanhe o progresso.
6. Quando terminar, clique em **Baixar MP4** na própria área de vídeos.

Não é necessário baixar um ZIP nem executar comandos para cada vídeo. A opção
**Exportar projeto editável** permanece disponível para continuar fora do Split.

## Como funciona

O navegador prepara o fundo com os mesmos algoritmos locais da peça e captura
cada camada visível como PNG transparente. Isso preserva os recortes, rotações,
proporções e fontes do editor. A timeline posicionável adiciona o movimento.

Ao clicar em **Gerar MP4**, esses PNGs, dimensões e opções são enviados ao servidor
do Split. O servidor gera o HTML a partir do template conhecido, executa
Hyperframes e disponibiliza o arquivo final. A prévia, o ZIP e o servidor usam
`video-composition.js` e `video-animation.js`, com a mesma timeline GSAP a 30 fps.

O servidor local escuta em `127.0.0.1`, aceita apenas solicitações de mesma origem,
valida dimensões e imagens, limita a fila e processa um vídeo por vez. Não aceita
HTML ou JavaScript fornecido pelo usuário. As pastas são temporárias e são
removidas 30 minutos após a conclusão, desde que o servidor permaneça em execução.
Telemetria do Hyperframes fica desativada na renderização. Campanhas não são
enviadas a serviços de IA.

## Hospedagem

O GitHub Pages mantém o editor estático, a prévia e a exportação do ZIP. A
renderização integrada precisa do processo Node.js deste projeto, com Chromium
e FFmpeg. O servidor também entrega `dist/`, mantendo interface e API na mesma
origem. Esta branch não altera a versão pública na `main`.

## Limites atuais

- Vídeo sem áudio, com uma composição e três estilos de entrada.
- Durações de 6, 10, 15 ou 20 segundos.
- Dimensões pares de 32 a 4096 px; até 8 megapixels para MP4.
- Até 60 camadas incluindo o fundo e 64 MB por solicitação.
- Três vídeos na fila incluindo o processamento; até 5 minutos por renderização.
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
node tests/video-studio-browser.cjs
node tests/video-render-browser.cjs
```

Os testes de navegador precisam de Playwright disponível em `NODE_PATH` e
`SPLIT_CHROME_PATH` apontando para Chromium. O teste de renderização usa Hyperframes
real, FFmpeg e `HYPERFRAMES_BROWSER_PATH` quando configurado. Ele verifica o clique
na interface, progresso, download real do MP4, duração, dimensões, fps, isolamento
do editor, rejeição de assets inválidos e controle de origem. O teste da prévia
cobre imagem enviada, texto, camadas ocultas, seek determinístico, ZIP e mobile.

Referências: [Hyperframes](https://github.com/heygen-com/hyperframes),
[GSAP Standard License](https://gsap.com/standard-license/). Hyperframes 0.8.150
está fixado no lockfile. GSAP 3.15.0 está em `dist/vendor/gsap.min.js`, com aviso de
licença original preservado.
