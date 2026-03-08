import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import { contactSchema, ServiceRow, EmployeeRow, BookingResult, MembershipRow } from "@/components/booking/types";
import { createBookingHold } from "@/integrations/firebase/createBookingHold";
import { confirmBooking } from "@/integrations/firebase/confirmBooking";

const DEMO_BUSINESS_ID = "papi-hair-design-main";
const makeIdempotencyKey = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        meno: "", priezvisko: "", email: "", phone: "", note: "",
        marketing: false, terms: false, all: false,
    });
    const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [bookingDone, setBookingDone] = useState(false);
    const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

    // Derived: grouped subcategories
    const subcategories = useMemo(() => {
        const cats = services
            .filter((s): s is typeof s & { subcategory: string } => s.category === category && Boolean(s.subcategory))
            .map((s) => s.subcategory);
        return [...new Set(cats)].sort((a, b) => a.localeCompare(b));
    }, [services, category]);

    // Derived: filtered services for selected subcategory
    const filteredServices = useMemo(() => {
        if (!subcategory) {
            if (subcategories.length === 0) {
                return services.filter((s) => s.category === category);
            }
            return [];
        }
        return services.filter((s) => s.category === category && s.subcategory === subcategory);
    }, [services, category, subcategory, subcategories.length]);

    const selectedService = useMemo(() => services.find((s) => s.id === selectedServiceId) ?? null, [services, selectedServiceId]);

    // Filter employees based on selected service and admin setting
    const filteredEmployees = useMemo(() => {
        let result = employees;

        if (selectedServiceId) {
            result = result.filter(emp => {
                if (!employeeServiceMap[emp.id]) return true;
                return employeeServiceMap[emp.id].includes(selectedServiceId);
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

    const selectedEmployee = useMemo(() => employees.find((e) => e.id === selectedWorkerId) ?? null, [employees, selectedWorkerId]);

    // Handlers
    const handleCheckAll = useCallback(() => {
        setFormData(prev => {
            const newValue = !prev.all;
            return { ...prev, all: newValue, marketing: newValue, terms: newValue };
        });
    }, []);

    const handleConsentChange = useCallback((field: "marketing" | "terms") => {
        setFormData(prev => {
            const newData = { ...prev, [field]: !prev[field] };
            newData.all = newData.marketing && newData.terms;
            return newData;
        });
    }, []);

    const handleSubmit = async (selectedTime: string | null, availableSlots: Date[]) => {
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
            if (!selectedServiceId || !selectedWorkerId) {
                setSubmitting(false);
                return;
            }
            const idempotencyKey = makeIdempotencyKey();

            const hold = await createBookingHold({
                business_id: DEMO_BUSINESS_ID,
                service_id: selectedServiceId,
                employee_id: selectedWorkerId,
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
                success: true,
                appointment_id: hold.appointment_id,
                customer_email: formData.email,
                customer_name: `${formData.meno} ${formData.priezvisko}`.trim(),
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
        selectedWorkerId,
        setSelectedWorkerId,
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
        selectedEmployee,
        handleCheckAll,
        handleConsentChange,
        handleSubmit
    };
}
