const data = window.QUIZ_DATA;
const stateKey = "mankiw-macro-quiz-state-v1";

const els = Object.fromEntries([
  "answeredCount", "correctRate", "wrongCount", "starCount", "typeFilter", "chapterFilter", "modeFilter",
  "searchInput", "randomBtn", "positionChip", "typeChip", "chapterChip", "difficultyChip", "starBtn",
  "questionText", "options", "writtenArea", "writtenAnswer", "checkWrittenBtn", "feedback", "prevBtn",
  "retryBtn", "masterBtn", "nextBtn", "progressLabel", "progressBar", "progressTip", "typeSummary", "knowledgeText",
].map((id) => [id, document.querySelector(`#${id}`)]));

const fallback = { answered: {}, wrong: [], starred: [], mastered: [], drafts: {} };
let state = loadState();
let filtered = [];
let currentIndex = 0;

function loadState() {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(stateKey)) }; }
  catch { return structuredClone(fallback); }
}

function saveState() { localStorage.setItem(stateKey, JSON.stringify(state)); }
function unique(values) { return [...new Set(values)]; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[ch]); }

function setupFilters() {
  const types = ["全部题型", ...Object.keys(data.summary)];
  els.typeFilter.innerHTML = types.map((x) => `<option value="${x === "全部题型" ? "all" : x}">${x}</option>`).join("");
  const chapters = ["全部章节", ...unique(data.items.map((x) => x.chapter))];
  els.chapterFilter.innerHTML = chapters.map((x) => `<option value="${x === "全部章节" ? "all" : escapeHtml(x)}">${escapeHtml(x)}</option>`).join("");
}

function applyFilters(keepId = current()?.id) {
  const type = els.typeFilter.value;
  const chapter = els.chapterFilter.value;
  const mode = els.modeFilter.value;
  const query = els.searchInput.value.trim().toLowerCase();
  filtered = data.items.filter((item) => {
    if (type !== "all" && item.type !== type) return false;
    if (chapter !== "all" && item.chapter !== chapter) return false;
    if (mode === "unanswered" && state.answered[item.id]) return false;
    if (mode === "wrong" && !state.wrong.includes(item.id)) return false;
    if (mode === "starred" && !state.starred.includes(item.id)) return false;
    if (mode === "difficult" && !["重点", "困难"].includes(item.difficulty)) return false;
    if (query && !`${item.question} ${item.knowledge} ${item.chapter}`.toLowerCase().includes(query)) return false;
    return true;
  });
  const found = filtered.findIndex((item) => item.id === keepId);
  currentIndex = found >= 0 ? found : 0;
  render();
}

function current() { return filtered[currentIndex] || null; }

function render() {
  const item = current();
  renderStats();
  if (!item) {
    els.questionText.textContent = "当前筛选没有题目";
    els.options.innerHTML = "";
    els.writtenArea.hidden = true;
    els.feedback.hidden = true;
    return;
  }

  els.positionChip.textContent = `${currentIndex + 1} / ${filtered.length}`;
  els.typeChip.textContent = item.type;
  els.chapterChip.textContent = item.chapter;
  els.difficultyChip.textContent = item.difficulty;
  els.difficultyChip.className = item.difficulty === "常规" ? "" : "focus";
  els.starBtn.textContent = state.starred.includes(item.id) ? "★" : "☆";
  els.starBtn.classList.toggle("active", state.starred.includes(item.id));
  els.questionText.textContent = item.question;
  els.knowledgeText.textContent = item.knowledge;
  els.feedback.hidden = true;
  els.feedback.className = "feedback";
  els.retryBtn.hidden = true;
  els.masterBtn.hidden = true;

  if (item.type === "单选题") {
    els.writtenArea.hidden = true;
    renderOptions(item);
  } else {
    els.options.innerHTML = "";
    els.writtenArea.hidden = false;
    els.writtenAnswer.value = state.drafts[item.id] || "";
  }
}

function renderOptions(item) {
  const previous = state.answered[item.id];
  els.options.innerHTML = Object.entries(item.options).map(([letter, text]) => {
    let cls = "option";
    if (previous) {
      if (letter === item.correctAnswer) cls += " correct";
      else if (letter === previous.choice) cls += " wrong";
    }
    return `<button class="${cls}" type="button" data-choice="${letter}" ${previous ? "disabled" : ""}><span class="option-letter">${letter}</span><span>${escapeHtml(text)}</span></button>`;
  }).join("");
  els.options.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => answerChoice(button.dataset.choice)));
  if (previous) showChoiceFeedback(item, previous.choice);
}

function answerChoice(choice) {
  const item = current();
  if (!item || state.answered[item.id]) return;
  const correct = choice === item.correctAnswer;
  state.answered[item.id] = { choice, correct };
  if (correct) state.wrong = state.wrong.filter((id) => id !== item.id);
  else state.wrong = unique([item.id, ...state.wrong]);
  saveState();
  renderOptions(item);
  renderStats();
}

