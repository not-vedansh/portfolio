document.documentElement.classList.add("js");

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const bootText = document.querySelector("#boot-type");
const bootLines = [...document.querySelectorAll(".boot-line")];
const bootCommand = "load portfolio";

function boot(timestamp, started = timestamp) {
  const elapsed = reducedMotion.matches ? 4000 : timestamp - started;
  bootText.textContent = bootCommand.slice(0, Math.floor(elapsed / 68));
  bootLines.forEach((line, index) => line.classList.toggle("on", elapsed > 1100 + index * 610));
  if (elapsed <= 2400) requestAnimationFrame((next) => boot(next, started));
}
requestAnimationFrame(boot);

const roleText = document.querySelector("#role-text");
const crtStatus = document.querySelector("#crt-status");
const motionToggle = document.querySelector(".motion-toggle");
const hero = document.querySelector(".hero");
const roleFrames = [
  ["Game developer", "[ READY ] Portfolio loaded"],
  ["3D, VFX & shader artist", "[ ART ] Materials / lighting / VFX"],
  ["Python, C# & HTML programmer", "[ CODE ] Python / C# / HTML"],
  ["Junior ethical hacker", "[ SEC ] Learning defensive security"],
  ["Entrepreneur", "[ DEV ] The Last Peg / five seats"],
  ["Founder of NoteX Studios", "[ SHIPPED ] Phantom Echoes / Steam"]
];

let roleIndex = 0;
let characterCount = roleFrames[0][0].length;
let erasingRole = true;
let roleTimer;
let rolePaused = false;
let heroVisible = true;

function scheduleRole(delay) {
  clearTimeout(roleTimer);
  if (!rolePaused && heroVisible && !document.hidden && !reducedMotion.matches) {
    roleTimer = setTimeout(advanceRole, delay);
  }
}

function advanceRole() {
  if (document.querySelector("dialog[open]")) {
    scheduleRole(500);
    return;
  }
  const [label, status] = roleFrames[roleIndex];
  characterCount += erasingRole ? -1 : 1;
  roleText.textContent = label.slice(0, characterCount);
  if (erasingRole && characterCount === 0) {
    roleIndex = (roleIndex + 1) % roleFrames.length;
    erasingRole = false;
    scheduleRole(160);
  } else if (!erasingRole && characterCount === label.length) {
    crtStatus.textContent = status;
    crtStatus.animate?.([{ opacity: .25 }, { opacity: 1 }], { duration: 240 });
    erasingRole = true;
    scheduleRole(2800);
  } else {
    scheduleRole(erasingRole ? 33 : 61);
  }
}

motionToggle.addEventListener("click", () => {
  rolePaused = !rolePaused;
  if (rolePaused) {
    const [label, status] = roleFrames[roleIndex];
    roleText.textContent = label;
    crtStatus.textContent = status;
    characterCount = label.length;
    erasingRole = true;
  }
  document.documentElement.classList.toggle("text-paused", rolePaused);
  motionToggle.textContent = rolePaused ? "Resume text" : "Pause text";
  scheduleRole(1900);
});
document.addEventListener("visibilitychange", () => scheduleRole(1900));
if ("IntersectionObserver" in window) {
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    scheduleRole(1900);
  }, { threshold: .15 }).observe(hero);
}
function syncMotionPreference() {
  motionToggle.hidden = reducedMotion.matches;
  if (reducedMotion.matches) {
    const [label, status] = roleFrames[roleIndex];
    roleText.textContent = label;
    crtStatus.textContent = status;
    characterCount = label.length;
    erasingRole = true;
  }
  scheduleRole(1900);
}
reducedMotion.addEventListener("change", syncMotionPreference);
syncMotionPreference();

const cursor = document.querySelector(".cursor");
const cursorText = cursor.querySelector("i");
let cursorFrame = 0;
let pointerX = 0;
let pointerY = 0;

