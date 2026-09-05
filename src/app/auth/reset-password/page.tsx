import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = {
  title: "Reset Password | Page",
};

export default function ResetPasswordPage() {
  // Suspense wajib karena form membaca `?token` lewat useSearchParams.
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
