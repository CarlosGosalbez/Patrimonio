"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A Card with a subtle lift on hover — GPU-accelerated (transform + opacity only).
 */
export function MotionCard({ children, className }: MotionCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
    >
      <Card className={cn("transition-shadow hover:shadow-md", className)}>{children}</Card>
    </motion.div>
  );
}
