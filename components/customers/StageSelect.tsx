"use client";

import { ChevronDownIcon } from "@/components/icons/DashboardIcons";
import { Listbox } from "@/components/ui/Listbox";
import type { CustomerStage } from "@/lib/api";
import { CUSTOMER_STAGES } from "@/lib/customers";


export function StageSelect({
  value,
  onChange,
  label,
}: {
  value: CustomerStage;
  onChange: (stage: CustomerStage) => void;
  label: string;
}) {
  const current = CUSTOMER_STAGES.find((s) => s.id === value);
  // Listed is set by listing the client's property from their lead, not picked here.
  const options = CUSTOMER_STAGES.filter((s) => s.id !== "listed" || value === "listed").map((s) => ({
    id: s.id,
    name: s.label,
  }));

  return (
    <Listbox
      value={value}
      onChange={(next) => onChange(next as CustomerStage)}
      options={options}
      label={label}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-[20px] px-4 py-[5px] text-[11px] leading-[1.4] ${
        current?.className ?? "bg-badge-neutral text-muted"
      }`}
    >
      {(isOpen) => (
        <>
          {current?.label ?? value}
          <ChevronDownIcon className={`size-2 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </>
      )}
    </Listbox>
  );
}
