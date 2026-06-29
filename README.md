# Nebula SPDA

Protótipo WEB/Mobile para rastreabilidade digital de pontos de inspeção de SPDA por QR Code.

## Como executar

```bash
python3 projeto_SPDA.py
```

Acesse no navegador:

```text
http://localhost:8000
```

## Com ngrok

Para expor a aplicação na internet durante testes, instale o `ngrok`, faça login e rode:

```bash
python3 projeto_SPDA.py --ngrok
```

Se quiser abrir o navegador automaticamente no endereço público, use:

```bash
python3 projeto_SPDA.py --ngrok --open
```

Se o executável não estiver no `PATH`, informe o caminho com `--ngrok-bin`.

## O que já vem pronto

- Tela inicial com indicadores e gráficos.
- Configurações do sistema para clientes, unidades, áreas, tipos de pontos e responsáveis.
- Cadastro de pontos com código automático no padrão `CLIENTE-SPDA-AREA-TIPO-NUMERO`.
- Base inicial com 15 pontos simulados.
- 18 registros de inspeção simulados.
- Geração de QR Codes por ponto.
- Leitura de QR pela câmera em navegadores compatíveis com `BarcodeDetector`.
- Ficha digital do ponto com histórico de inspeções.
- Registro de inspeções com medições, condição visual, oxidação, correção e conformidade.
- Filtros por área, tipo, ponto e busca textual.
- Exportação/importação de dados em JSON.
- Impressão de etiquetas QR pelo navegador.

## Observações

Os dados são salvos no `localStorage` do navegador. Use `Exportar JSON` para fazer backup antes de limpar dados ou trocar de computador.

Para leitura por celular com a câmera nativa, use o endereço da rede local exibido no terminal, por exemplo `http://192.168.0.10:8000`.

Na tela `QR Codes`, cole esse endereço no campo `URL base para celular` e clique em `Atualizar QR Codes`. O celular precisa estar na mesma rede Wi-Fi do computador que está rodando o servidor. Evite usar `localhost` no QR Code, porque no celular `localhost` aponta para o próprio celular, não para o computador.
