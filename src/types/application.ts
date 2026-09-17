export type ApplicationStatus = "new" | "in_progress" | "done" | "rejected";

export interface Application {
  id: string;
  name: string;
  phone: string;
  message?: string;
  productId?: string;
  productName?: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  done: "Обработана",
  rejected: "Отклонена",
};