import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  createIcons,
  Mail,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Ticket,
  TriangleAlert,
  UserRound,
} from "lucide";
import "./index.css";
import {
  getOrderTotal,
  getTicketPrice,
  type Participant,
  validateParticipants,
} from "./lib/tickets";

type Step = "tickets" | "review" | "success" | "soldout";
type Errors = Record<string, { name?: string; age?: string }>;

type State = {
  step: Step;
  participants: Participant[];
  email: string;
  errors: Errors;
  guardianError: string;
  emailError: string;
  simulateSoldOut: boolean;
  processing: boolean;
  orderNumber: string;
};

const rootElement = document.querySelector<HTMLDivElement>("#root");
if (!rootElement) throw new Error("Root element was not found");
const root = rootElement;

const money = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

let nextId = 1;
const newParticipant = (): Participant => ({ id: String(nextId++), name: "", age: "" });
const initialState = (): State => ({
  step: "tickets",
  participants: [newParticipant()],
  email: "",
  errors: {},
  guardianError: "",
  emailError: "",
  simulateSoldOut: false,
  processing: false,
  orderNumber: `SW-${Math.floor(100000 + Math.random() * 900000)}`,
});

let state = initialState();

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char] ?? char);

const icon = (name: string, classes = "size-5") =>
  `<i data-lucide="${name}" class="${classes}" aria-hidden="true"></i>`;

const button = (
  label: string,
  action: string,
  options: { variant?: "primary" | "outline" | "ghost"; extra?: string; disabled?: boolean } = {},
) => {
  const variants = {
    primary: "bg-violet-600 text-white shadow-[0_10px_30px_rgba(109,65,237,.25)] hover:bg-violet-700",
    outline: "border border-slate-200 bg-white text-slate-800 hover:border-violet-300 hover:bg-violet-50/50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  };
  const variant = options.variant ?? "primary";
  return `<button type="button" data-action="${action}" ${options.disabled ? "disabled" : ""}
    class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 active:scale-[.98] ${variants[variant]} ${options.extra ?? ""}">
    ${label}
  </button>`;
};

function stepper() {
  const current = state.step === "tickets" ? 1 : state.step === "review" ? 2 : 3;
  return `<ol class="flex items-center gap-2" aria-label="Этапы оформления">
    ${["Билеты", "Проверка", "Готово"].map((label, index) => {
      const number = index + 1;
      const done = number < current;
      const active = number === current;
      return `<li class="flex items-center gap-2 text-xs font-semibold">
        ${index ? '<span class="h-px w-4 bg-slate-200 sm:w-10" aria-hidden="true"></span>' : ""}
        <span class="grid size-7 place-items-center rounded-full ${done || active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"}">
          ${done ? icon("check", "size-4") : number}
        </span>
        <span class="hidden ${active ? "text-slate-900 sm:inline" : "text-slate-400 md:inline"}">${label}</span>
      </li>`;
    }).join("")}
  </ol>`;
}

function eventDetails() {
  return `<aside class="overflow-hidden rounded-3xl bg-[#171228] text-white lg:sticky lg:top-6">
    <div class="relative min-h-56 overflow-hidden p-6 sm:p-8">
      <div class="absolute -right-12 -top-16 size-56 rounded-full bg-violet-500/70 blur-3xl"></div>
      <div class="absolute -bottom-24 -left-16 size-64 rounded-full bg-fuchsia-500/30 blur-3xl"></div>
      <div class="relative">
        <span class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
          ${icon("sparkles", "size-3.5 text-amber-300")} Городской фестиваль
        </span>
        <h1 class="mt-7 max-w-sm text-4xl font-black leading-[.98] tracking-[-0.055em] sm:text-5xl">Sfera<br>Weekend</h1>
        <p class="mt-4 max-w-sm text-sm leading-6 text-white/65">День музыки, искусства и хороших встреч на открытом воздухе.</p>
      </div>
    </div>
    <div class="grid gap-4 border-t border-white/10 p-6 text-sm sm:grid-cols-3 lg:grid-cols-1 lg:p-8">
      ${detail("calendar-days", "25 октября", "Воскресенье")}
      ${detail("clock-3", "12:00–22:00", "Вход весь день")}
      ${detail("map-pin", "Хлебозавод", "Новодмитровская, 1")}
    </div>
  </aside>`;
}

function detail(iconName: string, title: string, text: string) {
  return `<div class="flex items-start gap-3">${icon(iconName, "mt-0.5 size-5 shrink-0 text-violet-300")}
    <div><p class="font-semibold">${title}</p><p class="mt-1 text-white/50">${text}</p></div>
  </div>`;
}

