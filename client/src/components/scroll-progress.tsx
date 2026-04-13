import { motion, useScroll, useSpring } from "framer-motion";
import { useDeviceTier } from "@/hooks/useDeviceTier";

/** Phase 2: Thin gold progress bar at top of viewport (like Medium/Linear).
 *  Height: 2px mobile, 3px desktop. scaleX linked to scrollYProgress. */
export const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 400, damping: 40 });
  const device = useDeviceTier();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[60] origin-left bg-gradient-to-r from-brand-yellow via-brand-red to-brand-yellow"
      style={{
        scaleX,
        height: device.isMobile ? '2px' : '3px',
      }}
    />
  );
};