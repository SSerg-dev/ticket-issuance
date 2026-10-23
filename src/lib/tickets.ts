export type Participant = {
  id: string;
  name: string;
  age: string;
};

export const ADULT_PRICE = 2000;
export const CHILD_PRICE = 1000;

export function getTicketPrice(age: string) {
  if (age.trim() === "") return 0;
  const value = Number(age);
  return Number.isFinite(value) && value < 14 ? CHILD_PRICE : ADULT_PRICE;
}

export function getOrderTotal(participants: Participant[]) {
  return participants.reduce((total, item) => total + getTicketPrice(item.age), 0);
}

export function validateParticipants(participants: Participant[]) {
  const fieldErrors: Record<string, { name?: string; age?: string }> = {};

  participants.forEach((participant) => {
    const errors: { name?: string; age?: string } = {};
    const age = Number(participant.age);
    if (!participant.name.trim()) errors.name = "Укажите имя";
    if (!participant.age) errors.age = "Укажите возраст";
    else if (!Number.isInteger(age) || age < 0 || age > 120) errors.age = "Возраст от 0 до 120";
    if (errors.name || errors.age) fieldErrors[participant.id] = errors;
  });

  const hasChild = participants.some((participant) => Number(participant.age) < 14);
  const hasAdultCompanion = participants.some((participant) => Number(participant.age) >= 18);

  return {
    fieldErrors,
    guardianError: hasChild && !hasAdultCompanion
      ? "Добавьте в заказ участника от 18 лет — ребёнок не может посетить мероприятие один."
      : "",
  };
}
