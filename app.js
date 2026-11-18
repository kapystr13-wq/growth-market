const form = document.getElementById("orderForm");
const result = document.getElementById("formResult");
document.querySelectorAll("[data-service]").forEach((link) => {
  link.addEventListener("click", () => {
    const select = document.getElementById("service");
    select.value = link.dataset.service;
  });
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const channel = document.getElementById("channel").value.trim();
  const service = document.getElementById("service").value;
  const budget = document.getElementById("budget").value;
  const contact = document.getElementById("contact").value.trim();
  if (!channel || !service || !budget || !contact) return;
  const orderId = "GM-" + Math.floor(100000 + Math.random() * 900000);
  result.textContent = `Демо-заявка ${orderId} сформирована. Сейчас она существует только в вашем браузере: сервер, отправка заявок и оплата ещё не подключены.`;
  result.classList.add("show");
  form.querySelector("button").textContent = "Заявка сформирована ✓";
});
const menu = document.querySelector(".menu-toggle");
menu.addEventListener("click", () => {
  const nav = document.querySelector(".topbar nav");
  const shown = nav.style.display === "flex";
  nav.style.display = shown ? "none" : "flex";
  nav.style.position = "absolute";
  nav.style.top = "72px";
  nav.style.right = "0";
  nav.style.padding = "18px";
  nav.style.background = "#151d31";
  nav.style.border = "1px solid #ffffff22";
  nav.style.borderRadius = "12px";
  nav.style.flexDirection = "column";
});
