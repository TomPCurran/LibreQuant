"use client";

import { useId, useState, type ComponentType, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type IconProps = { className?: string; "aria-hidden"?: boolean };

export function DataSourcesAccordionSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: ComponentType<IconProps>;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const regionId = `${baseId}-region`;

  return (
    <section className="glass overflow-hidden rounded-2xl border border-foreground/10 shadow-sm">
      <button
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors duration-200 hover:bg-foreground/5"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex min-w-0 items-center gap-2 text-alpha">
          <Icon className="size-5 shrink-0" aria-hidden />
          <span className="heading-brand text-base text-foreground">
            {title}
          </span>
        </span>
        <ChevronDown
          className={`size-5 shrink-0 text-text-secondary transition-transform duration-300 ease-out motion-reduce:transition-none ${
            open ? "rotate-180" : "rotate-0"
          }`}
          aria-hidden
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            id={regionId}
            role="region"
            aria-labelledby={triggerId}
            aria-hidden={!open}
            className={`border-t border-foreground/10 px-5 pb-5 pt-0 ${
              !open ? "pointer-events-none" : ""
            }`}
          >
            <div className="pt-4">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
