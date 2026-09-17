"use client";

import { useState } from "react";
import { ContactModal } from "@/components/ui/ContactModal";

interface ProductActionsProps {
  productName: string;
}

export const ProductActions = ({ productName }: ProductActionsProps) => {
  const [modalType, setModalType] = useState<"price" | "question" | null>(null);

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setModalType("price")}
          className="rounded-lg bg-primary px-7 py-3.5 font-medium text-white transition hover:bg-primary-dark"
        >
          Узнать стоимость
        </button>
        <button
          type="button"
          onClick={() => setModalType("question")}
          className="rounded-lg border border-border px-7 py-3.5 font-medium text-text transition hover:border-primary hover:text-primary"
        >
          Задать вопрос
        </button>
      </div>

      <ContactModal
        isOpen={modalType === "price"}
        onClose={() => setModalType(null)}
        title="Узнать стоимость"
        productName={productName}
      />

      <ContactModal
        isOpen={modalType === "question"}
        onClose={() => setModalType(null)}
        title="Задать вопрос"
        productName={productName}
      />
    </>
  );
};