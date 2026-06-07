import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import * as FramerMotion from 'motion/react';

const { motion } = FramerMotion;

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleTheme}
      className="p-3 warm-glass rounded-full text-art-text-dim hover:text-art-accent transition-colors shadow-sm"
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </motion.button>
  );
}
