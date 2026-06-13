export interface MailContact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface MailContactCollection {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  contacts: MailContact[];
  createdAt: string;
  updatedAt: string;
}
