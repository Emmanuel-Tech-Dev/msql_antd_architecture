const { z } = require("zod");

const authSchema = {
  createAdmin: {
    body: z
      .object({
        name: z
          .string({ required_error: "Name is required" })
          .trim()
          .min(2, "Name must be at least 2 characters")
          .max(100, "Name must not exceed 100 characters"),
        email: z
          .string({ required_error: "Email is required" })
          .trim()
          .email("Invalid email address")
          .toLowerCase(),
        phone_no: z
          .string()
          .trim()
          .max(15, "Phone number must not exceed 15 characters")
          .nullable()
          .optional(),
        status: z.union([z.literal(0), z.literal(1), z.boolean()]).optional(),
      })
      .strict(),
  },

  register: {
    body: z
      .object({
        name: z
          .string({ required_error: "Name is required" })
          .min(2, "Name must be at least 2 characters")
          .max(100, "Name must not exceed 100 characters")
          .trim(),

        email: z
          .string({ required_error: "Email is required" })
          .email("Invalid email address")
          .toLowerCase()
          .trim(),

        password: z
          .string({ required_error: "Password is required" })
          .min(8, "Password must be at least 8 characters")
          .max(100, "Password must not exceed 100 characters")
          .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            "Password must contain at least one uppercase, lowercase, and number"
          ),

        phone: z
          .string()
          .regex(/^\+?[\d\s-()]+$/, "Invalid phone number format")
          .optional(),
      })
      .strict(),
  },

  login: {
    body: z
      .object({
        email: z
          .string({ required_error: "Email or reg number required" })
          .email("Invalid email address")
          .min(1)
          .trim(),

        password: z.string({ required_error: "Password is required" }).min(1),
      })
      .strict(),
  },
};

module.exports = authSchema;
