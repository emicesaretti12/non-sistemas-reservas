import { motion } from 'framer-motion'
import {
  IconCheckCircle,
  IconBolt,
  IconChart,
  IconCalendar,
  IconPalette,
  IconRocket,
  IconClipboard,
} from './NoniIcons'

const TABS = [
  { id: 'inicio', label: 'Inicio', icon: IconChart },
  { id: 'agenda', label: 'Agenda', icon: IconCalendar },
  { id: 'servicios', label: 'Servicios', icon: IconBolt },
  { id: 'equipo', label: 'Equipo', icon: IconCheckCircle },
  { id: 'ajustes', label: 'Ajustes', icon: IconPalette },
]

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="ns-bottom-nav"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`ns-bottom-nav-item ${isActive ? 'active' : ''}`}
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <motion.div
              animate={{ scale: isActive ? 1.2 : 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <Icon size={24} />
            </motion.div>
            <span className="text-[9px] font-bold">{tab.label}</span>

            {/* Active indicator dot */}
            {isActive && (
              <motion.div
                layoutId="active-indicator"
                className="absolute -bottom-1 w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--ns-primary)' }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              />
            )}
          </motion.button>
        )
      })}
    </motion.nav>
  )
}
