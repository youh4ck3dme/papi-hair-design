import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SettingsPage from "../SettingsPage";

const authState = vi.hoisted(() => ({
  profile: {
    id: "profile-1",
    full_name: "Papi Hair",
    phone: "+421900111222",
    avatar_url: null as string | null,
  },
}));

const refreshProfileMock = vi.hoisted(() => vi.fn());

const businessState = vi.hoisted(() => ({
  value: {
    businessId: "biz-1",
    isOwner: true,
    isOwnerOrAdmin: true,
  },
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));

const firestoreMocks = vi.hoisted(() => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
}));

const functionMocks = vi.hoisted(() => ({
  saveSmtpConfig: vi.fn(),
  rebuildPublicSnapshot: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({
  ref: vi.fn((_storage: unknown, path: string) => ({ path })),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: authState.profile,
    refreshProfile: refreshProfileMock,
  }),
}));

vi.mock("@/hooks/useBusiness", () => ({
  useBusiness: () => businessState.value,
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@/integrations/firebase/config", () => ({
  db: {},
  functions: {},
  storage: {},
}));

vi.mock("@/components/admin/BusinessHoursEditor", () => ({
  BusinessHoursEditor: () => <div>Business hours editor</div>,
}));

vi.mock("@/components/admin/AvatarCropper", () => ({
  AvatarCropper: ({ onConfirm, onCancel }: { onConfirm: (blob: Blob) => void; onCancel: () => void }) => (
    <div>
      <button type="button" onClick={() => onConfirm(new Blob(["avatar"], { type: "image/jpeg" }))}>
        confirm-crop
      </button>
      <button type="button" onClick={onCancel}>
        cancel-crop
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button type="button" data-value={value}>
      {children}
    </button>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, disabled, onCheckedChange }: { checked?: boolean; disabled?: boolean; onCheckedChange?: (value: boolean) => void }) => (
    <button
      type="button"
      aria-label="booking-switch"
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
    >
      {checked ? "on" : "off"}
    </button>
  ),
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: (_functions: unknown, name: "saveSmtpConfig" | "rebuildPublicSnapshot") => functionMocks[name],
}));

vi.mock("firebase/storage", () => ({
  ref: storageMocks.ref,
  uploadBytes: storageMocks.uploadBytes,
  getDownloadURL: storageMocks.getDownloadURL,
  deleteObject: storageMocks.deleteObject,
}));

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual("firebase/firestore");
  class Timestamp {
    private readonly value: Date;

    constructor(value: Date) {
      this.value = value;
    }

    toDate() {
      return this.value;
    }
  }

  return {
    ...actual,
    collection: (_db: unknown, collectionName: string) => ({
      __collection: collectionName,
      constraints: [],
    }),
    doc: (_db: unknown, collectionName: string, id: string) => ({
      __collection: collectionName,
      id,
    }),
    getDocs: firestoreMocks.getDocs,
    getDoc: firestoreMocks.getDoc,
    limit: (value: number) => ({ type: "limit", value }),
    orderBy: (field: string, direction: string) => ({ type: "orderBy", field, direction }),
    query: (base: any, ...constraints: any[]) => ({
      __collection: base?.__collection ?? "unknown",
      constraints: [...(base?.constraints ?? []), ...constraints],
    }),
    updateDoc: firestoreMocks.updateDoc,
    Timestamp,
    where: (field: string, op: string, value: unknown) => ({ type: "where", field, op, value }),
  };
});

function makeDocSnapshot(data?: Record<string, unknown>) {
  return {
    id: data?.id ?? "doc-1",
    exists: () => Boolean(data),
    data: () => data,
  };
}