function participantCard(participant: Participant, index: number) {
  const errors = state.errors[participant.id];
  const child = participant.age !== "" && Number(participant.age) < 14;
  const ticketLabel = participant.age === "" ? "Укажите возраст" : child ? "Детский билет" : "Полный билет";
  return `<fieldset class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5" data-participant="${participant.id}">
    <legend class="sr-only">Участник ${index + 1}</legend>
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="grid size-9 place-items-center rounded-full bg-white text-sm font-bold text-violet-700 shadow-sm ring-1 ring-slate-200">${index + 1}</span>
        <div><h3 class="font-bold text-slate-950">Участник ${index + 1}</h3><p class="text-xs text-slate-500">${ticketLabel}</p></div>
      </div>
      ${state.participants.length > 1 ? `<button type="button" data-action="remove" data-id="${participant.id}" class="inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100">${icon("minus", "size-4")}<span class="hidden sm:inline">Удалить</span></button>` : ""}
    </div>
    <div class="grid gap-4 sm:grid-cols-[1fr_130px]">
      ${field({ label: "Имя и фамилия", name: "name", id: participant.id, value: participant.name, placeholder: "Например, Анна Смирнова", error: errors?.name, autocomplete: "name" })}
      ${field({ label: "Возраст", name: "age", id: participant.id, value: participant.age, placeholder: "18", error: errors?.age, inputmode: "numeric" })}
    </div>
  </fieldset>`;
}

function field(options: { label: string; name: string; id: string; value: string; placeholder: string; error?: string; autocomplete?: string; inputmode?: string }) {
  const invalid = Boolean(options.error);
  return `<label class="grid gap-2 text-sm font-semibold text-slate-700">${options.label}
    <input data-field="${options.name}" data-id="${options.id}" value="${escapeHtml(options.value)}" placeholder="${options.placeholder}"
      ${options.autocomplete ? `autocomplete="${options.autocomplete}"` : ""} ${options.inputmode ? `inputmode="${options.inputmode}"` : ""}
      ${invalid ? 'aria-invalid="true"' : ""}
      class="h-12 w-full rounded-xl border ${invalid ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200 focus:border-violet-500 focus:ring-violet-100"} bg-white px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4">
    ${options.error ? `<span class="text-xs font-medium text-rose-600">${options.error}</span>` : ""}
  </label>`;
}

function orderSummary() {
  return `<div class="rounded-2xl bg-violet-50/70 p-5">
    <div class="flex items-center justify-between gap-4"><span class="text-sm font-semibold text-slate-600">Билетов</span><span class="font-bold">${state.participants.length}</span></div>
    <div class="mt-4 space-y-2 border-t border-violet-100 pt-4 text-sm text-slate-600">
      ${state.participants.map((item, index) => `<div class="flex items-center justify-between gap-4">
        <span class="truncate">${escapeHtml(item.name || `Участник ${index + 1}`)} · ${item.age ? `${item.age} лет` : "возраст не указан"}</span>
        <span class="shrink-0 font-semibold text-slate-800">${money.format(getTicketPrice(item.age))}</span>
      </div>`).join("")}
    </div>
    <div class="mt-4 flex items-end justify-between gap-4 border-t border-violet-100 pt-4"><span class="font-semibold text-slate-700">Итого</span><span class="text-2xl font-black tracking-[-0.04em] text-slate-950">${money.format(getOrderTotal(state.participants))}</span></div>
  </div>`;
}

