import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  GraduationCap,
  BookOpen,
  Settings,
} from "lucide-react";

export const navigation = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    subtitle: "dash"
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: Calendar,
    subtitle: "calendar"

  },
  {
    title: "Homework",
    href: "/homework",
    icon: ClipboardList,
    subtitle: "homework"

  },
  {
    title: "Evaluations",
    href: "/evaluations",
    icon: GraduationCap,
    subtitle: "notas"

  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    subtitle: "defenicoes"

  },
];