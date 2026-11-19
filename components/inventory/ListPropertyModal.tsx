"use client";

import { useEffect, useState } from "react";
import { type MediaDraft } from "@/components/inventory/MediaField";
import { UnitFormModal } from "@/components/inventory/UnitFormModal";
import type { SelectOption } from "@/components/ui/Select";
import { createUnitFromLead, getCategories, getPartnerProjects, getUnits, type Lead, type UnitInput } from "@/lib/api";
import { startMediaUpload } from "@/lib/media-uploads";
import { useCan } from "@/lib/session";

/** The unit form for a client who wants to sell: their property joins Direct inventory, linked to their lead. */
export function ListPropertyModal({
  lead,
  onClose,
  onListed,
}: {
  lead: Lead;
  onClose: () => void;
  onListed: () => void;
}) {
  const canApprove = useCan("inventory.approve");
  const [projects, setProjects] = useState<SelectOption[]>([]);
  const [projectCategories, setProjectCategories] = useState<Record<string, string | null>>({});
  const [unitTypes, setUnitTypes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPartnerProjects({ limit: 500 }), getCategories().catch(() => [])])
      .then(([list, categories]) => {
        const categoryNames = Object.fromEntries(categories.map((c) => [c.id, c.name]));
        setProjects(list.map((p) => ({ id: p.id, name: p.project_name })));
        setProjectCategories(
          Object.fromEntries(list.map((p) => [p.id, (p.category_id && categoryNames[p.category_id]) || null])),
        );
      })
      .catch(() => {});
    getUnits({ inventory_type: "direct", limit: 1 })
      .then((res) => setUnitTypes(res.unit_types))
      .catch(() => {});
  }, []);

  async function handleSubmit(draft: UnitInput, media: MediaDraft) {
    setIsSaving(true);
    setError(null);
    try {
      const unit = await createUnitFromLead(lead.id, draft);
      startMediaUpload({ unit_id: unit.id }, media, `Unit ${unit.unit_number}`);
      onListed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not list that property.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <UnitFormModal
      initial={null}
      defaultProjectId={lead.project_id ?? ""}
      projects={projects}
      projectCategories={projectCategories}
      inventoryType="direct"
      needsApproval={!canApprove}
      unitTypes={unitTypes}
      seller={{ name: lead.client_name, phone: lead.client_number }}
      isSaving={isSaving}
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
}
