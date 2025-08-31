import { motion } from "framer-motion";
import { useScrollProgress } from "@/hooks/useScrollProgress";

export const ScrollProgress = () => {
  const { scrollProgress, scrollVelocity, isScrolling } = useScrollProgress();

  return (
    <>
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-brand-yellow via-brand-red to-brand-blue z-50"
        style={{
          width: `${scrollProgress * 100}%`,
          boxShadow: isScrolling ? '0 0 20px rgba(255, 204, 0, 0.6)' : 'none'
        }}
        initial={{ scaleX: 0 }}
        animate={{ 
          scaleX: 1,
          filter: `brightness(${1 + scrollVelocity * 2})`
        }}
        transition={{ 
          type: "spring",
          stiffness: 400,
          damping: 40
        }}
      />
      
      {/* Floating Progress Circle */}
      <motion.div
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: scrollProgress > 0.1 ? 1 : 0,
          opacity: scrollProgress > 0.1 ? 1 : 0,
          rotate: scrollProgress * 360
        }}
        whileHover={{ scale: 1.03 }}
        transition={{ 
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
      >
        <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="8"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            style={{
              pathLength: scrollProgress
            }}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: scrollProgress }}
            transition={{ duration: 0.3 }}
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFCC00" />
              <stop offset="50%" stopColor="#FF4444" />
              <stop offset="100%" stopColor="#4444FF" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {Math.round(scrollProgress * 100)}%
          </span>
        </div>
      </motion.div>
    </>
  );
};