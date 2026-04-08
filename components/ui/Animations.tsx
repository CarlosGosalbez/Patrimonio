"use client";

// ============================================================
// Framer Motion reusable animation components for Patrimio
// ============================================================

import { motion, type Variants, type HTMLMotionProps } from "framer-motion";

// ─────────────────────────────────────────────────────────────
// Fade In Up — generic enter animation
// ─────────────────────────────────────────────────────────────

const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

interface FadeInUpProps extends HTMLMotionProps<"div"> {
  delay?: number;
  children: React.ReactNode;
}

export function FadeInUp({ delay = 0, children, ...props }: FadeInUpProps) {
  return (
    <motion.div
      variants={fadeInUpVariants}
      initial="hidden"
      animate="visible"
      custom={delay}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Stagger Container — animates children in sequence
// ─────────────────────────────────────────────────────────────

const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
};

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerContainer({ children, className }: StaggerContainerProps) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: StaggerContainerProps) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Scale On Press — tactile feedback for interactive elements
// ─────────────────────────────────────────────────────────────

interface ScaleOnPressProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ScaleOnPress({ children, className, onClick }: ScaleOnPressProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.1 }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Counter animation — for numbers (net worth, totals)
// ─────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { useMotionValue, useSpring } from "framer-motion";
import { useRef } from "react";

interface AnimatedCounterProps {
  value: number;
  formatter?: (v: number) => string;
  className?: string;
}

export function AnimatedCounter({ value, formatter, className }: AnimatedCounterProps) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 80, damping: 20 });
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = formatter
          ? formatter(Math.round(latest))
          : Math.round(latest).toString();
      }
    });
    return unsubscribe;
  }, [spring, formatter]);

  return (
    <span ref={ref} className={className} aria-live="polite" aria-atomic="true">
      {formatter ? formatter(value) : value.toString()}
    </span>
  );
}

// Re-export framer-motion primitives for convenience
export { motion, AnimatePresence } from "framer-motion";
