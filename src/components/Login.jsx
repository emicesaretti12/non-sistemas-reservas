import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  // --- ESTADOS DEL FORMULARIO Y NAVEGACIÓN ---
  const [mode, setMode] = useState('login') // 'login' | 'registro' | 'recuperar'
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('') 
  const [acceptTerms, setAcceptTerms] = useState(false)      
  
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // --- ESTADOS DE ALERTAS Y SEGURIDAD ---
  const [mensaje, setMensaje] = useState(null) 
  const [passwordStrength, setPasswordStrength] = useState(0)

  /**
   * EFECTO: Limpieza de seguridad al cambiar de modo
   */
  useEffect(() => {
    setMensaje(null)
    setPassword('')
    setConfirmPassword('')
    setAcceptTerms(false)
    setPasswordStrength(0)
  }, [mode])

  /**
   * EFECTO: Evaluar fuerza de la contraseña en tiempo real
   */
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0)
      return
    }
    let score = 0
    if (password.length >= 8) score += 1 
    if (/[A-Z]/.test(password)) score += 1 
    if (/[0-9]/.test(password)) score += 1 
    if (/[^A-Za-z0-9]/.test(password)) score += 1 
    setPasswordStrength(score)
  }, [password])

  /**
   * UTILIDAD: Pre-validación estricta de Email
   */
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  /**
   * UTILIDAD: Diccionario de errores de Supabase
   */
  const traducirError = (errorMsg) => {
    const msg = errorMsg.toLowerCase()
    if (msg.includes('invalid login credentials')) return 'Credenciales incorrectas. Verifica tu correo y contraseña.'
    if (msg.includes('user already registered')) return 'El correo electrónico ya posee una cuenta activa.'
    if (msg.includes('rate limit')) return 'Tráfico inusual detectado. Por favor, espera 60 segundos.'
    if (msg.includes('email link is invalid')) return 'El token de seguridad ha expirado. Solicita un nuevo enlace.'
    if (msg.includes('not confirmed')) return 'Debes verificar tu correo electrónico antes de iniciar sesión.'
    return `Error del servidor: ${errorMsg}`
  }

  /**
   * MANEJO DE LOGIN SOCIAL (GOOGLE / GITHUB)
   */
  const handleSocialLogin = async (provider) => {
    setLoading(true)
    setMensaje(null)
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${window.location.origin}/admin`
      }
    })

    if (error) {
      setMensaje({ tipo: 'error', texto: `Error en pasarela ${provider}: ${error.message}` })
      setLoading(false)
    }
  }

  /**
   * MOTOR PRINCIPAL DE AUTENTICACIÓN
   */
  const handleAuth = async (e) => {
    e.preventDefault()
    setMensaje(null)

    const cleanEmail = email.trim().toLowerCase()
    
    if (!cleanEmail) {
      return setMensaje({ tipo: 'error', texto: 'Se requiere una dirección de correo electrónico.' })
    }
    if (!isValidEmail(cleanEmail)) {
      return setMensaje({ tipo: 'error', texto: 'El formato del correo ingresado no es válido.' })
    }

    if (mode === 'registro') {
      if (passwordStrength < 3) {
        return setMensaje({ tipo: 'error', texto: 'La clave es demasiado débil. Usa letras, números y símbolos.' })
      }
      if (password !== confirmPassword) {
        return setMensaje({ tipo: 'error', texto: 'Las contraseñas de seguridad no coinciden.' })
      }
      if (!acceptTerms) {
        return setMensaje({ tipo: 'error', texto: 'Es obligatorio aceptar los Términos y Condiciones.' })
      }
    }

    if (mode === 'login' && password.length === 0) {
      return setMensaje({ tipo: 'error', texto: 'Debes ingresar tu contraseña de acceso.' })
    }

    setLoading(true)

    try {
      if (mode === 'registro') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
        })
        if (error) throw error

        if (data?.user && !data.session) {
          setMensaje({ 
            tipo: 'exito', 
            texto: '¡Aprovisionado! Revisa tu bandeja de entrada o spam para activar el entorno.' 
          })
          setMode('login')
        }
        
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        })
        if (error) throw error
        
      } else if (mode === 'recuperar') {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/actualizar-clave`
        })
        if (error) throw error
        
        setMensaje({ 
          tipo: 'exito', 
          texto: 'Protocolo iniciado. Las instrucciones fueron enviadas a tu correo.' 
        })
        setMode('login')
      }
      
    } catch (error) {
      setMensaje({ tipo: 'error', texto: traducirError(error.message) })
    } finally {
      setLoading(false)
    }
  }

  const configUI = {
    login: { titulo: 'Bienvenido', subtitulo: 'Accedé al panel de Non Sistemas.', btn: 'Entrar al entorno' },
    registro: { titulo: 'Crear Cuenta', subtitulo: 'Desplegá tu infraestructura hoy.', btn: 'Aprovisionar servidor' },
    recuperar: { titulo: 'Recuperar Acceso', subtitulo: 'Ingresa tu correo para restablecer.', btn: 'Enviar protocolo' }
  }

  const renderPasswordMeter = () => {
    if (mode !== 'registro') return null
    
    const colors = ['bg-red-500', 'bg-orange-400', 'bg-blue-400', 'bg-emerald-500']
    const labels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte']
    
    return (
      <div className="mt-2 md:mt-3 animate-in fade-in duration-300">
        <div className="flex gap-1 md:gap-1.5 h-1 md:h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          {[1, 2, 3, 4].map(level => (
            <div 
              key={level} 
              className={`h-full flex-1 transition-all duration-500 ${passwordStrength >= level ? colors[passwordStrength - 1] : 'bg-transparent'}`}
            ></div>
          ))}
        </div>
        {password && (
          <p className={`text-[8px] md:text-[9px] font-bold uppercase tracking-widest mt-1 md:mt-1.5 text-right transition-colors ${passwordStrength < 3 ? 'text-white/40' : 'text-emerald-400'}`}>
            Nivel: {labels[Math.max(0, passwordStrength - 1)]}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 md:p-6 relative overflow-hidden ns-animated-bg">
      
      {/* ANIMATED BACKGROUND ORBS */}
      <div className="ns-orb w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-purple-600/30 -top-[5%] -left-[10%]"></div>
      <div className="ns-orb w-[250px] h-[250px] md:w-[400px] md:h-[400px] bg-cyan-400/20 -bottom-[5%] -right-[10%]" style={{animationDelay: '3s'}}></div>
      <div className="ns-orb w-[150px] h-[150px] md:w-[250px] md:h-[250px] bg-indigo-500/20 top-[50%] left-[60%]" style={{animationDelay: '6s'}}></div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '32px 32px'}}></div>

      <div className="w-full max-w-[440px] z-10 ns-fade-up">
        
        {/* TARJETA PRINCIPAL - GLASSMORPHISM (Compacta en móvil) */}
        <div className="ns-glass-dark rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-all duration-500 relative overflow-hidden border border-white/5">
          
          {/* LOGO Y TÍTULO */}
          <div className="text-center mb-6 md:mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[1.8rem] mb-4 md:mb-6 ns-float relative overflow-hidden shadow-2xl" style={{background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)'}}>
              <span className="text-white font-black text-xl md:text-3xl italic tracking-tighter relative z-10">NS</span>
              <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight" style={{fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
              {configUI[mode].titulo}
            </h1>
            <p className="text-white/40 mt-1 md:mt-2 font-medium text-[11px] md:text-sm transition-opacity duration-300">
              {configUI[mode].subtitulo}
            </p>
          </div>

          {/* CAJA DE MENSAJES DINÁMICOS */}
          {mensaje && (
            <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl mb-4 md:mb-6 text-[10px] md:text-xs font-bold text-center ns-fade-down relative z-10 ${
              mensaje.tipo === 'error' 
                ? 'bg-red-500/10 text-red-300 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
            }`}>
              {mensaje.texto}
            </div>
          )}

          {/* OAUTH: BOTONES SOCIALES */}
          {mode !== 'recuperar' && (
            <div className="animate-in fade-in duration-500 relative z-10">
              <div className="grid grid-cols-2 gap-2.5 md:gap-3 mb-4 md:mb-6">
                <button 
                  onClick={() => handleSocialLogin('google')}
                  disabled={loading}
                  type="button"
                  className="flex items-center justify-center gap-2 md:gap-3 py-3 md:py-3.5 px-3 md:px-4 bg-white/[0.03] border border-white/10 rounded-xl md:rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all font-bold text-white/80 text-xs md:text-sm active:scale-95 disabled:opacity-50 backdrop-blur-sm group"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:scale-110 transition-transform" alt="Google" />
                  <span>Google</span>
                </button>
                <button 
                  onClick={() => handleSocialLogin('github')}
                  disabled={loading}
                  type="button"
                  className="flex items-center justify-center gap-2 md:gap-3 py-3 md:py-3.5 px-3 md:px-4 bg-white/[0.03] border border-white/10 rounded-xl md:rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all font-bold text-white/80 text-xs md:text-sm active:scale-95 disabled:opacity-50 backdrop-blur-sm group"
                >
                  <img src="https://www.svgrepo.com/show/512317/github-142.svg" className="w-3.5 h-3.5 md:w-4 md:h-4 invert group-hover:scale-110 transition-transform" alt="GitHub" />
                  <span>GitHub</span>
                </button>
              </div>

              {/* DIVISOR */}
              <div className="relative mb-4 md:mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10"></span>
                </div>
                <div className="relative flex justify-center text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] text-white/30">
                  <span className="px-3 md:px-4" style={{background: 'rgba(15, 10, 30, 0.8)'}}>Operar con E-Mail</span>
                </div>
              </div>
            </div>
          )}

          {/* FORMULARIO PRINCIPAL */}
          <form onSubmit={handleAuth} className="space-y-3 md:space-y-4 relative z-10">
            
            {/* EMAIL */}
            <div>
              <label className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase ml-1 tracking-widest mb-1 md:mb-1.5 block">Correo Electrónico</label>
              <div className="relative flex items-center group">
                 <div className="absolute left-3 md:left-4 w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/5 flex items-center justify-center transition-colors duration-300 group-focus-within:bg-white text-white/30 group-focus-within:text-black">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </div>
                 <input 
                   type="email" 
                   required
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="w-full px-4 md:px-5 py-3 md:py-4 bg-white/5 border border-white/10 rounded-xl md:rounded-[1.2rem] focus:border-[#6c5ce7] focus:bg-white/10 outline-none transition-all font-semibold text-white placeholder:text-white/20 focus:shadow-[0_0_0_4px_rgba(108,92,231,0.15)] text-xs md:text-sm pl-11 md:pl-14"
                   placeholder="admin@empresa.com"
                   disabled={loading}
                   autoComplete="email"
                 />
              </div>
            </div>

            {/* CONTRASEÑA */}
            {mode !== 'recuperar' && (
              <div className="relative animate-in fade-in zoom-in-[0.98] duration-300">
                <div className="flex justify-between items-center mb-1 md:mb-1.5 ml-1 mr-1">
                  <label className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase tracking-widest block">Credencial Maestra</label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('recuperar')}
                      className="text-[9px] md:text-[10px] font-black text-[#a29bfe] hover:text-white transition-colors"
                    >
                      ¿Perdiste tu llave?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center group">
                  <div className="absolute left-3 md:left-4 w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/5 flex items-center justify-center transition-colors duration-300 group-focus-within:bg-white text-white/30 group-focus-within:text-black">
                     <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"}
                    required={mode !== 'recuperar'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 md:px-5 py-3 md:py-4 bg-white/5 border border-white/10 rounded-xl md:rounded-[1.2rem] focus:border-[#6c5ce7] focus:bg-white/10 outline-none transition-all font-semibold text-white placeholder:text-white/20 focus:shadow-[0_0_0_4px_rgba(108,92,231,0.15)] text-xs md:text-sm pl-11 md:pl-14"
                    placeholder="••••••••••••"
                    disabled={loading}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 md:right-4 text-white/30 hover:text-white p-1 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {renderPasswordMeter()}
              </div>
            )}

            {/* CONFIRMAR CONTRASEÑA */}
            {mode === 'registro' && (
              <div className="relative animate-in slide-in-from-top-4 fade-in duration-500 pt-1 md:pt-0">
                <label className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase ml-1 tracking-widest mb-1 md:mb-1.5 block">Confirmar Credencial</label>
                <div className="relative flex items-center group">
                  <div className="absolute left-3 md:left-4 w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/5 flex items-center justify-center transition-colors duration-300 group-focus-within:bg-white text-white/30 group-focus-within:text-black">
                     <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 md:px-5 py-3 md:py-4 bg-white/5 border rounded-xl md:rounded-[1.2rem] outline-none transition-all font-semibold text-white placeholder:text-white/20 text-xs md:text-sm pl-11 md:pl-14 ${
                      confirmPassword.length > 0 && password !== confirmPassword 
                      ? 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]' 
                      : 'border-white/10 focus:border-[#6c5ce7] focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(108,92,231,0.15)]'
                    }`}
                    placeholder="Repetir clave exacta"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* CHECKBOX LEGAL */}
            {mode === 'registro' && (
              <div className="flex items-start gap-2.5 md:gap-3 mt-3 md:mt-4 animate-in fade-in duration-500">
                <div className="relative flex items-center mt-0.5">
                  <input 
                    type="checkbox" 
                    id="terms"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="peer appearance-none w-3.5 h-3.5 md:w-4 md:h-4 border border-white/20 rounded bg-white/5 checked:bg-[#6c5ce7] checked:border-[#6c5ce7] transition-all cursor-pointer"
                  />
                  <svg className="absolute w-2.5 h-2.5 md:w-3 md:h-3 text-white left-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <label htmlFor="terms" className="text-[9px] md:text-[10px] font-medium text-white/50 leading-tight cursor-pointer select-none">
                  Entiendo y acepto los <a href="#" className="text-[#a29bfe] hover:underline">Términos de Servicio</a> y la <a href="#" className="text-[#a29bfe] hover:underline">Política de Privacidad</a> respecto al tratamiento de datos.
                </label>
              </div>
            )}

            {/* BOTÓN PRINCIPAL */}
            <button 
              type="submit" 
              disabled={loading || (mode === 'registro' && (!acceptTerms || password !== confirmPassword || passwordStrength < 3))}
              className="ns-shimmer-btn w-full text-white font-black py-3.5 md:py-4 rounded-xl md:rounded-[1.2rem] shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] text-[10px] md:text-[11px] uppercase tracking-[0.2em] mt-4 md:mt-6 hover:shadow-[0_12px_40px_rgba(108,92,231,0.3)]"
              style={{background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)'}}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <div className="ns-spinner-sm" style={{borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white'}}></div>
                  <span>Procesando...</span>
                </div>
              ) : (
                <span>{configUI[mode].btn}</span>
              )}
            </button>
          </form>

          {/* NAVEGACIÓN INFERIOR */}
          <div className="mt-6 md:mt-8 text-center relative z-10 border-t border-white/5 pt-4 md:pt-6">
            {mode === 'recuperar' ? (
              <button 
                type="button"
                onClick={() => setMode('login')}
                className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                Volver a la consola
              </button>
            ) : (
              <button 
                type="button"
                onClick={() => setMode(mode === 'login' ? 'registro' : 'login')}
                className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                {mode === 'login' 
                  ? 'Aprovisionar un nuevo entorno' 
                  : '¿Ya posees una cuenta? Iniciar Sesión'
                }
              </button>
            )}
          </div>

        </div>

        {/* PIE DE PÁGINA */}
        <div className="mt-6 md:mt-10 flex flex-col items-center gap-2 opacity-30 relative z-10 pb-4 md:pb-8">
          <p className="text-[8px] md:text-[9px] font-black text-white/60 uppercase tracking-[0.4em]">
            Non Sistemas • Salsipuedes, CBA
          </p>
        </div>

      </div>
    </div>
  )
}