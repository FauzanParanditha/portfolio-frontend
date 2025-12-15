"use client";

import clsx from "clsx";
import React, { forwardRef } from "react";
import { Input } from "./ui/input";

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      id,
      label,
      name,
      type = "text",
      className,
      containerClassName,
      hint,
      error,
      required,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const inputId = id ?? name; // idealnya name selalu ada

    const describedBy = [
      hint && inputId ? `${inputId}-hint` : null,
      error && inputId ? `${inputId}-error` : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={clsx("space-y-1", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
            {required && <span className="text-xs text-red-800"> *</span>}
          </label>
        )}

        <Input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy || undefined}
          className={clsx(
            error && "border-red-500 focus-visible:ring-red-500",
            className,
          )}
          required={required}
          {...rest}
        />

        {hint && !error && inputId && (
          <p id={`${inputId}-hint`} className="text-xs text-gray-500">
            {hint}
          </p>
        )}

        {error && inputId && (
          <p id={`${inputId}-error`} className="text-xs text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  },
);

FormInput.displayName = "FormInput";
export default FormInput;
