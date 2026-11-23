import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1";
const TOKEN_STORAGE_KEY = "kanan_jwt_token";

interface CuentaBancaria {
  cuenta_id: string;
  institucion_financiera: string;
  numero_cuenta: string;
  clabe: string;
  saldo_disponible: string;
}

interface ClienteItem {
  cliente_id: string;
  nombre_razon_social: string;
  rfc_emisor: string;
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
  clientes: ClienteItem[];
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
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_STORAGE_KEY) || "");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("ian@kanan.dev");
  const [password, setPassword] = useState("Kanan2026!");
  const [rfc, setRfc] = useState("");
  const [regimenFiscal, setRegimenFiscal] = useState("RESICO");
  const [bancoInicial, setBancoInicial] = useState("BBVA");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [cuentaId, setCuentaId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [montoIngreso, setMontoIngreso] = useState("5800");
  const [conceptoIngreso, setConceptoIngreso] = useState("Desarrollo módulo web");

  const [montoRuptura, setMontoRuptura] = useState("500");
  const [justificacionRuptura, setJustificacionRuptura] = useState("Emergencia médica / liquidez inmediata");

  const [montoAbono, setMontoAbono] = useState("500");
  const [cfdiInputs, setCfdiInputs] = useState<Record<string, string>>({});

  function guardarToken(nextToken: string) {
    setToken(nextToken);
    if (nextToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setData(null);
    }
  }

  async function cargarDashboard(activeToken = token) {
    if (!activeToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dashboard`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.status === 401) {
        guardarToken("");
        throw new Error("Tu sesión expiró o no es válida. Inicia sesión de nuevo.");
      }
      if (!res.ok) throw new Error("No se pudo obtener el tablero integrado");
      const json: DashboardData = await res.json();
      setData(json);
      if (json.cuentas?.length && !json.cuentas.some((c) => c.cuenta_id === cuentaId)) {
        setCuentaId(json.cuentas[0].cuenta_id);
      }
      if (json.clientes?.length && !clienteId) {
        setClienteId(json.clientes[0].cliente_id);
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error de red con backend" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      cargarDashboard(token);
    }
  }, [token]);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        authMode === "login"
          ? { email, password }
          : {
              nombre,
              email,
              password,
              rfc,
              regimen_fiscal: regimenFiscal,
              institucion_financiera: bancoInicial,
            };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error de autenticación");
      guardarToken(json.token);
      setFeedback({
        type: "success",
        text: `Sesión iniciada como ${json.usuario.nombre} (${json.usuario.rfc})`,
      });
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProvisionar(e: React.FormEvent) {
    e.preventDefault();
    if (!cuentaId) {
      setFeedback({ type: "error", text: "Selecciona una cuenta bancaria" });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/provisionar-ingreso`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
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

  async function handleReabastecer(e: React.FormEvent) {
    e.preventDefault();
    if (!cuentaId) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/reabastecer-boveda`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cuenta_id: cuentaId,
          monto: Number(montoAbono),
          justificacion: "Abono voluntario a deuda interna de bóveda",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al reabastecer bóveda");
      setFeedback({
        type: "success",
        text: `OP-06 Reabastecimiento aplicado: Bóveda ${formatMoney(
          json.saldo_reservado
        )} | Deuda restante: ${formatMoney(json.deuda_restante)}`,
      });
      await cargarDashboard();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVincularCfdi(transaccionId: string) {
    const uuidFiscal =
      cfdiInputs[transaccionId]?.trim() ||
      crypto.randomUUID().toUpperCase();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/vincular-cfdi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transaccion_id: transaccionId,
          uuid_fiscal: uuidFiscal,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al vincular CFDI");
      setFeedback({
        type: "success",
        text: `OP-04 CFDI ${json.uuid_fiscal} vinculado en PostgreSQL, MongoDB y Neo4j`,
      });
      await cargarDashboard();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="layout" style={{ maxWidth: "480px", marginTop: "40px" }}>
        <div className="card">
          <h1>Kanan — Acceso Multiusuario</h1>
          <p className="card-desc">
            {authMode === "login"
              ? "Inicia sesión para gestionar tu bóveda fiscal, liquidez y trazabilidad CFDI."
              : "Registra tu perfil fiscal para inicializar tu bóveda, regla RESICO y cuenta."}
          </p>

          {feedback && (
            <div className={`alert ${feedback.type === "success" ? "alert-success" : "alert-error"}`}>
              {feedback.text}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button
              type="button"
              className={`btn ${authMode === "login" ? "btn-primary" : ""}`}
              onClick={() => setAuthMode("login")}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={`btn ${authMode === "register" ? "btn-primary" : ""}`}
              onClick={() => setAuthMode("register")}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <>
                <div className="form-group">
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Ana López"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>RFC (12 o 13 caracteres)</label>
                  <input
                    type="text"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase())}
                    placeholder="Ej. LOPA980101ABC"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Régimen fiscal</label>
                  <select value={regimenFiscal} onChange={(e) => setRegimenFiscal(e.target.value)}>
                    <option value="RESICO">RESICO</option>
                    <option value="ACTIVIDAD_EMPRESARIAL">ACTIVIDAD_EMPRESARIAL</option>
                    <option value="SERVICIOS_PROFESIONALES">SERVICIOS_PROFESIONALES</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Banco inicial</label>
                  <input
                    type="text"
                    value={bancoInicial}
                    onChange={(e) => setBancoInicial(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? "Validando..."
                : authMode === "login"
                ? "Entrar a Kanan"
                : "Crear cuenta y bóveda"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading && !data) {
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
          <button type="button" className="btn" onClick={() => guardarToken("")}>
            Cerrar sesión
          </button>
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
                {(data?.clientes || []).map((cl) => (
                  <option key={cl.cliente_id} value={cl.cliente_id}>
                    {cl.nombre_razon_social} ({cl.rfc_emisor})
                  </option>
                ))}
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
            <span>Protocolo "Ruptura de Cristal" (OP-02) y Reabastecimiento (OP-06)</span>
            <span className="badge badge-mongo">PG ACID + Bitácora Mongo</span>
          </h2>
          <p className="card-desc">
            Retiro extraordinario de emergencia desde bóveda fiscal o abono desde liquidez operativa.
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

          {Number(data?.boveda?.deuda_interna || 0) > 0 && (
            <form onSubmit={handleReabastecer} style={{ marginTop: "14px" }}>
              <div className="form-group">
                <label>Abonar a Deuda Interna desde Cuenta Seleccionada (MXN)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Abonando..." : "Reabastecer Bóveda (OP-06)"}
              </button>
            </form>
          )}

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
            <span>Alertas de Depósitos Huérfanos (OP-03 / OP-04)</span>
            <span className="badge badge-neo">Consulta Cypher Neo4j</span>
          </h2>
          <p className="card-desc">
            Ingresos sin relación [:COMPROBADA_POR] con un CFDI. Vincula su UUID fiscal para conciliar.
          </p>
          <table>
            <thead>
              <tr>
                <th>Transacción</th>
                <th>Banco</th>
                <th>Monto</th>
                <th>UUID CFDI 4.0</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {(data?.huerfanos || []).map((h) => (
                <tr key={h.transaccion_id}>
                  <td>{h.transaccion_id.slice(0, 8)}...</td>
                  <td>{h.banco}</td>
                  <td>{formatMoney(h.monto)}</td>
                  <td>
                    <input
                      type="text"
                      placeholder="UUID fiscal (auto si vacío)"
                      value={cfdiInputs[h.transaccion_id] || ""}
                      onChange={(e) =>
                        setCfdiInputs((prev) => ({ ...prev, [h.transaccion_id]: e.target.value }))
                      }
                      style={{ width: "160px" }}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={submitting}
                      onClick={() => handleVincularCfdi(h.transaccion_id)}
                    >
                      Vincular CFDI
                    </button>
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
            Registro cronológico append-only de provisiones, rupturas y reabastecimientos.
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
