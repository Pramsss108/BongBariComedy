import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, ReactNode } from "react";

interface StickyScrollSectionProps {
  children: ReactNode;
  className?: string;
  height?: string;
}

export const StickyScrollSection = ({ 
  children, 
  className = "",
  height = "200vh"
}: StickyScrollSectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1, 0]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, -5]);

  return (
    <div ref={ref} style={{ height }} className="relative">
      <motion.div
        className={`sticky top-0 ${className}`}
        style={{
          scale,
          opacity,
          rotate,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export const MorphingCard = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const borderRadius = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ["0px", "50px", "100px"]
  );
  
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1.1, 0.8]);

  return (
    <motion.div
      ref={ref}
      className={`overflow-hidden ${className}`}
      style={{
        borderRadius,
        rotate,
        scale,
      }}
      whileHover={{
        scale: 1.05,
        rotate: 5,
        transition: { duration: 0.3 }
      }}
    >
      {children}
    </motion.div>
  );
};