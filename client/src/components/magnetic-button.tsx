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
    <div
      ref={magneticRef as any}
      className="inline-block relative"
    >
      <Button
        variant={variant}
        size={size}
        className={`relative overflow-hidden ${className}`}
        onClick={onClick}
      >
        {children}
      </Button>
    </div>
  );
};