/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Shield,
  Trash2,
  FileCheck2,
  Eye,
  X,
  MessageSquare,
  Send,
  Lock,
  User,
  LogOut,
  KeyRound,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface AuthUser {
  id: string;
  usuario: string;
  nombre: string;
  rol: 'administrador' | 'asesor';
  estado: 'activo' | 'suspendido';
  debeCambiarClave: boolean;
}

interface ProposalItem {
  id: string;
  name: string;
  size: number;
  base64: string;
  url?: string;
}

interface ProposalAnalysis {
  index: number;
  fileName: string;
  insurerName: string;
  quoteNumber: string;
  primaAnual: string;
  primaAnualNumber: number;
  cabeEnPresupuesto: 'Sí' | 'No';
  cabeEnPresupuestoJustificacion?: string;
  deducibleColision: string;
  deducibleRobo: string;
  rcDanosTerceros: string;
  rcLesiones: string;
  asistenciaVial247: string;
  grua: string;
  vehiculoSustituto: string;
  fenomenosNaturales: string;
  roturaCristales: string;
  exclusionesDestacadas: string;
  cumpleObligatorias: 'Sí' | 'No';
  cumpleObligatoriasDetalle: string;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  semaforoMotivo?: string;
  formaDePago: string;
}

interface ComparisonResult {
  proposals: ProposalAnalysis[];
  recomendacionPreliminar: string;
  mensajeWhatsApp: string;
}

