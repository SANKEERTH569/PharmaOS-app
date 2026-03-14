import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PremiumAnimatedLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  autoPlay?: boolean;
  playDelay?: number;
  textTone?: 'default' | 'light';
}

export function PremiumAnimatedLogo({
  className = '',
  size = 'md',
  autoPlay = false,
  playDelay = 1000,
  textTone = 'default',
}: PremiumAnimatedLogoProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  React.useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => setIsAnimating(true), playDelay);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, playDelay]);

  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', container: 'h-10' },
    md: { icon: 'w-10 h-10', text: 'text-2xl', container: 'h-12' },
    lg: { icon: 'w-14 h-14', text: 'text-3xl', container: 'h-16' },
    xl: { icon: 'w-20 h-20', text: 'text-5xl', container: 'h-24' },
  };

  const currentSize = sizes[size];

  return (
    <motion.div
      className={`relative flex items-center ${currentSize.container} ${className}`}
      onHoverStart={() => setIsAnimating(true)}
      onHoverEnd={() => !autoPlay && setIsAnimating(false)}
      style={{ cursor: 'pointer' }}
    >
      <AnimatePresence mode="wait">
        {!isAnimating ? (
          <motion.div
            key="compact"
            className={`${currentSize.icon} rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-500 flex items-center justify-center text-white font-black relative overflow-hidden shadow-lg`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-indigo-500/50 via-transparent to-indigo-400/30"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />

            <div className="relative z-10 flex">
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              >
                P
              </motion.span>
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, delay: 0.1 }}
              >
                H
              </motion.span>
            </div>

            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-white/50"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className={`${currentSize.icon} rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-500 flex items-center justify-center text-white font-black relative overflow-hidden shadow-xl`}
              initial={{ scale: 1, x: 0 }}
              animate={{ scale: [1, 1.15, 1.05], rotateY: [0, 360] }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />

              <div className="relative z-10">PH</div>
            </motion.div>

            <div className={`font-bold ${currentSize.text} flex overflow-hidden`}>
              <div className="flex">
                {['P', 'h', 'a', 'r', 'm', 'a'].map((letter, i) => (
                  <motion.span
                    key={`pharma-${i}`}
                    className={textTone === 'light' ? 'text-white' : 'text-slate-900'}
                    initial={{ opacity: 0, y: 20, rotateX: -90 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>

              <span className="w-2" />

              <div className="flex">
                {['H', 'e', 'a', 'd'].map((letter, i) => (
                  <motion.span
                    key={`head-${i}`}
                    className={textTone === 'light'
                      ? 'bg-gradient-to-r from-cyan-200 via-teal-200 to-emerald-200 bg-clip-text text-transparent font-extrabold'
                      : 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-400 bg-clip-text text-transparent font-extrabold'}
                    initial={{ opacity: 0, y: 20, rotateX: -90 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ delay: 0.6 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>
            </div>

            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute w-1 h-1 bg-indigo-600 rounded-full"
                initial={{ opacity: 0, scale: 0, x: 20 + i * 30, y: -10 + i * 5 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], y: -20 + i * 5 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
