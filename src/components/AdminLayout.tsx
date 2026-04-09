import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { cn } from "@/lib/utils";

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

  const navItems = allNavItems.filter((item) => Boolean(role) && item.roles.includes(role));
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
        <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black px-3 py-2.5 backdrop-blur-xl">
        <LogoIcon size="sm" color="#dc2626" />
        <div className="overflow-hidden uppercase tracking-tighter">
          <p className="text-sm font-black text-white truncate">H4CK3D ENTERPRISE</p>
          <p className="text-[10px] font-bold text-red-600 capitalize leading-none">{role ?? "AI AGENT"}</p>
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
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-sidebar-foreground/60">
            <Link to="/privacy" className="hover:text-sidebar-foreground/80">
              Zásady ochrany osobných údajov
            </Link>
            <Link to="/terms" className="hover:text-sidebar-foreground/80">
              Obchodné podmienky
            </Link>
          </div>
        </div>
    </Sidebar>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading: onboardingLoading } = useOnboarding();
  const { role } = useBusiness();

  if (onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isCalendarPage = location.pathname === "/admin/calendar";
  const navItems = allNavItems.filter((item) => Boolean(role) && item.roles.includes(role));

  return (
    <SidebarProvider>
      <div className="min-h-[100dvh] flex flex-col w-full max-w-full bg-background" data-testid="admin-layout">
        <div className="flex-1 flex w-full max-w-full overflow-hidden">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
            {!isCalendarPage && (
              <header className="h-10 md:h-12 flex items-center border-b border-border/70 px-2 md:px-4 safe-x bg-background/80 backdrop-blur-xl sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
                <SidebarTrigger className="mr-2 md:mr-3 min-h-touch min-w-touch flex items-center justify-center" />
                <div className="flex-1 min-w-0 font-black uppercase text-xs tracking-widest text-muted-foreground">
                  {navItems.find(n => n.url === location.pathname)?.title ?? "H4CK3D"}
                </div>
                <div className="hidden md:block"><ThemeToggle /></div>
              </header>
            )}
            <main className={`flex-1 overflow-auto max-w-full safe-x ${isCalendarPage ? "p-1.5 sm:p-3" : "p-4 sm:p-6"} ${!isCalendarPage ? "pb-24 lg:pb-6" : ""}`}>
              {children}
            </main>
          </div>
        </div>

        {/* Mobile Bottom Navigation - H4CK3D Style */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t-4 border-black bg-white px-6 pb-safe pt-2">
            <div className="flex items-center justify-between gap-2">
                {navItems.slice(0, 4).map((item) => {
                    const isActive = location.pathname === item.url;
                    const Icon = item.icon;
                    return (
                        <Link 
                            key={item.url} 
                            to={item.url}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 transition-all active:scale-95",
                                isActive ? "text-red-600" : "text-black"
                            )}
                        >
                            <Icon className={cn("w-6 h-6", isActive && "stroke-[3px]")} />
                            <span className="text-[10px] font-black uppercase tracking-tighter">{item.title}</span>
                        </Link>
                    )
                })}
                <button 
                  onClick={() => toast.info("Full menu available in sidebar (top left)")}
                  className="flex flex-col items-center gap-1 p-2 text-black"
                >
                    <Settings className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Viac</span>
                </button>
            </div>
        </nav>
      </div>
    </SidebarProvider>
  );
}
