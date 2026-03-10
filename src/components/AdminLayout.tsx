import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { useOnboarding } from "@/hooks/useOnboarding";
import {
  Sidebar, SidebarContent, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard, Calendar, BookOpen, Users, Briefcase, UserCheck,
  Settings, LogOut, ChevronRight, Monitor,
} from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LiquidGlassNav, type LiquidGlassNavItem } from "@/components/LiquidGlassNav";

const allNavItems = [
  { title: "Prehľad", url: "/admin", icon: LayoutDashboard, roles: ["owner", "admin", "employee"] },
  { title: "Kalendár", url: "/admin/calendar", icon: Calendar, roles: ["owner", "admin"] },
  { title: "Môj rozvrh", url: "/admin/my", icon: Calendar, roles: ["employee"] },
  { title: "Rezervácie", url: "/admin/appointments", icon: BookOpen, roles: ["owner", "admin", "employee"] },
  { title: "Zamestnanci", url: "/admin/employees", icon: Users, roles: ["owner", "admin"] },
  { title: "Služby", url: "/admin/services", icon: Briefcase, roles: ["owner", "admin"] },
  { title: "Zákazníci", url: "/admin/customers", icon: UserCheck, roles: ["owner", "admin"] },
  { title: "Nastavenia", url: "/admin/settings", icon: Settings, roles: ["owner", "admin", "employee"] },
  { title: "Recepcia", url: "/reception", icon: Monitor, roles: ["owner", "admin", "employee"] },
];

export function AdminSidebar() {
  const { profile, signOut } = useAuth();
  const { role } = useBusiness();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const navItems = allNavItems.filter((item) => !role || item.roles.includes(role));
  const liquidItems: LiquidGlassNavItem[] = navItems.map((item) => ({
    id: item.url,
    label: item.title,
    icon: item.icon,
  }));

  const activeItemId =
    navItems.find((item) =>
      item.url === "/admin"
        ? location.pathname === "/admin"
        : location.pathname === item.url || location.pathname.startsWith(`${item.url}/`)
    )?.url ?? liquidItems[0]?.id;

  const handleSignOut = async () => {
    await signOut();
    toast.success("Boli ste odhlásení");
    navigate("/auth");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <Sidebar className="border-r-0">
      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-3 py-2.5 backdrop-blur-xl">
        <LogoIcon size="sm" />
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-sidebar-foreground truncate">PAPI HAIR DESIGN</p>
          <p className="text-xs text-sidebar-foreground/60 capitalize">{role ?? "hosť"}</p>
        </div>
        </div>
      </div>

      <SidebarContent className="px-3 py-3">
        <p className="px-1 pb-2 text-xs uppercase tracking-[0.2em] text-sidebar-foreground/45">Navigácia</p>
        <LiquidGlassNav
          items={liquidItems}
          activeId={activeItemId}
          onSelect={(item) => {
            navigate(item.id);
            if (isMobile) setOpenMobile(false);
          }}
          showToast={false}
        />
      </SidebarContent>

      <div className="mt-auto border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-8 h-8">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Profilová fotka" />}
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{profile?.full_name ?? "Používateľ"}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{profile?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Odhlásiť sa
        </Button>
        <a
          href="/booking"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2 py-1.5 mt-1 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors rounded"
        >
          <ChevronRight className="w-3 h-3" />
          Online rezervácia
        </a>
      </div>
    </Sidebar>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading: onboardingLoading } = useOnboarding();

  if (onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-[100dvh] flex w-full max-w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_45%)]" data-testid="admin-layout">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          <header className="min-h-[44px] h-12 flex items-center border-b border-border/70 px-4 safe-x bg-background/80 backdrop-blur-xl sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
            <SidebarTrigger className="mr-3 min-h-touch min-w-touch flex items-center justify-center" />
            <div className="flex-1 min-w-0" />
            <ThemeToggle />
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-auto max-w-full safe-x">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
