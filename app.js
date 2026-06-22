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
  const optionAnalysis = Object.entries(item.options).map(([letter, text]) => {
    const isCorrect = letter === item.correctAnswer;
    const reason = isCorrect ? item.explanation : (item.wrongReasons[letter] || "不符合题目的模型条件或因果方向。 ");
    return `<div class="option-line ${isCorrect ? "correct-line" : ""}"><strong>${letter}、${escapeHtml(text)}</strong><span>${isCorrect ? "为什么对：" : "为什么错："}${escapeHtml(reason)}</span></div>`;
  }).join("");
  els.feedback.className = correct ? "feedback" : "feedback error";
  els.feedback.innerHTML = `
    <h3>${correct ? "答对了，把“为什么”也吃透" : "先别慌，这题错在这里"}</h3>
    <section class="easy-box"><h4>太奶版：先听懂</h4><div>${escapeHtml(item.easyExplanation || item.explanation)}</div></section>
    <section class="memory-box"><h4>考试就记</h4><div>${escapeHtml(item.memoryTip || item.knowledge)}</div></section>
    ${correct ? "" : `<section class="feedback-block"><h4>你选的 ${choice} 为什么错</h4><div><strong>${choice}、${escapeHtml(selectedText)}</strong></div><div>${escapeHtml(item.wrongReasons[choice] || "它不符合题目的模型条件或因果方向。")}</div></section>`}
    <section class="feedback-block"><h4>正确答案</h4><div><strong>${item.correctAnswer}、${escapeHtml(correctText)}</strong></div><div>${escapeHtml(item.explanation)}</div></section>
    <section class="feedback-block"><h4>一步一步推导</h4><div class="preserve">${escapeHtml(item.deepAnalysis || item.explanation)}</div></section>
    <section class="feedback-block"><h4>其他选项也错在哪里</h4><div class="option-analysis">${optionAnalysis}</div></section>
    <section class="feedback-block"><h4>原书知识补充</h4><div class="preserve">${escapeHtml(item.chapterNote || item.knowledge)}</div><div class="knowledge-tag"><strong>本题知识点：</strong>${escapeHtml(item.knowledge)}</div></section>`;
  els.feedback.hidden = false;
}

function showWrittenAnswer() {
  const item = current();
  if (!item || item.type === "单选题") return;
  state.drafts[item.id] = els.writtenAnswer.value;
  state.answered[item.id] = { reviewed: true, correct: state.mastered.includes(item.id) };
  saveState();
  els.feedback.className = "feedback";
  const source = item.sourceUrl ? `<div class="source-link"><strong>官方资料：</strong><a href="${item.sourceUrl}" target="_blank" rel="noreferrer">中国政府网正式纲要</a></div>` : "";
  els.feedback.innerHTML = `
    <h3>对答案时，先看思路，再看全文</h3>
    <section class="easy-box"><h4>太奶版作答法</h4><div>${escapeHtml(item.easyExplanation)}</div></section>
    <section class="memory-box"><h4>考试就记</h4><div>${escapeHtml(item.memoryTip)}</div></section>
    <section class="feedback-block"><h4>完整参考答案</h4><div class="preserve">${escapeHtml(item.answer)}</div></section>
    <section class="feedback-block"><h4>原书知识补充</h4><div class="preserve">${escapeHtml(item.chapterNote)}</div><div class="knowledge-tag"><strong>对应知识点：</strong>${escapeHtml(item.knowledge)}</div>${source}</section>`;
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
