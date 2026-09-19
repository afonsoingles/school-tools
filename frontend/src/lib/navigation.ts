import {
  LayoutDashboard,
  Calendar,
  GraduationCap,
  ChartNoAxesCombined,
  ClipboardList,
} from "lucide-react";

export const navigation = [
  {
    key: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "calendar",
    href: "/calendar",
    icon: Calendar,
  },
  {
    key: "evaluations",
    href: "/evaluations",
    icon: GraduationCap,
  },
  {
    key: "grades",
    href: "/grades",
    icon: ChartNoAxesCombined,
  },
  {
    key: "homework",
    href: "/homework",
    icon: ClipboardList,
  },
] as const;
