import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@store-credit-platform/web-components";
import { createAuthService } from "@store-credit-platform/api-services";
import { useAuthStore } from "@shared/stores/authStore";
import { PhoneInput } from "../../components/PhoneInput/PhoneInput";

const authService = createAuthService();

interface LoginFormData {
  phone: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { control, handleSubmit } = useForm<LoginFormData>({
    defaultValues: {
      phone: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError("");
    setIsLoading(true);

    try {
      const response = await authService.sendOtp({ phone: data.phone });

      if (response.success) {
        navigate("/verify-otp", { state: { phone: data.phone } });
      } else {
        setError(response.error || "Failed to send OTP");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">StoreCredit</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your phone number to receive a login code
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <PhoneInput
            name="phone"
            control={control}
            label="Phone Number"
            placeholder="20 000 0000"
            required
          />

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Sending code..." : "Send Login Code"}
          </Button>
        </form>

        {/* DEV — delete before production */}
        <button
          type="button"
          onClick={async () => {
            setIsLoading(true);
            try {
              const res = await authService.verifyOtp({
                phone: "0549270550",
                otp: "123456",
              });
              if (res.success) {
                useAuthStore.getState().setSession(res.data);
                navigate("/dashboard");
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : "Dev login failed");
            } finally {
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
          className="mt-4 w-full rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-50"
        >
          Dev Login
        </button>
        {/* END DEV */}
      </div>
    </div>
  );
}
