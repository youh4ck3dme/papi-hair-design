import { useRef, useState } from "react";
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
  Settings, LogOut, ChevronRight, Monitor, Camera,
} from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LiquidGlassNav, type LiquidGlassNavItem } from "@/components/LiquidGlassNav";
import { cn } from "@/lib/utils";
import { db, storage } from "@/integrations/firebase/config";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { compressProfileImage, readFileAsDataUrl, validateProfileImageFile } from "@/lib/profileImage";
import { AvatarCropper } from "@/components/admin/AvatarCropper";

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
  const { profile, signOut, refreshProfile } = useAuth();
  const { role } = useBusiness();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const err = validateProfileImageFile(file);
    if (err) { toast.error(err); return; }
    void readFileAsDataUrl(file).then(setCropImageSrc).catch(() => toast.error("Fotku sa nepodarilo načítať"));
  };

  const handleAvatarCropConfirm = async (croppedBlob: Blob) => {
    if (!profile) return;
    setUploadingAvatar(true);
    try {
      const compressed = await compressProfileImage(croppedBlob);
      const fileName = `profiles/${profile.id}/${Date.now()}.jpg`;
      const sRef = storageRef(storage, fileName);
      await uploadBytes(sRef, compressed, { contentType: "image/jpeg", cacheControl: "public,max-age=31536000,immutable" });
      const url = await getDownloadURL(sRef);
      await setDoc(doc(db, "profiles", profile.id), { avatar_url: url, updated_at: new Date().toISOString() }, { merge: true });
      await refreshProfile();
      setCropImageSrc(null);
      toast.success("Profilová fotka uložená");
    } catch {
      toast.error("Chyba pri nahrávaní fotky");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <Sidebar className="border-r-0">
      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black px-3 py-2.5 backdrop-blur-xl">
        <LogoIcon size="sm" color="#C9A84C" />
        <div className="overflow-hidden flex flex-col items-center w-full">
          <p className="text-sm font-black text-white truncate uppercase tracking-tighter">PAPI HAIR DESIGN</p>
          <p className="text-[16px] text-amber-400 leading-none text-center" style={{ fontFamily: "'Great Vibes', cursive" }}>Booking</p>
        </div>
        </div>
      </div>

      <SidebarContent className="px-3 py-3">
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
          {/* Avatar crop dialog */}
          {cropImageSrc && (
            <AvatarCropper
              imageSrc={cropImageSrc}
              onConfirm={handleAvatarCropConfirm}
              onCancel={() => setCropImageSrc(null)}
            />
          )}
          <input
            ref={avatarFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFileChange}
          />

          <div className="flex items-center gap-3 mb-3">
            {/* Clickable avatar */}
            <button
              type="button"
              onClick={() => avatarFileRef.current?.click()}
              className="relative group flex-shrink-0"
              title="Zmeniť fotku"
              disabled={uploadingAvatar}
            >
              <Avatar className="w-9 h-9">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Profilová fotka" />}
                <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar
                  ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  : <Camera className="w-3.5 h-3.5 text-white" />
                }
              </div>
            </button>

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
              Zmluvné podmienky
            </Link>
          </div>
        </div>
    </Sidebar>
  );
}

function AdminInnerLayout({ children }: { children: React.ReactNode }) {
  const { role } = useBusiness();
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  const isCalendarPage = location.pathname === "/admin/calendar";
  const navItems = allNavItems.filter((item) => Boolean(role) && item.roles.includes(role));

  return (
    <div className="min-h-[100dvh] flex flex-col w-full max-w-full bg-background" data-testid="admin-layout">
      <div className="flex-1 flex w-full max-w-full overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {!isCalendarPage && (
            <header className="h-10 md:h-12 flex items-center border-b border-border/70 px-2 md:px-4 safe-x bg-background/80 backdrop-blur-xl sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
              <SidebarTrigger className="mr-2 md:mr-3 min-h-touch min-w-touch flex items-center justify-center" />
              <div className="flex-1 min-w-0 font-black uppercase text-xs tracking-widest text-muted-foreground">
                {navItems.find(n => n.url === location.pathname)?.title ?? "PAPI HAIR DESIGN"}
              </div>
              <div className="hidden md:block"><ThemeToggle /></div>
            </header>
          )}
          <main className={`flex-1 overflow-auto max-w-full safe-x ${isCalendarPage ? "p-1.5 sm:p-3" : "p-4 sm:p-6"} ${!isCalendarPage ? "pb-24 lg:pb-6" : ""}`}>
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t-4 border-white bg-black px-6 pb-safe pt-2">
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
                  isActive ? "text-amber-500" : "text-white"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "stroke-[3px]")} />
                <span className="text-[10px] font-black uppercase tracking-tighter">{item.title}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setOpenMobile(true)}
            className="flex flex-col items-center gap-1 p-2 text-white"
          >
            <Settings className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Viac</span>
          </button>
        </div>
      </nav>
    </div>
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
      <AdminInnerLayout>{children}</AdminInnerLayout>
    </SidebarProvider>
  );
}
