const KEY = "smartlab_spda_v1";
const AUTH_KEY = "smartlab_spda_auth";
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);
const byId = id => document.getElementById(id);
const money = value => Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const clone = value => JSON.parse(JSON.stringify(value));
const memoryStorage = new Map();

function createStorage() {
  try {
    const probe = "__smartlab_spda_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return {
      getItem(key) {
        return memoryStorage.has(key) ? memoryStorage.get(key) : null;
      },
      setItem(key, value) {
        memoryStorage.set(key, String(value));
      },
      removeItem(key) {
        memoryStorage.delete(key);
      },
      clear() {
        memoryStorage.clear();
      }
    };
  }
}

const storage = createStorage();

let state;
let selectedPoint = null;
let uploadedPointPhoto = "";
let uploadedInspectionPhoto = "";
let scanStream = null;
let scanTimer = null;

const seed = {
  clients: [{ id: "c1", name: "Raizen", sigla: "RZ" }],
  units: [{ id: "u1", clientId: "c1", name: "Planta Industrial Modelo", sigla: "PI" }],
  areas: [
    ["a1", "Área dos Tanques", "TQ"], ["a2", "Prédio Administrativo", "ADM"],
    ["a3", "Prédio Multiuso", "MU"], ["a4", "Prédio da Alfândega", "ALF"],
    ["a5", "Carga e Descarga", "CD"], ["a6", "PCVV", "PCVV"],
    ["a7", "PCBB", "PCBB"], ["a8", "PCMB", "PCMB"], ["a9", "Postes", "PST"],
    ["a10", "Estrutura Metálica", "EM"]
  ].map(([id, name, sigla]) => ({ id, name, sigla })),
  types: [
    ["t1", "Caixa de inspeção no solo", "CI", "Caixa de inspeção da malha de aterramento instalada no piso ou solo."],
    ["t2", "Caixa de inspeção na parede", "CIP", "Caixa em parede associada a conectores de medição."],
    ["t3", "Descida do SPDA", "DESC", "Condutor de descida do sistema de proteção."],
    ["t4", "Captor", "CAP", "Elemento captor do SPDA."],
    ["t5", "Haste captora", "HC", "Captor tipo Franklin ou haste de interceptação."],
    ["t6", "Isolador", "ISO", "Suporte ou afastamento de condutores do SPDA."],
    ["t7", "Ponto de equipotencialização", "EQP", "Interligação equipotencial entre estruturas metálicas e condutores."],
    ["t8", "Condutor de malha", "MALHA", "Ponto associado à malha de aterramento."],
    ["t9", "Conector de medição", "CON", "Conector de medição, emenda ou quatro parafusos."],
    ["t10", "Poste", "POSTE", "Poste de iluminação, câmera ou suporte associado ao aterramento."],
    ["t11", "Estrutura metálica", "EM", "Estrutura metálica equipotencializada ou a equipotencializar."],
    ["t12", "Tanque metálico", "TQAT", "Ponto de aterramento ou equipotencialização em tanque metálico."]
  ].map(([id, name, sigla, description]) => ({ id, name, sigla, description })),
  users: [
    { id: "r1", name: "Equipe 01", role: "Inspeção de campo", password: "1234" },
    { id: "r2", name: "Responsável Técnico", role: "Validação", password: "1234" }
  ],
  points: [],
  inspections: [],
  audit: [],
  limits: { resistance: 10, continuity: 100 },
  qrBase: ""
};

const pointRows = [
  ["TQ", "CI", 1, "Próximo ao Tanque 09", "Alta", "Caixa de inspeção associada à malha de aterramento da área dos tanques."],
  ["TQ", "CI", 2, "Corredor entre tanques 07 e 08", "Alta", "Caixa de passagem e medição da malha principal."],
  ["TQ", "EQP", 1, "Base do Tanque 03", "Alta", "Ponto de equipotencialização do costado metálico."],
  ["TQ", "EQP", 2, "Base do Tanque 11", "Alta", "Interligação entre tanque e malha de aterramento."],
  ["ADM", "DESC", 1, "Fachada norte", "Media", "Descida do SPDA no prédio administrativo."],
  ["ADM", "CIP", 1, "Sala técnica externa", "Media", "Caixa de inspeção em parede para medição."],
  ["ADM", "CON", 1, "Cobertura do prédio", "Media", "Conector de medição de descida."],
  ["MU", "HC", 1, "Cobertura central", "Alta", "Haste captora principal do prédio multiuso."],
  ["MU", "ISO", 1, "Lateral oeste da cobertura", "Baixa", "Isolador de afastamento do condutor."],
  ["ALF", "DESC", 1, "Fachada de acesso", "Media", "Descida do SPDA no prédio da alfândega."],
  ["CD", "EQP", 1, "Plataforma de carga", "Alta", "Equipotencialização de estrutura metálica da doca."],
  ["PCVV", "CI", 1, "Entrada do painel PCVV", "Media", "Caixa de inspeção próxima ao painel."],
  ["PCBB", "CON", 1, "Casa elétrica PCBB", "Media", "Conector de medição inspecionável."],
  ["PST", "POSTE", 1, "Poste 14 da via interna", "Baixa", "Poste de câmera associado ao aterramento."],
  ["PCMB", "EQP", 1, "Base da estrutura PCMB", "Alta", "Interligação equipotencial em estrutura operacional."]
];

const pointCoordinates = [
  [-23.55052, -46.633308], [-23.55091, -46.6329], [-23.5512, -46.63372],
  [-23.55158, -46.6331], [-23.54984, -46.6342], [-23.54948, -46.63454],
  [-23.54922, -46.63386], [-23.55012, -46.6351], [-23.55048, -46.63536],
  [-23.54892, -46.6327], [-23.55201, -46.63401], [-23.55244, -46.63244],
  [-23.55276, -46.6328], [-23.55182, -46.63198], [-23.55308, -46.63348]
];

function buildSeed() {
  const data = typeof structuredClone === "function" ? structuredClone(seed) : clone(seed);
  data.points = pointRows.map((row, index) => {
    const [areaSigla, typeSigla, number, location, criticality, description] = row;
    const area = data.areas.find(item => item.sigla === areaSigla);
    const type = data.types.find(item => item.sigla === typeSigla);
    return {
      id: `p${index + 1}`,
      clientId: "c1",
      unitId: "u1",
      areaId: area.id,
      typeId: type.id,
      number,
      code: makeCode("RZ", areaSigla, typeSigla, number),
      location,
      description,
      criticality,
      status: "Ativo",
      photo: "",
      photoData: "",
      lat: pointCoordinates[index]?.[0] || "",
      lng: pointCoordinates[index]?.[1] || "",
      notes: "Ponto simulado para demonstração acadêmica."
    };
  });
  data.inspections = data.points.map((point, index) => {
    const bad = [2, 6, 10, 13].includes(index);
    const monitor = [4, 8, 14].includes(index);
    const resistance = bad ? 11 + index * 0.4 : monitor ? 7.8 + index * 0.1 : 3.2 + (index % 5) * 0.7;
    const continuity = bad ? 115 + index : monitor ? 72 + index : 24 + index * 2;
    return {
      id: `i${index + 1}`,
      pointId: point.id,
      date: `2026-06-${String(4 + index).padStart(2, "0")}`,
      userId: index % 2 ? "r2" : "r1",
      visual: bad ? "Ruim" : monitor ? "Regular" : "Boa",
      continuity,
      resistance: Number(resistance.toFixed(1)),
      oxidation: bad ? "Sim" : "Nao",
      correction: bad ? "Sim" : "Nao",
      conformity: bad ? "Nao conforme" : monitor ? "Monitorar" : "Conforme",
      photo: "",
      photoData: "",
      notes: bad ? "Valor fora da faixa de referência. Programar correção." : "Inspeção simulada sem anomalia crítica."
    };
  });
  data.audit = [
    { id: "a1", date: "2026-06-24T08:00:00.000Z", user: "Sistema", action: "Base exemplo criada", target: "15 pontos e 18 inspeções" }
  ];
  data.inspections.push(
    { ...data.inspections[0], id: "i16", date: "2026-05-12", resistance: 5.3, continuity: 42, notes: "Medição anterior para análise de tendência." },
    { ...data.inspections[0], id: "i17", date: "2026-04-10", resistance: 4.8, continuity: 38, notes: "Caixa íntegra e conexão em boas condições." },
    { ...data.inspections[2], id: "i18", date: "2026-05-18", resistance: 9.8, continuity: 104, conformity: "Nao conforme", oxidation: "Sim", correction: "Sim" }
  );
  return data;
}

