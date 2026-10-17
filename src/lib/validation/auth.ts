import { z } from "zod";

import { ALLOWED_EMAIL_DOMAIN, isAllowedSignupEmail } from "@/lib/constants";

/**
 * Shared Zod schemas for every auth / account / admin-user form.
 * Server actions validate with the SAME schemas — client validation is UX,
 * the database triggers are the hard security boundary.
 */

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Maximum 72 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

// ---------- sign up / sign in / recovery ----------------------------------------

export const signUpSchema = z
  .object({
    full_name: z.string().trim().min(2, "Enter your full name").max(80),
    email: emailField,
    password: passwordSchema,
  })
  .refine((values) => isAllowedSignupEmail(values.email), {
    message: `Sign-up is limited to @${ALLOWED_EMAIL_DOMAIN} emails — ask an admin to invite you.`,
    path: ["email"],
  });

export type SignUpValues = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password"),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  })
  .refine((values) => values.password !== values.current, {
    message: "New password must be different",
    path: ["password"],
  });

// ---------- profile / account ------------------------------------------------------

const optionalPhone = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^(\+?880|0)1[3-9]\d{8}$/.test(value),
    "Enter a valid BD phone number, e.g. 01XXXXXXXXX",
  );

export const updateProfileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: optionalPhone,
  bio: z.string().trim().max(280, "Keep it under 280 characters"),
});

export const updateEmailSchema = z
  .object({
    email: emailField,
  })
  .refine((values) => isAllowedSignupEmail(values.email), {
    message: `Account emails must be @${ALLOWED_EMAIL_DOMAIN} addresses.`,
    path: ["email"],
  });

export const deleteAccountSchema = z.object({
  current_password: z.string().min(1, "Enter your password to confirm"),
});

// ---------- admin: invite & direct create ------------------------------------------

export const inviteUserSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  role: z.enum(["buyer", "seller", "admin"]),
  note: z.string().trim().max(200).optional(),
});

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  full_name: z.string().trim().min(2, "Enter their full name").max(80),
  role: z.enum(["buyer", "seller", "admin"]),
  password: passwordSchema,
});