function showChoiceFeedback(item, choice) {
  const correct = choice === item.correctAnswer;
  const selectedText = item.options[choice] || "";
  const correctText = item.options[item.correctAnswer] || "";
  els.feedback.className = correct ? "feedback" : "feedback error";
  els.feedback.innerHTML = correct
    ? `<h3>回答正确</h3><div>${escapeHtml(item.explanation)}</div><div class="answer-key"><strong>原书知识点：</strong>${escapeHtml(item.knowledge)}</div>`
    : `<h3>回答错误：${choice}、${escapeHtml(selectedText)}</h3><div><strong>错误点：</strong>${escapeHtml(item.wrongReasons[choice] || "该选项不符合模型条件或因果方向。")}</div><div class="answer-key"><strong>正确答案：</strong>${item.correctAnswer}、${escapeHtml(correctText)}<br><strong>为什么正确：</strong>${escapeHtml(item.explanation)}<br><strong>原书知识点：</strong>${escapeHtml(item.knowledge)}</div>`;
  els.feedback.hidden = false;
}

function showWrittenAnswer() {
  const item = current();
  if (!item || item.type === "单选题") return;
  state.drafts[item.id] = els.writtenAnswer.value;
  state.answered[item.id] = { reviewed: true, correct: state.mastered.includes(item.id) };
  saveState();
  const source = item.sourceUrl ? `\n\n官方资料：${item.sourceUrl}` : "";
  els.feedback.textContent = `参考答案\n\n${item.answer}${source}\n\n对应知识点：${item.knowledge}`;
  if (item.sourceUrl) {
    const url = item.sourceUrl;
    els.feedback.innerHTML = `${escapeHtml(`参考答案\n\n${item.answer}\n\n对应知识点：${item.knowledge}\n\n官方资料：`)}<a href="${url}" target="_blank" rel="noreferrer">中国政府网正式纲要</a>`;
  }
  els.feedback.hidden = false;
  els.retryBtn.hidden = false;
  els.masterBtn.hidden = false;
  renderStats();
}

function markWritten(mastered) {
  const item = current();
  if (!item) return;
  if (mastered) {
    state.mastered = unique([...state.mastered, item.id]);
    state.wrong = state.wrong.filter((id) => id !== item.id);
  } else {
    state.mastered = state.mastered.filter((id) => id !== item.id);
    state.wrong = unique([item.id, ...state.wrong]);
  }
  state.answered[item.id] = { reviewed: true, correct: mastered };
  saveState();
  renderStats();
  next(1);
}

function renderStats() {
  const answeredIds = Object.keys(state.answered);
  const correct = answeredIds.filter((id) => state.answered[id]?.correct).length;
  els.answeredCount.textContent = answeredIds.length;
  els.correctRate.textContent = answeredIds.length ? `${Math.round(correct / answeredIds.length * 100)}%` : "0%";
  els.wrongCount.textContent = state.wrong.length;
  els.starCount.textContent = state.starred.length;
  els.progressLabel.textContent = `${answeredIds.length} / ${data.count}`;
  els.progressBar.style.width = `${Math.round(answeredIds.length / data.count * 100)}%`;
  els.progressTip.textContent = state.wrong.length ? `当前有 ${state.wrong.length} 道需要复盘。先理解错误原因，再重做。` : "从选择题开始热身，再完成简答和计算推导。";
  els.typeSummary.innerHTML = Object.entries(data.summary).map(([type, count]) => {
    const done = data.items.filter((item) => item.type === type && state.answered[item.id]).length;
    return `<div class="summary-row"><strong>${type}</strong><span>${done} / ${count}</span><b>${Math.round(done / count * 100)}%</b></div>`;
  }).join("");
}

function next(delta) {
  if (!filtered.length) return;
  currentIndex = (currentIndex + delta + filtered.length) % filtered.length;
  render();
}

els.typeFilter.addEventListener("change", () => applyFilters());
els.chapterFilter.addEventListener("change", () => applyFilters());
els.modeFilter.addEventListener("change", () => applyFilters());
els.searchInput.addEventListener("input", () => applyFilters());
els.prevBtn.addEventListener("click", () => next(-1));
els.nextBtn.addEventListener("click", () => next(1));
els.randomBtn.addEventListener("click", () => { if (filtered.length) { currentIndex = Math.floor(Math.random() * filtered.length); render(); } });
els.starBtn.addEventListener("click", () => {
  const item = current(); if (!item) return;
  state.starred = state.starred.includes(item.id) ? state.starred.filter((id) => id !== item.id) : unique([...state.starred, item.id]);
  saveState(); render();
});
els.writtenAnswer.addEventListener("input", () => { const item = current(); if (item) { state.drafts[item.id] = els.writtenAnswer.value; saveState(); } });
els.checkWrittenBtn.addEventListener("click", showWrittenAnswer);
els.retryBtn.addEventListener("click", () => markWritten(false));
els.masterBtn.addEventListener("click", () => markWritten(true));

setupFilters();
applyFilters(null);
