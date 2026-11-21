import { useEffect, useState } from "react";

const API_BASE = "http://localhost:8000/api/v1";
const USUARIO_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

interface CuentaBancaria {
  cuenta_id: string;
  institucion_financiera: string;
  numero_cuenta: string;
  clabe: string;
  saldo_disponible: string;
}

interface Transaccion {
  transaccion_id: string;
  monto: string;
  tipo: string;
  concepto: string;
  fecha_transaccion: string;
  institucion_financiera: string;
}

interface Huerfano {
  transaccion_id: string;
  monto: number;
  fecha: string;
  banco: string;
}

interface BitacoraEvento {
  evento_id: string;
  tipo_evento: string;
  monto: { $numberDecimal?: string } | number | string;
  justificacion?: string;
  fecha_timestamp: string;
}

interface DashboardData {
  usuario: {
    usuario_id: string;
    nombre: string;
    email: string;
    rfc: string;
    regimen_fiscal: string;
  } | null;
  boveda: {
    boveda_id: string;
    saldo_reservado: string;
    deuda_interna: string;
    balance_neto_boveda: string;
  } | null;
  cuentas: CuentaBancaria[];
  transacciones_recientes: Transaccion[];
  huerfanos: Huerfano[];
  trazabilidad: {
    nodes: Array<{ id: string; label: string; properties: Record<string, unknown> }>;
    edges: Array<{ id: string; type: string }>;
  };
  bitacora_boveda: BitacoraEvento[];
}

function formatMoney(val: string | number | undefined | null): string {
  const num = Number(val ?? 0);
  return num.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function parseMongoDecimal(val: any): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val);
  if (val && typeof val === "object" && "$numberDecimal" in val) {
    return Number(val.$numberDecimal);
  }
  return 0;
}

