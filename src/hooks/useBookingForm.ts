import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { contactSchema, ServiceRow, EmployeeRow, BookingResult, MembershipRow } from "@/components/booking/types";
import { createBookingHold } from "@/integrations/firebase/createBookingHold";
import { confirmBooking } from "@/integrations/firebase/confirmBooking";

const makeIdempotencyKey = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function inferCategoryFromName(name: string): "damske" | "panske" {
    const normalized = name.toLowerCase();
    const menPattern = /(p[aá]nsk|brad|junior|depil[aá]cia nosa|u[šs]n[eé] svie[cč]k|maska|t[oó]novanie sed[ií]n)/i;
    return menPattern.test(normalized) ? "panske" : "damske";
}

function resolveServiceCategory(service: ServiceRow): "damske" | "panske" {
    if (service.category === "damske" || service.category === "panske") {
        return service.category;
    }
    return inferCategoryFromName(service.name_sk ?? "");
}

function resolveServiceSubcategory(service: ServiceRow): string | null {
    return typeof service.subcategory === "string" && service.subcategory.trim().length > 0
        ? service.subcategory
        : null;
}

export function useBookingForm(
    services: ServiceRow[],
    employees: EmployeeRow[],
    business: any,
    employeeServiceMap: Record<string, string[]>,
    memberships: MembershipRow[]
) {
    const { t } = useTranslation();

    // Booking states
    const [category, setCategory] = useState<"damske" | "panske">("damske");
    const [subcategory, setSubcategory] = useState<string | null>(null);
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        meno: "", priezvisko: "", email: "", phone: "", note: "",
        marketing: false, terms: false, gdpr: false, all: false,
    });
    const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [bookingDone, setBookingDone] = useState(false);
    const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
    const { profile } = useAuth();
    const businessId = typeof business?.id === "string" ? business.id : "";

    // Pre-fill profile data
    useEffect(() => {
        if (profile) {
            const names = (profile.full_name ?? "").split(" ");
            const firstName = names[0] ?? "";
            const lastName = names.slice(1).join(" ") ?? "";

            setFormData(prev => ({
                ...prev,
                meno: prev.meno || firstName,
                priezvisko: prev.priezvisko || lastName,
                email: prev.email || profile.email || "",
                phone: prev.phone || (profile.phone ? profile.phone.replace("+421", "") : ""),
            }));
        }
    }, [profile]);

    // Derived: grouped subcategories
    const subcategories = useMemo(() => {
        const cats = services
            .filter((s): s is typeof s & { subcategory: string } =>
                resolveServiceCategory(s) === category && Boolean(resolveServiceSubcategory(s))
            )
            .map((s) => resolveServiceSubcategory(s) as string);
        return [...new Set(cats)].sort((a, b) => a.localeCompare(b));
    }, [services, category]);

    // Derived: filtered services for selected subcategory
    const filteredServices = useMemo(() => {
        if (!subcategory) {
            if (subcategories.length === 0) {
                return services.filter((s) => resolveServiceCategory(s) === category);
            }
            return [];
        }
        return services.filter((s) => resolveServiceCategory(s) === category && resolveServiceSubcategory(s) === subcategory);
    }, [services, category, subcategory, subcategories.length]);

    const selectedService = useMemo(() => services.find((s) => s.id === selectedServiceId) ?? null, [services, selectedServiceId]);

    // Filter employees based on selected service and admin setting
    const filteredEmployees = useMemo(() => {
        let result = employees;

        if (selectedServiceId) {
            result = result.filter(emp => {
                const serviceMode = emp.service_mode === "restricted" ? "restricted" : "all";
                if (serviceMode === "all") return true;
                const assignedServices = employeeServiceMap[emp.id];
                if (!assignedServices || assignedServices.length === 0) return false;
                return assignedServices.includes(selectedServiceId);
            });
        }

        if (!business?.allow_admin_as_provider) {
            result = result.filter(emp => {
                if (!emp.profile_id) return true;
                const membership = memberships.find(m => m.profile_id === emp.profile_id);
                if (!membership) return true;
                return membership.role === "employee";
            });
        }

        return result;
    }, [employees, selectedServiceId, employeeServiceMap, business, memberships]);

    // Handlers
    const handleCheckAll = useCallback(() => {
        setFormData(prev => {
            const newValue = !prev.all;
            return { ...prev, all: newValue, marketing: newValue, terms: newValue, gdpr: newValue };
        });
    }, []);

    const handleConsentChange = useCallback((field: "marketing" | "terms" | "gdpr") => {
        setFormData(prev => {
            const newData = { ...prev, [field]: !prev[field] };
            newData.all = newData.marketing && newData.terms && newData.gdpr;
            return newData;
        });
    }, []);

    const handleSubmit = async (selectedTime: string | null, availableSlots: Date[]) => {
        if (!formData.gdpr) {
            toast.error(t("booking.toastGdprRequired"));
            return;
        }

        const result = contactSchema.safeParse(formData);
        if (!result.success) {
            const errs: Record<string, string> = {};
            result.error.errors.forEach((e) => { if (e.path[0]) errs[e.path[0] as string] = e.message; });
            setContactErrors(errs);
            return;
        }
        if (!formData.terms) {
            toast.error(t("booking.toastTermsRequired"));
            return;
        }
        setContactErrors({});
        setSubmitting(true);

        const slotDate = availableSlots.find((s) => format(s, "HH:mm") === selectedTime);
        if (!slotDate) {
            toast.error(t("booking.toastSlotTaken"));
            setSubmitting(false);
            return;
        }

        try {
            if (!selectedServiceId) {
                setSubmitting(false);
                return;
            }
            const idempotencyKey = makeIdempotencyKey();
            if (!businessId) {
                toast.error(t("booking.toastServerError"));
                setSubmitting(false);
                return;
            }

            const hold = await createBookingHold({
                business_id: businessId,
                service_id: selectedServiceId,
                start_at: slotDate.toISOString(),
                customer_name: `${formData.meno} ${formData.priezvisko}`.trim(),
                customer_email: formData.email,
                customer_phone: formData.phone || undefined,
                idempotency_key: idempotencyKey,
            });

            if (!hold.success || !hold.appointment_id) {
                toast.error(hold.error || t("booking.toastServerError"));
                setSubmitting(false);
                return;
            }

            const confirm = await confirmBooking({
                appointment_id: hold.appointment_id,
                idempotency_key: idempotencyKey,
            });

            if (!confirm.success) {
                toast.error(confirm.error || t("booking.toastServerError"));
                setSubmitting(false);
                return;
            }

            const data: BookingResult = {
                claim_token: confirm.claim_token ?? undefined,
                history_access_token: confirm.history_access_token ?? null,
                history_reference: confirm.history_reference ?? hold.appointment_id,
                customer_email: confirm.customer_email ?? formData.email,
                customer_name: confirm.customer_name ?? `${formData.meno} ${formData.priezvisko}`.trim(),
            };

            setBookingResult(data);
            setBookingDone(true);
            toast.success(t("booking.toastSuccess"));
        } catch {
            toast.error(t("booking.toastServerError"));
        }
        setSubmitting(false);
    };

    return {
        category,
        setCategory,
        subcategory,
        setSubcategory,
        selectedServiceId,
        setSelectedServiceId,
        formData,
        setFormData,
        contactErrors,
        submitting,
        bookingDone,
        bookingResult,
        subcategories,
        filteredServices,
        selectedService,
        filteredEmployees,
        handleCheckAll,
        handleConsentChange,
        handleSubmit
    };
}
