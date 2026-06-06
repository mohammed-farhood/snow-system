"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-[var(--text)] text-right"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] placeholder-[var(--text-muted)]",
              "px-3 py-2 text-sm transition-colors",
              "focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]",
              leftIcon && "pr-10",
              rightIcon && "pl-10",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-[var(--error)] text-right">{error}</p>
        )}
        {helper && !error && (
          <p className="text-xs text-[var(--text-muted)] text-right">{helper}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// Textarea variant
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helper, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-[var(--text)] text-right"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--text)] placeholder-[var(--text-muted)]",
            "px-3 py-2 text-sm transition-colors resize-none",
            "focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-[var(--error)] text-right">{error}</p>
        )}
        {helper && !error && (
          <p className="text-xs text-[var(--text-muted)] text-right">{helper}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
