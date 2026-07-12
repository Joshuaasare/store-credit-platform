import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@store-credit-platform/web-components";
import { createAuthService } from "@store-credit-platform/api-services";
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
      </div>
    </div>
  );
}
