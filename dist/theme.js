'use strict';
(function(){
const root=document.documentElement;
let theme='light';
try{if(localStorage.getItem('split-theme')==='dark')theme='dark';}catch{}
function apply(value){theme=value==='dark'?'dark':'light';root.dataset.theme=theme;root.style.colorScheme=theme;const button=document.getElementById('themeToggle');if(button){button.textContent=theme==='dark'?'☀ Claro':'☾ Escuro';button.setAttribute('aria-pressed',String(theme==='dark'));button.setAttribute('aria-label',theme==='dark'?'Ativar tema claro':'Ativar tema escuro');button.title=theme==='dark'?'Ativar tema claro':'Ativar tema escuro';}}
apply(theme);
function connect(){apply(theme);const button=document.getElementById('themeToggle');if(button)button.onclick=()=>{apply(theme==='dark'?'light':'dark');try{localStorage.setItem('split-theme',theme);}catch{}};}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',connect,{once:true});else connect();
})();
