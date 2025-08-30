import { motion } from "framer-motion";
import { useMagneticEffect } from "@/hooks/useMagneticEffect";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  strength?: number;
}

export const MagneticButton = ({ 
  children, 
  className, 
  onClick, 
  variant = "default",
  size = "default",
  strength = 0.3 
}: MagneticButtonProps) => {
  const magneticRef = useMagneticEffect(strength);

  return (
    <motion.div
      ref={magneticRef as any}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      className="inline-block"
      style={{
        transition: "transform 0.2s cubic-bezier(0.23, 1, 0.32, 1)"
      }}
    >
      <Button
        variant={variant}
        size={size}
        className={`relative overflow-hidden ${className}`}
        onClick={onClick}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-brand-yellow/20 to-brand-red/20"
          initial={{ x: "-100%" }}
          whileHover={{ x: "0%" }}
          transition={{ duration: 0.3 }}
        />
        <span className="relative z-10">{children}</span>
      </Button>
    </motion.div>
  );
};