import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface BackButtonProps {
    to?: string;
    className?: string;
    label?: string;
}

export function BackButton({ to, className, label = "Back" }: BackButtonProps) {
    const [, setLocation] = useLocation();
    const [isHovered, setIsHovered] = useState(false);

    const handleBack = () => {
        if (to) {
            setLocation(to);
        } else {
            window.history.back();
        }
    };

    return (
        <motion.div
            className={cn("inline-flex items-center", className)}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
        >
            <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="relative group h-9 px-0 w-9 hover:w-auto hover:px-3 overflow-hidden transition-all duration-300 rounded-full border border-border/40 bg-background/50 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                data-testid="button-animated-back"
            >
                <ArrowLeft className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
                <AnimatePresence>
                    {isHovered && (
                        <motion.span
                            initial={{ opacity: 0, x: -10, width: 0 }}
                            animate={{ opacity: 1, x: 0, width: "auto" }}
                            exit={{ opacity: 0, x: -10, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-xs font-medium whitespace-nowrap overflow-hidden"
                        >
                            {label}
                        </motion.span>
                    )}
                </AnimatePresence>
            </Button>
        </motion.div>
    );
}
