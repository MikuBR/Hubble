"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";
import * as React from "react";

interface CarouselProps {
  children: ReactNode;
  title?: string;
  count?: number;
  className?: string;
}

export function Carousel({ children, title, count, className }: CarouselProps) {
  const total = React.Children.count(children);

  return (
    <section className={cn("mb-12", className)}>
      {title && (
        <div className="flex items-center justify-between mb-4 px-4">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {count !== undefined && (
            <span className="text-sm text-zinc-500">{count} itens</span>
          )}
        </div>
      )}

      <div className="relative">
        {/* Container de scroll com rolagem nativa horizontal */}
        <motion.div
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-px-4 pb-2"
          style={{ scrollBehavior: "smooth" }}
        >
          {children}
        </motion.div>

        {/* Fade gradient overlay nas bordas */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-zinc-950 to-transparent rounded-l-xl" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-zinc-950 to-transparent rounded-r-xl" />
      </div>
    </section>
  );
}

/**
 * Carousel compacto para sidebar/listas
 */
export function CarouselCompact({
  children,
  title,
  className,
}: CarouselProps) {
  return (
    <div className={cn("mb-6", className)}>
      {title && (
        <h3 className="text-sm font-semibold text-zinc-400 mb-2 px-4 uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-px-4">
        {children}
      </div>
    </div>
  );
}

