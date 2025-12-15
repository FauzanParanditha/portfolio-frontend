"use client";

import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Input } from "./ui/input";

interface PasswordInputProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string; // ✅ tambahkan
}

export default function PasswordInput({
  label = "Password",
  value,
  onChange,
  name,
  autoComplete,
  required,
  className, // ✅ terima dari luar
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-xs text-red-800"> *</span>}
        </label>
      )}

      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          name={name}
          autoComplete={autoComplete}
          required={required}
          className={clsx(
            "pr-10", // ruang untuk icon
            className, // ✅ class eksternal
          )}
        />

        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-2.5 text-gray-500"
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
}
