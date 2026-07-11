import { Suspense } from "react";
import LoginFormPage from "./LoginForm";

export const metadata = {
  title: "Login | Page",
};

export default function LoginPage() {
  // Suspense wajib karena LoginForm memakai useSearchParams (baca `?redirect`).
  return (
    <Suspense>
      <LoginFormPage />
    </Suspense>
  );
}
