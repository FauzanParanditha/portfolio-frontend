// Model pesan kontak (inbox admin) — cermin dari ContactMessageResponse backend.
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string; // backend list/detail saat ini tidak selalu mengirim field ini
}

// Status filter untuk toggle di UI daftar pesan.
export type ContactReadFilter = "all" | "unread" | "read";
