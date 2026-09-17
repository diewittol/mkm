"use client";

import { Modal } from "./Modal";
import { ContactForm } from "./ContactForm";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  productName?: string;
}

export const ContactModal = ({
  isOpen,
  onClose,
  title = "Узнать стоимость",
  productName,
}: ContactModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <ContactForm productName={productName} />
    </Modal>
  );
};