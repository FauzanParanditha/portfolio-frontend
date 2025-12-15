import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
  password: z.string().min(6, { message: "Minimal 6 karakter" }),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Format email tidak valid")
    .max(100, "Email terlalu panjang"),
});

export const resetPasswordSchema = z
  .object({
    email: z
      .string()
      .email("Format email tidak valid")
      .max(100, "Email terlalu panjang"),

    newPassword: z
      .string()
      .min(8, "Password baru minimal 8 karakter")
      .max(100, "Password terlalu panjang")
      .regex(/[a-z]/, "Harus mengandung huruf kecil")
      .regex(/[A-Z]/, "Harus mengandung huruf besar")
      .regex(/[0-9]/, "Harus mengandung angka")
      .regex(/[^a-zA-Z0-9]/, "Harus mengandung simbol"),

    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export type LoginSchemaType = z.infer<typeof loginSchema>;
export type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;
