import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {
    type CallableRequest,
    HttpsError
} from "firebase-functions/v2/https";

interface ListBookableProvidersData {
    business_id: string;
    service_id?: string;
}

export const listBookableProviders = functions.https.onCall(async (request: CallableRequest<ListBookableProvidersData>) => {
    const { data } = request;
    const db = admin.firestore();

    const { business_id, service_id } = data;
    if (!business_id) {
        throw new HttpsError("invalid-argument", "Missing business_id");
    }

    // 1. Get business setting
    const businessSnap = await db.collection("businesses").doc(business_id).get();
    const allowAdmin = businessSnap.data()?.allow_admin_in_service_selection === true;

    // 2. Get active employees
    const employeesSnap = await db.collection("employees")
        .where("business_id", "==", business_id)
        .where("is_active", "==", true)
        .get();

    const providers: any[] = [];

    for (const empDoc of employeesSnap.docs) {
        const empData = empDoc.data();
        const empId = empDoc.id;

        // 3. Check role/membership if needed
        let role = "employee";
        if (empData.profile_id) {
            const membershipSnap = await db.collection("memberships")
                .where("business_id", "==", business_id)
                .where("profile_id", "==", empData.profile_id)
                .limit(1)
                .get();

            if (!membershipSnap.empty) {
                role = membershipSnap.docs[0].data().role;
            }
        }

        // Filter by admin setting
        if (role === "admin" && !allowAdmin) continue;

        // 4. Check service eligibility if service_id provided
        if (service_id) {
            const empServiceSnap = await db.collection("employee_services")
                .where("employee_id", "==", empId)
                .where("service_id", "==", service_id)
                .limit(1)
                .get();

            // If they have specific services assigned, they MUST have THIS service
            // If they have NO services assigned, they are eligible for ALL
            const hasAnyServiceSnap = await db.collection("employee_services")
                .where("employee_id", "==", empId)
                .limit(1)
                .get();

            if (!hasAnyServiceSnap.empty && empServiceSnap.empty) {
                continue;
            }
        }

        providers.push({
            id: empId,
            display_name: empData.display_name,
            email: empData.email,
            phone: empData.phone,
            photo_url: empData.photo_url,
            is_active: empData.is_active,
            role
        });
    }

    return providers;
});
