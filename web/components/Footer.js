"use client";

import { telHref } from "@/lib/phone";
import { Magnetic } from "./Magnetic";
import { LanguageSwitch } from "./LanguageSwitch";
import { LogoMark } from "./LogoMark";
import { useI18n } from "./LocaleProvider";

export function Footer({ doctor }) {
  const { t } = useI18n();

  return (
    <footer id="contacts" className="bg-navy text-white dark:bg-bg-elev dark:text-ink">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Magnetic className="block" strength={10} scale={1.03}>
            <div className="flex items-center gap-3 text-4xl font-semibold">
              <LogoMark className="h-12 w-12" />
              {doctor.clinicName}
            </div>
          </Magnetic>
          <p className="mt-3 max-w-xs text-sm leading-6 text-sky dark:text-muted">
            {t("footer.lead", { name: t("doctor.name") })}
          </p>
          <LanguageSwitch className="mt-5" tone="dark" />
        </div>
        <div className="text-sm leading-7">
          <div className="font-medium">{t("footer.contacts")}</div>
          <div className="mt-3 space-y-3 text-sky dark:text-muted">
            {(t("doctor.clinics") || []).map((clinic) => (
              <div key={clinic.name}>
                <div className="text-white dark:text-ink">{clinic.name}</div>
                <div>{clinic.address}</div>
                <div>{clinic.days}, {t("doctor.hours")}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-col items-start gap-1">
            <Magnetic strength={8}>
              <a className="rounded-xl hover:text-white" href={telHref(doctor.contacts.phone)}>
                {doctor.contacts.phone}
              </a>
            </Magnetic>
          </div>
        </div>
        <div className="text-sm leading-7">
          <div className="font-medium">{t("footer.booking")}</div>
          <div className="mt-3">
            <Magnetic strength={8}>
              <a className="rounded-xl text-sky hover:text-white dark:text-muted" href={telHref(doctor.contacts.phone)}>
                {t("footer.phone", { value: doctor.contacts.phone })}
              </a>
            </Magnetic>
          </div>
          <div className="text-sky dark:text-muted">{t("footer.bot", { value: doctor.contacts.bot })}</div>
        </div>
      </div>
    </footer>
  );
}
