import { motion } from "framer-motion";
import { useEffect, useState } from "react";

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

  const elements = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    size: Math.random() * 60 + 20,
    initialX: Math.random() * 100,
    initialY: Math.random() * 100,
    speed: Math.random() * 0.5 + 0.2,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {elements.map((element) => (
        <motion.div
          key={element.id}
          className="absolute rounded-full opacity-10"
          style={{
            width: element.size,
            height: element.size,
            background: `linear-gradient(45deg, 
              hsl(${45 + element.id * 60}, 70%, 60%), 
              hsl(${45 + element.id * 60 + 30}, 70%, 70%))`,
          }}
          animate={{
            x: [
              `${element.initialX}vw`,
              `${element.initialX + 20}vw`,
              `${element.initialX}vw`,
            ],
            y: [
              `${element.initialY}vh`,
              `${element.initialY - 30}vh`,
              `${element.initialY}vh`,
            ],
            rotate: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20 + element.id * 5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
      
      {/* Mouse follower - Rolling Pin */}
      <motion.img
        src="@assets/rolling-pin_1756659784180.png"
        alt="Rolling Pin Cursor"
        className="absolute pointer-events-none opacity-30"
        style={{
          width: '20px',
          height: '20px',
          transform: 'rotate(45deg)'
        }}
        animate={{
          x: `${mousePosition.x}vw`,
          y: `${mousePosition.y}vh`,
        }}
        transition={{
          type: "spring",
          stiffness: 150,
          damping: 15,
        }}
      />
    </div>
  );
};