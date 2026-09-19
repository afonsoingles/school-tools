import type { Metadata } from "next"
import { AuditManager } from "@/components/admin/audit-manager"

export const metadata: Metadata = {
  title: "Audit/Admin",
}

export default function AdminAuditPage() {
  return <AuditManager />
}