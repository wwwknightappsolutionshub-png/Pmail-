import { prisma } from "../lib/prisma.js";

export type FormFieldDefinition = {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select";
  placeholder?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  sortOrder: number;
  helpText?: string;
};

export type FormDefinitionPayload = {
  id: string;
  formKey: string;
  title: string;
  description: string | null;
  fields: FormFieldDefinition[];
  isActive: boolean;
  updatedAt: string;
};

const MEMBERSHIP_FIELDS: FormFieldDefinition[] = [
  { key: "fullName", label: "Full Name", type: "text", required: true, sortOrder: 10, placeholder: "Jane Doe" },
  { key: "workEmail", label: "Work Email", type: "email", required: true, sortOrder: 20, placeholder: "jane@company.com" },
  { key: "phone", label: "Phone Number", type: "tel", required: true, sortOrder: 30, placeholder: "+1 555 0100" },
  {
    key: "teamType",
    label: "For Team / Individual",
    type: "select",
    required: true,
    sortOrder: 40,
    options: [
      { value: "team", label: "Team" },
      { value: "individual", label: "Individual" },
    ],
  },
  {
    key: "deployIntent",
    label: "What are you looking to deploy",
    type: "textarea",
    required: true,
    sortOrder: 50,
    placeholder: "Hosting, mail, VPS, reseller program…",
  },
  {
    key: "hostingScale",
    label: "Hosting Scale",
    type: "select",
    required: true,
    sortOrder: 60,
    options: [
      { value: "Starter", label: "Starter" },
      { value: "Growing", label: "Growing" },
      { value: "Scaler", label: "Scaler" },
      { value: "Enterprise", label: "Enterprise" },
    ],
  },
  {
    key: "emailService",
    label: "Email Service",
    type: "select",
    required: true,
    sortOrder: 70,
    options: [{ value: "PMail+ / Bespoke", label: "PMail+ / Bespoke" }],
  },
];

const INQUIRY_FIELDS: FormFieldDefinition[] = [
  { key: "name", label: "Name", type: "text", required: true, sortOrder: 10 },
  { key: "email", label: "Email", type: "email", required: true, sortOrder: 20 },
  { key: "phone", label: "Phone", type: "tel", required: false, sortOrder: 30 },
  {
    key: "membershipInterest",
    label: "Membership",
    type: "select",
    required: true,
    sortOrder: 40,
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "inquiringAbout",
    label: "Inquiring About",
    type: "textarea",
    required: true,
    sortOrder: 50,
    placeholder: "How can we help?",
  },
];

function serialize(row: {
  id: string;
  formKey: string;
  title: string;
  description: string | null;
  fieldsJson: string;
  isActive: boolean;
  updatedAt: Date;
}): FormDefinitionPayload {
  let fields: FormFieldDefinition[] = [];
  try {
    fields = JSON.parse(row.fieldsJson) as FormFieldDefinition[];
  } catch {
    fields = [];
  }
  return {
    id: row.id,
    formKey: row.formKey,
    title: row.title,
    description: row.description,
    fields: fields.sort((a, b) => a.sortOrder - b.sortOrder),
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function seedPublicFormDefinitions(): Promise<void> {
  const defs = [
    {
      formKey: "membership",
      title: "Get Custom Price",
      description: "Register for a tailored Prohost Cloud deployment.",
      fields: MEMBERSHIP_FIELDS,
    },
    {
      formKey: "inquiry",
      title: "Contact Us",
      description: "General inquiries and support requests.",
      fields: INQUIRY_FIELDS,
    },
  ];

  for (const def of defs) {
    await prisma.publicFormDefinition.upsert({
      where: { formKey: def.formKey },
      create: {
        formKey: def.formKey,
        title: def.title,
        description: def.description,
        fieldsJson: JSON.stringify(def.fields),
        isActive: true,
      },
      update: {
        title: def.title,
        description: def.description,
      },
    });
  }
}

export async function listFormDefinitions() {
  const rows = await prisma.publicFormDefinition.findMany({ orderBy: { formKey: "asc" } });
  return rows.map(serialize);
}

export async function getActivePublicForms() {
  const rows = await prisma.publicFormDefinition.findMany({ where: { isActive: true } });
  return rows.map(serialize);
}

export async function getFormDefinition(formKey: string) {
  const row = await prisma.publicFormDefinition.findUnique({ where: { formKey } });
  return row ? serialize(row) : null;
}

export async function updateFormDefinition(
  id: string,
  input: Partial<{ title: string; description: string | null; fields: FormFieldDefinition[]; isActive: boolean }>,
) {
  const row = await prisma.publicFormDefinition.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.fields !== undefined ? { fieldsJson: JSON.stringify(input.fields) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  return serialize(row);
}

const PROTECTED_FORM_KEYS = new Set(["membership", "inquiry"]);

export async function createFormDefinition(input: {
  formKey: string;
  title: string;
  description?: string | null;
  fields?: FormFieldDefinition[];
  isActive?: boolean;
}) {
  const formKey = input.formKey.trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(formKey)) {
    throw new Error("Form key must use lowercase letters, numbers, hyphens, or underscores");
  }

  const existing = await prisma.publicFormDefinition.findUnique({ where: { formKey } });
  if (existing) throw new Error("A form with this key already exists");

  const row = await prisma.publicFormDefinition.create({
    data: {
      formKey,
      title: input.title.trim(),
      description: input.description ?? null,
      fieldsJson: JSON.stringify(input.fields ?? []),
      isActive: input.isActive ?? false,
    },
  });
  return serialize(row);
}

export async function deleteFormDefinition(id: string): Promise<void> {
  const row = await prisma.publicFormDefinition.findUnique({ where: { id } });
  if (!row) throw new Error("Form not found");
  if (PROTECTED_FORM_KEYS.has(row.formKey)) {
    throw new Error(`The "${row.formKey}" form is built-in and cannot be deleted`);
  }
  await prisma.publicFormDefinition.delete({ where: { id } });
}

export function validateFormPayload(
  fields: FormFieldDefinition[],
  payload: Record<string, unknown>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of fields.sort((a, b) => a.sortOrder - b.sortOrder)) {
    const raw = payload[field.key];
    const value = raw === undefined || raw === null ? "" : String(raw).trim();
    if (field.required && !value) {
      throw new Error(`${field.label} is required`);
    }
    if (field.type === "select" && value && field.options?.length) {
      const allowed = field.options.map((o) => o.value);
      if (!allowed.includes(value)) {
        throw new Error(`Invalid value for ${field.label}`);
      }
    }
    if (value) result[field.key] = value;
  }
  return result;
}
