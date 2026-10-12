# Vídeo Studio — experimento

Branch: `experiment/video-studio`, criada a partir de `main`.

O Split continua estático. **O fluxo não utiliza LLM, chave de API ou serviço de IA.**
Hyperframes renderiza HTML e animações; os modelos não são necessários para a autoria
ou renderização. Templates e regras determinísticas definem o movimento.

## Experimentar

```sh
git switch experiment/video-studio
python -m http.server 8000 --directory dist
```

Abra `http://localhost:8000`, adicione os assets e gere suas composições. Clique em
**Vídeos · LAB** na barra superior. Escolha uma composição, duração e movimento.
Também é possível usar o exemplo do Split diretamente na área de vídeos.

- A prévia usa uma timeline GSAP pausada, posicionada pelo quadro atual (30 fps).
- A linha do tempo mostra as entradas das camadas visíveis.
- Arraste o controle de reprodução para inspecionar um quadro.
- **Atualizar da composição** captura novamente os ajustes da peça.
- **Baixar projeto · ZIP** inclui HTML, timeline, GSAP local, manifesto e assets.

Extraia o ZIP. Com Node.js 22+ e FFmpeg instalados, execute na pasta extraída:

```sh
npx hyperframes@0.8.150 preview
npx hyperframes@0.8.150 render --fps 30 --output video.mp4
```

## Escolha técnica

Hyperframes usa HTML e timelines posicionáveis, compatíveis com a aplicação atual.
Não é necessário migrar o editor para React. O HTML exportado registra
`window.__timelines['split-video']` e informa dimensões, duração e tracks no contrato
do Hyperframes. A prévia e o projeto exportado usam o mesmo arquivo de animação.

Cada camada é capturada como um PNG transparente na resolução original. Isso
preserva os recortes, rotações, proporções e a tipografia do editor, incluindo
fontes locais. A animação atua nessas camadas, sem recriar o conteúdo com IA.
O fundo é preparado com os mesmos algoritmos locais da peça estática.
As campanhas não são enviadas a servidores. Nenhuma chamada a modelo ocorre.

## Limites deste primeiro experimento

- MP4 pelo CLI do Hyperframes; a exportação direta na plataforma ainda não existe.
- Vídeos sem áudio, com uma composição e três estilos de entrada.
- Textos ficam rasterizados no ZIP. Edite o conteúdo no Split e atualize a prévia.
- As configurações do vídeo ainda não são incluídas no arquivo `.split`.
- Muitas camadas em resolução alta aumentam memória e tamanho do ZIP.

Para renderizar dentro da plataforma em uma próxima etapa, um serviço de renderização
pode receber esse mesmo pacote e executar Hyperframes + Chromium + FFmpeg. Esse
serviço também não precisa de LLM. Copy e roteiro por IA podem ser opcionais, sem
participar do fluxo padrão.

## Validação

```sh
node tests/validate.cjs
NODE_PATH=/caminho/para/node_modules SPLIT_CHROME_PATH=/caminho/para/chrome node tests/video-studio-browser.cjs
```

O teste de navegador verifica assets da campanha, camadas ocultas, posição por
quadro, reprodução, estilos, duração, ZIP real, isolamento do editor, fechamento
com Escape, foco e largura mobile. `SPLIT_VIDEO_QA_DIR` permite extrair o pacote
gerado em uma pasta temporária para renderizá-lo com o Hyperframes.

Referências: [Hyperframes](https://github.com/heygen-com/hyperframes),
[GSAP Standard License](https://gsap.com/standard-license/). GSAP 3.15.0 está em
`dist/vendor/gsap.min.js`, com o aviso de licença original preservado.
