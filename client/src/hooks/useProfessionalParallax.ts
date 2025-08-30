import { useRef, useEffect } from 'react';
import { useScroll, useTransform, useSpring, MotionValue } from 'framer-motion';

interface ParallaxLayer {
  speed: number;
  direction?: 'normal' | 'reverse';
  perspective?: number;
  blur?: boolean;
}

export const useProfessionalParallax = (layers: ParallaxLayer[] = [{ speed: 0.5 }]) => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  });

  // Professional spring configuration
  const springConfig = {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  };

  // Create smooth parallax transforms for each layer
  const createParallaxTransforms = (layer: ParallaxLayer) => {
    const { speed, direction = 'normal', perspective = 1000, blur = false } = layer;
    
    const multiplier = direction === 'reverse' ? -1 : 1;
    const range = [-100 * speed * multiplier, 100 * speed * multiplier];
    
    const y = useSpring(
      useTransform(scrollYProgress, [0, 1], range),
      springConfig
    );
    
    const rotateX = useSpring(
      useTransform(scrollYProgress, [0, 1], [0, 15 * speed * multiplier]),
      springConfig
    );
    
    const scale = useSpring(
      useTransform(scrollYProgress, [0, 0.5, 1], [1, 1 + speed * 0.1, 1]),
      springConfig
    );

    const opacity = useSpring(
      useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.7, 1, 1, 0.7]),
      springConfig
    );

    const blurAmount = blur ? useSpring(
      useTransform(scrollYProgress, [0, 0.5, 1], [0, 2, 5]),
      springConfig
    ) : undefined;

    return {
      y,
      rotateX,
      scale,
      opacity,
      perspective: perspective,
      filter: blurAmount ? blurAmount.get() : undefined,
      transform: `perspective(${perspective}px)`
    };
  };

  // Advanced 3D parallax effects
  const create3DParallax = () => {
    const rotateY = useSpring(
      useTransform(scrollYProgress, [0, 1], [0, 360]),
      { ...springConfig, stiffness: 50 }
    );

    const translateZ = useSpring(
      useTransform(scrollYProgress, [0, 0.5, 1], [0, 100, 0]),
      springConfig
    );

    const rotateX = useSpring(
      useTransform(scrollYProgress, [0, 1], [-15, 15]),
      springConfig
    );

    return {
      rotateY,
      translateZ,
      rotateX,
      transformStyle: 'preserve-3d' as const,
      perspective: 1000
    };
  };

  // Momentum-based physics
  const createMomentumEffect = () => {
    const velocity = useRef(0);
    const lastScrollY = useRef(0);

    useEffect(() => {
      const unsubscribe = scrollYProgress.onChange((current) => {
        const delta = current - lastScrollY.current;
        velocity.current = delta * 100; // Scale velocity
        lastScrollY.current = current;
      });
      return unsubscribe;
    }, []);

    const momentumScale = useSpring(
      useTransform(scrollYProgress, (value) => {
        const vel = Math.abs(velocity.current);
        return 1 + vel * 0.02; // Scale based on velocity
      }),
      { stiffness: 200, damping: 15 }
    );

    return { momentumScale, velocity: velocity.current };
  };

  // Professional stagger effects
  const createStaggerEffect = (itemCount: number) => {
    return Array.from({ length: itemCount }, (_, i) => {
      const delay = i * 0.1;
      const offset = i * 50;
      
      return {
        y: useSpring(
          useTransform(scrollYProgress, [0, 1], [-offset, offset]),
          { ...springConfig, delay: delay * 1000 }
        ),
        opacity: useSpring(
          useTransform(scrollYProgress, [0, 0.2 + delay, 0.8 - delay, 1], [0, 1, 1, 0]),
          springConfig
        ),
        scale: useSpring(
          useTransform(scrollYProgress, [0, 0.5], [0.8, 1]),
          { ...springConfig, delay: delay * 500 }
        )
      };
    });
  };

  // Parallax transforms for each layer
  const layerTransforms = layers.map(createParallaxTransforms);
  const threeDTransforms = create3DParallax();
  const momentumEffects = createMomentumEffect();

  return {
    ref,
    scrollYProgress,
    layerTransforms,
    threeDTransforms,
    momentumEffects,
    createStaggerEffect,
    // Professional presets
    presets: {
      hero: {
        y: useSpring(useTransform(scrollYProgress, [0, 1], [0, -300]), springConfig),
        scale: useSpring(useTransform(scrollYProgress, [0, 1], [1, 1.2]), springConfig),
        opacity: useSpring(useTransform(scrollYProgress, [0, 0.5], [1, 0]), springConfig)
      },
      background: {
        y: useSpring(useTransform(scrollYProgress, [0, 1], [0, -200]), springConfig),
        scale: useSpring(useTransform(scrollYProgress, [0, 1], [1.1, 1]), springConfig)
      },
      floating: {
        y: useSpring(useTransform(scrollYProgress, [0, 1], [50, -50]), springConfig),
        rotateZ: useSpring(useTransform(scrollYProgress, [0, 1], [0, 360]), springConfig)
      }
    }
  };
};