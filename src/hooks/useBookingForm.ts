import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { contactSchema, ServiceRow, EmployeeRow, BookingResult, MembershipRow } from "@/components/booking/types";
import { createBookingHold } from "@/integrations/firebase/createBookingHold";
import { confirmBooking } from "@/integrations/firebase/confirmBooking";
import {
    buildServiceSubcategoryOptions,
    filterServicesBySubcategoryOption,
    type BookingMainCategory,
    type ServiceSubcategoryRow,
} from "@/lib/serviceSubcategories";

const makeIdempotencyKey = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function useBookingForm(
    services: ServiceRow[],
    serviceSubcategories: ServiceSubcategoryRow[],
    employees: EmployeeRow[],
    business: any,
    employeeServiceMap: Record<string, string[]>,
    memberships: MembershipRow[]
) {
    const { t } = useTranslation();

    // Booking states
    const [category, setCategory] = useState<BookingMainCategory>("damske");
    const [subcategory, setSubcategory] = useState<string | null>(null);
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
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

    const subcategoryOptions = useMemo(() => buildServiceSubcategoryOptions(
        services,
        serviceSubcategories,
        category,
    ), [services, serviceSubcategories, category]);

    const showSubcategoryStep = useMemo(() => {
        if (subcategoryOptions.length === 0) return false;
        return subcategoryOptions.some((option) => !option.isUncategorized) || subcategoryOptions.length > 1;
    }, [subcategoryOptions]);

    const selectedSubcategoryOption = useMemo(
        () => subcategoryOptions.find((option) => option.key === subcategory) ?? null,
        [subcategoryOptions, subcategory],
    );

    const filteredServices = useMemo(() => {
        if (!showSubcategoryStep) {
            return filterServicesBySubcategoryOption(services, category, null);
        }

        if (!selectedSubcategoryOption) {
            return [];
        }

        return filterServicesBySubcategoryOption(services, category, selectedSubcategoryOption);
    }, [services, category, selectedSubcategoryOption, showSubcategoryStep]);

    const selectedService = useMemo(() => services.find((s) => s.id === selectedServiceId) ?? null, [services, selectedServiceId]);

    useEffect(() => {
        if (!showSubcategoryStep) {
            if (subcategory !== null) {
                setSubcategory(null);
            }
            return;
        }

        if (subcategory !== null && !subcategoryOptions.some((option) => option.key === subcategory)) {
            setSubcategory(null);
            return;
        }

        if (subcategory == null && subcategoryOptions.length === 1) {
            setSubcategory(subcategoryOptions[0].key);
        }
    }, [showSubcategoryStep, subcategory, subcategoryOptions]);

    useEffect(() => {
        if (!selectedServiceId) return;
        if (!filteredServices.some((service) => service.id === selectedServiceId)) {
            setSelectedServiceId(null);
        }
    }, [filteredServices, selectedServiceId]);

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

    useEffect(() => {
        if (!selectedServiceId) {
            setSelectedEmployeeId(null);
            return;
        }

        if (!filteredEmployees.length) {
            setSelectedEmployeeId(null);
            return;
        }

        if (!selectedEmployeeId) {
            return;
        }

        const stillValid = filteredEmployees.some((employee) => employee.id === selectedEmployeeId);
        if (!stillValid) {
            setSelectedEmployeeId(null);
        }
    }, [selectedServiceId, filteredEmployees, selectedEmployeeId]);

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

    const handleSubmit = async (selectedTime: string | null, availableSlots: Date[], selectedEmployeeId?: string | null) => {
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
                employee_id: selectedEmployeeId ?? undefined,
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
                confirm_token: hold.confirm_token!,
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
        selectedEmployeeId,
        setSelectedEmployeeId,
        formData,
        setFormData,
        contactErrors,
        submitting,
        bookingDone,
        bookingResult,
        subcategoryOptions,
        showSubcategoryStep,
        selectedSubcategoryOption,
        filteredServices,
        selectedService,
        filteredEmployees,
        handleCheckAll,
        handleConsentChange,
        handleSubmit
    };
}
