import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useProfessionalParallax } from "@/hooks/useProfessionalParallax";

interface ParallaxSceneProps {
  children: ReactNode;
  className?: string;
  layers?: number;
  intensity?: 'subtle' | 'moderate' | 'dramatic';
  type?: 'hero' | 'content' | 'floating' | 'custom';
}

export const ProfessionalParallaxScene = ({
  children,
  className = "",
  layers = 3,
  intensity = 'moderate',
  type = 'content'
}: ParallaxSceneProps) => {
  
  // Configure layers based on intensity
  const getLayerConfig = () => {
    const configs = {
      subtle: [
        { speed: 0.2, direction: 'normal' as const },
        { speed: 0.1, direction: 'reverse' as const },
        { speed: 0.3, direction: 'normal' as const }
      ],
      moderate: [
        { speed: 0.5, direction: 'normal' as const, perspective: 1000 },
        { speed: 0.3, direction: 'reverse' as const, blur: true },
        { speed: 0.7, direction: 'normal' as const },
        { speed: 0.2, direction: 'reverse' as const }
      ],
      dramatic: [
        { speed: 1.0, direction: 'normal' as const, perspective: 800 },
        { speed: 0.8, direction: 'reverse' as const, blur: true },
        { speed: 1.2, direction: 'normal' as const },
        { speed: 0.4, direction: 'reverse' as const, blur: true },
        { speed: 1.5, direction: 'normal' as const }
      ]
    };
    return configs[intensity].slice(0, layers);
  };

  const {
    ref,
    layerTransforms,
    threeDTransforms,
    momentumEffects,
    presets
  } = useProfessionalParallax(getLayerConfig());

  // Get appropriate preset transforms
  const getPresetTransforms = () => {
    switch (type) {
      case 'hero':
        return presets.hero;
      case 'floating':
        return presets.floating;
      case 'content':
      default:
        return presets.background;
    }
  };

  const transforms = getPresetTransforms();

  return (
    <motion.div
      ref={ref as any}
      className={`relative overflow-hidden ${className}`}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
    >
      {/* Background parallax layers */}
      {layerTransforms.map((transform, index) => (
        <motion.div
          key={`parallax-layer-${index}`}
          className="absolute inset-0 pointer-events-none"
          style={{
            y: transform.y,
            rotateX: transform.rotateX,
            scale: transform.scale,
            opacity: transform.opacity,
            filter: transform.filter ? `blur(${transform.filter}px)` : undefined,
            transform: transform.transform,
            zIndex: -index - 1,
          }}
        >
          <div
            className="w-full h-full"
            style={{
              background: index % 2 === 0 
                ? 'radial-gradient(circle at 30% 70%, rgba(255,204,0,0.1) 0%, transparent 50%)'
                : 'radial-gradient(circle at 70% 30%, rgba(68,68,255,0.05) 0%, transparent 50%)',
            }}
          />
        </motion.div>
      ))}

      {/* 3D perspective layer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          rotateY: threeDTransforms.rotateY,
          rotateX: threeDTransforms.rotateX,
          translateZ: threeDTransforms.translateZ,
          transformStyle: threeDTransforms.transformStyle,
          opacity: 0.3,
          zIndex: -10,
        }}
      >
        <div className="w-full h-full bg-gradient-to-br from-brand-yellow/5 via-transparent to-brand-blue/5" />
      </motion.div>

      {/* Momentum-based scaling container */}
      <motion.div
        className="relative z-10"
        style={{
          scale: momentumEffects.momentumScale,
          y: transforms.y,
          opacity: transforms.opacity,
        }}
      >
        {/* Main content with advanced effects */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ 
            opacity: 1, 
            scale: 1,
            transition: {
              duration: 1.2,
              ease: [0.25, 0.1, 0.25, 1],
            }
          }}
          viewport={{ once: true, margin: "-10%" }}
        >
          {children}
        </motion.div>
      </motion.div>

      {/* Atmospheric particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-2 h-2 bg-brand-yellow/20 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`,
            }}
            animate={{
              y: [-20, -100, -20],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.8,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};