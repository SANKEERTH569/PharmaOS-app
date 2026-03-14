import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface AnimatedLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  autoExpand?: boolean;
  expandDelay?: number;
}

export function AnimatedLogo({ 
  className = "", 
  size = "md",
  autoExpand = false,
  expandDelay = 2000
}: AnimatedLogoProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  React.useEffect(() => {
    if (autoExpand) {
      const timer = setTimeout(() => setIsExpanded(true), expandDelay);
      return () => clearTimeout(timer);
    }
  }, [autoExpand, expandDelay]);

  const sizes = {
    sm: { icon: "w-6 h-6", text: "text-base", gap: "gap-1.5" },
    md: { icon: "w-8 h-8", text: "text-xl", gap: "gap-2" },
    lg: { icon: "w-12 h-12", text: "text-3xl", gap: "gap-3" }
  };

  const currentSize = sizes[size];

  return (
    <motion.div
      className={`flex items-center ${currentSize.gap} ${className}`}
      onHoverStart={() => setIsExpanded(true)}
      onHoverEnd={() => !autoExpand && setIsExpanded(false)}
      style={{ cursor: "pointer" }}
    >
      {/* Animated Icon */}
      <motion.div
        className={`${currentSize.icon} rounded-lg bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center text-white font-black relative overflow-hidden`}
        animate={{
          scale: isExpanded ? [1, 1.05, 1] : 1,
          rotate: isExpanded ? [0, -5, 5, 0] : 0,
        }}
        transition={{
          duration: 0.6,
          ease: "easeInOut"
        }}
      >
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{
            x: isExpanded ? ["-100%", "200%"] : "-100%"
          }}
          transition={{
            duration: 0.8,
            ease: "easeInOut"
          }}
        />
        
        {/* PH Text with split animation */}
        <div className="relative flex items-center justify-center">
          <motion.span
            animate={{
              x: isExpanded ? -2 : 0,
              scale: isExpanded ? 1.1 : 1
            }}
            transition={{ duration: 0.3 }}
          >
            P
          </motion.span>
          <motion.span
            animate={{
              x: isExpanded ? 2 : 0,
              scale: isExpanded ? 1.1 : 1
            }}
            transition={{ duration: 0.3 }}
          >
            H
          </motion.span>
        </div>
      </motion.div>

      {/* Animated Text */}
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            className={`font-bold text-text-primary tracking-tight ${currentSize.text} overflow-hidden flex`}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {/* Pharma */}
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="whitespace-nowrap"
            >
              Pharma
            </motion.span>
            
            {/* Space */}
            <span className="w-1.5" />
            
            {/* Head with gradient */}
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="whitespace-nowrap bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
            >
              Head
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
