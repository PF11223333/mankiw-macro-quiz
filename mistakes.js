const data = window.QUIZ_DATA;
const stateKey = "mankiw-macro-quiz-state-v1";
const fallback = { answered: {}, wrong: [], starred: [], mastered: [], drafts: {}, mistakes: {} };
let state = loadState();
const list = document.querySelector("#mistakeList");
const chapterFilter = document.querySelector("#mistakeChapter");
const search = document.querySelector("#mistakeSearch");

function esc(value) { return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[ch]); }
function loadState() { try { return { ...fallback, ...JSON.parse(localStorage.getItem(stateKey)) }; } catch { return structuredClone(fallback); } }
function saveState() { localStorage.setItem(stateKey, JSON.stringify(state)); }
function unique(values) { return [...new Set(values)]; }
function activeIds() { return unique([...(state.wrong || []), ...Object.keys(state.mistakes || {}).filter((id) => !state.mistakes[id].mastered)]); }

function setup() {
  const chapters = unique(data.items.filter((item) => activeIds().includes(item.id)).map((item) => item.chapter));
  chapterFilter.innerHTML = '<option value="all">全部章节</option>' + chapters.map((chapter) => `<option value="${esc(chapter)}">${esc(chapter)}</option>`).join("");
  render();
}

function render() {
  const ids = activeIds();
  const query = search.value.trim().toLowerCase();
  const items = data.items.filter((item) => ids.includes(item.id) && (chapterFilter.value === "all" || item.chapter === chapterFilter.value) && (!query || `${item.question} ${item.knowledge} ${state.mistakes[item.id]?.note || ""}`.toLowerCase().includes(query)));
  const attempts = Object.values(state.mistakes || {}).reduce((sum, item) => sum + (item.attempts || 1), 0);
  document.querySelector("#navWrongCount").textContent = ids.length;
  document.querySelector("#pendingCount").textContent = ids.length;
  document.querySelector("#attemptCount").textContent = attempts;
  if (!items.length) {
    list.innerHTML = `<div class="empty-notebook"><h2>${ids.length ? "当前筛选没有错题" : "错题本现在是空的"}</h2><p>${ids.length ? "换一个章节或关键词看看。" : "去答题训练做几道题；答错后会自动出现在这里。"}</p><a href="./index.html">进入答题训练</a></div>`;
    return;
  }
  list.innerHTML = items.map((item) => {
    const record = state.mistakes[item.id] || { attempts: 1, wrongChoices: [] };
    const wrongChoices = (record.wrongChoices || []).map((letter) => `${letter}、${item.options?.[letter] || ""}`).join("；") || "主观题标记再练";
    return `<article class="mistake-item" data-id="${item.id}">
      <header><div><span>${esc(item.type)} · ${esc(item.chapter)}</span><h2>${esc(item.question)}</h2></div><strong>错 ${record.attempts || 1} 次</strong></header>
      <div class="mistake-cause"><b>你曾经错在：</b>${esc(wrongChoices)}</div>
      ${item.type === "单选题" ? `<details><summary>展开正确答案与错因</summary><div class="mistake-answer"><p><b>正确答案：</b>${esc(item.correctAnswer)}、${esc(item.options[item.correctAnswer])}</p><p>${esc(item.explanation)}</p>${(record.wrongChoices || []).map((letter) => `<p><b>${esc(letter)} 为什么错：</b>${esc(item.wrongReasons[letter])}</p>`).join("")}<p class="preserve"><b>一步一步推导：</b>\n${esc(item.deepAnalysis)}</p></div></details>` : `<details><summary>展开完整参考答案</summary><div class="mistake-answer preserve">${esc(item.answer)}</div></details>`}
      <label>我的防错提醒<textarea data-note="${item.id}" placeholder="例如：看到“长期”先排除只改变水平的选项。">${esc(record.note || "")}</textarea></label>
      <footer><a href="./index.html?question=${item.id}">重新做这题</a><button type="button" data-master="${item.id}">✓ 已掌握，移出待复习</button></footer>
    </article>`;
  }).join("");
  list.querySelectorAll("textarea[data-note]").forEach((box) => box.addEventListener("input", () => {
    const id = box.dataset.note;
    state.mistakes[id] = { attempts: 1, wrongChoices: [], ...(state.mistakes[id] || {}), note: box.value };
    saveState();
  }));
  list.querySelectorAll("button[data-master]").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.master;
    state.wrong = (state.wrong || []).filter((itemId) => itemId !== id);
    state.mastered = unique([...(state.mastered || []), id]);
    state.mistakes[id] = { attempts: 1, wrongChoices: [], ...(state.mistakes[id] || {}), mastered: true };
    saveState();
    setup();
  }));
}

chapterFilter.addEventListener("change", render);
search.addEventListener("input", render);
setup();
