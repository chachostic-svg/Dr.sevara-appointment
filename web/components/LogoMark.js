export function LogoMark({ className = "h-11 w-11" }) {
  return (
    <img
      src="/logo.jpg"
      alt=""
      className={`shrink-0 rounded-full object-cover ${className}`}
      aria-hidden="true"
    />
  );
}
