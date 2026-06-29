# Relatório Técnico - Nebula SPDA

## Problema

Inspeções de SPDA em ambientes industriais costumam ser registradas em planilhas, fotos soltas e relatórios manuais. Isso dificulta consultar rapidamente a ficha de cada ponto, manter histórico de medições e identificar não conformidades.

## Solução desenvolvida

Foi desenvolvido um protótipo WEB/Mobile estático, executado localmente por um servidor Python simples. Cada ponto de inspeção possui código único, ficha digital, QR Code associado e histórico de inspeções.

## Tecnologias

- HTML, CSS e JavaScript puro para interface e lógica.
- Python 3 com `http.server` para servir o sistema localmente.
- `localStorage` para persistência simples no navegador.
- Canvas para gráficos e geração dos QR Codes.
- API nativa `BarcodeDetector`, quando disponível, para leitura de QR pela câmera.

## Modelo de identificação

O padrão adotado foi:

```text
CLIENTE-SPDA-AREA-TIPO-NUMERO
```

Exemplo:

```text
RZ-SPDA-TQ-CI-001
```

As siglas de cliente, área e tipo são configuráveis na tela `Configurações do Sistema`.

## Dados incluídos

A base inicial contém:

- 1 cliente: Raizen.
- 1 unidade industrial modelo.
- 10 áreas configuradas.
- 12 tipos de pontos de SPDA.
- 2 responsáveis.
- 15 pontos de inspeção simulados.
- 18 inspeções simuladas.

## Indicadores

O dashboard apresenta total de pontos, pontos inspecionados, conformes, não conformes, resistência média, pontos por área, conformidade e evolução temporal da resistência de aterramento.

## Critérios técnicos usados

Valores elevados de resistência ou continuidade e inspeções marcadas como `Não conforme` aparecem no painel de alertas. A aplicação também permite analisar tendência de resistência por ponto ao longo do tempo.

## Melhorias futuras

- Banco de dados multiusuário.
- Autenticação com perfis.
- Upload real de fotos.
- Relatório PDF gerado automaticamente.
- Sincronização offline/online para equipes em campo.
- Mapa georreferenciado dos pontos.