interface SampleProposal {
  id: string;
  name: string;
  displayName: string;
  sizeBytes: number;
  base64: string;
  url: string;
}

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [loginUsuario, setLoginUsuario] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Forced password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // 1. Files state
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [availableSamples, setAvailableSamples] = useState<SampleProposal[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Client Profile state
  const [clientName, setClientName] = useState('Laura Solís Vargas');
  const [vehicleAndUsage, setVehicleAndUsage] = useState('Toyota Corolla XEi 2022 - Particular');
  const [budgetAnnual, setBudgetAnnual] = useState<number>(420000);
  const [budgetDisplay, setBudgetDisplay] = useState('420.000');
  const [mandatoryCovers, setMandatoryCovers] = useState({
    colision: true,
    robo: true,
    asistenciaVial247: true,
    fenomenosNaturales: false,
    vehiculoSustituto: false,
  });
  const [priorities, setPriorities] = useState(
    'Prioriza costo razonable y deducibles moderados, pero requiere asistencia vial 24/7 y grúa confiable para viajes fuera del GAM.'
  );
  const [paymentPreference, setPaymentPreference] = useState('Anual');

  // 3. Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ComparisonResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // 4. UI interaction state
  const [copied, setCopied] = useState(false);
  const [activePdfPreview, setActivePdfPreview] = useState<{ url: string; name: string } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Check current session on mount via GET /api/yo
  useEffect(() => {
    async function checkAuth() {
      try {
        setAuthChecking(true);
        const res = await fetch('/api/yo');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
          }
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Error verificando sesión:', err);
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

  // Load sample proposals when authenticated
  useEffect(() => {
    if (!currentUser || currentUser.debeCambiarClave) return;

    async function loadSamples() {
      try {
        const res = await fetch('/api/sample-proposals');
        if (res.ok) {
          const data = await res.json();
          if (data.samples && Array.isArray(data.samples)) {
            setAvailableSamples(data.samples);
          }
        } else if (res.status === 401) {
          setCurrentUser(null);
        }
      } catch (e) {
        console.error('Error fetching sample proposals:', e);
      }
    }
    loadSamples();
  }, [currentUser]);

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginUsuario.trim() || !loginPassword) {
      setLoginError('Por favor ingrese su usuario y contraseña.');
      return;
    }

    try {
      setLoginLoading(true);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: loginUsuario.trim(),
          contrasena: loginPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Clear password and show error from server
        setLoginPassword('');
        setLoginError(data.error || 'usuario o contraseña incorrectos');
        return;
      }

      if (data.user) {
        setCurrentUser(data.user);
        setLoginUsuario('');
        setLoginPassword('');
        setLoginError(null);
      }
    } catch (err: any) {
      console.error('Error al iniciar sesión:', err);
      setLoginError('Error de conexión con el servidor. Intente de nuevo.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setCurrentUser(null);
      setAnalysisResult(null);
      setProposals([]);
    }
  };

  // Handle Forced Password Change
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);

    if (newPassword.length < 8) {
      setChangePasswordError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!/\d/.test(newPassword)) {
      setChangePasswordError('La contraseña debe incluir al menos un número.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError('Las contraseñas no coinciden. Verifíquelas.');
      return;
    }

    try {
      setChangePasswordLoading(true);
      const res = await fetch('/api/cambiar-clave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claveNueva: newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setChangePasswordError(data.error || 'Error al cambiar la contraseña.');
        return;
      }

      if (data.user) {
        setCurrentUser(data.user);
        setNewPassword('');
        setConfirmPassword('');
        setChangePasswordError(null);
      }
    } catch (err: any) {
      console.error('Error al actualizar contraseña:', err);
      setChangePasswordError('Error de conexión. Intente nuevamente.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // Format budget input with colones format
  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^\d]/g, '');
    const num = rawVal ? parseInt(rawVal, 10) : 0;
    setBudgetAnnual(num);
    setBudgetDisplay(num ? num.toLocaleString('es-CR') : '');
  };

  // Handle uploading PDF files (max 3)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const uploaded = Array.from(e.target.files);
    addFiles(uploaded);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const dropped = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      addFiles(dropped);
    }
  };

  const addFiles = (newFiles: File[]) => {
    if (proposals.length + newFiles.length > 3) {
      alert('Solo se permite comparar un máximo de 3 propuestas.');
      return;
    }

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = (event.target?.result as string) || '';
        const blobUrl = URL.createObjectURL(file);
        setProposals((prev) => {
          if (prev.length >= 3) return prev;
          return [
            ...prev,
            {
              id: `${file.name}-${Date.now()}-${Math.random()}`,
              name: file.name,
              size: file.size,
              base64: base64Data,
              url: blobUrl,
            },
          ];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove a loaded file
  const removeProposal = (index: number) => {
    setProposals((prev) => prev.filter((_, i) => i !== index));
  };

  // Load sample PDFs into comparison
  const loadSingleSample = (sample: SampleProposal) => {
    if (proposals.length >= 3) {
      alert('Ya tiene 3 propuestas cargadas. Elimine una para agregar otra.');
      return;
    }
    if (proposals.some((p) => p.name === sample.name)) {
      alert('Esta propuesta ya está cargada.');
      return;
    }

    setProposals((prev) => [
      ...prev,
      {
        id: sample.id,
        name: sample.name,
        size: sample.sizeBytes,
        base64: sample.base64,
        url: sample.url,
      },
    ]);
  };

  const loadAllSamples = () => {
    if (availableSamples.length === 0) return;
    const newItems: ProposalItem[] = availableSamples.slice(0, 3).map((sample) => ({
      id: sample.id,
      name: sample.name,
      size: sample.sizeBytes,
      base64: sample.base64,
      url: sample.url,
    }));
    setProposals(newItems);
  };

  // Run Gemini comparison
  const handleCompare = async () => {
    if (proposals.length === 0) {
      alert('Por favor cargue al menos 1 propuesta en PDF (máximo 3) en la sección 1.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const payload = {
        files: proposals.map((p) => ({
          name: p.name,
          base64: p.base64,
        })),
        profile: {
          name: clientName,
          vehicleAndUsage,
          budgetAnnual,
          mandatoryCovers,
          priorities,
          paymentPreference,
        },
      };

      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setCurrentUser(null);
        throw new Error('Su sesión ha expirado o no es válida. Por favor inicie sesión nuevamente.');
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Error en el servidor (${res.status})`);
      }

      const data = await res.json();
      setAnalysisResult(data);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      console.error('Error during comparison:', err);
      setAnalysisError(err.message || 'Error al conectar con Gemini para analizar las propuestas.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Copy WhatsApp message
  const handleCopyMessage = () => {
    if (!analysisResult?.mensajeWhatsApp) return;
    navigator.clipboard.writeText(analysisResult.mensajeWhatsApp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Reset comparison
  const handleResetComparison = () => {
    setAnalysisResult(null);
    setAnalysisError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper for traffic light styling
  const getTrafficLightBadge = (color: 'verde' | 'amarillo' | 'rojo') => {
    switch (color) {
      case 'verde':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span>Verde (Apta)</span>
          </div>
        );
      case 'amarillo':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 font-semibold text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
            <span>Amarillo (Revisar presupuesto)</span>
          </div>
        );
      case 'rojo':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-900 border border-rose-300 font-semibold text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
            <span>Rojo (No cumple obligatorias)</span>
          </div>
        );
    }
  };

  // Loading state while checking session
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-[#002b66]" />
          <p className="text-xs font-semibold tracking-wide">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: LOGIN SCREEN (NO GOOGLE, NO EMAIL)
  // ==========================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
        {/* Simple Institutional Header */}
        <header className="bg-[#002b66] text-white py-4 px-6 border-b border-[#001f4d] shadow-xs">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                <Shield className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight block">BN Corredora de Seguros</span>
                <span className="text-[10px] text-blue-200">Costa Rica</span>
              </div>
            </div>
            <span className="text-[11px] text-blue-200 font-medium">Acceso Asesores</span>
          </div>
        </header>

        {/* Login Card */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-7 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#002b66] mx-auto flex items-center justify-center border border-blue-100 mb-1">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Comparador de Propuestas BN
              </h1>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Ingrese sus credenciales de usuario asignadas para acceder a la plataforma.
              </p>
            </div>

            {/* Error Message Box */}
            {loginError && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug font-medium">{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Usuario
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={loginUsuario}
                    onChange={(e) => setLoginUsuario(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder="Ej. admin"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b66]/20 focus:border-[#002b66] bg-white text-slate-900 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b66]/20 focus:border-[#002b66] bg-white text-slate-900 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 px-4 bg-[#002b66] hover:bg-[#001f4d] active:scale-[0.99] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <span>Entrar</span>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 leading-normal">
                Sistema interno exclusivo. La creación de cuentas la realiza únicamente el administrador.
              </p>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center text-xs text-slate-500">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-1.5">
            <span className="font-semibold text-slate-700">Aviso importante:</span>
            <span>
              Borrador generado con IA. Debe ser validado por un asesor contra las condiciones reales de la póliza. No suba datos reales de clientes.
            </span>
          </div>
        </footer>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: FORCED PASSWORD CHANGE SCREEN
  // ==========================================
  if (currentUser.debeCambiarClave) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
        <header className="bg-[#002b66] text-white py-4 px-6 border-b border-[#001f4d] shadow-xs">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                <Shield className="w-4 h-4 text-amber-400" />
              </div>
              <span className="font-bold text-sm tracking-tight">BN Corredora de Seguros</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-blue-200 hover:text-white flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-7 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center border border-amber-200 mb-1">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Cambio obligatorio de contraseña
              </h1>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Hola <strong className="text-slate-700">{currentUser.nombre}</strong>. Por motivos de seguridad, debe definir una nueva contraseña personal antes de continuar.
              </p>
            </div>

            {changePasswordError && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug font-medium">{changePasswordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres y al menos un número"
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b66]/20 focus:border-[#002b66] bg-white text-slate-900 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita su nueva contraseña"
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b66]/20 focus:border-[#002b66] bg-white text-slate-900 transition-colors"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-semibold text-slate-700 block">Requisitos de seguridad:</span>
                <p className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  Mínimo 8 caracteres
                </p>
                <p className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${/\d/.test(newPassword) ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  Al menos un número (0-9)
                </p>
              </div>

              <button
                type="submit"
                disabled={changePasswordLoading}
                className="w-full py-2.5 px-4 bg-[#002b66] hover:bg-[#001f4d] active:scale-[0.99] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
              >
                {changePasswordLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Actualizando contraseña...</span>
                  </>
                ) : (
                  <span>Guardar contraseña y continuar</span>
                )}
              </button>
            </form>
          </div>
        </div>

        <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center text-xs text-slate-500">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-1.5">
            <span className="font-semibold text-slate-700">Aviso importante:</span>
            <span>
              Borrador generado con IA. Debe ser validado por un asesor contra las condiciones reales de la póliza. No suba datos reales de clientes.
            </span>
          </div>
        </footer>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: MAIN COMPARATOR APPLICATION
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Top Header with User Bar and Cerrar Sesión button */}
      <header className="bg-[#002b66] text-white shadow-sm border-b border-[#001f4d] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Comparador de Propuestas BN</h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-white/15 text-blue-100 px-2 py-0.5 rounded">
                  Corredora de Seguros
                </span>
              </div>
              <p className="text-xs text-blue-100/90 font-normal mt-0.5">
                Compara propuestas de seguro de automóvil en minutos. La IA prepara, el asesor decide.
              </p>
            </div>
          </div>

          {/* User information & Cerrar sesión button visible on all views */}
          <div className="flex items-center gap-3 self-end md:self-auto text-xs">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/15">
              <div className="w-6 h-6 rounded-full bg-amber-400 text-[#002b66] font-bold text-[11px] flex items-center justify-center">
                {currentUser.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="font-semibold text-white leading-tight">{currentUser.nombre}</p>
                <p className="text-[10px] text-blue-200 capitalize">
                  {currentUser.rol} · @{currentUser.usuario}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-rose-600/80 text-blue-100 hover:text-white transition-colors border border-white/15 font-medium cursor-pointer"
              title="Cerrar sesión del sistema"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8 flex-1 space-y-8">
        
        {/* Step 1 & Step 2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* SECTION 1: PROPUESTAS (PDF UPLOADER) */}
          <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#002b66] text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h2 className="text-base font-bold text-slate-900">Propuestas</h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {proposals.length} de 3 cargadas
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Sube de 1 a 3 cotizaciones en formato PDF (una propuesta por aseguradora). Gemini extraerá automáticamente los datos de póliza.
            </p>

            {/* Drag & Drop Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => proposals.length < 3 && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${
                proposals.length >= 3
                  ? 'border-slate-200 bg-slate-50/50 cursor-not-allowed text-slate-400'
                  : 'border-slate-300 hover:border-[#002b66] bg-slate-50/70 hover:bg-blue-50/30 text-slate-600'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                disabled={proposals.length >= 3}
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-blue-100/80 text-[#002b66] flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  {proposals.length >= 3 ? 'Límite de 3 archivos alcanzado' : 'Haga clic para subir o arrastre sus PDF'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Formatos aceptados: .pdf (Máximo 3 archivos)
                </p>
              </div>
            </div>

            {/* List of uploaded files */}
            {proposals.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-slate-700 block">
                  Archivos listos para comparar:
                </span>
                {proposals.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-slate-800 truncate" title={item.name}>
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {(item.size / 1024).toFixed(1)} KB · Propuesta #{idx + 1}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.url && (
                        <button
                          type="button"
                          onClick={() => setActivePdfPreview({ url: item.url!, name: item.name })}
                          className="p-1 text-slate-500 hover:text-[#002b66] hover:bg-slate-200/60 rounded"
                          title="Ver documento"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeProposal(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Eliminar propuesta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Sample Proposals */}
            {availableSamples.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    Propuestas de ejemplo listas:
                  </span>
                  {proposals.length < 3 && (
                    <button
                      type="button"
                      onClick={loadAllSamples}
                      className="text-[11px] text-[#002b66] hover:underline font-semibold cursor-pointer"
                    >
                      Cargar las 3
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  {availableSamples.map((sample) => {
                    const isAdded = proposals.some((p) => p.name === sample.name);
                    return (
                      <button
                        key={sample.id}
                        type="button"
                        disabled={isAdded || proposals.length >= 3}
                        onClick={() => loadSingleSample(sample)}
                        className={`text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between border transition-colors cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800 cursor-default'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="truncate pr-2 font-medium">
                          {sample.displayName.replace('Propuesta ', '')}
                        </span>
                        {isAdded ? (
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" /> Cargada
                          </span>
                        ) : (
                          <span className="text-[10px] text-blue-700 font-semibold shrink-0">
                            + Agregar
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2: PERFIL DEL CLIENTE */}
          <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#002b66] text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h2 className="text-base font-bold text-slate-900">Perfil del cliente</h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Criterios de validación
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del cliente
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej. Laura Solís Vargas"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b66]/20 focus:border-[#002b66] bg-white"
                />
              </div>

              {/* Vehículo y uso */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehículo y uso
                </label>
                <input
                  type="text"
                  value={vehicleAndUsage}
                  onChange={(e) => setVehicleAndUsage(e.target.value)}
                  placeholder="Ej. Toyota Corolla XEi 2022 - Particular"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b66]/20 focus:border-[#002b66] bg-white"
                />
              </div>

              {/* Presupuesto máximo anual (colones) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Presupuesto máximo anual (colones)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                    ₡
                  </span>
                  <input
                    type="text"
                    value={budgetDisplay}
                    onChange={handleBudgetChange}
                    placeholder="420.000"
                    className="w-full text-xs pl-7 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b66]/20 focus:border-[#002b66] bg-white font-mono tabular-nums font-semibold"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Base para validar si cabe en presupuesto.
                </p>
              </div>

              {/* Forma de pago preferida */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Forma de pago preferida
                </label>
                <select
                  value={paymentPreference}
                  onChange={(e) => setPaymentPreference(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b66]/20 focus:border-[#002b66] bg-white"
                >
                  <option value="Anual">Anual (contado)</option>
                  <option value="Semestral">Semestral</option>
                  <option value="Mensual">Mensual (fraccionado)</option>
                </select>
              </div>
            </div>

            {/* Coberturas obligatorias (casillas) */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Coberturas obligatorias{' '}
                <span className="text-[11px] font-normal text-slate-500">
                  (Para considerar que cumple obligatorias)
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mandatoryCovers.colision}
                    onChange={(e) =>
                      setMandatoryCovers((prev) => ({ ...prev, colision: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-[#002b66] focus:ring-[#002b66]"
                  />
                  <span className="font-medium text-slate-800">Colisión</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mandatoryCovers.robo}
                    onChange={(e) =>
                      setMandatoryCovers((prev) => ({ ...prev, robo: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-[#002b66] focus:ring-[#002b66]"
                  />
                  <span className="font-medium text-slate-800">Robo</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mandatoryCovers.asistenciaVial247}
                    onChange={(e) =>
                      setMandatoryCovers((prev) => ({ ...prev, asistenciaVial247: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-[#002b66] focus:ring-[#002b66]"
                  />
                  <span className="font-medium text-slate-800">Asistencia vial 24/7</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mandatoryCovers.fenomenosNaturales}
                    onChange={(e) =>
                      setMandatoryCovers((prev) => ({ ...prev, fenomenosNaturales: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-[#002b66] focus:ring-[#002b66]"
                  />
                  <span className="font-medium text-slate-800">Fenómenos naturales</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mandatoryCovers.vehiculoSustituto}
                    onChange={(e) =>
                      setMandatoryCovers((prev) => ({ ...prev, vehiculoSustituto: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-[#002b66] focus:ring-[#002b66]"
                  />
                  <span className="font-medium text-slate-800">Vehículo sustituto</span>
                </label>
              </div>
            </div>

            {/* Prioridades (área de texto) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prioridades del cliente
              </label>
              <textarea
                rows={2}
                value={priorities}
                onChange={(e) => setPriorities(e.target.value)}
                placeholder="Indique las prioridades particulares del cliente (ej. deducibles bajos, cobertura ante inundaciones, grúa de alto kilometraje, etc.)"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b66]/20 focus:border-[#002b66] bg-white resize-none"
              />
            </div>
          </section>
        </div>

        {/* COMPARISON ACTION BUTTON */}
        <div className="flex flex-col items-center justify-center pt-2">
          <button
            type="button"
            disabled={isAnalyzing || proposals.length === 0}
            onClick={handleCompare}
            className={`w-full max-w-md py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer ${
              isAnalyzing || proposals.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-[#002b66] hover:bg-[#001f4d] text-white hover:shadow-lg active:scale-[0.99]'
            }`}
          >
            {isAnalyzing ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                <span>Analizando propuestas...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>Comparar propuestas ({proposals.length} cargada{proposals.length === 1 ? '' : 's'})</span>
              </>
            )}
          </button>

          {proposals.length === 0 && (
            <p className="text-xs text-slate-500 mt-2">
              Cargue al menos una propuesta en la sección 1 para habilitar el análisis.
            </p>
          )}

          {analysisError && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 max-w-xl text-center">
              <strong>Error:</strong> {analysisError}
            </div>
          )}
        </div>

        {/* SECTION 3: RESULTADO */}
        {analysisResult && (
          <div ref={resultRef} className="space-y-8 pt-4">
            
            {/* Header section 3 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#002b66] text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Resultado de la Comparativa</h2>
                    <p className="text-xs text-slate-500">
                      Cliente: <span className="font-semibold text-slate-700">{clientName}</span> · Presupuesto anual: <span className="font-semibold text-slate-700 font-mono tabular-nums">₡ {budgetAnnual.toLocaleString('es-CR')}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetComparison}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Nueva comparación
                  </button>
                </div>
              </div>

              {/* Comparative Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#002b66] text-white">
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider w-56 shrink-0 border-r border-blue-900">
                        Criterio / Cobertura
                      </th>
                      {analysisResult.proposals.map((prop, idx) => (
                        <th
                          key={idx}
                          className="py-3 px-4 font-bold text-xs border-r last:border-r-0 border-blue-900 min-w-[240px]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-extrabold text-white">
                              {prop.insurerName || `Aseguradora #${idx + 1}`}
                            </span>
                          </div>
                          <p className="text-[10px] text-blue-200 font-normal truncate mt-0.5">
                            {prop.quoteNumber !== 'no indicado' ? `Cotización: ${prop.quoteNumber}` : prop.fileName}
                          </p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    
                    {/* 1. Prima anual */}
                    <tr className="bg-white hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 border-r border-slate-200 bg-slate-50/50">
                        Prima anual
                      </td>
                      {analysisResult.proposals.map((prop, idx) => (
                        <td key={idx} className="py-3 px-4 font-bold text-slate-900 font-mono tabular-nums text-sm border-r last:border-r-0 border-slate-200">
                          {prop.primaAnual}
                        </td>
                      ))}
                    </tr>

                    {/* 2. Cabe en presupuesto */}
                    <tr className="bg-slate-50/40 hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                        Cabe en presupuesto
                      </td>
                      {analysisResult.proposals.map((prop, idx) => {
                        const fits = prop.cabeEnPresupuesto === 'Sí';
                        return (
                          <td key={idx} className="py-3 px-4 border-r last:border-r-0 border-slate-200">
                            <div className="flex items-center gap-1.5">
                              {fits ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <Check className="w-3.5 h-3.5" /> Sí
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  <X className="w-3.5 h-3.5" /> No
                                </span>
                              )}
                              {prop.cabeEnPresupuestoJustificacion && (
                                <span className="text-[10px] text-slate-500">
                                  ({prop.cabeEnPresupuestoJustificacion})
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* 3. Deducible colisión */}
                    <tr className="bg-white hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                        Deducible colisión
                      </td>
                      {analysisResult.proposals.map((prop, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-700 border-r last:border-r-0 border-slate-200">
                          {prop.deducibleColision}
                        </td>
                      ))}
                    </tr>

                    {/* 4. Deducible robo */}
                    <tr className="bg-slate-50/40 hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                        Deducible robo
                      </td>
                      {analysisResult.proposals.map((prop, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-700 border-r last:border-r-0 border-slate-200">
                          {prop.deducibleRobo}
                        </td>
                      ))}
                    </tr>

                    {/* 5. RC daños a terceros */}
                    <tr className="bg-white hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                        RC daños a terceros
                      </td>
                      {analysisResult.proposals.map((prop, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-700 border-r last:border-r-0 border-slate-200 font-mono tabular-nums">
                          {prop.rcDanosTerceros}
                        </td>
                      ))}
                    </tr>

                    {/* 6. RC lesiones */}
                    <tr className="bg-slate-50/40 hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                        RC lesiones
                      </td>
                      {analysisResult.proposals.map((prop, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-700 border-r last:border-r-0 border-slate-200 font-mono tabular-nums">
                          {prop.rcLesiones}
                        </td>
                      ))}
                    </tr>

                    {/* 7. Asistencia vial 24/7 */}
                    <tr className="bg-white hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                        Asistencia vial 24/7
                      </td>
                      {analysisResult.proposals.map((prop, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-700 border-r last:border-r-0 border-slate-200">
                          {prop.asistenciaVial247}
                        </td>
                      ))}
                    </tr>

                    {/* 8. Grúa */}
                    <tr className="bg-slate-50/40 hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                        Grúa
                      </td>
                      {analysisResult.proposals.map((prop, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-700 border-r last:border-r-0 border-slate-200">
                          {prop.grua}
                        </td>
                      ))}
                    </tr>

                    {/* 9. Vehículo sustituto */}
                    <tr className="bg-white hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                        Vehículo sustituto
                      </td>
                      {analysisResult.proposals.map((prop, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-700 border-r last:border-r-0 border-slate-200">
                          {prop.vehiculoSustituto}
                        </td>
                      ))}
                    </tr>

                    {/* 10. Fenómenos naturales */}
                    <tr className="bg-slate-50/40 hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                        Fenómenos naturales
                      </td>
                      {analysisResult.proposals.map((prop, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-700 border-r last:border-r-0 border-slate-200">
                          {prop.fenomenosNaturales}
                        </td>
                      ))}
                    </tr>

                    {/* 11. Rotura de cristales */}
                    <tr className="bg-white hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                        Rotura de cristales
                      </td>
                      {analysisResult.proposals.map((prop, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-700 border-r last:border-r-0 border-slate-200 font-mono tabular-nums">
                          {prop.roturaCristales}
                        </td>
                      ))}
                    </tr>

                    {/* 12. Exclusiones destacadas */}
                    <tr className="bg-slate-50/40 hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                        Exclusiones destacadas
                      </td>
                      {analysisResult.proposals.map((prop, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-600 border-r last:border-r-0 border-slate-200 text-[11px] leading-relaxed">
                          {prop.exclusionesDestacadas}
                        </td>
                      ))}
                    </tr>

                    {/* 13. Cumple obligatorias */}
                    <tr className="bg-white hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/50">
                        Cumple obligatorias
                      </td>
                      {analysisResult.proposals.map((prop, idx) => {
                        const complies = prop.cumpleObligatorias === 'Sí';
                        return (
                          <td key={idx} className="py-3 px-4 border-r last:border-r-0 border-slate-200">
                            <div>
                              {complies ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <Check className="w-3.5 h-3.5" /> Sí
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  <X className="w-3.5 h-3.5" /> No
                                </span>
                              )}
                              <p className="text-[10px] text-slate-500 mt-1">
                                {prop.cumpleObligatoriasDetalle}
                              </p>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* 14. Semáforo */}
                    <tr className="bg-slate-100/70 hover:bg-slate-100 transition-colors border-t-2 border-slate-300">
                      <td className="py-3.5 px-4 font-bold text-slate-900 border-r border-slate-200 bg-slate-100">
                        Semáforo
                      </td>
                      {analysisResult.proposals.map((prop, idx) => (
                        <td key={idx} className="py-3.5 px-4 border-r last:border-r-0 border-slate-200">
                          <div className="space-y-1">
                            {getTrafficLightBadge(prop.semaforo)}
                            {prop.semaforoMotivo && (
                              <p className="text-[10px] text-slate-500 leading-tight">
                                {prop.semaforoMotivo}
                              </p>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>

                  </tbody>
                </table>
              </div>

              {/* Traffic light legend */}
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-700">Regla del semáforo:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Verde: Cabe en presupuesto y cumple obligatorias
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Amarillo: Cumple obligatorias pero excede presupuesto
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Rojo: No cumple obligatorias requeridas
                </span>
              </div>
            </div>

            {/* TWO BOXES BELOW TABLE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              
              {/* Box 1: Recomendación preliminar (borrador) */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-5 h-5 text-[#002b66]" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Recomendación preliminar (borrador)
                      </h3>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      Para el asesor
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-3">
                    Propuesta recomendada según las prioridades del cliente, justificada con montos exactos (máximo 5 líneas):
                  </p>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-line">
                    {analysisResult.recomendacionPreliminar}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Revisión previa a contacto</span>
                  <span className="font-medium text-slate-700">BN Corredora de Seguros</span>
                </div>
              </div>

              {/* Box 2: Mensaje sugerido para el cliente (WhatsApp) */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Mensaje sugerido para el cliente (WhatsApp)
                      </h3>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Borrador WhatsApp
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-3">
                    Tono cordial, sin tecnicismos, con recomendación, dos razones, alternativa y próximo paso:
                  </p>

                  {/* WhatsApp Chat Bubble Look */}
                  <div className="bg-[#e7f5e9]/70 border border-[#c6e6cb] rounded-xl p-4 text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-line shadow-xs">
                    {analysisResult.mensajeWhatsApp}
                  </div>
                </div>

                {/* Buttons: Copiar mensaje y Nueva comparación */}
                <div className="pt-4 border-t border-slate-100 mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                        copied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#002b66] hover:bg-[#001f4d] text-white active:scale-95'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>¡Copiado al portapapeles!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar mensaje</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(analysisResult.mensajeWhatsApp)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      title="Abrir en WhatsApp Web o App"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Abrir WhatsApp</span>
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetComparison}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Nueva comparación</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* PDF PREVIEW MODAL */}
      {activePdfPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-300">
            <div className="flex items-center justify-between px-4 py-3 bg-[#002b66] text-white">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-blue-200 shrink-0" />
                <span className="font-bold text-xs truncate">{activePdfPreview.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setActivePdfPreview(null)}
                className="p-1 rounded hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100">
              <iframe
                src={activePdfPreview.url}
                className="w-full h-full border-none"
                title={activePdfPreview.name}
              />
            </div>
          </div>
        </div>
      )}

      {/* FIXED FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-1.5">
          <span className="font-semibold text-slate-700">Aviso importante:</span>
          <span>
            Borrador generado con IA. Debe ser validado por un asesor contra las condiciones reales de la póliza. No suba datos reales de clientes.
          </span>
        </div>
      </footer>
    </div>
  );
}