function loadState() {
  const saved = storage.getItem(KEY);
  if (!saved) return buildSeed();
  try {
    return migrateState(JSON.parse(saved));
  } catch {
    return buildSeed();
  }
}

function migrateState(data) {
  const base = buildSeed();
  data.clients ||= base.clients;
  data.units ||= base.units;
  data.areas ||= base.areas;
  data.types ||= base.types;
  data.users ||= base.users;
  data.points ||= [];
  data.inspections ||= [];
  data.audit ||= [];
  data.limits ||= { resistance: 10, continuity: 100 };
  data.qrBase ||= "";
  data.users = data.users.map(user => ({ password: "1234", ...user }));
  data.points = data.points.map(point => ({ photoData: "", lat: "", lng: "", ...point }));
  data.inspections = data.inspections.map(item => ({ photoData: "", ...item }));
  return data;
}

function save() {
  storage.setItem(KEY, JSON.stringify(state));
}

function makeCode(clientSigla, areaSigla, typeSigla, number) {
  return `${clientSigla}-SPDA-${areaSigla}-${typeSigla}-${String(number).padStart(3, "0")}`.toUpperCase();
}

function findIn(collection, id) {
  return state[collection].find(item => item.id === id) || {};
}

function optionList(select, items, valueKey = "id", label = item => item.name) {
  select.innerHTML = items.map(item => `<option value="${item[valueKey]}">${label(item)}</option>`).join("");
}

function refreshOptions() {
  optionList(byId("pointClient"), state.clients, "id", item => `${item.name} (${item.sigla})`);
  optionList(byId("unitClient"), state.clients, "id", item => `${item.name} (${item.sigla})`);
  optionList(byId("pointUnit"), state.units, "id", item => `${item.name} (${item.sigla})`);
  optionList(byId("pointArea"), state.areas, "id", item => `${item.name} (${item.sigla})`);
  optionList(byId("pointType"), state.types, "id", item => `${item.name} (${item.sigla})`);
  optionList(byId("inspectionPoint"), state.points, "id", item => item.code);
  optionList(byId("inspectionUser"), state.users, "id", item => item.name);
  optionList(byId("trendPoint"), state.points, "id", item => item.code);
  optionList(byId("loginUser"), state.users, "id", item => `${item.name} (${displayAccented(item.role)})`);

  fillFilter("areaFilter", state.areas, "Todas as áreas");
  fillFilter("typeFilter", state.types, "Todos os tipos");
  fillFilter("ncAreaFilter", state.areas, "Todas as áreas");
  fillFilter("ncTypeFilter", state.types, "Todos os tipos");
  fillFilter("inspectionFilterPoint", state.points, "Todos os pontos", item => item.code);
  fillStaticFilter("pointStatusFilter", [
    { value: "Ativo", label: "Ativo" },
    { value: "Em manutencao", label: "Em manutenção" },
    { value: "Inativo", label: "Inativo" }
  ], "Todos os status");
  fillStaticFilter("inspectionFilterStatus", [
    { value: "Conforme", label: "Conforme" },
    { value: "Nao conforme", label: "Não conforme" },
    { value: "Monitorar", label: "Monitorar" }
  ], "Todos os status");
}

function fillFilter(id, items, first, label = item => `${item.name} (${item.sigla || ""})`) {
  const select = byId(id);
  const current = select.value;
  select.innerHTML = `<option value="">${first}</option>` + items.map(item => `<option value="${item.id}">${label(item)}</option>`).join("");
  select.value = current;
}

function fillStaticFilter(id, items, first) {
  const select = byId(id);
  const current = select.value;
  select.innerHTML = `<option value="">${first}</option>` + items.map(item => {
    if (item && typeof item === "object") {
      const value = item.value ?? item.label ?? "";
      const label = item.label ?? item.value ?? "";
      return `<option value="${value}">${label}</option>`;
    }
    return `<option value="${item}">${item}</option>`;
  }).join("");
  select.value = current;
}

function updatePointCode() {
  const client = findIn("clients", byId("pointClient").value);
  const area = findIn("areas", byId("pointArea").value);
  const type = findIn("types", byId("pointType").value);
  const number = byId("pointNumber").value || 1;
  byId("pointCode").value = makeCode(client.sigla || "CL", area.sigla || "AR", type.sigla || "TP", number);
}

function render() {
  refreshOptions();
  updatePointCode();
  renderAuth();
  renderPoints();
  renderInspections();
  renderConfig();
  renderDashboard();
  renderNonConformities();
  renderQrCodes();
  renderAudit();
  save();
}