document.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse" || !finePointer.matches || reducedMotion.matches) return;
  document.body.classList.add("cursor-active");
  const target = event.target.closest("a,button");
  const mode = target?.dataset.cursor || (target ? "target" : "");
  cursor.dataset.mode = mode;
  cursorText.textContent = mode === "OPEN" ? "OPEN" : "";
  pointerX = event.clientX;
  pointerY = event.clientY;
  if (!cursorFrame) cursorFrame = requestAnimationFrame(() => {
    cursor.style.transform = `translate3d(${pointerX}px,${pointerY}px,0)`;
    cursorFrame = 0;
  });
});
document.documentElement.addEventListener("pointerleave", () => document.body.classList.remove("cursor-active"));
document.addEventListener("keydown", () => document.body.classList.remove("cursor-active"));

function tilt(area, surface, strength) {
  area.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || reducedMotion.matches) return;
    const bounds = area.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - .5;
    const vertical = (event.clientY - bounds.top) / bounds.height - .5;
    surface.style.setProperty("--rx", `${-vertical * strength}deg`);
    surface.style.setProperty("--ry", `${horizontal * strength}deg`);
  });
  area.addEventListener("pointerleave", () => {
    surface.style.removeProperty("--rx");
    surface.style.removeProperty("--ry");
  });
}
tilt(document.querySelector(".machine"), document.querySelector(".computer"), 17);
document.querySelectorAll(".project").forEach((card) => tilt(card, card, 7));

const terminal = document.querySelector("#terminal-dialog");
const output = document.querySelector("#terminal-output");
const input = document.querySelector("#terminal-input");
const form = document.querySelector("#terminal-form");
const elevator = document.querySelector("#elevator-game");

function printLine(message, className = "", link) {
  const line = document.createElement("p");
  line.textContent = message;
  if (className) line.className = className;
  if (link) {
    const anchor = document.createElement("a");
    anchor.href = link.href;
    anchor.textContent = link.label;
    if (link.href.startsWith("#")) anchor.addEventListener("click", () => terminal.close());
    line.append(" ", anchor);
  }
  output.append(line);
  output.scrollTop = output.scrollHeight;
}

const commands = new Map([
  ["help", () => printLine("help · projects · whoami · stack · contact · lab · clear · exit")],
  ["projects", () => printLine("Phantom Echoes Chapter I (Steam) · The Last Peg (in development).", "", { href: "#work", label: "View projects ↗" })],
  ["whoami", () => printLine("Vedansh Yadav · NoteX founder · entrepreneur · game developer · programmer · 3D, VFX and shader artist · junior ethical hacker.", "", { href: "#about", label: "About ↗" })],
  ["stack", () => printLine("Python · C# · HTML · Unity · Blender · Git · and more.", "", { href: "#stack", label: "Full toolkit ↗" })],
  ["contact", () => printLine("Collaboration inbox:", "", { href: "mailto:esco.bar.001@gmail.com", label: "esco.bar.001@gmail.com" })],
  ["lab", () => printLine("Graphics experiments:", "", { href: "lab.html", label: "Open Shader Lab ↗" })],
  ["unlock", () => { terminal.close(); window.openElevator(); }],
  ["clear", () => output.replaceChildren()],
  ["exit", () => terminal.close()]
]);

function runCommand(value) {
  const command = value.trim().toLowerCase();
  if (!command) return;
  printLine(`> ${value.trim()}`, "entered");
  const action = commands.get(command);
  if (action) action();
  else printLine("Unknown command. Try help.");
}

printLine("NOTEX_OS / Portfolio shell. Type help to get started.");
document.querySelectorAll("[data-terminal]").forEach((button) => {
  button.addEventListener("click", () => {
    terminal.showModal();
    input.focus();
  });
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  runCommand(input.value);
  input.value = "";
});
document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => {
    runCommand(button.dataset.command);
    input.focus();
  });
});

for (const dialog of [terminal, elevator]) {
  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
}

const navLinks = [...document.querySelectorAll('.nav nav a[href^="#"]')];
const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href")));
function updateNavigation() {
  const active = sections.findLastIndex((section) => section.getBoundingClientRect().top < innerHeight * .36);
  navLinks.forEach((link, index) => {
    if (index === active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
window.addEventListener("scroll", updateNavigation, { passive: true });
updateNavigation();


document.querySelector(".footer-easter").addEventListener("click", () => {
  terminal.showModal();
  printLine("[ HOTEL MERIDIAN ] Emergency access key: unlock");
  input.focus();
});
