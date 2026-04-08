"use client";

import { motion, PanInfo, useAnimation } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface SwipeableTransactionRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  threshold?: number;
}

export function SwipeableTransactionRow({
  children,
  onDelete,
  threshold = -80,
}: SwipeableTransactionRowProps) {
  const controls = useAnimation();
  const [isRevealed, setIsRevealed] = useState(false);

  const handleDragEnd = (_event: any, info: PanInfo) => {
    if (info.offset.x < threshold) {
      // Swipe left past threshold → reveal delete button
      setIsRevealed(true);
      controls.start({ x: threshold });
    } else {
      // Snap back
      setIsRevealed(false);
      controls.start({ x: 0 });
    }
  };

  const handleDelete = () => {
    // Animate out then call onDelete
    controls.start({ x: -400, opacity: 0 }).then(() => {
      onDelete();
    });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete button background */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-rose-600 px-6"
        style={{ width: isRevealed ? "80px" : "0px", transition: "width 0.2s" }}
      >
        <button
          onClick={handleDelete}
          className="flex h-full items-center text-white"
          aria-label="Eliminar transacción"
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: threshold, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="relative z-10"
        style={{ touchAction: "pan-y" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
