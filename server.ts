import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const SESSION_COOKIE_SECRET = process.env.SESSION_SECRET || 'bn_seguros_costa_rica_secret_2026';

// Middleware setup
app.use(cookieParser(SESSION_COOKIE_SECRET));
app.use(express.json({ limit: '60mb' }));

// In-memory active sessions map (sessionId -> { userId, expiresAt })
const sessions = new Map<string, { userId: string; expiresAt: number }>();

interface UsuarioRecord {
  id: string;
  usuario: string;
  nombre: string;
  rol: 'administrador' | 'asesor';
  estado: 'activo' | 'suspendido';
  debeCambiarClave: boolean;
  fechaCreacion: string;
  ultimoAcceso: string | null;
  passwordHash: string;
}

// Initialize server data storage files if they don't exist
function initDataStorage() {
  const dataDir = path.resolve(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const usersFile = path.join(dataDir, 'usuarios.json');
  if (!fs.existsSync(usersFile)) {
    const defaultAdmin: UsuarioRecord[] = [
      {
        id: 'usr_admin_001',
        usuario: 'admin',
        nombre: 'Administrador',
        rol: 'administrador',
        estado: 'activo',
        debeCambiarClave: true,
        fechaCreacion: new Date().toISOString(),
        ultimoAcceso: null,
        passwordHash: bcrypt.hashSync('Fundepos2026*', 10),
      },
    ];
    fs.writeFileSync(usersFile, JSON.stringify(defaultAdmin, null, 2), 'utf-8');
    console.log('data/usuarios.json inicializado con el usuario "admin" (contraseña temporal Fundepos2026*).');
  }

  const compFile = path.join(dataDir, 'comparaciones.json');
  if (!fs.existsSync(compFile)) {
    fs.writeFileSync(compFile, JSON.stringify([], null, 2), 'utf-8');
  }

  const auditFile = path.join(dataDir, 'auditoria.json');
  if (!fs.existsSync(auditFile)) {
    fs.writeFileSync(auditFile, JSON.stringify([], null, 2), 'utf-8');
  }
}

initDataStorage();

// Helper functions for data access
function getUsers(): UsuarioRecord[] {
  const usersFile = path.resolve(__dirname, 'data/usuarios.json');
  if (!fs.existsSync(usersFile)) {
    initDataStorage();
  }
  try {
    return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
  } catch (err) {
    console.error('Error reading data/usuarios.json:', err);
    return [];
  }
}

function saveUsers(users: UsuarioRecord[]) {
  const usersFile = path.resolve(__dirname, 'data/usuarios.json');
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf-8');
}

function logAudit(record: { userId: string; usuario: string; accion: string; detalle: string }) {
  try {
    const auditFile = path.resolve(__dirname, 'data/auditoria.json');
    let list: any[] = [];
    if (fs.existsSync(auditFile)) {
      list = JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
    }
    list.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fecha: new Date().toISOString(),
      ...record,
    });
    fs.writeFileSync(auditFile, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error logging audit:', e);
  }
}

function saveComparison(comparison: any) {
  try {
    const compFile = path.resolve(__dirname, 'data/comparaciones.json');
    let list: any[] = [];
    if (fs.existsSync(compFile)) {
      list = JSON.parse(fs.readFileSync(compFile, 'utf-8'));
    }
    list.unshift(comparison);
    fs.writeFileSync(compFile, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving comparison:', e);
  }
}

// Extend Express Request type
interface AuthenticatedRequest extends Request {
  user?: UsuarioRecord;
}

// Authentication middleware (requires valid session & active status)
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const sessionId = req.signedCookies?.bn_session;
  if (!sessionId) {
    return res.status(401).json({ error: 'Sesión no válida o no autenticado' });
  }

  const session = sessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    if (session) sessions.delete(sessionId);
    res.clearCookie('bn_session', { path: '/' });
    return res.status(401).json({ error: 'Sesión expirada' });
  }

  const users = getUsers();
  const user = users.find((u) => u.id === session.userId);
  if (!user) {
    sessions.delete(sessionId);
    res.clearCookie('bn_session', { path: '/' });
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

  if (user.estado !== 'activo') {
    sessions.delete(sessionId);
    res.clearCookie('bn_session', { path: '/' });
    return res.status(401).json({ error: 'usuario suspendido, contacte al administrador' });
  }

  req.user = user;
  next();
}

// Shared Gemini client setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface UploadedFile {
  name: string;
  base64: string;
}