function ticketsStep() {
  const hasIncompleteAge = state.participants.some((participant) => participant.age === "");
  return `<section>
    <div class="flex items-start justify-between gap-5">
      <div><p class="text-xs font-bold uppercase tracking-[.16em] text-violet-600">Шаг 1 из 2</p><h2 class="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950">Кто идёт?</h2><p class="mt-2 text-sm leading-6 text-slate-500">Добавьте от 1 до 4 участников. Тип билета определится по возрасту.</p></div>
      <div class="hidden rounded-2xl bg-slate-50 px-4 py-3 text-right sm:block"><p class="text-xs text-slate-500">от</p><p class="font-black">1 000 ₽</p></div>
    </div>
    <div class="mt-7 space-y-3">${state.participants.map(participantCard).join("")}</div>
    ${state.participants.length < 4 ? button(`${icon("plus", "size-4")} Добавить участника`, "add", { variant: "outline", extra: "mt-4 w-full border-dashed" }) : ""}
    ${state.guardianError ? `<div class="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-900" role="alert">${icon("triangle-alert", "mt-0.5 size-5 shrink-0")}<span>${state.guardianError}</span></div>` : ""}
    <div class="mt-7 border-t border-slate-200 pt-7">
      <label class="grid gap-2 text-sm font-semibold text-slate-700">Email для билетов
        <div class="relative">${icon("mail", "pointer-events-none absolute left-4 top-3.5 size-5 text-slate-400")}
          <input data-field="email" value="${escapeHtml(state.email)}" type="email" autocomplete="email" placeholder="you@example.com" ${state.emailError ? 'aria-invalid="true"' : ""}
            class="h-12 w-full rounded-xl border ${state.emailError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200 focus:border-violet-500 focus:ring-violet-100"} bg-white pl-12 pr-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4">
        </div>
        ${state.emailError ? `<span class="text-xs font-medium text-rose-600">${state.emailError}</span>` : ""}
        <span class="font-normal text-slate-400">Отправим подтверждение и все билеты одним письмом.</span>
      </label>
    </div>
    <div class="mt-7 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
      <div class="text-sm text-slate-500"><span class="font-semibold text-slate-900">${state.participants.length}</span> ${state.participants.length === 1 ? "билет" : "билета"} · ${hasIncompleteAge ? "стоимость после заполнения" : money.format(getOrderTotal(state.participants))}</div>
      ${button(`Проверить заказ ${icon("arrow-right", "size-4")}`, "review")}
    </div>
  </section>`;
}

function reviewStep() {
  return `<section>
    <p class="text-xs font-bold uppercase tracking-[.16em] text-violet-600">Шаг 2 из 2</p><h2 class="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950">Всё верно?</h2><p class="mt-2 text-sm leading-6 text-slate-500">Проверьте детали. Данные ещё можно изменить до подтверждения.</p>
    <div class="mt-7 overflow-hidden rounded-2xl border border-slate-200">
      ${state.participants.map((participant) => `<div class="flex items-center gap-4 border-b border-slate-100 p-4 last:border-b-0 sm:p-5">
        <span class="grid size-10 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-700">${icon("user-round")}</span>
        <div class="min-w-0 flex-1"><p class="truncate font-bold text-slate-950">${escapeHtml(participant.name)}</p><p class="mt-1 text-xs text-slate-500">${participant.age} лет · ${Number(participant.age) < 14 ? "детский" : "полный"} билет</p></div>
        <span class="shrink-0 text-sm font-bold">${money.format(getTicketPrice(participant.age))}</span>
      </div>`).join("")}
    </div>
    <div class="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 p-4"><span class="grid size-10 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-500">${icon("mail")}</span><div class="min-w-0"><p class="text-xs text-slate-500">Билеты придут на</p><p class="truncate text-sm font-bold">${escapeHtml(state.email)}</p></div></div>
    <div class="mt-5">${orderSummary()}</div>
    <label class="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <span><span class="block text-sm font-semibold text-slate-800">Имитировать отсутствие мест</span><span class="mt-1 block text-xs leading-5 text-slate-500">Демо обязательного sold-out сценария перед подтверждением.</span></span>
      <input data-field="soldout" type="checkbox" ${state.simulateSoldOut ? "checked" : ""} class="peer sr-only">
      <span class="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-violet-600 peer-focus-visible:ring-4 peer-focus-visible:ring-violet-200 after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-5" aria-hidden="true"></span>
    </label>
    <div class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
      ${button(`${icon("arrow-left", "size-4")} Изменить данные`, "edit", { variant: "ghost" })}
      ${button(state.processing ? "Проверяем места…" : `Подтвердить · ${money.format(getOrderTotal(state.participants))} ${icon("shield-check", "size-4")}`, "confirm", { disabled: state.processing })}
    </div>
  </section>`;
}

