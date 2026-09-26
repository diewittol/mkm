// Структурированные данные для поисковиков (schema.org, JSON-LD)
export const JsonLd = ({ data }: { data: unknown }) => (
  <script
    type="application/ld+json"
    // «<» экранируем, чтобы текст из базы не мог закрыть тег script
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
  />
);