interface ClientProfile {
  name: string;
  vehicleAndUsage: string;
  budgetAnnual: number;
  mandatoryCovers: {
    colision: boolean;
    robo: boolean;
    asistenciaVial247: boolean;
    fenomenosNaturales: boolean;
    vehiculoSustituto: boolean;
  };
  priorities: string;
  paymentPreference: string;
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// POST /api/login (usuario y contraseña)
app.post('/api/login', (req: Request, res: Response) => {
  try {
    const { usuario, contrasena, password } = req.body;
    const rawPassword = contrasena || password;

    if (!usuario || typeof usuario !== 'string' || !rawPassword || typeof rawPassword !== 'string') {
      return res.status(400).json({ error: 'usuario o contraseña incorrectos' });
    }

    const normalizedUser = usuario.trim().toLowerCase();
    const users = getUsers();
    const user = users.find((u) => u.usuario === normalizedUser);

    if (!user) {
      return res.status(401).json({ error: 'usuario o contraseña incorrectos' });
    }

    const isMatch = bcrypt.compareSync(rawPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'usuario o contraseña incorrectos' });
    }

    if (user.estado === 'suspendido') {
      return res.status(403).json({ error: 'usuario suspendido, contacte al administrador' });
    }

    // Update last access timestamp
    user.ultimoAcceso = new Date().toISOString();
    saveUsers(users);

    // Create session (expires in 8 hours)
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
    sessions.set(sessionId, { userId: user.id, expiresAt });

    res.cookie('bn_session', sessionId, {
      httpOnly: true,
      signed: true,
      maxAge: 8 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/',
    });

    logAudit({
      userId: user.id,
      usuario: user.usuario,
      accion: 'inicio_sesion',
      detalle: 'Inicio de sesión con credenciales',
    });

    return res.json({
      user: {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        rol: user.rol,
        estado: user.estado,
        debeCambiarClave: user.debeCambiarClave,
      },
    });
  } catch (err: any) {
    console.error('Error during login:', err);
    return res.status(500).json({ error: 'Error interno en el inicio de sesión' });
  }
});

// GET /api/yo (devuelve usuario conectado)
app.get('/api/yo', (req: AuthenticatedRequest, res: Response) => {
  const sessionId = req.signedCookies?.bn_session;
  if (!sessionId) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const session = sessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    if (session) sessions.delete(sessionId);
    res.clearCookie('bn_session', { path: '/' });
    return res.status(401).json({ error: 'Sesión expirada' });
  }

  const users = getUsers();
  const user = users.find((u) => u.id === session.userId);
  if (!user || user.estado !== 'activo') {
    sessions.delete(sessionId);
    res.clearCookie('bn_session', { path: '/' });
    return res.status(401).json({ error: 'Usuario no válido o suspendido' });
  }

  return res.json({
    user: {
      id: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      rol: user.rol,
      estado: user.estado,
      debeCambiarClave: user.debeCambiarClave,
    },
  });
});

// POST /api/logout (elimina cookie de sesión)
app.post('/api/logout', (req: AuthenticatedRequest, res: Response) => {
  const sessionId = req.signedCookies?.bn_session;
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (session) {
      const users = getUsers();
      const user = users.find((u) => u.id === session.userId);
      if (user) {
        logAudit({
          userId: user.id,
          usuario: user.usuario,
          accion: 'cierre_sesion',
          detalle: 'Cierre de sesión manual',
        });
      }
    }
    sessions.delete(sessionId);
  }

  res.clearCookie('bn_session', { path: '/' });
  return res.json({ ok: true });
});