function resultStep(success: boolean) {
  if (success) {
    return `<section class="py-5 text-center sm:py-10"><span class="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">${icon("check-circle-2", "size-10")}</span>
      <p class="mt-8 text-xs font-bold uppercase tracking-[.16em] text-emerald-600">Заказ ${state.orderNumber}</p><h2 class="mt-2 text-4xl font-black tracking-[-0.055em] text-slate-950">Вы идёте!</h2>
      <p class="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500">${state.participants.length} ${state.participants.length === 1 ? "билет отправлен" : "билета отправлены"} на <strong class="text-slate-800">${escapeHtml(state.email)}</strong>. Покажите QR-коды на входе.</p>
      <div class="mx-auto mt-7 max-w-md text-left">${orderSummary()}</div>${button(`${icon("rotate-ccw", "size-4")} Оформить новый заказ`, "reset", { variant: "outline", extra: "mt-7" })}</section>`;
  }
  return `<section class="py-5 text-center sm:py-10"><span class="mx-auto grid size-20 place-items-center rounded-full bg-amber-100 text-amber-700 ring-8 ring-amber-50">${icon("triangle-alert", "size-10")}</span>
    <p class="mt-8 text-xs font-bold uppercase tracking-[.16em] text-amber-700">Места закончились</p><h2 class="mx-auto mt-2 max-w-md text-4xl font-black tracking-[-0.055em] text-slate-950">Не успели подтвердить заказ</h2>
    <p class="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500">Пока вы проверяли данные, последние билеты забронировали. Мы сохранили состав заказа — можно вернуться и попробовать снова.</p>
    <div class="mx-auto mt-7 max-w-md rounded-2xl bg-slate-50 p-5 text-left"><p class="text-xs font-bold uppercase tracking-wider text-slate-400">Сохранено</p><p class="mt-2 font-bold">${state.participants.length} ${state.participants.length === 1 ? "участник" : "участника"} · ${money.format(getOrderTotal(state.participants))}</p><p class="mt-1 truncate text-sm text-slate-500">${escapeHtml(state.email)}</p></div>
    ${button(`${icon("arrow-left", "size-4")} Вернуться к заказу`, "back", { extra: "mt-7" })}</section>`;
}

function render() {
  const content = state.step === "tickets" ? ticketsStep() : state.step === "review" ? reviewStep() : resultStep(state.step === "success");
  root.innerHTML = `<div class="min-h-screen">
    <header class="border-b border-slate-200/80 bg-white/75 backdrop-blur-xl"><div class="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <div class="flex items-center gap-2.5 font-black tracking-[-0.04em] text-slate-950"><span class="grid size-9 rotate-[-8deg] place-items-center rounded-[13px] bg-violet-600 text-white shadow-lg shadow-violet-200">${icon("ticket", "size-5 rotate-[8deg]")}</span><span class="text-xl">sfera</span></div>${stepper()}
    </div></header>
    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10"><div class="grid items-start gap-6 lg:grid-cols-[.82fr_1.18fr] lg:gap-8">${eventDetails()}<div class="animate-enter rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_70px_rgba(34,20,67,.08)] sm:p-8">${content}</div></div>
      <footer class="flex flex-col gap-3 py-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><p>© 2026 Sfera Weekend</p><div class="flex gap-5"><span>1–4 участника</span><span>Безопасное оформление</span></div></footer>
    </main></div>`;

  createIcons({ icons: { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, Mail, MapPin, Minus, Plus, RotateCcw, ShieldCheck, Sparkles, Ticket, TriangleAlert, UserRound } });
}

function validate() {
  const result = validateParticipants(state.participants);
  state.errors = result.fieldErrors;
  state.guardianError = result.guardianError;
  state.emailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim()) ? "" : "Укажите корректный email";
  return Object.keys(state.errors).length === 0 && !state.guardianError && !state.emailError;
}

root.addEventListener("input", (event) => {
  const input = event.target as HTMLInputElement;
  const fieldName = input.dataset.field;
  if (!fieldName) return;
  if (fieldName === "email") {
    state.email = input.value;
    state.emailError = "";
    return;
  }
  if (fieldName === "soldout") {
    state.simulateSoldOut = input.checked;
    return;
  }
  const participant = state.participants.find((item) => item.id === input.dataset.id);
  if (!participant) return;
  if (fieldName === "age") {
    input.value = input.value.replace(/\D/g, "").slice(0, 3);
    participant.age = input.value;
  } else {
    participant.name = input.value;
  }
  state.errors[participant.id] = {};
  state.guardianError = "";
});

root.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "add" && state.participants.length < 4) state.participants.push(newParticipant());
  if (action === "remove") state.participants = state.participants.filter((item) => item.id !== target.dataset.id);
  if (action === "review") {
    if (validate()) state.step = "review";
  }
  if (action === "edit") state.step = "tickets";
  if (action === "confirm" && !state.processing) {
    state.processing = true;
    render();
    window.setTimeout(() => {
      state.processing = false;
      state.step = state.simulateSoldOut ? "soldout" : "success";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 850);
    return;
  }
  if (action === "back") {
    state.simulateSoldOut = false;
    state.step = "review";
  }
  if (action === "reset") state = initialState();
  render();
  if (["review", "edit", "back", "reset"].includes(action ?? "")) window.scrollTo({ top: 0, behavior: "smooth" });
});

render();
