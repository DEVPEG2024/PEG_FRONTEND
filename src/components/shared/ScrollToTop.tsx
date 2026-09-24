import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiArrowUp } from 'react-icons/hi'

const ScrollToTop = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          // au-dessus de la barre d'onglets du téléphone (--peg-dock-lift, 0 sans elle)
          style={{ bottom: 'calc(1.5rem + var(--peg-safe-bottom, 0px) + var(--peg-dock-lift, 0px))' }}
          className="fixed right-6 z-50 p-3 rounded-full bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 shadow-lg hover:shadow-xl transition-shadow"
          aria-label="Retour en haut"
        >
          <HiArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export default ScrollToTop
