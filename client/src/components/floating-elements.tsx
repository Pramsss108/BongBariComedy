import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";

export const FloatingElements = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const elements = useMemo(() => Array.from({ length: 7 }, (_, i) => ({
    id: i,
    size: 40 + Math.random() * 80,
    initialX: Math.random() * 100,
    initialY: Math.random() * 100,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {elements.map((element, idx) => {
        const horizontalDrift = 6 + idx * 1.2; // vw
        const verticalDrift = 10 + idx * 1.5; // vh
        return (
          <motion.div
            key={element.id}
            className="absolute rounded-full opacity-[0.08] will-change-transform"
            style={{
              width: element.size,
              height: element.size,
              background: `radial-gradient(circle at 30% 30%, hsl(${200 + element.id * 25},70%,65%), hsl(${200 + element.id * 25},70%,40%))`,
              mixBlendMode: 'screen',
              filter: 'blur(2px)'
            }}
            animate={{
              x: [
                `${element.initialX}vw`,
                `${element.initialX + horizontalDrift}vw`,
                `${element.initialX - horizontalDrift}vw`,
                `${element.initialX}vw`,
              ],
              y: [
                `${element.initialY}vh`,
                `${element.initialY - verticalDrift}vh`,
                `${element.initialY + verticalDrift * 0.6}vh`,
                `${element.initialY}vh`,
              ],
              scale: [1, 1.04, 1, 1.02],
              rotate: [0, 20, -15, 0],
              opacity: [0.04, 0.12, 0.08, 0.1]
            }}
            transition={{
              duration: 70 + idx * 18,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        );
      })}
      
      {/* REMOVED: Mouse follower belan - preventing double cursor effect */}
    </div>
  );
};