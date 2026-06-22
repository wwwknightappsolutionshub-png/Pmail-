import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  variant?: "default" | "hero" | "orbit" | "fabric" | "shield" | "pmail" | "capabilities";
  delay?: number;
  className?: string;
};

export function LandingArtFrame({ children, variant = "default", delay = 0, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`landing-art-frame landing-art-frame--${variant}${visible ? " landing-art-frame--visible" : ""}${className ? ` ${className}` : ""}`}
      style={{ "--art-delay": `${delay}ms` } as React.CSSProperties}
    >
      <span className="landing-art-flare landing-art-flare--a" aria-hidden />
      <span className="landing-art-flare landing-art-flare--b" aria-hidden />
      <span className="landing-art-ring" aria-hidden />
      <span className="landing-art-shine" aria-hidden />
      <div className="landing-art-frame-inner">{children}</div>
    </div>
  );
}