// POST /api/cambiar-clave (mínimo 8 caracteres, al menos un número)
app.post('/api/cambiar-clave', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { claveNueva, contrasenaNueva, passwordNueva } = req.body;
    const newPass = (claveNueva || contrasenaNueva || passwordNueva || '').trim();

    if (!newPass || newPass.length < 8 || !/\d/.test(newPass)) {
      return res.status(400).json({
        error: 'La nueva contraseña debe tener mínimo 8 caracteres y contener al menos un número.',
      });
    }

    const users = getUsers();
    const userIndex = users.findIndex((u) => u.id === req.user!.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    users[userIndex].passwordHash = bcrypt.hashSync(newPass, 10);
    users[userIndex].debeCambiarClave = false;
    saveUsers(users);

    logAudit({
      userId: users[userIndex].id,
      usuario: users[userIndex].usuario,
      accion: 'cambio_clave',
      detalle: 'Contraseña actualizada correctamente',
    });

    return res.json({
      ok: true,
      user: {
        id: users[userIndex].id,
        usuario: users[userIndex].usuario,
        nombre: users[userIndex].nombre,
        rol: users[userIndex].rol,
        estado: users[userIndex].estado,
        debeCambiarClave: false,
      },
    });
  } catch (err: any) {
    console.error('Error changing password:', err);
    return res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

// ==========================================
// COMPARATOR ENDPOINTS (REQUIRE AUTH)
// ==========================================

// Endpoint to list and provide sample PDFs for quick testing
app.get('/api/sample-proposals', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const samplesDir = path.resolve(__dirname, 'public/assets/aistudio');
    if (!fs.existsSync(samplesDir)) {
      return res.json({ samples: [] });
    }

    const files = fs.readdirSync(samplesDir).filter((f) => f.toLowerCase().endsWith('.pdf'));
    const samples = files.map((file) => {
      const filePath = path.join(samplesDir, file);
      const stat = fs.statSync(filePath);
      const buffer = fs.readFileSync(filePath);
      return {
        id: file,
        name: file,
        displayName: file.replace(/_/g, ' ').replace('.pdf', ''),
        sizeBytes: stat.size,
        base64: buffer.toString('base64'),
        url: `/assets/aistudio/${file}`,
      };
    });

    res.json({ samples });
  } catch (err: any) {
    console.error('Error listing sample proposals:', err);
    res.status(500).json({ error: 'No se pudieron cargar las propuestas de ejemplo' });
  }
});

// Optional extract-client-profile placeholder if needed
app.post('/api/extract-client-profile', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  res.json({ ok: true });
});

