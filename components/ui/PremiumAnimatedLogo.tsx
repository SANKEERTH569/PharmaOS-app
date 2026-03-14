import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface PremiumAnimatedLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "morph" | "reveal" | "particles";
  autoPlay?: boolean;
  playDelay?: number;
}

export function PremiumAnimatedLogo({ 
  className = "", 
  size = "md",
  variant = "morph",
  autoPlay = false,
  playDelay = 1000
}: PremiumAnimatedLogoProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  React.useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => setIsAnimating(true), playDelay);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, playDelay]);

  const sizes = {
    sm: { icon: "w-8 h-8", text: "text-lg", container: "h-10" },
    md: { icon: "w-10 h-10", text: "text-2xl", container: "h-12" },
    lg: { icon: "w-14 h-14", text: "text-3xl", container: "h-16" },
    xl: { icon: "w-20 h-20", text: "text-5xl", container: "h-24" }
  };

  const currentSize = sizes[size];

  // Morph Animation (Default - Best)
  if (variant === "morph") {
    return (
      <motion.div
        className={`relative flex items-center ${currentSize.container} ${className}`}
        onHoverStart={() => setIsAnimating(true)}
        onHoverEnd={() => !autoPlay && setIsAnimating(false)}
        style={{ cursor: "pointer" }}
      >
        <AnimatePresence mode="wait">
          {!isAnimating ? (
            // Compact PH Logo
            <motion.div
              key="compact"
              className={`${currentSize.icon} rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center text-white font-black relative overflow-hidden shadow-lg`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Animated background gradient */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary/50 via-transparent to-primary/30"
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
              
              {/* PH Letters */}
              <div className="relative z-10 flex">
                <motion.span
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                >
                  P
                </motion.span>
                <motion.span
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                    delay: 0.1
                  }}
                >
                  H
                </motion.span>
              </div>

              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-white/50"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          ) : (
            // Expanded Full Logo
            <motion.div
              key="expanded"
              className="flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Icon morphs and moves */}
              <motion.div
                className={`${currentSize.icon} rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center text-white font-black relative overflow-hidden shadow-xl`}
                initial={{ scale: 1, x: 0 }}
                animate={{ 
                  scale: [1, 1.15, 1.05],
                  rotateY: [0, 360],
                }}
                transition={{ 
                  duration: 0.8,
                  ease: "easeInOut"
                }}
              >
                {/* Shimmer sweep */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{
                    duration: 0.8,
                    ease: "easeInOut"
                  }}
                />
                
                <div className="relative z-10">PH</div>
              </motion.div>

              {/* Text reveals with stagger */}
              <div className={`font-bold ${currentSize.text} flex overflow-hidden`}>
                {/* Pharma */}
                <div className="flex">
                  {["P", "h", "a", "r", "m", "a"].map((letter, i) => (
                    <motion.span
                      key={`pharma-${i}`}
                      className="text-text-primary"
                      initial={{ opacity: 0, y: 20, rotateX: -90 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{
                        delay: 0.3 + i * 0.05,
                        duration: 0.4,
                        ease: "easeOut"
                      }}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </div>

                {/* Space */}
                <span className="w-2" />

                {/* Head with gradient */}
                <div className="flex">
                  {["H", "e", "a", "d"].map((letter, i) => (
                    <motion.span
                      key={`head-${i}`}
                      className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent font-extrabold"
                      initial={{ opacity: 0, y: 20, rotateX: -90 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{
                        delay: 0.6 + i * 0.05,
                        duration: 0.4,
                        ease: "easeOut"
                      }}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Sparkle effects */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={`sparkle-${i}`}
                  className="absolute w-1 h-1 bg-primary rounded-full"
                  initial={{ 
                    opacity: 0, 
                    scale: 0,
                    x: 20 + i * 30,
                    y: -10 + i * 5
                  }}
                  animate={{ 
                    opacity: [0, 1, 0], 
                    scale: [0, 1.5, 0],
                    y: -20 + i * 5
                  }}
                  transition={{
                    delay: 0.5 + i * 0.1,
                    duration: 0.6,
                    ease: "easeOut"
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Reveal Animation
  if (variant === "reveal") {
    return (
      <motion.div
        className={`relative flex items-center ${currentSize.container} ${className}`}
        onHoverStart={() => setIsAnimating(true)}
        onHoverEnd={() => !autoPlay && setIsAnimating(false)}
        style={{ cursor: "pointer" }}
      >
        {/* Icon */}
        <motion.div
          className={`${currentSize.icon} rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-black relative overflow-hidden shadow-lg`}
          animate={{
            scale: isAnimating ? [1, 1.1, 1] : 1,
          }}
          transition={{ duration: 0.5 }}
        >
          <span className="relative z-10">PH</span>
          
          {/* Reveal curtain */}
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ x: "0%" }}
            animate={{ x: isAnimating ? "100%" : "0%" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Text with mask reveal */}
        <div className="relative overflow-hidden ml-3">
          <motion.div
            className={`font-bold ${currentSize.text} text-text-primary whitespace-nowrap`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isAnimating ? 1 : 0 }}
          >
            Pharma <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Head</span>
          </motion.div>
          
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ x: "0%" }}
            animate={{ x: isAnimating ? "100%" : "0%" }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    );
  }

  // Particles Animation
  if (variant === "particles") {
    return (
      <motion.div
        className={`relative flex items-center ${currentSize.container} ${className}`}
        onHoverStart={() => setIsAnimating(true)}
        onHoverEnd={() => !autoPlay && setIsAnimating(false)}
        style={{ cursor: "pointer" }}
      >
        <div className="relative">
          {/* Particle effects */}
          {isAnimating && [...Array(12)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1.5 h-1.5 bg-primary rounded-full"
              initial={{ 
                opacity: 0,
                scale: 0,
                x: 20,
                y: 20
              }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                x: 20 + Math.cos(i * 30 * Math.PI / 180) * 40,
                y: 20 + Math.sin(i * 30 * Math.PI / 180) * 40,
              }}
              transition={{
                duration: 1,
                delay: i * 0.05,
                ease: "easeOut"
              }}
            />
          ))}

          {/* Icon */}
          <motion.div
            className={`${currentSize.icon} rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-black shadow-lg relative z-10`}
            animate={{
              scale: isAnimating ? [1, 1.2, 1] : 1,
              rotate: isAnimating ? [0, 360] : 0,
            }}
            transition={{ duration: 1 }}
          >
            PH
          </motion.div>
        </div>

        {/* Text */}
        <AnimatePresence>
          {isAnimating && (
            <motion.div
              className={`font-bold ${currentSize.text} ml-3 flex`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <span className="text-text-primary">Pharma</span>
              <span className="w-2" />
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Head</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Default simple animation
  return (
    <motion.div
      className={`flex items-center gap-2 ${className}`}
      onHoverStart={() => setIsAnimating(true)}
      onHoverEnd={() => !autoPlay && setIsAnimating(false)}
    >
      <motion.div
        className={`${currentSize.icon} rounded-xl bg-primary flex items-center justify-center text-white font-black`}
        animate={{ scale: isAnimating ? 1.1 : 1 }}
      >
        PH
      </motion.div>
      
      <AnimatePresence>
        {isAnimating && (
          <motion.span
            className={`font-bold ${currentSize.text} text-text-primary`}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
          >
            Pharma Head
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
