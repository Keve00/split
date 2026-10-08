'use strict';
globalThis.SplitBackgroundMenu=(()=>{
 const modes=[
 ['auto','Automático','Analisa o fundo e escolhe entre cores, textura ou extensão das bordas.'],
 ['texture','Repetir textura','Combina pequenos trechos com emendas suaves. Ideal para padrões e texturas; pode repetir detalhes.'],
 ['geometry','Estender cores e formas','Prolonga cores, gradientes e contornos simples. Ideal para fundos gráficos.'],
 ['opencv','Reconstruir bordas','Repara pequenos espaços e estende faixas das bordas, suavizando áreas maiores. Não cria novos objetos.'],
 ['cover','Preencher com recorte','Ocupa toda a peça. Corta o excesso; ajuste o foco para escolher a área visível.'],
 ['extend','Estender com desfoque','Mantém a imagem inteira e preenche o espaço com uma cópia desfocada do fundo.'],
 ['contain','Mostrar imagem inteira','Mantém a imagem inteira sobre a cor de fundo escolhida.']
 ];
 const picker=$('backgroundModePicker'),holder=$('backgroundModeOptions');holder.replaceChildren();
 for(const [value,name,description]of modes){const button=document.createElement('button');button.type='button';button.className='background-mode-option';button.dataset.mode=value;const title=document.createElement('strong'),hint=document.createElement('span');title.textContent=name;hint.textContent=description;button.append(title,hint);button.onclick=()=>{const control=$('backgroundMode');if(control.value!==value){control.value=value;control.onchange({target:control});}picker.open=false;sync();picker.querySelector('summary').focus();};holder.append(button);}
 function sync(){const value=$('backgroundMode').value||'auto',mode=modes.find(m=>m[0]===value)||modes[0];$('backgroundModeName').textContent=mode[1];$('backgroundModeDescription').textContent=mode[2];for(const button of holder.children)button.setAttribute('aria-pressed',String(button.dataset.mode===mode[0]));}
 picker.addEventListener('keydown',event=>{if(event.key==='Escape'){picker.open=false;picker.querySelector('summary').focus();}});sync();return{sync};
})();
