import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@store-credit-platform/web-components";
import { createAuthService } from "@store-credit-platform/api-services";
import { supabase } from "../../shared/lib/supabase";
import { useAuthStore } from "../../stores/auth-store";

const authService = createAuthService(supabase as any);

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  const phone = location.state?.phone || "";
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await authService.verifyOtp({ phone, otp });

      if (response.success) {
        await setSession(response.data);
        navigate("/dashboard");
      } else {
        setError(response.error || "Invalid code. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await authService.sendOtp({ phone });
      if (!response.success) {
        setError(response.error || "Failed to resend code");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Verify Code</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter the 6-digit code sent to <strong>{phone}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-700"
            >
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg font-semibold tracking-widest shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Verifying..." : "Verify & Login"}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={isLoading}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
          >
            Didn&apos;t receive it? Resend code
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Use a different phone number
          </button>
        </div>
      </div>
    </div>
  );
}
