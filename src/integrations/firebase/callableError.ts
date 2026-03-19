interface CallableErrorLike {
  message?: string;
  code?: string;
  details?: {
    code?: string;
  };
}

function resolveErrorCode(error: CallableErrorLike): string | null {
  if (typeof error.details?.code === "string" && error.details.code.length > 0) {
    return error.details.code;
  }
  if (typeof error.code === "string" && error.code.length > 0) {
    return error.code.replace(/^functions\//, "");
  }
  return null;
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_recaptcha_token: "Prosím potvrďte bezpečnostný overovací krok a skúste to znova.",
  recaptcha_unavailable: "Bezpečnostné overenie je dočasne nedostupné. Skúste to o chvíľu.",
  recaptcha_failed: "Bezpečnostné overenie zlyhalo. Obnovte stránku a skúste to znova.",
  recaptcha_low_score: "Bezpečnostné overenie neprešlo. Skúste to znova.",
  slot_unavailable: "Vybraný termín už nie je dostupný. Vyberte prosím iný čas.",
  hold_expired: "Potvrdzovací čas vypršal. Vytvorte novú rezerváciu.",
  appointment_not_found: "Rezerváciu sa nepodarilo nájsť.",
  invalid_confirm_token: "Overovací token nie je platný. Spustite proces rezervácie znovu.",
};

export function toCallableErrorMessage(error: unknown, fallback: string): string {
  const parsed = (error ?? {}) as CallableErrorLike;
  const code = resolveErrorCode(parsed);
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
    return parsed.message;
  }
  return fallback;
}

