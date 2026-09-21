// Группировка записей ленты в «заметки». Без зависимостей: работает и в браузере,
// и на сервере.
//
// Записи одного сеанса добавления имеют общий batchId и показываются как одна
// заметка (текст + фото + голосовые). Старые записи без batchId — каждая сама
// по себе.

export interface GroupableNote {
  id: string;
  batchId: string | null;
}

export interface NoteGroup<T extends GroupableNote> {
  // B<batchId> или N<id записи> — компактный ключ для кнопок бота
  key: string;
  notes: T[];
}

export const noteGroupKey = (note: GroupableNote) =>
  note.batchId ? `B${note.batchId}` : `N${note.id}`;

// notes должны быть отсортированы по времени (старые первыми).
// Порядок групп — по первой записи группы.
export function groupNotes<T extends GroupableNote>(notes: T[]): NoteGroup<T>[] {
  const groups: NoteGroup<T>[] = [];
  const byKey = new Map<string, NoteGroup<T>>();

  for (const note of notes) {
    const key = noteGroupKey(note);
    let group = byKey.get(key);
    if (!group) {
      group = { key, notes: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.notes.push(note);
  }
  return groups;
}