describe("SettingsPage", () => {
  beforeEach(() => {
    refreshProfileMock.mockReset();
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    toastMocks.warning.mockReset();
    firestoreMocks.getDoc.mockReset();
    firestoreMocks.getDocs.mockReset();
    firestoreMocks.updateDoc.mockReset();
    functionMocks.saveSmtpConfig.mockReset();
    functionMocks.rebuildPublicSnapshot.mockReset();
    storageMocks.ref.mockClear();
    storageMocks.uploadBytes.mockReset();
    storageMocks.getDownloadURL.mockReset();
    storageMocks.deleteObject.mockReset();

    authState.profile = {
      id: "profile-1",
      full_name: "Papi Hair",
      phone: "+421900111222",
      avatar_url: null,
    };

    businessState.value = {
      businessId: "biz-1",
      isOwner: true,
      isOwnerOrAdmin: true,
    };

    firestoreMocks.getDoc.mockImplementation(async (docRef: { __collection: string; id: string }) => {
      if (docRef.__collection === "businesses") {
        return makeDocSnapshot({
          id: docRef.id,
          name: "PAPI HAIR DESIGN",
          address: "Kosice",
          phone: "+421949459624",
          email: "booking@papihairdesign.sk",
          timezone: "Europe/Bratislava",
          lead_time_minutes: 60,
          max_days_ahead: 60,
          cancellation_hours: 24,
          allow_admin_as_provider: true,
          smtp_config: {
            host: "smtp.m1.websupport.sk",
            port: 465,
            user: "booking@papihairdesign.sk",
            from: "booking@papihairdesign.sk",
          },
        });
      }

      if (docRef.__collection === "public_snapshots") {
        return makeDocSnapshot({
          id: docRef.id,
          revision: 123456,
          updated_at: "2026-04-16T10:00:00.000Z",
          status: "ready",
        });
      }

      if (docRef.__collection === "ops_health" && docRef.id === "snapshot_biz-1") {
        return makeDocSnapshot({
          id: docRef.id,
          status: "ready",
          updated_at: "2026-04-12T10:00:00.000Z",
          last_success_at: "2026-04-12T10:00:00.000Z",
          duration_ms: 6200,
          service_count: 33,
          subcategory_count: 14,
          employee_count: 3,
          business_hours_count: 7,
          date_override_count: 1,
          last_trigger_source: "services",
        });
      }

      if (docRef.__collection === "ops_health" && docRef.id === "booking_funnel_biz-1") {
        return makeDocSnapshot({
          id: docRef.id,
          total_events: 12,
          last_event_name: "service_selected",
          last_event_at: "2026-04-16T09:58:00.000Z",
          counters: {
            booking_started: 6,
            category_selected: 4,
            service_selected: 2,
          },
        });
      }

      return makeDocSnapshot(undefined);
    });

    firestoreMocks.getDocs.mockImplementation(async (queryRef: { __collection: string }) => {
      if (queryRef.__collection === "snapshot_rebuild_events") {
        return {
          docs: [
            {
              id: "evt-1",
              data: () => ({
                business_id: "biz-1",
                created_at: "2026-04-16T09:57:00.000Z",
                status: "failed",
                error: "Test failure",
                last_trigger_source: "services",
                duration_ms: 7100,
                service_count: 33,
                subcategory_count: 14,
              }),
            },
            {
              id: "evt-2",
              data: () => ({
                business_id: "biz-1",
                created_at: "2026-04-16T09:40:00.000Z",
                status: "ready",
                last_trigger_source: "service_subcategories",
                duration_ms: 180,
                service_count: 33,
                subcategory_count: 14,
              }),
            },
          ],
        };
      }

      return { docs: [] };
    });
  });

  it("loads business and profile data into the form", async () => {
    render(<SettingsPage />);

    expect(await screen.findByDisplayValue("Papi Hair")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+421900111222")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("PAPI HAIR DESIGN")).toBeInTheDocument();
    expect(screen.getByDisplayValue("smtp.m1.websupport.sk")).toBeInTheDocument();
  });

  it("renders observability warnings and rebuild history", async () => {
    render(<SettingsPage />);

    expect(await screen.findByText("Vyžaduje pozornosť")).toBeInTheDocument();
    expect(screen.getByText("Snapshot je starý")).toBeInTheDocument();
    expect(screen.getByText("Snapshot rebuild je pomalý")).toBeInTheDocument();
    expect(screen.getByText("História rebuildov")).toBeInTheDocument();
    expect(screen.getByText("Test failure")).toBeInTheDocument();
    expect(screen.getByTestId("snapshot-rebuild-events")).toBeInTheDocument();
  });

  it("saves the profile and refreshes auth data", async () => {
    render(<SettingsPage />);

    const fullNameInput = await screen.findByDisplayValue("Papi Hair");
    fireEvent.change(fullNameInput, { target: { value: "Papi Test" } });

    const profileSaveButton = screen.getByRole("button", { name: /Uložiť profil/i });
    fireEvent.click(profileSaveButton);

    await waitFor(() => {
      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        { __collection: "profiles", id: "profile-1" },
        expect.objectContaining({
          full_name: "Papi Test",
          phone: "+421900111222",
          avatar_url: null,
        }),
      );
    });

    expect(refreshProfileMock).toHaveBeenCalledTimes(1);
    expect(toastMocks.success).toHaveBeenCalledWith("Profil aktualizovaný");
  });

  it("saves SMTP settings through the callable and clears the password field", async () => {
    functionMocks.saveSmtpConfig.mockResolvedValue({ data: { success: true } });

    render(<SettingsPage />);

    const passwordInput = screen.getByPlaceholderText("Zadajte heslo");
    fireEvent.change(passwordInput, { target: { value: "super-secret" } });
    fireEvent.click(screen.getByRole("button", { name: /Uložiť SMTP/i }));

    await waitFor(() => {
      expect(functionMocks.saveSmtpConfig).toHaveBeenCalledWith({
        business_id: "biz-1",
        host: "smtp.m1.websupport.sk",
        port: 465,
        user: "booking@papihairdesign.sk",
        from: "booking@papihairdesign.sk",
        pass: "super-secret",
      });
    });

    expect(screen.getByPlaceholderText("••••••••")).toHaveValue("");
    expect(toastMocks.success).toHaveBeenCalledWith("SMTP nastavenia uložené");
  });

  it("rejects unsupported avatar files before opening the cropper", async () => {
    const { container } = render(<SettingsPage />);
    await screen.findByDisplayValue("Papi Hair");

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    const invalidFile = new File(["bad"], "avatar.gif", { type: "image/gif" });
    fireEvent.change(fileInput!, { target: { files: [invalidFile] } });

    expect(toastMocks.error).toHaveBeenCalledWith("Podporované sú iba JPG, PNG alebo WEBP súbory.");
    expect(screen.queryByText("confirm-crop")).not.toBeInTheDocument();
  });
});
