# Apresentação Final - Nebula SPDA

## 1. Problema abordado

Rastreabilidade manual de pontos de SPDA gera dificuldade de consulta, perda de histórico e baixa visibilidade de não conformidades.

## 2. Proposta de solução

Sistema WEB/Mobile com cadastro configurável, QR Code por ponto, ficha digital, registro de inspeções, histórico e indicadores técnicos.

## 3. Tecnologias utilizadas

HTML, CSS, JavaScript, Canvas, `localStorage`, Python 3 e API nativa de leitura de QR quando disponível.

## 4. Demonstração sugerida

1. Abrir `http://localhost:8000`.
2. Mostrar o dashboard.
3. Acessar `Configurações` e cadastrar uma nova área ou tipo.
4. Cadastrar um novo ponto e observar o código automático.
5. Abrir a ficha digital do ponto.
6. Registrar uma nova inspeção com medição.
7. Ver o histórico e os indicadores atualizados.
8. Abrir `QR Codes`, imprimir ou ler uma etiqueta.
9. Exportar JSON como backup dos dados.

## 5. Diferenciais

- Interface responsiva para celular.
- Código automático configurável.
- QR Codes gerados no próprio sistema.
- Leitor de câmera quando o navegador suporta.
- Dashboard com gráficos e alertas.
- Exportação e importação de dados.

## 6. Dificuldades

Manter o protótipo sem dependências externas exigiu implementar gráficos e QR Codes diretamente em JavaScript.

## 7. Melhorias futuras

Banco de dados em nuvem, autenticação, fotos reais, PDF automático e mapa dos pontos.
