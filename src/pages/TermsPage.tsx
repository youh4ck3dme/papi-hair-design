import { useMemo } from "react";
import { ArrowLeft, ChevronRight, FileText, Mail, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { APP_BOOKING_EMAIL, APP_BRAND_NAME } from "@/lib/brandConfig";

type TermsSection = {
  title: string;
  body: string;
};

export default function TermsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const sections = useMemo<TermsSection[]>(
    () => [
      { title: t("terms.s1Title"), body: t("terms.s1Body") },
      { title: t("terms.s2Title"), body: t("terms.s2Body") },
      { title: t("terms.s3Title"), body: t("terms.s3Body") },
      { title: t("terms.s4Title"), body: t("terms.s4Body") },
      { title: t("terms.s5Title"), body: t("terms.s5Body") },
      { title: t("terms.s6Title"), body: t("terms.s6Body") },
    ],
    [t],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.10),transparent_30%),linear-gradient(180deg,#080706_0%,#0d0b09_48%,#060505_100%)] px-4 py-8 text-white selection:bg-primary/80 selection:text-black">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/78 transition-all hover:border-primary/25 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft size={16} />
            {t("terms.back")}
          </button>

          <Link
            to="/booking"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[linear-gradient(135deg,#b8860b,#daa520,#f2cf60)] px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[0_16px_34px_-22px_rgba(218,165,32,0.9)] transition-transform hover:scale-[1.01]"
          >
            Rezervovať
            <ChevronRight size={16} />
          </Link>
        </div>

        <section className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_32px_80px_-52px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-full border border-primary/18 bg-primary/[0.08] px-3 py-1.5">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/85">
                {APP_BRAND_NAME}
              </span>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/66">
              {t("terms.lastUpdate")}
            </div>
          </div>

          <div className="mt-6 max-w-3xl space-y-3">
            <h1 className="text-[2.4rem] font-semibold tracking-tight text-white sm:text-[3.4rem] sm:leading-[0.95]">
              {t("terms.title")}
            </h1>
            <p className="text-base leading-8 text-white/72 sm:text-lg">
              {t("terms.subtitle")}
            </p>
          </div>
        </section>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <main className="space-y-4">
            {sections.map((section, index) => (
              <section
                key={section.title}
                className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 shadow-[0_24px_58px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/18 bg-primary/[0.08]">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-white">
                      {section.title}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-white/66 sm:text-[15px]">
                      {section.body}
                    </p>
                  </div>
                </div>
              </section>
            ))}
          </main>

          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            <section className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 shadow-[0_24px_58px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/18 bg-primary/[0.08]">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/75">
                    {t("terms.s4Title")}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    {t("common.privacyPolicy")}
                  </h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-white/65">
                {t("terms.s4Body")}
              </p>
              <Link
                to="/privacy"
                className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 transition-all hover:border-primary/25 hover:bg-white/[0.06] hover:text-white"
              >
                {t("common.privacyPolicy")}
                <ChevronRight size={16} />
              </Link>
            </section>

            <section className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 shadow-[0_24px_58px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/18 bg-primary/[0.08]">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/75">
                    {t("terms.s7Title")}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    {APP_BOOKING_EMAIL}
                  </h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-white/65">
                {t("terms.s7Body")}
              </p>
              <a
                href={`mailto:${APP_BOOKING_EMAIL}`}
                className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#b8860b,#daa520,#f2cf60)] px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-black transition-transform hover:scale-[1.01]"
              >
                {APP_BOOKING_EMAIL}
              </a>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
