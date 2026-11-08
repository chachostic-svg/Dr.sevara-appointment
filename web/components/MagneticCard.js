import { Magnetic } from "./Magnetic";
import { Reveal } from "./Reveal";

export function MagneticCard({ children, delay = 0, strength = 12, scale = 1.03, className = "" }) {
  return (
    <Reveal delay={delay} className={className}>
      <Magnetic className="block h-full" strength={strength} scale={scale}>
        {children}
      </Magnetic>
    </Reveal>
  );
}