export function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Formulario OP-01: Provisión Automática
  const [cuentaId, setCuentaId] = useState("d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44");
  const [clienteId, setClienteId] = useState("e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55");
  const [montoIngreso, setMontoIngreso] = useState("5800");
  const [conceptoIngreso, setConceptoIngreso] = useState("Desarrollo módulo web");

  // Formulario OP-02: Ruptura de Cristal
  const [montoRuptura, setMontoRuptura] = useState("500");
  const [justificacionRuptura, setJustificacionRuptura] = useState("Emergencia médica / liquidez inmediata");

  async function cargarDashboard() {
    try {
      const res = await fetch(`${API_BASE}/dashboard/${USUARIO_ID}`);
      if (!res.ok) throw new Error("No se pudo obtener el tablero integrado");
      const json: DashboardData = await res.json();
      setData(json);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error de red con backend" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarDashboard();
  }, []);

  async function handleProvisionar(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/provisionar-ingreso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuenta_id: cuentaId,
          cliente_id: clienteId || null,
          monto: Number(montoIngreso),
          concepto: conceptoIngreso,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al provisionar ingreso");
      setFeedback({
        type: "success",
        text: `OP-01 ejecutada: Bruto ${formatMoney(json.monto_bruto)} | Retenido (IVA+ISR): ${formatMoney(
          json.saldo_retenido
        )} | Neto disponible: ${formatMoney(json.monto_neto_disponible)} | Grafo: ${json.status}`,
      });
      await cargarDashboard();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRuptura(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/ruptura-cristal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: USUARIO_ID,
          monto: Number(montoRuptura),
          justificacion: justificacionRuptura,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al ejecutar ruptura de cristal");
      setFeedback({
        type: "success",
        text: `OP-02 Ruptura de Cristal ejecutada: Saldo restante en bóveda ${formatMoney(
          json.saldo_restante
        )} | Deuda interna acumulada: ${formatMoney(json.deuda_generada)}`,
      });
      await cargarDashboard();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="layout">Cargando arquitectura políglota de Kanan...</div>;
  }

  const saldoCuentas = (data?.cuentas || []).reduce(
    (acc, c) => acc + Number(c.saldo_disponible || 0),
    0
  );

  return (
    <div className="layout">
      <header className="header">
        <div>
          <h1>Kanan — Bóveda Fiscal y Trazabilidad Políglota</h1>
          <p>
            Contribuyente: <strong>{data?.usuario?.nombre}</strong> ({data?.usuario?.rfc} ·{" "}
            {data?.usuario?.regimen_fiscal})
          </p>
        </div>
        <div className="badges">
          <span className="badge badge-pg">PostgreSQL 16 (ACID)</span>
          <span className="badge badge-mongo">MongoDB 7 (Auditoría)</span>
          <span className="badge badge-neo">Neo4j 5 (Linaje Grafo)</span>
        </div>
      </header>

      {feedback && (
        <div className={`alert ${feedback.type === "success" ? "alert-success" : "alert-error"}`}>
          {feedback.text}
        </div>
      )}

      <section className="kpi-grid">
        <div className="card">
          <div className="kpi-title">Liquidez Operativa Disponible</div>
          <div className="kpi-value text-blue">{formatMoney(saldoCuentas)}</div>
          <div className="kpi-sub">{data?.cuentas?.length || 0} cuentas bancarias activas (PostgreSQL)</div>
        </div>

        <div className="card">
          <div className="kpi-title">Bóveda Fiscal Reservada</div>
          <div className="kpi-value text-emerald">
            {formatMoney(data?.boveda?.saldo_reservado)}
          </div>
          <div className="kpi-sub">Segregación automática IVA + ISR</div>
        </div>

        <div className="card">
          <div className="kpi-title">Deuda Interna Bóveda</div>
          <div className="kpi-value text-rose">{formatMoney(data?.boveda?.deuda_interna)}</div>
          <div className="kpi-sub">Retiros por Ruptura de Cristal</div>
        </div>

        <div className="card">
          <div className="kpi-title">Depósitos Huérfanos (OP-03)</div>
          <div className="kpi-value text-amber">{data?.huerfanos?.length || 0}</div>
          <div className="kpi-sub">Ingresos sin CFDI asociado (Neo4j)</div>
        </div>
      </section>

      <section className="main-grid">
        <div className="card">
          <h2>
            <span>Simulador de Ingreso SPEI (OP-01)</span>
            <span className="badge badge-pg">PG + Mongo + Neo4j</span>
          </h2>
          <p className="card-desc">
            Recibe un depósito bruto, segrega IVA (16%) + ISR RESICO (2.5%) y sincroniza linaje.
          </p>
          <form onSubmit={handleProvisionar}>
            <div className="form-group">
              <label>Cuenta Bancaria Destino</label>
              <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
                {(data?.cuentas || []).map((c) => (
                  <option key={c.cuenta_id} value={c.cuenta_id}>
                    {c.institucion_financiera} ({c.numero_cuenta}) — Disp:{" "}
                    {formatMoney(c.saldo_disponible)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Cliente Emisor (Opcional)</label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55">Acme Corp (ACME900101AB1)</option>
                <option value="e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a56">Global Tech (GLOB800202CD2)</option>
                <option value="">Sin cliente identificado</option>
              </select>
            </div>
            <div className="form-group">
              <label>Monto Bruto Recibido (MXN)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={montoIngreso}
                onChange={(e) => setMontoIngreso(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Concepto del Depósito</label>
              <input
                type="text"
                value={conceptoIngreso}
                onChange={(e) => setConceptoIngreso(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Procesando..." : "Registrar Ingreso y Provisionar Impuestos"}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>
            <span>Protocolo "Ruptura de Cristal" (OP-02)</span>
            <span className="badge badge-mongo">PG ACID + Bitácora Mongo</span>
          </h2>
          <p className="card-desc">
            Retiro extraordinario de emergencia desde la bóveda fiscal con generación de deuda interna.
          </p>
          <form onSubmit={handleRuptura}>
            <div className="form-group">
              <label>Monto a Retirar de Bóveda (MXN)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={montoRuptura}
                onChange={(e) => setMontoRuptura(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Justificación Obligatoria (Auditoría Inmutable)</label>
              <input
                type="text"
                value={justificacionRuptura}
                onChange={(e) => setJustificacionRuptura(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-danger" disabled={submitting}>
              {submitting ? "Ejecutando..." : "Ejecutar Ruptura de Cristal"}
            </button>
          </form>

          <div style={{ marginTop: "20px" }}>
            <div className="kpi-title">Trazabilidad de Grafo Activa (OP-05 · Neo4j)</div>
            <p className="kpi-sub">
              Subgrafo conectado: <strong>{data?.trazabilidad?.nodes?.length || 0} nodos</strong> y{" "}
              <strong>{data?.trazabilidad?.edges?.length || 0} aristas</strong>.
            </p>
            <div className="graph-tags">
              {(data?.trazabilidad?.nodes || []).slice(0, 12).map((n) => (
                <span key={n.id} className="node-chip">
                  <strong>:{n.label}</strong>{" "}
                  {String(
                    n.properties.nombre ||
                      n.properties.institucion ||
                      n.properties.uuid_fiscal ||
                      n.properties.transaccion_id ||
                      ""
                  ).slice(0, 14)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="main-grid">
        <div className="card">
          <h2>
            <span>Alertas de Depósitos Huérfanos (OP-03)</span>
            <span className="badge badge-neo">Consulta Cypher Neo4j</span>
          </h2>
          <p className="card-desc">
            Ingresos recibidos en cuenta que aún no tienen relación [:COMPROBADA_POR] con un CFDI.
          </p>
          <table>
            <thead>
              <tr>
                <th>Transacción</th>
                <th>Banco</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(data?.huerfanos || []).map((h) => (
                <tr key={h.transaccion_id}>
                  <td>{h.transaccion_id.slice(0, 8)}...</td>
                  <td>{h.banco}</td>
                  <td>{h.fecha}</td>
                  <td>{formatMoney(h.monto)}</td>
                  <td>
                    <span className="pill pill-warn">Sin CFDI</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>
            <span>Bitácora Inmutable de Bóveda</span>
            <span className="badge badge-mongo">MongoDB bitacora_boveda</span>
          </h2>
          <p className="card-desc">
            Registro cronológico append-only de provisiones automáticas y rupturas de cristal.
          </p>
          <table>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Monto</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {(data?.bitacora_boveda || []).slice(0, 6).map((ev) => (
                <tr key={ev.evento_id}>
                  <td>
                    <span
                      className={`pill ${
                        ev.tipo_evento === "RUPTURA_CRISTAL" ? "pill-danger" : "pill-ok"
                      }`}
                    >
                      {ev.tipo_evento}
                    </span>
                  </td>
                  <td>{formatMoney(parseMongoDecimal(ev.monto))}</td>
                  <td>{ev.justificacion || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default App;
