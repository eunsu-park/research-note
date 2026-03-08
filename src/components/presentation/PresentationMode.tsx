"use client";

import { useState, useCallback, useEffect } from "react";
import { MarpPreview } from "@/components/preview/MarpPreview";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface PresentationModeProps {
  content: string;
  onExit: () => void;
}

export function PresentationMode({ content, onExit }: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);

  const handleSlideChange = useCallback((current: number, total: number) => {
    setCurrentSlide(current);
    setTotalSlides(total);
  }, []);

  // ESC to exit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onExit]);

  // Forward navigation commands to iframe
  const navigate = useCallback((slide: number) => {
    const iframe = document.querySelector(
      'iframe[title="Marp presentation preview"]'
    );
    if (iframe instanceof HTMLIFrameElement) {
      iframe.contentWindow?.postMessage(
        { type: "marp-navigate", slide },
        "*"
      );
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Slide area */}
      <div className="flex-1 min-h-0">
        <MarpPreview
          content={content}
          mode="presentation"
          onSlideChange={handleSlideChange}
        />
      </div>

      {/* Bottom control bar */}
      <div className="h-12 bg-black/80 backdrop-blur flex items-center justify-between px-4 text-white shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:text-white/80 hover:bg-white/10 h-8 w-8"
            onClick={() => navigate(currentSlide - 1)}
            disabled={currentSlide <= 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-mono min-w-[60px] text-center">
            {totalSlides > 0
              ? `${currentSlide + 1} / ${totalSlides}`
              : "..."}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:text-white/80 hover:bg-white/10 h-8 w-8"
            onClick={() => navigate(currentSlide + 1)}
            disabled={currentSlide >= totalSlides - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white/80 hover:bg-white/10 h-8 w-8"
          onClick={onExit}
          title="Exit presentation (ESC)"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
