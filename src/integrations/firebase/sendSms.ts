import { httpsCallable } from "firebase/functions";
import { functions } from "./config";

export interface SendSmsBody {
  to: string;
  message: string;
}

export interface SendSmsResponse {
  success?: boolean;
  sid?: string;
  error?: string;
}

export async function sendSms(body: SendSmsBody): Promise<SendSmsResponse> {
  try {
    const fn = httpsCallable<SendSmsBody, SendSmsResponse>(functions, "sendSms");
    const result = await fn(body);
    return result.data;
  } catch (err: any) {
    console.error("sendSms error:", err);
    return { error: err.message || "Odoslanie SMS zlyhalo" };
  }
}
