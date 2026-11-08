export function PageSection({ id, children, band = false, bandClass = "bg-sky/30 dark:bg-brand-soft" }) {
  if (band) {
    return (
      <section id={id} className={`py-16 sm:py-24 ${bandClass}`}>
        <div className="mx-auto max-w-6xl px-4">{children}</div>
      </section>
    );
  }

  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
      {children}
    </section>
  );
}
