import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { getSettings } from "@/lib/settings";

export const metadata = {
  title: "Политика конфиденциальности — МКМ",
  description:
    "Политика обработки персональных данных пользователей сайта МКМ.",
};

export default async function PrivacyPage() {
  const settings = await getSettings();
  const companyName = settings?.companyName ?? "МКМ";
  const address = settings?.address ?? "—";
  const email = settings?.email ?? "—";
  const phone = settings?.phone ?? "—";

  return (
    <Container className="py-10 lg:py-14">
      {/* Хлебные крошки */}
      <nav className="flex items-center gap-1 text-sm text-text/60">
        <Link href="/" className="transition hover:text-primary">
          Главная
        </Link>
        <ChevronRight size={14} />
        <span className="text-text">Политика конфиденциальности</span>
      </nav>

      <div className="mt-6 max-w-3xl">
        <h1 className="font-montserrat text-3xl font-bold text-text md:text-4xl">
          Политика обработки персональных данных
        </h1>
        <p className="mt-3 text-sm text-text/60">
          Действует в отношении посетителей сайта {companyName}
        </p>
      </div>

      <div className="mt-10 max-w-3xl space-y-8 text-sm leading-relaxed text-text/80">
        <section>
          <h2 className="font-montserrat text-lg font-semibold text-text">
            1. Общие положения
          </h2>
          <p className="mt-3">
            Настоящая политика обработки персональных данных составлена в
            соответствии с требованиями Федерального закона от 27.07.2006
            №152-ФЗ «О персональных данных» и определяет порядок обработки
            персональных данных, которые {companyName} (далее — «Оператор»)
            может получить от пользователя сайта (далее — «Пользователь») в
            процессе использования сайта, в частности при заполнении формы
            обратной связи.
          </p>
          <p className="mt-3">
            Используя сайт и отправляя данные через форму обратной связи,
            Пользователь подтверждает своё согласие на обработку персональных
            данных на условиях, изложенных в настоящей политике.
          </p>
        </section>

        <section>
          <h2 className="font-montserrat text-lg font-semibold text-text">
            2. Какие данные собираются
          </h2>
          <p className="mt-3">
            При заполнении формы обратной связи Оператор получает следующие
            персональные данные Пользователя:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>имя;</li>
            <li>номер телефона;</li>
            <li>
              текст сообщения (если Пользователь указал его добровольно).
            </li>
          </ul>
          <p className="mt-3">
            Сайт не собирает данные о банковских картах, паспортные данные и
            иные специальные категории персональных данных.
          </p>
        </section>

        <section>
          <h2 className="font-montserrat text-lg font-semibold text-text">
            3. Цели обработки персональных данных
          </h2>
          <p className="mt-3">
            Персональные данные обрабатываются исключительно для того, чтобы
            связаться с Пользователем по указанным им контактам, обработать
            заявку, проконсультировать по интересующему изделию или услуге и
            подготовить коммерческое предложение.
          </p>
        </section>

        <section>
          <h2 className="font-montserrat text-lg font-semibold text-text">
            4. Правовые основания обработки
          </h2>
          <p className="mt-3">
            Правовым основанием обработки персональных данных является
            согласие Пользователя, выраженное путём заполнения и отправки
            формы обратной связи на сайте (ст. 6 152-ФЗ).
          </p>
        </section>

        <section>
          <h2 className="font-montserrat text-lg font-semibold text-text">
            5. Хранение и передача данных третьим лицам
          </h2>
          <p className="mt-3">
            Персональные данные хранятся на защищённых серверах Оператора и
            не передаются третьим лицам, за исключением случаев, прямо
            предусмотренных законодательством Российской Федерации.
            Обработка данных прекращается по достижении цели обработки или
            при отзыве согласия Пользователем.
          </p>
        </section>

        <section>
          <h2 className="font-montserrat text-lg font-semibold text-text">
            6. Права Пользователя
          </h2>
          <p className="mt-3">Пользователь вправе в любой момент:</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>отозвать согласие на обработку персональных данных;</li>
            <li>запросить информацию о обрабатываемых данных;</li>
            <li>потребовать исправления или удаления своих данных.</li>
          </ul>
          <p className="mt-3">
            Для этого достаточно направить соответствующий запрос по
            контактам, указанным в разделе «Реквизиты Оператора» ниже.
          </p>
        </section>

        <section>
          <h2 className="font-montserrat text-lg font-semibold text-text">
            7. Меры защиты данных
          </h2>
          <p className="mt-3">
            Оператор принимает необходимые организационные и технические меры
            для защиты персональных данных от неправомерного или случайного
            доступа, уничтожения, изменения, блокирования, копирования,
            распространения и иных неправомерных действий третьих лиц.
          </p>
        </section>

        <section>
          <h2 className="font-montserrat text-lg font-semibold text-text">
            8. Изменение политики
          </h2>
          <p className="mt-3">
            Оператор вправе вносить изменения в настоящую политику. Новая
            редакция вступает в силу с момента её размещения на сайте, если
            иное не предусмотрено новой редакцией.
          </p>
        </section>

        <section>
          <h2 className="font-montserrat text-lg font-semibold text-text">
            9. Реквизиты Оператора
          </h2>
          <dl className="mt-3 space-y-1.5">
            <div className="flex gap-2">
              <dt className="text-text/50">Наименование:</dt>
              <dd>{companyName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text/50">Адрес:</dt>
              <dd>{address}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text/50">Телефон:</dt>
              <dd>{phone}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text/50">Email:</dt>
              <dd>{email}</dd>
            </div>
          </dl>
        </section>
      </div>
    </Container>
  );
}
