const chapters = window.KNOWLEDGE_DATA;
const stateKey = "mankiw-macro-quiz-state-v1";
const list = document.querySelector("#chapterList");
const detail = document.querySelector("#knowledgeDetail");
const search = document.querySelector("#knowledgeSearch");
let currentId = chapters[0].id;

function esc(value) { return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[ch]); }
function state() { try { return JSON.parse(localStorage.getItem(stateKey)) || {}; } catch { return {}; } }

function renderList() {
  const query = search.value.trim().toLowerCase();
  const shown = chapters.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  list.innerHTML = shown.map((item, index) => `<button type="button" class="chapter-button ${item.id === currentId ? "active" : ""}" data-id="${item.id}"><span>${String(index + 1).padStart(2, "0")}</span>${esc(item.chapter)}</button>`).join("") || '<p class="empty-state">没有找到对应知识点。</p>';
  list.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => { currentId = button.dataset.id; renderList(); renderDetail(); window.scrollTo({ top: 0, behavior: "smooth" }); }));
}

function renderDetail() {
  const item = chapters.find((chapter) => chapter.id === currentId) || chapters[0];
  detail.innerHTML = `
    <div class="chapter-heading"><p class="eyebrow">${esc(item.chapter)}</p><h2>${esc(item.chapter)}</h2></div>
    <section class="plain-band"><h3>太奶版：这章到底在说什么</h3><p>${esc(item.plain)}</p></section>
    <section class="knowledge-section"><h3>核心知识点</h3><ol>${item.core.map((point) => `<li>${esc(point)}</li>`).join("")}</ol></section>
    <section class="knowledge-section"><h3>公式拆开讲</h3><div class="formula-list">${item.formulas.map(([name, formula, meaning]) => `<div class="formula-row"><div><span>${esc(name)}</span><strong>${esc(formula)}</strong></div><p>${esc(meaning)}</p></div>`).join("")}</div></section>
    <section class="knowledge-section"><h3>模型图与经济学解释</h3><div class="chart-grid">${item.images.map(([src, caption]) => `<figure><img src="${src}" alt="${esc(caption)}" /><figcaption>${esc(caption)}</figcaption></figure>`).join("")}</div></section>
    <section class="knowledge-section"><h3>因果链：考试怎么推</h3><ol>${item.mechanism.map((point) => `<li>${esc(point)}</li>`).join("")}</ol></section>
    <section class="trap-band"><h3>最容易丢分的地方</h3><ul>${item.traps.map((point) => `<li>${esc(point)}</li>`).join("")}</ul></section>`;
}

document.querySelector("#navWrongCount").textContent = (state().wrong || []).length;
search.addEventListener("input", renderList);
renderList();
renderDetail();
