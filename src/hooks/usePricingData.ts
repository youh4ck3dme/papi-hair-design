import { useEffect, useState } from "react";
import { signInAnonymously } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

import type { ServiceRow } from "@/components/booking/types";
import { DEFAULT_BUSINESS_ID, withBusinessIdFallbacks } from "@/lib/businessIds";
import { auth, db } from "@/integrations/firebase/config";

type PricingData = {
  services: ServiceRow[];
};

let pricingCache: PricingData | null = null;
let pricingRequest: Promise<PricingData> | null = null;

function normalizeService(raw: any): ServiceRow {
  return {
    ...raw,
    id: raw.id,
  } as ServiceRow;
}

function sortServices(services: ServiceRow[]): ServiceRow[] {
  return [...services].sort((a, b) => {
    const aSort = typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
    const bSort = typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;
    if (aSort !== bSort) return aSort - bSort;
    return (a.name_sk ?? "").localeCompare(b.name_sk ?? "", "sk");
  });
}

async function ensureAnonymousAuth() {
  if (auth.currentUser) return;

  try {
    await signInAnonymously(auth);
  } catch (error) {
    console.warn("usePricingData: anonymous sign-in failed", error);
  }
}

async function loadPricingData(): Promise<PricingData> {
  if (pricingCache) return pricingCache;
  if (pricingRequest) return pricingRequest;

  pricingRequest = (async () => {
    await ensureAnonymousAuth();

    const businessIds = withBusinessIdFallbacks(DEFAULT_BUSINESS_ID);
    const snapshotDocs = await Promise.all(
      businessIds.map((businessId) => getDoc(doc(db, "public_snapshots", businessId))),
    );
    const snapshot = snapshotDocs.find((snapshotDoc) => snapshotDoc.exists());

    if (snapshot) {
      const data = snapshot.data() as { services?: any[] };
      pricingCache = {
        services: sortServices((data.services ?? []).map(normalizeService)),
      };
      return pricingCache;
    }

    const serviceSnapshots = await Promise.all(
      businessIds.map((businessId) =>
        getDocs(query(
          collection(db, "services"),
          where("business_id", "==", businessId),
          where("is_active", "==", true),
        )),
      ),
    );
    const serviceSnapshot = serviceSnapshots.find((serviceSnap) => !serviceSnap.empty);

    pricingCache = {
      services: sortServices(
        serviceSnapshot?.docs.map((serviceDoc) => normalizeService({ ...serviceDoc.data(), id: serviceDoc.id })) ?? [],
      ),
    };
    return pricingCache;
  })().finally(() => {
    pricingRequest = null;
  });

  return pricingRequest;
}

export function usePricingData() {
  const [services, setServices] = useState<ServiceRow[]>(pricingCache?.services ?? []);
  const [initialLoading, setInitialLoading] = useState(!pricingCache);

  useEffect(() => {
    let isMounted = true;

    void loadPricingData()
      .then((data) => {
        if (!isMounted) return;
        setServices(data.services);
      })
      .catch((error) => {
        console.warn("usePricingData: failed to load pricing data", error);
      })
      .finally(() => {
        if (isMounted) {
          setInitialLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { services, initialLoading };
}
