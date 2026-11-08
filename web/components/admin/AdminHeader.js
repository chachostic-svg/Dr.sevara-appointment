import { ADMIN_EYEBROW_CLASS } from "@/lib/ui";

export function AdminHeader({ eyebrow, title }) {
  return (
    <>
      <p className={ADMIN_EYEBROW_CLASS}>{eyebrow}</p>
      <h1 className="mt-2 text-4xl font-semibold">{title}</h1>
    </>
  );
}
