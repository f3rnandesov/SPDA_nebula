# Roteiro de Apresentação - Nebula SPDA

## 1. Abertura

"Olá, pessoal. Hoje eu vou apresentar o Nebula SPDA, um protótipo WEB/Mobile criado para organizar, rastrear e acompanhar pontos de inspeção de SPDA de forma digital."

"A ideia do projeto é substituir o controle manual, que normalmente fica espalhado em planilhas, anotações e registros difíceis de consultar."

## 2. Problema que o projeto resolve

"Em inspeções de SPDA, um dos maiores problemas é a falta de rastreabilidade."

"Quando os dados ficam dispersos, é difícil saber:
- qual foi a última inspeção de um ponto;
- quem fez a verificação;
- se houve não conformidade;
- e quais pontos precisam de correção ou acompanhamento."

"Isso gera perda de histórico, dificuldade de consulta em campo e menor confiabilidade na gestão técnica."

## 3. Proposta da solução

"Para resolver isso, o Nebula SPDA centraliza todo o fluxo em um único sistema."

"Nele, é possível:
- cadastrar clientes, unidades, áreas, tipos de ponto e responsáveis;
- criar pontos com código automático;
- registrar inspeções com medições e observações;
- gerar e ler QR Codes;
- visualizar histórico, indicadores e alertas;
- e exportar os dados para backup."

## 4. Visão geral do sistema

"O sistema foi pensado para funcionar bem tanto no computador quanto no celular."

"A tela inicial já mostra um painel com indicadores, gráficos e alertas. A navegação principal se divide em:
- Indicadores;
- Pontos;
- Inspeções;
- Não Conformidades;
- QR Codes;
- Configurações."

## 5. Tecnologias utilizadas

"O projeto foi desenvolvido com tecnologias leves e sem dependência complexa de backend."

"A base visual usa HTML e CSS, enquanto a lógica principal foi feita em JavaScript."

"Os dados ficam salvos no `localStorage`, o que permite usar o protótipo diretamente no navegador."

"Também há suporte para:
- Canvas, para gráficos e geração de QR Code;
- leitura de QR Code pela câmera quando o navegador permite;
- e um servidor simples em Python para execução local."

## 6. Demonstração do fluxo principal

### 6.1 Tela inicial

"Na tela inicial, o projeto apresenta os principais indicadores do sistema."

"Aqui eu consigo ver:
- quantidade de pontos cadastrados;
- quantidade de pontos inspecionados;
- quantidade de conformes e não conformes;
- resistência média;
- distribuição por área;
- e tendência de resistência em um ponto específico."

### 6.2 Cadastro de pontos

"Na aba de Pontos, eu cadastro cada ponto de inspeção com os dados técnicos necessários."

"O sistema gera automaticamente um código no padrão:
`CLIENTE-SPDA-AREA-TIPO-NUMERO`."

"Além disso, eu posso informar localização, criticidade, status, coordenadas, foto e observações."

"Esse cadastro é importante porque cada ponto passa a ter uma identificação única e fácil de consultar."

### 6.3 Registro de inspeções

"Na aba de Inspeções, eu registro as medições e o resultado da vistoria."

"Aqui entram informações como:
- condição visual;
- resistência de aterramento;
- continuidade elétrica;
- presença de oxidação;
- necessidade de correção;
- e situação final de conformidade."

"Isso permite acompanhar a evolução técnica do ponto ao longo do tempo."

### 6.4 Ficha digital do ponto

"Ao abrir a ficha de um ponto, eu acesso o histórico completo dele."

"Essa ficha mostra:
- os dados do cadastro;
- o QR Code vinculado;
- e todas as inspeções anteriores."

"Na prática, isso facilita muito o uso em campo, porque o técnico consegue consultar tudo em um só lugar."

### 6.5 Não conformidades

"Na aba de Não Conformidades, o sistema separa automaticamente os pontos com alerta."

"Ele destaca situações como:
- resistência acima do limite;
- continuidade fora de faixa;
- necessidade de correção;
- oxidação;
- e registros com status de não conformidade."

"Essa visão é útil porque ajuda a priorizar as ações corretivas."

### 6.6 QR Codes

"Na aba de QR Codes, cada ponto recebe uma etiqueta própria."

"Esses QR Codes podem ser:
- visualizados na tela;
- impressos;
- baixados em imagem;
- ou lidos pela câmera no celular."

"Quando o QR é lido, o sistema abre diretamente a ficha do ponto, acelerando a consulta em campo."

### 6.7 Configurações

"Na parte de configurações, é possível manter a estrutura do sistema organizada."

"Ali eu cadastro ou edito:
- clientes;
- unidades;
- áreas;
- tipos de pontos;
- e responsáveis."

"Isso torna o sistema flexível para diferentes cenários operacionais."

## 7. Diferenciais do projeto

"Os principais diferenciais do Nebula SPDA são:
- interface responsiva;
- cadastro com código automático;
- histórico técnico centralizado;
- QR Code gerado dentro do próprio sistema;
- leitura por câmera quando disponível;
- gráficos e indicadores visuais;
- exportação e importação de dados em JSON;
- e relatórios simples para apoio à apresentação e análise."

## 8. Como o projeto funciona por trás

"Por trás da interface, o sistema guarda os dados no navegador do usuário."

"Isso foi uma escolha proposital para manter o protótipo leve, rápido e fácil de executar sem banco de dados externo."

"Além disso, o projeto já vem com uma base exemplo, com pontos e inspeções simulados, para facilitar a demonstração."

## 9. Limitações e desafios

"Durante o desenvolvimento, um desafio foi manter o protótipo funcional sem depender de bibliotecas externas pesadas."

"Por isso, algumas funções foram implementadas diretamente em JavaScript, como:
- gráficos;
- QR Code;
- e parte da navegação e dos relatórios."

"A limitação principal é que os dados ficam locais no navegador, então ainda não há banco de dados em nuvem nem autenticação robusta."

## 10. Melhorias futuras

"Como evolução do projeto, as próximas etapas podem incluir:
- banco de dados centralizado;
- autenticação por perfis;
- upload de fotos reais por inspeção;
- geração de PDF mais completo;
- mapa dos pontos;
- e sincronização entre dispositivos."

## 11. Encerramento

"Em resumo, o Nebula SPDA foi pensado para transformar o controle de inspeções de SPDA em um processo digital, organizado e rápido."

"Ele melhora a rastreabilidade, reduz perda de informação e facilita a tomada de decisão técnica."

"Obrigado pela atenção. Fico à disposição para demonstrar o sistema e tirar dúvidas."

## 12. Sugestão de fala curta, se precisar resumir

"O Nebula SPDA é um sistema WEB/Mobile para cadastro, inspeção e rastreabilidade de pontos de SPDA com QR Code. Ele centraliza os dados, gera histórico técnico, destaca não conformidades e facilita a consulta em campo."
