// Развёрнутый текст категории под списком изделий. Формат из админки:
// абзацы разделены пустой строкой, строка вида «## Заголовок» — подзаголовок.
export const CategoryText = ({ text }: { text: string }) => {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return null;

  return (
    <section className="mt-16 max-w-3xl border-t border-border pt-10">
      {blocks.map((block, index) =>
        block.startsWith("## ") ? (
          <h2
            key={index}
            className="mt-8 font-montserrat text-xl font-semibold text-text first:mt-0 md:text-2xl"
          >
            {block.slice(3).trim()}
          </h2>
        ) : (
          <p
            key={index}
            className="mt-4 whitespace-pre-line text-sm leading-relaxed text-text/70 first:mt-0 md:text-base"
          >
            {block}
          </p>
        ),
      )}
    </section>
  );
};