function renderPoints() {
  const search = byId("pointSearch").value.toLowerCase();
  const areaFilter = byId("areaFilter").value;
  const typeFilter = byId("typeFilter").value;
  const statusFilter = byId("pointStatusFilter").value;
  const points = state.points.filter(point => {
    const area = findIn("areas", point.areaId);
    const type = findIn("types", point.typeId);
    const haystack = `${point.code} ${area.name} ${type.name} ${point.location}`.toLowerCase();
    return (!search || haystack.includes(search))
      && (!areaFilter || point.areaId === areaFilter)
      && (!typeFilter || point.typeId === typeFilter)
      && (!statusFilter || point.status === statusFilter);
  });

  if (!points.length) {
    byId("pointList").innerHTML = `<p class="muted" style="padding: 20px; text-align: center;">Nenhum ponto cadastrado ou correspondente aos filtros.</p>`;
    return;
  }

  const tableHtml = `
    <table class="modern-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Planta / Área</th>
          <th>Tipo</th>
          <th>Localização</th>
          <th>Última Inspeção</th>
          <th>Status</th>
          <th style="width: 200px; text-align: center;">Ações</th>
        </tr>
      </thead>
      <tbody>
        ${points.map(point => {
          const area = findIn("areas", point.areaId);
          const type = findIn("types", point.typeId);
          const last = latestInspection(point.id);
          const location = point.lat && point.lng ? `${point.location} <small class="muted" style="display:block;">(${point.lat}, ${point.lng})</small>` : point.location;
          
          let statusBadge = `<span class="badge muted">Sem Inspeção</span>`;
          if (last) {
            const outOfRange = isOutOfRange(last);
            const badgeClass = last.conformity === "Conforme" && !outOfRange ? "ok" : (last.conformity === "Nao conforme" || outOfRange ? "bad" : "warn");
            const extraText = outOfRange ? " (Fora de faixa)" : "";
            statusBadge = `<span class="badge ${badgeClass}">${last.conformity}${extraText}</span>`;
          }

          let pointStatusBadge = `<span class="badge ok">Ativo</span>`;
          if (point.status === "Em manutencao") pointStatusBadge = `<span class="badge warn">Em manutenção</span>`;
          else if (point.status === "Inativo") pointStatusBadge = `<span class="badge muted">Inativo</span>`;

          return `
            <tr>
              <td><strong>${point.code}</strong></td>
              <td>${area.name}</td>
              <td>${type.name}</td>
              <td>${location}</td>
              <td>${last ? new Date(last.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"}</td>
              <td>
                <div style="display:flex; flex-direction:column; gap:4px;">
                  ${pointStatusBadge}
                  ${statusBadge}
                </div>
              </td>
              <td style="text-align: center;">
                <div class="actions-cell" style="justify-content: center;">
                  <button data-edit-point="${point.id}" class="secondary">Editar</button>
                  <button data-sheet-point="${point.id}">Ficha</button>
                  ${point.lat && point.lng ? `<a class="button-link" target="_blank" rel="noopener" href="${mapUrl(point)}">Mapa</a>` : ""}
                </div>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
  byId("pointList").innerHTML = tableHtml;
}

function renderInspections() {
  const search = byId("inspectionSearch").value.toLowerCase();
  const filterPoint = byId("inspectionFilterPoint").value;
  const filterStatus = byId("inspectionFilterStatus").value;
  const rows = [...state.inspections].sort((a, b) => b.date.localeCompare(a.date)).filter(item => {
    const point = findIn("points", item.pointId);
    const user = findIn("users", item.userId);
    const haystack = `${point.code} ${user.name} ${item.visual} ${item.conformity} ${item.notes}`.toLowerCase();
    return (!search || haystack.includes(search))
      && (!filterPoint || item.pointId === filterPoint)
      && (!filterStatus || item.conformity === filterStatus);
  });

  if (!rows.length) {
    byId("inspectionList").innerHTML = `<p class="muted" style="padding: 20px; text-align: center;">Nenhuma inspeção encontrada.</p>`;
    return;
  }

  const tableHtml = `
    <table class="modern-table">
      <thead>
        <tr>
          <th>Ponto</th>
          <th>Data</th>
          <th>Responsável</th>
          <th>Visual</th>
          <th>Resistência</th>
          <th>Continuidade</th>
          <th>Situação</th>
          <th>Observações</th>
          <th style="text-align: center; width: 80px;">Foto</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(item => {
          const point = findIn("points", item.pointId);
          const user = findIn("users", item.userId);
          const photo = item.photoData || item.photo;
          const outOfRange = isOutOfRange(item);
          const badgeClass = item.conformity === "Conforme" && !outOfRange ? "ok" : (item.conformity === "Nao conforme" || outOfRange ? "bad" : "warn");
          const extraText = outOfRange ? " (Fora de faixa)" : "";

          return `
            <tr>
              <td><strong>${point.code || "Ponto Excluído"}</strong></td>
              <td>${new Date(item.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
              <td>${user.name || "N/A"}</td>
              <td>${displayAccented(item.visual)}</td>
              <td class="${Number(item.resistance) > Number(state.limits.resistance) ? 'bad' : ''}">${money(item.resistance)} Ω</td>
              <td class="${Number(item.continuity) > Number(state.limits.continuity) ? 'bad' : ''}">${money(item.continuity)} mΩ</td>
              <td><span class="badge ${badgeClass}">${item.conformity}${extraText}</span></td>
              <td><small>${item.notes || "—"}</small></td>
              <td style="text-align: center;">
                ${photo ? `<img class="thumb" src="${photo}" alt="Foto" style="max-height: 40px; border-radius: 4px; cursor: pointer; display: block; margin: 0 auto;" onclick="window.open('${photo}', '_blank')">` : "—"}
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
  byId("inspectionList").innerHTML = tableHtml;
}

function statusText(status) {
  const cls = status === "Conforme" ? "badge ok" : status === "Nao conforme" ? "badge bad" : status === "Monitorar" ? "badge warn" : "badge muted";
  const label = status === "Nao conforme" ? "Não conforme" : status === "Conforme" ? "Conforme" : status === "Monitorar" ? "Monitorar" : "Sem inspeção";
  return `<span class="${cls}">${label}</span>`;
}

function displayAccented(value) {
  const map = {
    "Nao": "Não",
    "Nao conforme": "Não conforme",
    "Em manutencao": "Em manutenção",
    "Media": "Média",
    "Critica": "Crítica",
    "Inspecao de campo": "Inspeção de campo",
    "Responsavel Tecnico": "Responsável Técnico",
    "Validacao": "Validação"
  };
  return map[value] || value;
}

function latestInspection(pointId) {
  return state.inspections.filter(item => item.pointId === pointId).sort((a, b) => b.date.localeCompare(a.date))[0];
}

function isOutOfRange(inspection) {
  return Number(inspection.resistance || 0) > Number(state.limits.resistance || 10)
    || Number(inspection.continuity || 0) > Number(state.limits.continuity || 100);
}

function mapUrl(point) {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${point.lat},${point.lng}`)}`;
}

function renderDashboard() {
  const latest = state.points.map(point => latestInspection(point.id)).filter(Boolean);
  const conformes = latest.filter(item => item.conformity === "Conforme").length;
  const nao = latest.filter(item => item.conformity === "Nao conforme").length;
  const avgResistance = average(latest.map(item => item.resistance));
  const maxResistance = Math.max(...latest.map(item => Number(item.resistance || 0)), 0);
  const inspectedCount = latest.length;
  byId("cards").innerHTML = [
    ["Pontos cadastrados", state.points.length],
    ["Pontos inspecionados", new Set(state.inspections.map(i => i.pointId)).size],
    ["Conformes", conformes],
    ["Não conformes", nao],
    ["Resistência média", `${money(avgResistance)} Ohm`]
  ].map(([label, value]) => `<div class="card"><span>${label}</span><strong>${value}</strong></div>`).join("");

  const areaCounts = Object.entries(countBy(state.points, point => findIn("areas", point.areaId).sigla))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  drawHorizontalBars("areaChart", areaCounts, {
    emptyLabel: "Ainda não há pontos cadastrados para distribuir por área."
  });

  const statusCounts = state.points.reduce((acc, point) => {
    const inspection = latestInspection(point.id);
    const key = inspection ? inspection.conformity : "Sem inspeção";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const riskCount = (statusCounts.Monitorar || 0) + (statusCounts["Nao conforme"] || 0);
  const conformityRate = inspectedCount ? (conformes / inspectedCount) * 100 : 0;
  drawDonut("statusChart", [
    { label: "Conforme", value: statusCounts.Conforme || 0, color: chartPalette.ok },
    { label: "Monitorar", value: statusCounts.Monitorar || 0, color: chartPalette.warn },
    { label: "Não conforme", value: statusCounts["Nao conforme"] || 0, color: chartPalette.bad },
    { label: "Sem inspeção", value: statusCounts["Sem inspeção"] || 0, color: chartPalette.muted }
  ], {
    centerLabel: "Conformidade geral",
    centerValue: `${Math.round(conformityRate)}%`,
    centerCaption: `${conformes} conformes • ${riskCount} em risco`
  });

  renderTrend();
  byId("alerts").innerHTML = state.points.map(point => ({ point, inspection: latestInspection(point.id) }))
    .filter(row => row.inspection && (row.inspection.conformity !== "Conforme" || isOutOfRange(row.inspection)))
    .map(row => `<article class="item"><strong>${row.point.code}</strong><p>${statusText(row.inspection.conformity)} - ${money(row.inspection.resistance)} Ohm / ${money(row.inspection.continuity)} mOhm</p><p>${row.inspection.notes}</p></article>`)
    .join("") || `<p class="muted">Nenhum alerta crítico na última inspeção.</p>`;
  byId("trendHint").textContent = `Maior resistência atual: ${money(maxResistance)} Ohm`;
}

function renderTrend() {
  const pointId = byId("trendPoint").value || state.points[0]?.id;
  const rows = state.inspections.filter(item => item.pointId === pointId).sort((a, b) => a.date.localeCompare(b.date));
  drawTrendLine("trendChart", rows.map(item => formatShortDate(item.date)), rows.map(item => Number(item.resistance || 0)), {
    referenceValue: Number(state.limits.resistance || 10),
    emptyLabel: "Selecione um ponto para acompanhar a tendência de resistência."
  });
}

function nonConformingRows() {
  return state.points.map(point => {
    const inspection = latestInspection(point.id);
    return { point, inspection };
  }).filter(row => row.inspection && (row.inspection.conformity !== "Conforme" || row.inspection.correction === "Sim" || isOutOfRange(row.inspection)));
}

function renderNonConformities() {
  byId("limitResistance").value = state.limits.resistance;
  byId("limitContinuity").value = state.limits.continuity;
  const rows = nonConformingRows();
  const search = byId("ncSearch").value.toLowerCase();
  const areaFilter = byId("ncAreaFilter").value;
  const typeFilter = byId("ncTypeFilter").value;
  const filtered = rows.filter(({ point, inspection }) => {
    const area = findIn("areas", point.areaId);
    const type = findIn("types", point.typeId);
    const user = findIn("users", inspection.userId);
    const haystack = `${point.code} ${area.name} ${type.name} ${user.name} ${inspection.notes}`.toLowerCase();
    return (!search || haystack.includes(search))
      && (!areaFilter || point.areaId === areaFilter)
      && (!typeFilter || point.typeId === typeFilter);
  });

  const out = rows.filter(row => isOutOfRange(row.inspection)).length;
  const corrections = rows.filter(row => row.inspection.correction === "Sim").length;
  
  byId("ncCards").innerHTML = [
    ["Pendências Ativas", rows.length],
    ["Fora de Faixa", out],
    ["Correção Pendente", corrections]
  ].map(([label, value]) => `<div class="card"><span>${label}</span><strong>${value}</strong></div>`).join("");

  if (!filtered.length) {
    byId("ncList").innerHTML = `<p class="muted" style="padding: 20px; text-align: center;">Nenhuma não conformidade ativa encontrada.</p>`;
    return;
  }

  const tableHtml = `
    <table class="modern-table">
      <thead>
        <tr>
          <th>Ponto</th>
          <th>Data da falha</th>
          <th>Área</th>
          <th>Tipo</th>
          <th>Responsável</th>
          <th>Resistência</th>
          <th>Continuidade</th>
          <th>Situação / Tipo de Anomalia</th>
          <th>Observações</th>
          <th style="width: 180px; text-align: center;">Ações</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(({ point, inspection }) => {
          const area = findIn("areas", point.areaId);
          const type = findIn("types", point.typeId);
          const user = findIn("users", inspection.userId);
          const outOfRange = isOutOfRange(inspection);
          
          let alertBadges = [];
          if (inspection.conformity === "Nao conforme") alertBadges.push(`<span class="badge bad">Não Conforme</span>`);
          if (inspection.conformity === "Monitorar") alertBadges.push(`<span class="badge warn">Monitorar</span>`);
          if (outOfRange) alertBadges.push(`<span class="badge bad">Fora de Faixa</span>`);
          if (inspection.correction === "Sim") alertBadges.push(`<span class="badge warn">Requer Correção</span>`);
          if (inspection.oxidation === "Sim") alertBadges.push(`<span class="badge warn">Oxidação</span>`);

          return `
            <tr>
              <td><strong>${point.code}</strong></td>
              <td>${new Date(inspection.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
              <td>${area.name}</td>
              <td>${type.name}</td>
              <td>${user.name || "N/D"}</td>
              <td class="${Number(inspection.resistance) > Number(state.limits.resistance) ? 'bad' : ''}">${money(inspection.resistance)} Ω</td>
              <td class="${Number(inspection.continuity) > Number(state.limits.continuity) ? 'bad' : ''}">${money(inspection.continuity)} mΩ</td>
              <td>
                <div style="display: flex; gap: 4px; flex-direction: column;">
                  ${alertBadges.join("")}
                </div>
              </td>
              <td><small>${inspection.notes || "—"}</small></td>
              <td style="text-align: center;">
                <div class="actions-cell" style="justify-content: center;">
                  <button data-sheet-point="${point.id}">Ficha</button>
                  ${point.lat && point.lng ? `<a class="button-link" target="_blank" rel="noopener" href="${mapUrl(point)}">Mapa</a>` : ""}
                </div>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
  byId("ncList").innerHTML = tableHtml;
}

function countBy(rows, getter) {
  return rows.reduce((acc, row) => {
    const key = getter(row) || "N/D";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function average(rows) {
  const values = rows.map(Number).filter(Number.isFinite);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function canvasBase(id) {
  const canvas = byId(id);
  if (!canvas || typeof canvas.getContext !== "function") return null;
  let ctx;
  try {
    ctx = canvas.getContext("2d");
  } catch {
    return null;
  }
  if (!ctx) return null;
  const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 300;
  const h = Number(canvas.getAttribute("height")) || 220;
  canvas.width = w * devicePixelRatio;
  canvas.height = h * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { canvas, ctx, w, h };
}

const chartPalette = {
  surface: "#0b1020",
  grid: "rgba(255, 255, 255, 0.09)",
  ink: "#f5f7ff",
  muted: "#9aa6c2",
  brand: "#8b5cf6",
  brandDark: "#2563eb",
  accent: "#f97316",
  ok: "#22c55e",
  warn: "#f59e0b",
  bad: "#fb7185"
};

function drawHorizontalBars(id, items, { emptyLabel = "Sem dados para exibir." } = {}) {
  const base = canvasBase(id);
  if (!base) return;
  const { ctx, w, h } = base;
  paintChartBackground(ctx, w, h);

  if (!items.length) {
    drawEmptyState(ctx, w, h, emptyLabel);
    return;
  }

  const margin = { top: 24, right: 26, bottom: 24, left: 82 };
  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;
  const max = Math.max(...items.map(item => item.value), 1);
  const gap = Math.max(10, Math.min(16, innerH * 0.05));
  const barH = (innerH - gap * (items.length - 1)) / items.length;
  const axisSteps = 4;

  ctx.save();
  ctx.strokeStyle = chartPalette.grid;
  ctx.setLineDash([4, 8]);
  for (let step = 0; step <= axisSteps; step++) {
    const x = margin.left + (innerW / axisSteps) * step;
    ctx.beginPath();
    ctx.moveTo(x, margin.top - 6);
    ctx.lineTo(x, h - margin.bottom + 8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = chartPalette.muted;
    ctx.font = "11px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round((max / axisSteps) * step)}`, x, h - 8);
    ctx.setLineDash([4, 8]);
  }
  ctx.restore();

  items.forEach((item, index) => {
    const y = margin.top + index * (barH + gap);
    const label = truncateText(ctx, item.label, margin.left - 16);
    const value = item.value;
    const ratio = value / max;
    const barW = Math.max(2, innerW * ratio);
    const radius = Math.min(barH / 2, 12);
    const barX = margin.left;

    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    roundedRect(ctx, barX, y, innerW, barH, radius);
    ctx.fill();

    const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    gradient.addColorStop(0, chartPalette.brandDark);
    gradient.addColorStop(1, chartPalette.brand);
    ctx.fillStyle = gradient;
    roundedRect(ctx, barX, y, barW, barH, radius);
    ctx.fill();

    ctx.fillStyle = chartPalette.ink;
    ctx.font = "700 12px 'Segoe UI', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(label, margin.left - 14, y + barH / 2);

    ctx.fillStyle = chartPalette.ink;
    ctx.textAlign = barW > 52 ? "right" : "left";
    const valueTextX = barW > 52 ? barX + barW - 10 : barX + barW + 10;
    ctx.fillText(String(value), valueTextX, y + barH / 2);
  });
}

function drawDonut(id, items, { centerLabel = "", centerValue = "", centerCaption = "", emptyLabel = "Sem dados para exibir." } = {}) {
  const base = canvasBase(id);
  if (!base) return;
  const { ctx, w, h } = base;
  paintChartBackground(ctx, w, h);

  const visible = items.filter(item => item.value > 0);
  if (!visible.length) {
    drawEmptyState(ctx, w, h, emptyLabel);
    return;
  }

  const total = visible.reduce((sum, item) => sum + item.value, 0);
  const isCompact = w < 470;
  const cx = isCompact ? w * 0.5 : w * 0.34;
  const cy = h * 0.5;
  const radius = Math.min(w, h) * 0.28;
  const thickness = Math.max(20, radius * 0.34);
  let start = -Math.PI / 2;

  visible.forEach((item, index) => {
    const angle = (Math.PI * 2 * item.value) / total;
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = thickness;
    ctx.strokeStyle = item.color || donutPalette(index);
    ctx.lineCap = "round";
    ctx.shadowColor = item.color || donutPalette(index);
    ctx.shadowBlur = 14;
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.stroke();
    ctx.restore();
    start += angle;
  });

  ctx.save();
  const innerGlow = ctx.createRadialGradient(cx, cy, 8, cx, cy, radius - thickness / 2);
  innerGlow.addColorStop(0, "rgba(15, 23, 42, 0.95)");
  innerGlow.addColorStop(1, "rgba(8, 11, 22, 0.98)");
  ctx.fillStyle = innerGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - thickness / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = chartPalette.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 26px 'Segoe UI', sans-serif";
  ctx.fillText(String(centerValue), cx, cy - 12);
  ctx.font = "700 12px 'Segoe UI', sans-serif";
  ctx.fillStyle = chartPalette.muted;
  ctx.fillText(centerLabel, cx, cy + 10);
  if (centerCaption) {
    ctx.font = "600 11px 'Segoe UI', sans-serif";
    ctx.fillText(centerCaption, cx, cy + 28);
  }
  ctx.restore();

  const legendX = isCompact ? w * 0.08 : w * 0.60;
  const legendY = isCompact ? h * 0.76 : h * 0.20;
  const legendWidth = isCompact ? w * 0.84 : w * 0.34;
  const rowH = 32;

  visible.forEach((item, index) => {
    const y = legendY + index * rowH;
    const pct = `${Math.round((item.value / total) * 100)}%`;
    const color = item.color || donutPalette(index);
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    roundedRect(ctx, legendX, y - 10, legendWidth, 18, 9);
    ctx.fill();
    ctx.fillStyle = color;
    roundedRect(ctx, legendX, y - 10, Math.max(24, (legendWidth * item.value) / total), 18, 9);
    ctx.fill();
    ctx.fillStyle = chartPalette.ink;
    ctx.font = "700 12px 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(item.label, legendX + 10, y + 2);
    ctx.fillStyle = chartPalette.muted;
    ctx.textAlign = "right";
    ctx.fillText(`${item.value} (${pct})`, legendX + legendWidth, y + 2);
  });
}

function drawTrendLine(id, labels, values, { referenceValue = null, emptyLabel = "Sem dados para exibir." } = {}) {
  const base = canvasBase(id);
  if (!base) return;
  const { ctx, w, h } = base;
  paintChartBackground(ctx, w, h);

  if (!values.length) {
    drawEmptyState(ctx, w, h, emptyLabel);
    return;
  }

  const margin = { top: 20, right: 24, bottom: 42, left: 52 };
  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;
  const normalized = values.map(Number).filter(Number.isFinite);
  const yMax = Math.max(...normalized, referenceValue || 0, 1);
  const yMin = Math.min(...normalized, referenceValue || 0, 0);
  const padding = (yMax - yMin) * 0.18 || 1;
  const min = Math.max(0, yMin - padding);
  const max = yMax + padding;
  const range = Math.max(max - min, 1);
  const points = normalized.map((value, index) => {
    const x = margin.left + (innerW / Math.max(values.length - 1, 1)) * index;
    const y = margin.top + innerH - ((value - min) / range) * innerH;
    return { x, y, value, label: labels[index] };
  });

  ctx.save();
  ctx.strokeStyle = chartPalette.grid;
  ctx.fillStyle = chartPalette.muted;
  ctx.font = "11px 'Segoe UI', sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = margin.top + innerH - (innerH / steps) * i;
    const value = min + (range / steps) * i;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(w - margin.right, y);
    ctx.stroke();
    ctx.fillText(money(value), margin.left - 10, y);
  }
  ctx.restore();

  if (referenceValue !== null && Number.isFinite(referenceValue)) {
    const limitY = margin.top + innerH - ((referenceValue - min) / range) * innerH;
    ctx.save();
    ctx.strokeStyle = chartPalette.accent;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(margin.left, limitY);
    ctx.lineTo(w - margin.right, limitY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = chartPalette.accent;
    ctx.font = "700 11px 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(`Limite ${money(referenceValue)} Ω`, margin.left + 6, limitY - 4);
    ctx.restore();
  }

  const lineGradient = ctx.createLinearGradient(margin.left, 0, w - margin.right, 0);
  lineGradient.addColorStop(0, chartPalette.brandDark);
  lineGradient.addColorStop(1, chartPalette.brand);
  const fillGradient = ctx.createLinearGradient(0, margin.top, 0, h - margin.bottom);
  fillGradient.addColorStop(0, "rgba(139, 92, 246, 0.26)");
  fillGradient.addColorStop(1, "rgba(37, 99, 235, 0.03)");

  const areaStartY = margin.top + innerH;
  ctx.save();
  ctx.beginPath();
  points.forEach((point, index) => {
    if (!index) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.lineTo(points.at(-1).x, areaStartY);
  ctx.lineTo(points[0].x, areaStartY);
  ctx.closePath();
  ctx.fillStyle = fillGradient;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  points.forEach((point, index) => {
    if (!index) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = lineGradient;
  ctx.lineWidth = 3.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();

  const step = Math.max(1, Math.ceil(points.length / 6));
  points.forEach((point, index) => {
    ctx.save();
    ctx.fillStyle = chartPalette.surface;
    ctx.strokeStyle = chartPalette.brand;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (points.length <= 8 || index % step === 0 || index === points.length - 1) {
      ctx.fillStyle = chartPalette.muted;
      ctx.font = "600 11px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(point.label, point.x, h - 30);
    }
    ctx.fillStyle = chartPalette.ink;
    ctx.font = "700 11px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(money(point.value), point.x, point.y - 10);
    ctx.restore();
  });
}

function paintChartBackground(ctx, w, h) {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, "#0d1326");
  background.addColorStop(1, "#070b17");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.18, h * 0.18, 10, w * 0.18, h * 0.18, Math.max(w, h) * 0.55);
  glow.addColorStop(0, "rgba(139, 92, 246, 0.10)");
  glow.addColorStop(1, "rgba(139, 92, 246, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  roundedRect(ctx, 0.5, 0.5, w - 1, h - 1, 18);
  ctx.stroke();
  ctx.restore();
}

function drawEmptyState(ctx, w, h, label) {
  ctx.save();
  ctx.fillStyle = chartPalette.muted;
  ctx.font = "600 13px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, w / 2, h / 2);
  ctx.restore();
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let output = text;
  while (output.length > 1 && ctx.measureText(`${output}…`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}…`;
}

function donutPalette(index) {
  return [chartPalette.brand, chartPalette.accent, chartPalette.bad, chartPalette.warn][index % 4];
}

function formatShortDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString.slice(5);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function renderConfig() {
  renderMini("clientList", state.clients, item => `${item.name} (${item.sigla})`, "client");
  renderMini("unitList", state.units, item => `${item.name} (${item.sigla})`, "unit");
  renderMini("configAreaList", state.areas, item => `${item.name} (${item.sigla})`, "area");
  renderMini("configTypeList", state.types, item => `${item.name} (${item.sigla})`, "type");
  renderMini("userList", state.users, item => `${item.name} - ${displayAccented(item.role)}`, "user");
}

function renderMini(target, rows, label, prefix) {
  byId(target).innerHTML = rows.map(item => `<div class="mini"><span>${label(item)}</span><button data-edit-${prefix}="${item.id}">Editar</button></div>`).join("");
}

function renderQrCodes() {
  byId("qrBase").value = state.qrBase || currentBaseUrl();
  const activeBase = qrBaseUrl();
  const samplePayload = state.points[0] ? qrPayload(state.points[0].code) : activeBase;
  byId("qrHelp").textContent = isLocalhost(activeBase)
    ? `Os QR Codes apontam para ${activeBase}. Para ler com a câmera nativa do celular, troque localhost pelo IP exibido no terminal.`
    : `Os QR Codes abrem fichas em ${activeBase}.`;
  if (samplePayload.length > 78) {
    byId("qrHelp").textContent += " A URL está longa demais para este protótipo; use um endereço base mais curto.";
  }
  byId("qrGrid").innerHTML = state.points.map(point => {
    const area = findIn("areas", point.areaId);
    return `<div class="qr-card"><canvas data-qr="${point.id}"></canvas><strong>${point.code}</strong><span>${area.name}</span><a href="${qrPayload(point.code)}">Abrir ficha</a></div>`;
  }).join("");
  document.querySelectorAll("[data-qr]").forEach(canvas => {
    const point = findIn("points", canvas.dataset.qr);
    drawQr(canvas, qrPayload(point.code));
  });
}

function currentBaseUrl() {
  return `${location.origin}${location.pathname}`.replace(/\/$/, "");
}

function qrBaseUrl() {
  return (state.qrBase || currentBaseUrl()).replace(/\/$/, "");
}

function qrPayload(code) {
  return `${qrBaseUrl()}?p=${encodeURIComponent(code)}`;
}

function isLocalhost(url) {
  try {
    const host = new URL(url, location.href).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

function openSheet(pointId) {
  const point = findIn("points", pointId);
  const client = findIn("clients", point.clientId);
  const unit = findIn("units", point.unitId);
  const area = findIn("areas", point.areaId);
  const type = findIn("types", point.typeId);
  const inspections = state.inspections.filter(item => item.pointId === pointId).sort((a, b) => b.date.localeCompare(a.date));
  byId("pointSheet").innerHTML = `<div class="sheet">
    <div class="sheet-head">
      <div>
        <h1>${point.code}</h1>
        <p>${type.name} - ${area.name}</p>
        <dl>
          <dt>Cliente</dt><dd>${client.name}</dd>
          <dt>Unidade</dt><dd>${unit.name}</dd>
          <dt>Localização</dt><dd>${point.location}</dd>
          <dt>Criticidade</dt><dd>${displayAccented(point.criticality)}</dd>
          <dt>Status</dt><dd>${displayAccented(point.status)}</dd>
          <dt>Descrição</dt><dd>${point.description || ""}</dd>
          <dt>Observações</dt><dd>${point.notes || ""}</dd>
        </dl>
      </div>
      <canvas id="sheetQr"></canvas>
    </div>
    <div class="history">
      <h2>Histórico de inspeções</h2>
      <table><thead><tr><th>Data</th><th>Responsável</th><th>Visual</th><th>Continuidade</th><th>Resistência</th><th>Status</th><th>Obs.</th></tr></thead>
      <tbody>${inspections.map(item => `<tr><td>${item.date}</td><td>${findIn("users", item.userId).name}</td><td>${displayAccented(item.visual)}</td><td>${money(item.continuity)} mOhm</td><td>${money(item.resistance)} Ohm</td><td>${displayAccented(item.conformity)}</td><td>${item.notes || ""}</td></tr>`).join("")}</tbody></table>
    </div>
  </div>`;
  drawQr(byId("sheetQr"), qrPayload(point.code));
  const dialog = byId("pointDialog");
  if (dialog && typeof dialog.showModal === "function") dialog.showModal();
  else if (dialog) dialog.setAttribute("open", "open");
}

// ===== Autenticação =====
function renderAuth() {
  const session = JSON.parse(storage.getItem(AUTH_KEY) || "null");
  const loginScreen = byId("loginScreen");
  const logoutBtn = byId("logoutBtn");
  const authUser = byId("authUser");
  document.body.classList.toggle("auth-locked", !session);
  if (session) {
    loginScreen.style.display = "none";
    document.querySelector("main").style.display = "";
    authUser.textContent = session.name;
    logoutBtn.style.display = "";
  } else {
    loginScreen.style.display = "";
    document.querySelector("main").style.display = "none";
    authUser.textContent = "Visitante";
    logoutBtn.style.display = "none";
  }
}

function doLogin(event) {
  event.preventDefault();
  const userId = byId("loginUser").value;
  const password = byId("loginPassword").value;
  const user = findIn("users", userId);
  if (user.password !== password) { alert("Senha incorreta."); return; }
  storage.setItem(AUTH_KEY, JSON.stringify({ id: user.id, name: user.name }));
  renderAuth();
}

function doLogout() {
  storage.removeItem(AUTH_KEY);
  renderAuth();
}

// ===== Auditoria =====
function addAudit(action, target) {
  const session = JSON.parse(storage.getItem(AUTH_KEY) || "null");
  state.audit.unshift({ id: uid(), date: new Date().toISOString(), user: session?.name || "Sistema", action, target });
  if (state.audit.length > 200) state.audit.length = 200;
}

function renderAudit() {
  byId("auditList").innerHTML = state.audit.slice(0, 50).map(a =>
    `<div class="mini"><span>${new Date(a.date).toLocaleString("pt-BR")} — <strong>${a.user}</strong>: ${a.action} → ${a.target}</span></div>`
  ).join("") || `<p class="muted">Nenhuma alteração registrada.</p>`;
}

// ===== Upload de fotos =====
function handlePhotoUpload(fileInputId, previewId, callback) {
  const file = byId(fileInputId).files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    callback(dataUrl);
    byId(previewId).innerHTML = `<img src="${dataUrl}" alt="Preview" style="max-width:100%;max-height:180px;border-radius:6px;">`;
  };
  reader.readAsDataURL(file);
}

// ===== Relatório PDF simples =====
function generateReport() {
  const w = safeOpenWindow("Relatório SPDA");
  if (!w) return;
  const latest = state.points.map(p => ({ point: p, insp: latestInspection(p.id) }));
  const rows = latest.map(({ point, insp }) => {
    const area = findIn("areas", point.areaId);
    return `<tr><td>${point.code}</td><td>${area.name}</td><td>${point.location}</td><td>${insp ? money(insp.resistance) + " Ω" : "—"}</td><td>${insp ? displayAccented(insp.conformity) : "—"}</td></tr>`;
  }).join("");
  writeReportDocument(w, "Relatório Nebula SPDA", `<h1>Relatório Nebula SPDA</h1><p>Gerado em ${new Date().toLocaleString("pt-BR")}</p><table><thead><tr><th>Código</th><th>Área</th><th>Localização</th><th>Resistência</th><th>Situação</th></tr></thead><tbody>${rows}</tbody></table>`);
}

function generateNcReport() {
  const w = safeOpenWindow("Não Conformidades Nebula SPDA");
  if (!w) return;
  const rows = nonConformingRows().map(({ point, inspection }) => {
    const area = findIn("areas", point.areaId);
    return `<tr><td>${point.code}</td><td>${area.name}</td><td>${money(inspection.resistance)} Ω</td><td>${money(inspection.continuity)} mΩ</td><td>${displayAccented(inspection.conformity)}</td><td>${inspection.notes || ""}</td></tr>`;
  }).join("");
  writeReportDocument(w, "Não Conformidades Nebula SPDA", `<h1>Relatório de Não Conformidades</h1><p>Gerado em ${new Date().toLocaleString("pt-BR")}</p><table><thead><tr><th>Código</th><th>Área</th><th>Resistência</th><th>Continuidade</th><th>Situação</th><th>Observações</th></tr></thead><tbody>${rows}</tbody></table>`);
}

function downloadAllQrCodes() {
  if (state.points.length === 0) return;
  const canvas = document.createElement("canvas");
  const cols = 4;
  const cellW = 220, cellH = 260;
  const total = state.points.length;
  const rowCount = Math.ceil(total / cols);
  canvas.width = cols * cellW;
  canvas.height = rowCount * cellH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  state.points.forEach((point, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = col * cellW + 26, y = row * cellH + 10;
    const tempCanvas = document.createElement("canvas");
    drawQr(tempCanvas, qrPayload(point.code));
    ctx.drawImage(tempCanvas, x, y, 168, 168);
    ctx.fillStyle = "#111";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(point.code, x + 84, y + 190);
  });
  const link = document.createElement("a");
  link.download = "qrcodes-nebula-spda.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
    document.querySelectorAll(".tab,.view").forEach(el => el.classList.remove("active"));
    tab.classList.add("active");
    byId(tab.dataset.view).classList.add("active");
    renderDashboard();
  }));
  ["pointClient", "pointArea", "pointType", "pointNumber"].forEach(id => byId(id).addEventListener("input", updatePointCode));
  ["pointSearch", "areaFilter", "typeFilter", "inspectionSearch", "inspectionFilterPoint"].forEach(id => byId(id).addEventListener("input", render));
  ["pointStatusFilter", "inspectionFilterStatus", "ncSearch", "ncAreaFilter", "ncTypeFilter"].forEach(id => byId(id).addEventListener("input", render));
  byId("trendPoint").addEventListener("change", renderTrend);
  byId("closeDialog").addEventListener("click", () => {
    const dialog = byId("pointDialog");
    if (dialog && typeof dialog.close === "function") dialog.close();
    else if (dialog) dialog.removeAttribute("open");
  });
  byId("newPoint").addEventListener("click", clearPointForm);
  byId("deletePoint").addEventListener("click", deleteSelectedPoint);
  byId("clearInspection").addEventListener("click", clearInspectionForm);
  byId("seedReset").addEventListener("click", () => { if (confirm("Restaurar a base exemplo e substituir os dados atuais?")) { state = buildSeed(); render(); } });
  byId("clearData").addEventListener("click", () => { if (confirm("Apagar todos os dados do navegador?")) { state = { ...buildSeed(), points: [], inspections: [] }; render(); } });
  byId("printQr").addEventListener("click", () => window.print());
  byId("startScan").addEventListener("click", startScanner);
  byId("stopScan").addEventListener("click", stopScanner);
  byId("applyQrBase").addEventListener("click", () => { state.qrBase = byId("qrBase").value.trim(); renderQrCodes(); save(); });
  byId("exportData").addEventListener("click", exportData);
  byId("importData").addEventListener("change", importData);

  // Login / Logout
  byId("loginForm").addEventListener("submit", doLogin)
  byId("logoutBtn").addEventListener("click", doLogout)

  // Relatórios PDF
  byId("reportPdf").addEventListener("click", generateReport);
  byId("ncReportPdf").addEventListener("click", generateNcReport);

  // Download QR Codes
  byId("downloadAllQr").addEventListener("click", downloadAllQrCodes);

  // Limites de não conformidade
  byId("saveLimits").addEventListener("click", () => {
      state.limits.resistance = Number(byId("limitResistance").value || 10);
      state.limits.continuity = Number(byId("limitContinuity").value || 100);
      addAudit("Limites alterados", `Res: ${state.limits.resistance} Ω / Cont: ${state.limits.continuity} mΩ`);
      render();
    });

    // Upload de fotos
  byId("pointPhotoFile").addEventListener("change", () => handlePhotoUpload("pointPhotoFile", "pointPhotoPreview", url => { uploadedPointPhoto = url; }));
  byId("inspectionPhotoFile").addEventListener("change", () => handlePhotoUpload("inspectionPhotoFile", "inspectionPhotoPreview", url => { uploadedInspectionPhoto = url; }));

  byId("pointForm").addEventListener("submit", savePoint);
  byId("inspectionForm").addEventListener("submit", saveInspection);
  byId("clientForm").addEventListener("submit", event => saveConfig(event, "clients", ["clientName", "clientSigla"], item => ({ name: item[0], sigla: item[1].toUpperCase() }), "client"));
  byId("unitForm").addEventListener("submit", event => saveConfig(event, "units", ["unitName", "unitSigla"], item => ({ clientId: byId("unitClient").value, name: item[0], sigla: item[1].toUpperCase() }), "unit"));
  byId("areaForm").addEventListener("submit", event => saveConfig(event, "areas", ["areaName", "areaSigla"], item => ({ name: item[0], sigla: item[1].toUpperCase() }), "area"));
  byId("typeForm").addEventListener("submit", event => saveConfig(event, "types", ["typeName", "typeSigla", "typeDescription"], item => ({ name: item[0], sigla: item[1].toUpperCase(), description: item[2] }), "type"));
  byId("userForm").addEventListener("submit", event => saveConfig(event, "users", ["userName", "userRole", "userPassword"], item => ({ name: item[0], role: item[1], password: item[2] || "1234" }), "user"));

  document.addEventListener("click", event => {
      const editPoint = event.target.dataset.editPoint;
      const sheetPoint = event.target.dataset.sheetPoint;
      if (editPoint) fillPointForm(editPoint);
      if (sheetPoint) openSheet(sheetPoint);
      ["client", "unit", "area", "type", "user"].forEach(prefix => {
        const id = event.target.dataset[`edit${prefix[0].toUpperCase()}${prefix.slice(1)}`];
        if (id) fillConfigForm(prefix, id);
      });
    });
}

function savePoint(event) {
  event.preventDefault();
  const id = byId("pointId").value || uid();
  const isNew = !state.points.find(p => p.id === id);
  const point = {
    id,
    clientId: byId("pointClient").value,
    unitId: byId("pointUnit").value,
    areaId: byId("pointArea").value,
    typeId: byId("pointType").value,
    number: Number(byId("pointNumber").value),
    code: byId("pointCode").value,
    location: byId("pointLocation").value,
    description: byId("pointDescription").value,
    criticality: byId("pointCriticality").value,
    status: byId("pointStatus").value,
    photo: byId("pointPhoto").value,
    photoData: uploadedPointPhoto || findIn("points", id).photoData || "",
    lat: byId("pointLat").value || "",
    lng: byId("pointLng").value || "",
    notes: byId("pointNotes").value
  };
  const duplicate = state.points.find(item => item.code === point.code && item.id !== id);
  if (duplicate) return alert("Já existe um ponto com este código.");
  upsert(state.points, point);
  addAudit(isNew ? "Ponto criado" : "Ponto editado", point.code);
  selectedPoint = id;
  uploadedPointPhoto = "";
  byId("pointPhotoPreview").innerHTML = "";
  render();
}

function fillPointForm(id) {
  const point = findIn("points", id);
  selectedPoint = id;
  byId("pointId").value = point.id;
  byId("pointClient").value = point.clientId;
  byId("pointUnit").value = point.unitId;
  byId("pointArea").value = point.areaId;
  byId("pointType").value = point.typeId;
  byId("pointNumber").value = point.number;
  byId("pointCode").value = point.code;
  byId("pointLocation").value = point.location;
  byId("pointDescription").value = point.description;
  byId("pointCriticality").value = point.criticality;
  byId("pointStatus").value = point.status;
  byId("pointPhoto").value = point.photo;
  byId("pointLat").value = point.lat || "";
  byId("pointLng").value = point.lng || "";
  byId("pointNotes").value = point.notes;
  const photo = point.photoData || point.photo;
  byId("pointPhotoPreview").innerHTML = photo ? `<img src="${photo}" alt="Foto" style="max-width:100%;max-height:180px;border-radius:6px;">` : "";
}

function clearPointForm() {
  byId("pointForm").reset();
  byId("pointId").value = "";
  byId("pointNumber").value = nextNumber();
  selectedPoint = null;
  updatePointCode();
}

function nextNumber() {
  const areaId = byId("pointArea").value;
  const typeId = byId("pointType").value;
  const numbers = state.points.filter(p => p.areaId === areaId && p.typeId === typeId).map(p => p.number);
  return Math.max(0, ...numbers) + 1;
}

function deleteSelectedPoint() {
  const id = byId("pointId").value || selectedPoint;
  if (!id) return;
  if (!confirm("Excluir este ponto e suas inspeções?")) return;
  state.points = state.points.filter(item => item.id !== id);
  state.inspections = state.inspections.filter(item => item.pointId !== id);
  clearPointForm();
  render();
}

function saveInspection(event) {
  event.preventDefault();
  const id = byId("inspectionId").value || uid();
  const isNew = !state.inspections.find(i => i.id === id);
  const pointId = byId("inspectionPoint").value;
  const point = findIn("points", pointId);
  const inspection = {
    id,
    pointId,
    date: byId("inspectionDate").value,
    userId: byId("inspectionUser").value,
    visual: byId("inspectionVisual").value,
    continuity: Number(byId("inspectionContinuity").value || 0),
    resistance: Number(byId("inspectionResistance").value || 0),
    oxidation: byId("inspectionOxidation").value,
    correction: byId("inspectionCorrection").value,
    conformity: byId("inspectionConformity").value,
    photo: byId("inspectionPhoto").value,
    photoData: uploadedInspectionPhoto || findIn("inspections", id).photoData || "",
    notes: byId("inspectionNotes").value
  };
  upsert(state.inspections, inspection);
  addAudit(isNew ? "Inspeção registrada" : "Inspeção alterada", point.code || pointId);
  uploadedInspectionPhoto = "";
  byId("inspectionPhotoPreview").innerHTML = "";
  clearInspectionForm();
  render();
}

function clearInspectionForm() {
  byId("inspectionForm").reset();
  byId("inspectionId").value = "";
  byId("inspectionDate").value = today();
}

function saveConfig(event, collection, ids, mapper, prefix) {
  event.preventDefault();
  const values = ids.map(id => byId(id).value.trim());
  const id = byId(`${prefix}Id`).value || uid();
  upsert(state[collection], { id, ...mapper(values) });
  event.target.reset();
  byId(`${prefix}Id`).value = "";
  render();
}

function fillConfigForm(prefix, id) {
  const map = {
    client: ["clients", { clientName: "name", clientSigla: "sigla" }],
    unit: ["units", { unitName: "name", unitSigla: "sigla", unitClient: "clientId" }],
    area: ["areas", { areaName: "name", areaSigla: "sigla" }],
    type: ["types", { typeName: "name", typeSigla: "sigla", typeDescription: "description" }],
    user: ["users", { userName: "name", userRole: "role" }]
  };
  const [collection, fields] = map[prefix];
  const item = findIn(collection, id);
  byId(`${prefix}Id`).value = id;
  Object.entries(fields).forEach(([input, key]) => byId(input).value = item[key] || "");
}

function upsert(rows, item) {
  const index = rows.findIndex(row => row.id === item.id);
  if (index >= 0) rows[index] = item;
  else rows.push(item);
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "nebula-spda-dados.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = migrateState(JSON.parse(reader.result));
      render();
    } catch {
      alert("Arquivo JSON inválido.");
    }
  };
  reader.readAsText(file);
}

function initFromQuery() {
  const code = new URLSearchParams(location.search).get("p");
  if (!code) return;
  const point = state.points.find(item => item.code === code);
  if (point) setTimeout(() => openSheet(point.id), 200);
}

async function startScanner() {
  if (!("BarcodeDetector" in window)) {
    byId("scanStatus").textContent = "Este navegador não oferece BarcodeDetector. Use o QR gerado ou informe ?p=CÓDIGO na URL.";
    byId("scanBox").classList.add("active");
    return;
  }
  try {
    stopScanner();
    byId("scanBox").classList.add("active");
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const video = byId("scanVideo");
    video.srcObject = scanStream;
    await video.play();
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    byId("scanStatus").textContent = "Câmera ativa. Aponte para uma etiqueta QR.";
    scanTimer = setInterval(async () => {
      const codes = await detector.detect(video).catch(() => []);
      if (!codes.length) return;
      const raw = codes[0].rawValue || "";
      const code = raw.startsWith("SPDA:") ? raw.replace("SPDA:", "") : new URL(raw, location.href).searchParams.get("p");
      const point = state.points.find(item => item.code === code);
      if (point) {
        byId("scanStatus").textContent = `QR lido: ${point.code}`;
        stopScanner(false);
        openSheet(point.id);
      } else {
        byId("scanStatus").textContent = `QR lido, mas ponto não encontrado: ${raw}`;
      }
    }, 700);
  } catch (error) {
    byId("scanStatus").textContent = "Não foi possível acessar a câmera neste navegador.";
    byId("scanBox").classList.add("active");
  }
}

function stopScanner(hide = true) {
  if (scanTimer) clearInterval(scanTimer);
  scanTimer = null;
  if (scanStream) scanStream.getTracks().forEach(track => track.stop());
  scanStream = null;
  byId("scanVideo").srcObject = null;
  if (hide) byId("scanBox").classList.remove("active");
}

function drawQr(canvas, text) {
  const matrix = qrMatrix(text);
  const size = matrix.length;
  const scale = 6;
  const pad = 4;
  canvas.width = (size + pad * 2) * scale;
  canvas.height = (size + pad * 2) * scale;
  let ctx;
  try {
    ctx = canvas.getContext("2d");
  } catch {
    return;
  }
  if (!ctx) return;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111";
  matrix.forEach((row, y) => row.forEach((bit, x) => {
    if (bit) ctx.fillRect((x + pad) * scale, (y + pad) * scale, scale, scale);
  }));
}

function safeOpenWindow(title) {
  try {
    const w = window.open("", "_blank");
    if (!w) {
      alert("O navegador bloqueou a abertura do relatório.");
      return null;
    }
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left;vertical-align:top}th{background:#006b5c;color:#fff}h1{color:#006b5c}</style></head><body>`);
    return w;
  } catch {
    return null;
  }
}

function writeReportDocument(w, title, bodyHtml) {
  w.document.write(`${bodyHtml}</body></html>`);
  w.document.close();
  try {
    w.focus();
    w.print();
  } catch {
    // If printing is blocked, the report still opens as a readable document.
  }
}

// QR Code byte mode, version 4-L. Capacity is enough for short local URLs.
function qrMatrix(text) {
  const size = 33, ecCount = 20, dataCount = 80;
  const bytes = [...new TextEncoder().encode(text)].slice(0, 78);
  const bits = [0, 1, 0, 0, ...toBits(bytes.length, 8)];
  bytes.forEach(byte => bits.push(...toBits(byte, 8)));
  bits.push(0, 0, 0, 0);
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length && data.length < dataCount; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let pad = 0; data.length < dataCount; pad++) data.push(pad % 2 ? 0x11 : 0xec);
  const codewords = data.concat(rsEncode(data, ecCount));
  let best = null, bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const reserved = Array.from({ length: size }, () => Array(size).fill(false));
    const m = Array.from({ length: size }, () => Array(size).fill(false));
    placePatterns(m, reserved);
    placeData(m, reserved, codewords, mask);
    placeFormat(m, reserved, mask);
    const score = penalty(m);
    if (score < bestScore) { best = m; bestScore = score; }
  }
  return best;
}

function toBits(value, length) {
  return Array.from({ length }, (_, i) => (value >> (length - 1 - i)) & 1);
}

function placePatterns(m, r) {
  const size = m.length;
  [[0, 0], [size - 7, 0], [0, size - 7]].forEach(([x, y]) => finder(m, r, x, y));
  for (let i = 0; i < size; i++) {
    set(m, r, 6, i, i % 2 === 0); set(m, r, i, 6, i % 2 === 0);
  }
  alignment(m, r, 26, 26);
  set(m, r, 8, size - 8, true);
  for (let i = 0; i < 9; i++) { reserve(r, 8, i); reserve(r, i, 8); reserve(r, size - 1 - i, 8); reserve(r, 8, size - 1 - i); }
}

function finder(m, r, x, y) {
  for (let dy = -1; dy <= 7; dy++) for (let dx = -1; dx <= 7; dx++) {
    const xx = x + dx, yy = y + dy;
    if (yy < 0 || xx < 0 || yy >= m.length || xx >= m.length) continue;
    const on = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
    set(m, r, xx, yy, on);
  }
}

function alignment(m, r, cx, cy) {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    set(m, r, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
}

function set(m, r, x, y, value) {
  if (x < 0 || y < 0 || x >= m.length || y >= m.length) return;
  m[y][x] = value; r[y][x] = true;
}

function reserve(r, x, y) {
  if (x >= 0 && y >= 0 && x < r.length && y < r.length) r[y][x] = true;
}

function placeData(m, r, codewords, mask) {
  const bits = codewords.flatMap(byte => toBits(byte, 8));
  let i = 0, up = true;
  for (let x = m.length - 1; x > 0; x -= 2) {
    if (x === 6) x--;
    for (let row = 0; row < m.length; row++) {
      const y = up ? m.length - 1 - row : row;
      for (let dx = 0; dx < 2; dx++) {
        const xx = x - dx;
        if (r[y][xx]) continue;
        const bit = Boolean(bits[i++] || 0);
        m[y][xx] = bit !== maskBit(mask, xx, y);
      }
    }
    up = !up;
  }
}

function maskBit(mask, x, y) {
  return [
    (x + y) % 2 === 0,
    y % 2 === 0,
    x % 3 === 0,
    (x + y) % 3 === 0,
    (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
    ((x * y) % 2) + ((x * y) % 3) === 0,
    (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
  ][mask];
}

function placeFormat(m, r, mask) {
  const bits = toBits(formatBits(mask), 15);
  const a = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  const s = m.length;
  const b = [[s - 1, 8], [s - 2, 8], [s - 3, 8], [s - 4, 8], [s - 5, 8], [s - 6, 8], [s - 7, 8], [8, s - 8], [8, s - 7], [8, s - 6], [8, s - 5], [8, s - 4], [8, s - 3], [8, s - 2], [8, s - 1]];
  a.forEach(([x, y], i) => set(m, r, x, y, Boolean(bits[i])));
  b.forEach(([x, y], i) => set(m, r, x, y, Boolean(bits[i])));
}

function formatBits(mask) {
  let data = (0b01 << 3) | mask;
  let value = data << 10;
  const generator = 0b10100110111;
  for (let i = 14; i >= 10; i--) if ((value >> i) & 1) value ^= generator << (i - 10);
  return (((data << 10) | value) ^ 0b101010000010010);
}

function rsEncode(data, ecCount) {
  const gen = rsGenerator(ecCount);
  const res = Array(ecCount).fill(0);
  data.forEach(byte => {
    const factor = byte ^ res.shift();
    res.push(0);
    gen.forEach((coef, i) => res[i] ^= gfMul(coef, factor));
  });
  return res;
}

function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = Array(poly.length + 1).fill(0);
    poly.forEach((coef, j) => {
      next[j] ^= gfMul(coef, 1);
      next[j + 1] ^= gfMul(coef, gfPow(2, i));
    });
    poly = next;
  }
  return poly.slice(1);
}

function gfMul(a, b) {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const high = a & 0x80;
    a = (a << 1) & 0xff;
    if (high) a ^= 0x1d;
    b >>= 1;
  }
  return p;
}

function gfPow(a, n) {
  let r = 1;
  for (let i = 0; i < n; i++) r = gfMul(r, a);
  return r;
}

function penalty(m) {
  const size = m.length;
  let score = 0, dark = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (m[y][x]) dark++;
    if (x && y && m[y][x] === m[y][x - 1] && m[y][x] === m[y - 1][x] && m[y][x] === m[y - 1][x - 1]) score += 3;
  }
  const percent = dark * 100 / (size * size);
  score += Math.abs(percent - 50) * 2;
  return score;
}

state = loadState();
bindEvents();
clearPointForm();
clearInspectionForm();
render();
initFromQuery();
