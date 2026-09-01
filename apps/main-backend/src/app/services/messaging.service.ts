import {
  SendSMSMessageParams,
  SendSMSMessageResponse,
  SMSMessageErrorReponse,
} from "../schemas/main.schema";

const MNOTIFY_URL = "https://api.mnotify.com/api/sms/quick";

export class MessagingService {
  static async sendSMSMessage({ phone, message }: SendSMSMessageParams) {
    const apiKey = process.env.MNOTIFY_API_KEY;

    if (!apiKey) {
      console.log(`[SMS MOCK] To: ${phone} | Message: ${message}`);
      return { status: "success" } as SendSMSMessageResponse;
    }

    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: [phone],
        sender: process.env.MNOTIFY_SENDER_ID || "SmartSchool",
        message: message,
        is_schedule: false,
      }),
    };

    const response = await fetch(`${MNOTIFY_URL}?key=${apiKey}`, options);
    const data = (await response.json()) as
      | SendSMSMessageResponse
      | SMSMessageErrorReponse;

    if (!response.ok || data?.status !== "success") {
      console.error("Failed to send SMS:", data);
      throw new Error("Failed to send SMS");
    }

    console.log(`✅ SMS sent to ${phone} (status: ${data.status})`);

    return data;
  }
}

export class SMSTemplates {
  static loginOTP(otp: string): string {
    return `Your StoreCredit login code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
  }

  // Distinct copy so the customer can tell a phone-change SMS apart from a login code — a phishing attempt that asks for a "login code" can't reuse a phone-change SMS.
  static phoneChangeOTP(otp: string): string {
    return `Your StoreCredit phone-change code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
  }
}
