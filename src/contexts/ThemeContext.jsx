import { createContext, useContext, useEffect } from 'react'

/**
 * El sistema de diseño de Noni es de un solo tema: papel (#FCF6F5) y marca
 * (#990011). No hay variante oscura.
 *
 * Antes este contexto seguía la preferencia del sistema operativo y ponía
 * `color-scheme: dark` cuando el usuario tenía el modo oscuro activado. Como no
 * existe ni una sola regla de CSS para ese tema, el resultado era un panel de
 * papel con los selects, los scrollbars y los date pickers nativos pintados en
 * negro. Ahora el tema queda fijo y sólo dejamos el contexto en pie para que
 * los componentes que lo consultan sigan funcionando.
 */
const TEMA = 'light'

const ThemeContext = createContext({ theme: TEMA, toggle: () => {}, setTheme: () => {} })

const noop = () => {}

export function ThemeProvider({ children }) {
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', TEMA)
    root.style.colorScheme = TEMA
    // La barra del navegador toma siempre el color del papel para que el borde
    // superior no se corte contra el fondo de la app.
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', '#FCF6F5')
    // Limpiamos la preferencia vieja: si alguien la tenía en 'dark', al volver
    // a instalarse la variante clara no quedaba pegada.
    try { localStorage.removeItem('noni_theme') } catch { /* noop */ }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: TEMA, toggle: noop, setTheme: noop }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export default ThemeContext
