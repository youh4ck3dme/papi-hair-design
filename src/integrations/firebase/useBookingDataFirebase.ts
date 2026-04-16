import { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "./config";
import { ServiceRow, EmployeeRow, MembershipRow } from "@/components/booking/types";
import { type BusinessHourEntry, type DateOverrideEntry } from "@/lib/availability";
import { DEFAULT_BUSINESS_ID, withBusinessIdFallbacks } from "@/lib/businessIds";
import {
    sortServiceSubcategories,
    type ServiceSubcategoryRow,
} from "@/lib/serviceSubcategories";

export interface BusinessData {
    id: string;
    name: string;
    allow_admin_as_provider?: boolean;
    max_days_ahead?: number;
    lead_time_minutes?: number;
    opening_hours?: unknown;
    revision?: number;
}

function normalizePhotoUrl(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function resolveProfilePhotoUrl(profileData: Record<string, unknown> | undefined): string | null {
    if (!profileData) return null;
    return (
        normalizePhotoUrl(profileData.avatar_url) ??
        normalizePhotoUrl(profileData.photo_url) ??
        normalizePhotoUrl(profileData.profile_photo_url)
    );
}

async function enrichEmployeesWithProfilePhoto(employees: EmployeeRow[]): Promise<EmployeeRow[]> {
    const profileIds = [...new Set(
        employees
            .filter((employee) => !normalizePhotoUrl(employee.photo_url))
            .map((employee) => employee.profile_id)
            .filter((profileId): profileId is string => typeof profileId === "string" && profileId.trim().length > 0)
    )];

    if (profileIds.length === 0) {
        return employees;
    }

    const profilePhotoById = new Map<string, string>();

    await Promise.all(profileIds.map(async (profileId) => {
        try {
            const profileSnap = await getDoc(doc(db, "profiles", profileId));
            if (!profileSnap.exists()) return;

            const profileData = profileSnap.data() as Record<string, unknown> | undefined;
            const profilePhotoUrl = resolveProfilePhotoUrl(profileData);
            if (profilePhotoUrl) {
                profilePhotoById.set(profileId, profilePhotoUrl);
            }
        } catch {
            // Profile photo lookup is best-effort for public booking.
        }
    }));

    if (profilePhotoById.size === 0) {
        return employees;
    }

    return employees.map((employee) => {
        if (normalizePhotoUrl(employee.photo_url)) {
            return employee;
        }

        const profileId = employee.profile_id;
        if (!profileId) {
            return employee;
        }

        const profilePhotoUrl = profilePhotoById.get(profileId);
        if (!profilePhotoUrl) {
            return employee;
        }

        return { ...employee, photo_url: profilePhotoUrl };
    });
}

export function useBookingDataFirebase() {
    const [services, setServices] = useState<ServiceRow[]>([]);
    const [serviceSubcategories, setServiceSubcategories] = useState<ServiceSubcategoryRow[]>([]);
    const [employees, setEmployees] = useState<EmployeeRow[]>([]);
    const [business, setBusiness] = useState<BusinessData | null>(null);
    const [businessHourEntries, setBusinessHourEntries] = useState<BusinessHourEntry[]>([]);
    const [dateOverrides, setDateOverrides] = useState<DateOverrideEntry[]>([]);
    const [schedules, setSchedules] = useState<Record<string, any[]>>({});
    const [employeeServiceMap, setEmployeeServiceMap] = useState<Record<string, string[]>>({});
    const [memberships, setMemberships] = useState<MembershipRow[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setInitialLoading(true);
            try {
                const businessIdCandidates = withBusinessIdFallbacks(DEFAULT_BUSINESS_ID);
                let activeBusinessId = businessIdCandidates[0] ?? DEFAULT_BUSINESS_ID;

                // Public booking needs read access even when Firebase rules require authentication.
                if (!auth.currentUser) {
                    try {
                        await signInAnonymously(auth);
                    } catch (authError) {
                        console.warn("useBookingDataFirebase: anonymous sign-in failed", authError);
                    }
                }

                // 1. Try snapshot first (with fallback business IDs)
                let snapshotData: any | null = null;
                for (const candidateBusinessId of businessIdCandidates) {
                    const snapshotDoc = await getDoc(doc(db, "public_snapshots", candidateBusinessId));
                    if (snapshotDoc.exists()) {
                        activeBusinessId = candidateBusinessId;
                        snapshotData = snapshotDoc.data();
                        break;
                    }
                }

                if (snapshotData) {
                    const snap = snapshotData as any;
                    setBusiness({
                        id: activeBusinessId,
                        name: snap.business?.name ?? "",
                        allow_admin_as_provider: snap.business?.allow_admin_as_provider,
                        max_days_ahead: snap.business?.max_days_ahead,
                        lead_time_minutes: snap.business?.lead_time_minutes,
                        opening_hours: snap.business?.opening_hours,
                        revision: snap.revision,
                    });
                    setServices(
                        (snap.services ?? [])
                            .map((d: any) => ({ ...d, id: d.id } as ServiceRow))
                            .sort((a: any, b: any) => {
                                const aSort = typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
                                const bSort = typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;
                                if (aSort !== bSort) return aSort - bSort;
                                return (a.name_sk ?? "").localeCompare(b.name_sk ?? "", "sk");
                            })
                    );
                    const snapshotSubcategories = Array.isArray(snap.service_subcategories)
                        ? sortServiceSubcategories(
                            (snap.service_subcategories ?? []).map((d: any) => ({ ...d, id: d.id } as ServiceSubcategoryRow)),
                        )
                        : [];
                    setServiceSubcategories(snapshotSubcategories);
                    const snapshotEmployees = (snap.employees ?? [])
                        .map((d: any) => ({ ...d, id: d.id } as EmployeeRow))
                        .sort((a: any, b: any) => (a.display_name ?? "").localeCompare(b.display_name ?? "", "sk"));
                    setEmployees(await enrichEmployeesWithProfilePhoto(snapshotEmployees));
                    setBusinessHourEntries(
                        (snap.business_hours ?? [])
                            .map((h: any) => ({
                                day_of_week: h.day_of_week,
                                mode: h.mode,
                                start_time: h.start_time,
                                end_time: h.end_time,
                                sort_order: h.sort_order ?? Number.MAX_SAFE_INTEGER,
                            }))
                            .sort((a: any, b: any) => a.sort_order - b.sort_order)
                            .map(({ day_of_week, mode, start_time, end_time }: any) => ({ day_of_week, mode, start_time, end_time }))
                    );
                    setDateOverrides(
                        (snap.date_overrides ?? []).map((o: any) => ({
                            override_date: o.override_date,
                            mode: o.mode,
                            start_time: o.start_time ?? null,
                            end_time: o.end_time ?? null
                        }))
                    );
                    setEmployeeServiceMap(snap.employee_service_map ?? {});

                    if (snapshotSubcategories.length === 0) {
                        try {
                            const liveSubcategoriesSnap = await getDocs(query(
                                collection(db, "service_subcategories"),
                                where("business_id", "==", activeBusinessId),
                                where("is_active", "==", true),
                            ));

                            setServiceSubcategories(sortServiceSubcategories(
                                liveSubcategoriesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as ServiceSubcategoryRow)),
                            ));
                        } catch (subcategoryError) {
                            console.warn("useBookingDataFirebase: live service subcategories unavailable", subcategoryError);
                        }
                    }
                } else {
                    // Fallback to live collections
                    let businessSnap = null;
                    for (const candidateBusinessId of businessIdCandidates) {
                        const candidateBusinessSnap = await getDoc(doc(db, "businesses", candidateBusinessId));
                        if (candidateBusinessSnap.exists()) {
                            activeBusinessId = candidateBusinessId;
                            businessSnap = candidateBusinessSnap;
                            break;
                        }
                    }

                    if (!businessSnap) {
                        businessSnap = await getDoc(doc(db, "businesses", activeBusinessId));
                    }

                    const [bizSnap, svcSnap, subcategorySnap, empSnap, bhSnap, bdoSnap] = await Promise.all([
                        Promise.resolve(businessSnap),
                        getDocs(query(
                            collection(db, "services"),
                            where("business_id", "==", activeBusinessId),
                            where("is_active", "==", true)
                        )),
                        getDocs(query(
                            collection(db, "service_subcategories"),
                            where("business_id", "==", activeBusinessId),
                            where("is_active", "==", true)
                        )),
                        getDocs(query(
                            collection(db, "employees"),
                            where("business_id", "==", activeBusinessId),
                            where("is_active", "==", true)
                        )),
                        getDocs(query(
                            collection(db, "business_hours"),
                            where("business_id", "==", activeBusinessId)
                        )),
                        getDocs(query(
                            collection(db, "business_date_overrides"),
                            where("business_id", "==", activeBusinessId),
                            where("override_date", ">=", new Date().toISOString().slice(0, 10))
                        )),
                    ]);

                    if (bizSnap.exists()) {
                        const d = bizSnap.data();
                        setBusiness({
                            id: activeBusinessId,
                            name: d.name,
                            allow_admin_as_provider: d.allow_admin_as_provider,
                            max_days_ahead: d.max_days_ahead,
                            lead_time_minutes: d.lead_time_minutes,
                            opening_hours: d.opening_hours
                        });
                    }

                    setServices(
                        svcSnap.docs
                            .map(d => ({ ...d.data(), id: d.id } as ServiceRow))
                            .sort((a, b) => {
                                const aSort = typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
                                const bSort = typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;
                                if (aSort !== bSort) return aSort - bSort;
                                return (a.name_sk ?? "").localeCompare(b.name_sk ?? "", "sk");
                            })
                    );
                    setServiceSubcategories(sortServiceSubcategories(
                        subcategorySnap.docs.map(d => ({ ...d.data(), id: d.id } as ServiceSubcategoryRow)),
                    ));
                    const liveEmployees = empSnap.docs
                        .map(d => ({ ...d.data(), id: d.id } as EmployeeRow))
                        .sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? "", "sk"));
                    setEmployees(await enrichEmployeesWithProfilePhoto(liveEmployees));

                    setBusinessHourEntries(
                        bhSnap.docs
                            .map(d => {
                                const h = d.data();
                                return {
                                    day_of_week: h.day_of_week,
                                    mode: h.mode,
                                    start_time: h.start_time,
                                    end_time: h.end_time,
                                    sort_order: h.sort_order ?? Number.MAX_SAFE_INTEGER,
                                };
                            })
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map(({ day_of_week, mode, start_time, end_time }) => ({ day_of_week, mode, start_time, end_time }))
                    );

                    setDateOverrides(bdoSnap.docs.map(d => {
                        const o = d.data();
                        return {
                            override_date: o.override_date,
                            mode: o.mode,
                            start_time: o.start_time ?? null,
                            end_time: o.end_time ?? null
                        };
                    }));
                }

                // 2. Memberships (best-effort, only for staff/admin)
                try {
                    const isAnonymous = auth.currentUser?.isAnonymous;
                    if (auth.currentUser && !isAnonymous) {
                        const memSnap = await getDocs(query(
                            collection(db, "memberships"),
                            where("business_id", "==", activeBusinessId)
                        ));
                        setMemberships(memSnap.docs.map(d => {
                            const data = d.data();
                            return { profile_id: data.profile_id, role: data.role };
                        }) as MembershipRow[]);
                    } else {
                        setMemberships([]);
                    }
                } catch (membershipError: any) {
                    // Only warn if it's NOT a permission error for an anonymous/unauthed user
                    const isPermissionError = membershipError?.code === "permission-denied";
                    if (!isPermissionError) {
                        console.warn("useBookingDataFirebase: memberships unavailable", membershipError);
                    }
                    setMemberships([]);
                }

            } catch (error_) {
                console.warn("useBookingDataFirebase: failed to load Firestore data", error_);
            } finally {
                setInitialLoading(false);
            }
        };
        load();
    }, []);

    return {
        services,
        serviceSubcategories,
        employees,
        business,
        businessHourEntries,
        dateOverrides,
        schedules,
        employeeServiceMap,
        memberships,
        initialLoading
    };
}