// Compare proposals using Gemini with PDF reading
app.post('/api/compare', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { files, profile } = req.body as { files: UploadedFile[]; profile: ClientProfile };

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Debe subir o seleccionar al menos 1 propuesta en PDF (máximo 3).' });
    }

    if (files.length > 3) {
      return res.status(400).json({ error: 'Solo se pueden comparar de 1 a 3 propuestas a la vez.' });
    }

    const mandatoryList: string[] = [];
    if (profile.mandatoryCovers.colision) mandatoryList.push('Colisión y vuelco');
    if (profile.mandatoryCovers.robo) mandatoryList.push('Robo total y parcial');
    if (profile.mandatoryCovers.asistenciaVial247) mandatoryList.push('Asistencia vial 24/7');
    if (profile.mandatoryCovers.fenomenosNaturales) mandatoryList.push('Fenómenos naturales');
    if (profile.mandatoryCovers.vehiculoSustituto) mandatoryList.push('Vehículo sustituto');

    // Prepare contents for Gemini with PDF parts
    const parts: any[] = [];

    files.forEach((file, index) => {
      // Strip potential data URL prefix
      const cleanBase64 = file.base64.replace(/^data:application\/pdf;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: cleanBase64,
        },
      });
      parts.push({
        text: `--- DOCUMENTO PROPUESTA #${index + 1}: Archivo "${file.name}" ---`,
      });
    });

    const promptText = `
Eres un actuario y analista senior de seguros de automóvil en BN Corredora de Seguros (Costa Rica).
Tu misión es analizar ${files.length} documento(s) PDF adjunto(s) con cotizaciones o propuestas de seguro voluntario de automóviles y cotejarlas estrictamente contra el perfil del cliente.

PERFIL DEL CLIENTE:
- Nombre del cliente: ${profile.name || 'Laura Solís Vargas'}
- Vehículo y uso: ${profile.vehicleAndUsage || 'Toyota Corolla XEi 2022 - Particular'}
- Presupuesto máximo anual (colones): ₡ ${Number(profile.budgetAnnual).toLocaleString('es-CR')} (${profile.budgetAnnual} colones)
- Coberturas obligatorias requeridas por el cliente: ${mandatoryList.length > 0 ? mandatoryList.join(', ') : 'Ninguna marcada como obligatoria'}
- Prioridades del cliente: ${profile.priorities || 'Costo beneficio balanceado, buena asistencia vial'}
- Forma de pago preferida: ${profile.paymentPreference || 'Anual'}

INSTRUCCIONES Y LÓGICA ESTRICTA:
1. Extraer de cada PDF SOLO lo que dice el documento; si un dato no aparece, escribir exactamente "no indicado". No inventar nada.
2. Validar:
   - CABE EN PRESUPUESTO: "Sí" si la prima anual (incluyendo IVA o monto total indicado) es menor o igual al presupuesto del cliente (${profile.budgetAnnual} colones). "No" si lo supera.
   - CUMPLE OBLIGATORIAS: "Sí" SOLO si TODAS las coberturas marcadas como obligatorias (${mandatoryList.join(', ') || 'ninguna'}) están expresamente INCLUIDAS en la prima básica del documento. Un paquete opcional con costo adicional o que diga "No incluida" o "No aplica" NO cuenta como cumplida. Si no tiene obligatorias marcadas, se considera "Sí".
3. SEMÁFORO:
   - "verde": si cabe en presupuesto ("Sí") Y cumple obligatorias ("Sí").
   - "amarillo": si cumple obligatorias ("Sí") PERO NO cabe en presupuesto ("No").
   - "rojo": si NO cumple obligatorias ("No"), sin importar su costo.
4. RECOMENDACIÓN PRELIMINAR (BORRADOR):
   - Una sola propuesta recomendada como principal.
   - Justificada en MÁXIMO 5 LÍNEAS con los montos exactos, según las prioridades del cliente.
   - Si una propuesta con semáforo amarillo es mejor para satisfacer las prioridades del cliente (por ejemplo, tiene coberturas superiores que el cliente prioriza), dilo claramente y cuantifica con exactitud la diferencia en colones de la prima respecto al presupuesto o a las demás.
5. MENSAJE SUGERIDO PARA EL CLIENTE (WHATSAPP):
   - Formato listo para enviar por WhatsApp (puedes usar negritas con asteriscos como *palabra*).
   - MÁXIMO 8 LÍNEAS.
   - Tono cordial y profesional, sin tecnicismos complejos.
   - Debe contener:
     a) Un saludo cordial y la recomendación principal.
     b) Dos razones claras y entendibles del porqué se recomienda.
     c) La alternativa (si aplica, indicando la opción más económica o más completa).
     d) Un próximo paso concreto (ejemplo: "Si le parece bien, ¿me confirma para solicitar la emisión con la aseguradora?").
   - SIN prometer plazos ni tiempos de entrega de la póliza.

FORMATO DE RESPUESTA:
Devuelve EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura (sin bloques markdown ni explicaciones adicionales fuera del JSON):

{
  "proposals": [
    {
      "index": 1,
      "fileName": "Nombre del archivo",
      "insurerName": "Nombre de la aseguradora extraído del documento",
      "quoteNumber": "Número de cotización o póliza o 'no indicado'",
      "primaAnual": "Monto total exacto de la prima anual con moneda e IVA como dice el documento, ej: ₡ 395.000",
      "primaAnualNumber": 395000,
      "cabeEnPresupuesto": "Sí" o "No",
      "cabeEnPresupuestoJustificacion": "Explicación breve con montos",
      "deducibleColision": "Texto exacto del deducible por colisión o 'no indicado'",
      "deducibleRobo": "Texto exacto del deducible por robo o 'no indicado'",
      "rcDanosTerceros": "Límite o condición de RC daños a terceros o 'no indicado'",
      "rcLesiones": "Límite o condición de RC lesiones o muerte a terceros o 'no indicado'",
      "asistenciaVial247": "Detalle de asistencia vial 24/7 o 'no indicado'",
      "grua": "Detalle de grúa (km y eventos) o 'no indicado'",
      "vehiculoSustituto": "Detalle de vehículo sustituto o 'no indicado'",
      "fenomenosNaturales": "Detalle de fenómenos naturales o 'no indicado'",
      "roturaCristales": "Detalle de rotura de cristales o 'no indicado'",
      "exclusionesDestacadas": "Resumen conciso de las exclusiones principales indicadas",
      "cumpleObligatorias": "Sí" o "No",
      "cumpleObligatoriasDetalle": "Explicación de qué coberturas cumple o cuál le falta",
      "semaforo": "verde" | "amarillo" | "rojo",
      "semaforoMotivo": "Motivo del color asignado",
      "formaDePago": "Forma de pago indicada en la propuesta"
    }
  ],
  "recomendacionPreliminar": "Texto de máximo 5 líneas con la justificación y montos según prioridades",
  "mensajeWhatsApp": "Texto para WhatsApp de máximo 8 líneas con formato, saludo cordial, recomendación, dos razones, alternativa y próximo paso sin prometer plazos"
}
`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: parts,
      config: {
        systemInstruction: 'Eres un sistema experto en auditoría y comparación de seguros para BN Corredora de Seguros en Costa Rica. Extraes datos con absoluta fidelidad documental y devuelves exclusivamente JSON válido.',
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    let parsedResult: any;

    try {
      parsedResult = JSON.parse(responseText);
    } catch (parseError) {
      // Clean possible markdown code fences if present
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    }

    // Programmatic verification pass to enforce 100% adherence to prompt rules
    if (parsedResult && Array.isArray(parsedResult.proposals)) {
      parsedResult.proposals = parsedResult.proposals.map((prop: any) => {
        // Parse numeric premium if missing or NaN
        let numericPremium = prop.primaAnualNumber;
        if (!numericPremium || isNaN(numericPremium)) {
          const matched = String(prop.primaAnual || '').replace(/[^\d]/g, '');
          numericPremium = matched ? parseInt(matched, 10) : 0;
        }

        const fitsBudget = numericPremium > 0 ? numericPremium <= profile.budgetAnnual : false;
        
        // Strict evaluation of mandatory covers
        let fulfillsMandatory = true;
        const missingCovers: string[] = [];

        if (profile.mandatoryCovers.colision) {
          const col = String(prop.deducibleColision || '').toLowerCase();
          if (col.includes('no aplica') || col.includes('no incluid') || col === 'no' || col === 'no indicado') {
            fulfillsMandatory = false;
            missingCovers.push('Colisión');
          }
        }
        if (profile.mandatoryCovers.robo) {
          const rob = String(prop.deducibleRobo || '').toLowerCase();
          if (rob.includes('no aplica') || rob.includes('no incluid') || rob === 'no' || rob === 'no indicado') {
            fulfillsMandatory = false;
            missingCovers.push('Robo');
          }
        }
        if (profile.mandatoryCovers.asistenciaVial247) {
          const asis = String(prop.asistenciaVial247 || '').toLowerCase();
          if (asis.includes('no aplica') || asis.includes('no incluid') || asis === 'no' || asis === 'no indicado') {
            fulfillsMandatory = false;
            missingCovers.push('Asistencia vial 24/7');
          }
        }
        if (profile.mandatoryCovers.fenomenosNaturales) {
          const nat = String(prop.fenomenosNaturales || '').toLowerCase();
          if (nat.includes('no aplica') || nat.includes('no incluid') || nat === 'no' || nat === 'no indicado' || nat.includes('opcional')) {
            fulfillsMandatory = false;
            missingCovers.push('Fenómenos naturales');
          }
        }
        if (profile.mandatoryCovers.vehiculoSustituto) {
          const veh = String(prop.vehiculoSustituto || '').toLowerCase();
          if (veh.includes('no incluid') || veh.includes('no aplica') || veh === 'no' || veh === 'no indicado' || veh.includes('requiere')) {
            fulfillsMandatory = false;
            missingCovers.push('Vehículo sustituto');
          }
        }

        // Apply strict traffic light rule:
        // Verde: cabe y cumple
        // Amarillo: cumple pero no cabe
        // Rojo: no cumple
        let semaforo: 'verde' | 'amarillo' | 'rojo';
        if (fulfillsMandatory && fitsBudget) {
          semaforo = 'verde';
        } else if (fulfillsMandatory && !fitsBudget) {
          semaforo = 'amarillo';
        } else {
          semaforo = 'rojo';
        }

        return {
          ...prop,
          cabeEnPresupuesto: fitsBudget ? 'Sí' : 'No',
          cumpleObligatorias: fulfillsMandatory ? 'Sí' : 'No',
          cumpleObligatoriasDetalle: fulfillsMandatory
            ? 'Cumple todas las obligatorias requeridas'
            : `No incluye: ${missingCovers.join(', ')}`,
          semaforo,
        };
      });
    }

    // Persist comparison in data/comparaciones.json associated with userId
    saveComparison({
      id: crypto.randomUUID ? crypto.randomUUID() : `comp_${Date.now()}`,
      fecha: new Date().toISOString(),
      userId: req.user!.id,
      usuario: req.user!.usuario,
      cliente: profile.name,
      vehiculo: profile.vehicleAndUsage,
      presupuestoAnual: profile.budgetAnnual,
      archivos: files.map((f) => f.name),
      resultado: parsedResult,
    });

    // Record audit in data/auditoria.json
    logAudit({
      userId: req.user!.id,
      usuario: req.user!.usuario,
      accion: 'comparacion_realizada',
      detalle: `Comparación de ${files.length} propuestas para cliente ${profile.name || 'Sin nombre'}`,
    });

    res.json(parsedResult);
  } catch (error: any) {
    console.error('Error during comparison:', error);
    res.status(500).json({
      error: 'Ocurrió un error al procesar las propuestas con Gemini.',
      details: error?.message || String(error),
    });
  }
});

// Configure Vite middleware or static serving
async function setupServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Comparador de Propuestas BN server running at http://localhost:${port}`);
  });
}

setupServer();
