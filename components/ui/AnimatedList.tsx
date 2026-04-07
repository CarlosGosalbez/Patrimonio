'use client'

import { motion } from 'framer-motion'

const listVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.07, delayChildren: 0.05 },
    },
}

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.25, ease: 'easeOut' as const },
    },
}

interface AnimatedListProps {
    children: React.ReactNode
    className?: string
    as?: 'ul' | 'ol' | 'div'
}

/**
 * Wraps a list of children with a staggered fade-in animation.
 * Each direct child receives the `itemVariants` via context.
 */
export function AnimatedList({ children, className, as = 'div' }: AnimatedListProps) {
    const Tag = motion[as]
    return (
        <Tag
            variants={listVariants}
            initial="hidden"
            animate="show"
            className={className}
        >
            {children}
        </Tag>
    )
}

/**
 * Wrapper for individual animated list items.
 */
export function AnimatedItem({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <motion.div variants={itemVariants} className={className}>
            {children}
        </motion.div>
    )
}
