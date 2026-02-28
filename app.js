const STORAGE_KEY = "elan-francais-v1";

const COURSE_TEMPLATE = [
  { level: "A1", title: "Foundations", units: 16 },
  { level: "A2", title: "Everyday Communication", units: 16 },
  { level: "B1", title: "Independent User", units: 16 },
  { level: "B2", title: "Upper-Intermediate", units: 16 },
  { level: "C1", title: "Advanced Proficiency", units: 16 },
  { level: "C2", title: "Near-Native Mastery", units: 16 },
];

const UNIT_THEMES = [
  "Greetings & Identity",
  "Food & Drinks",
  "Daily Routine",
  "Travel & Directions",
  "Work & Study",
  "Culture & Society",
  "Listening Focus",
  "Speaking Focus",
  "Writing Focus",
  "Grammar Mastery",
];

const LEAGUES = ["Seed", "Bronze", "Silver", "Gold", "Sapphire", "Ruby", "Emerald", "Obsidian", "Diamond"];

function buildCourse() {
  return COURSE_TEMPLATE.map((section, sIndex) => ({
    ...section,
    units: Array.from({ length: section.units }, (_, uIndex) => ({
      id: `${section.level}-U${uIndex + 1}`,
      title: `${section.level} Unit ${uIndex + 1}: ${UNIT_THEMES[uIndex % UNIT_THEMES.length]}`,
      lessons: Array.from({ length: 10 + (uIndex % 5) }, (_, lIndex) => ({
        id: `${section.level}-U${uIndex + 1}-L${lIndex + 1}`,
        name: `Lesson ${lIndex + 1}`,
        difficulty: lIndex < 4 ? "easy" : lIndex < 9 ? "medium" : "hard",
      })),
      unlocked: sIndex === 0 && uIndex < 2,
      completed: 0,
    })),
  }));
}

function initialState() {
  return {
    course: buildCourse(),
    frenchScore: 0,
    streak: 0,
    longestStreak: 0,
    freezes: 2,
    lastGoalDate: null,
    dailyGoal: 40,
    todayFS: 0,
    leagueTier: 0,
    weeklyFS: 0,
    badges: [],
    completedLessons: {},
    mastery: {
      grammar: 0,
      vocabulary: 0,
      listening: 0,
      speaking: 0,
      reading: 0,
      writing: 0,
    },
    reviewQueue: [],
  };
}

let state = loadState();

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState();
  try {
    return { ...initialState(), ...JSON.parse(raw) };
  } catch {
    return initialState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nextLessonTarget() {
  for (const section of state.course) {
    for (const unit of section.units) {
      if (!unit.unlocked) continue;
      const lesson = unit.lessons.find((l) => !state.completedLessons[l.id]);
      if (lesson) return { section, unit, lesson };
    }
  }
  return null;
}

function fsForLesson(difficulty, perfect) {
  const base = 10 + (difficulty === "hard" ? 5 : 0);
  const perfectBonus = perfect ? 5 : 0;
  const streakMultiplier = state.streak >= 30 ? 1.4 : state.streak >= 7 ? 1.2 : state.streak >= 3 ? 1.1 : 1;
  return Math.floor((base + perfectBonus) * streakMultiplier);
}

function awardFS(amount) {
  state.frenchScore += amount;
  state.weeklyFS += amount;
  state.todayFS += amount;

  const tier = Math.min(LEAGUES.length - 1, Math.floor(state.weeklyFS / 500));
  state.leagueTier = tier;

  if (state.todayFS >= state.dailyGoal) {
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastGoalDate !== today) {
      state.streak += 1;
      state.longestStreak = Math.max(state.longestStreak, state.streak);
      state.lastGoalDate = today;
      if (state.streak === 7 && !state.badges.includes("7-Day Streak")) {
        state.badges.push("7-Day Streak");
        state.freezes += 1;
      }
      if (state.streak === 30 && !state.badges.includes("30-Day Streak")) {
        state.badges.push("30-Day Streak");
      }
    }
  }
}

function pushReview(lessonId) {
  state.reviewQueue.unshift({ lessonId, due: Date.now() + 86400000 });
  state.reviewQueue = state.reviewQueue.slice(0, 30);
}

function masteryUp(skill) {
  state.mastery[skill] = Math.min(5, +(state.mastery[skill] + 0.2).toFixed(1));
}

function renderHeader() {
  document.getElementById("fsValue").textContent = state.frenchScore;
  document.getElementById("streakValue").textContent = state.streak;
  document.getElementById("freezeValue").textContent = `Freezes: ${state.freezes}`;
  document.getElementById("goalProgress").textContent = state.todayFS;
  document.getElementById("goalTarget").textContent = state.dailyGoal;
  document.getElementById("goalStatus").textContent = state.todayFS >= state.dailyGoal ? "Goal complete ✅" : "In progress";
  document.getElementById("leagueTier").textContent = LEAGUES[state.leagueTier];
  document.getElementById("leagueRank").textContent = `Rank #${Math.max(1, 30 - Math.floor(state.weeklyFS / 100))}`;

  const target = nextLessonTarget();
  document.getElementById("heroTitle").textContent = target
    ? `${target.section.level} • ${target.unit.title}`
    : "Course complete! Start review mode.";
  document.getElementById("heroMeta").textContent = target
    ? `Next: ${target.lesson.name} (${target.lesson.difficulty})`
    : "You have completed all generated lessons.";
}

function renderLearn() {
  const root = document.getElementById("learn");
  root.innerHTML = state.course
    .map((section) => {
      const totalLessons = section.units.reduce((acc, unit) => acc + unit.lessons.length, 0);
      const done = section.units.reduce((acc, unit) => {
        return acc + unit.lessons.filter((l) => state.completedLessons[l.id]).length;
      }, 0);
      const percent = Math.round((done / totalLessons) * 100);
      return `
        <article class="card section-card">
          <div class="section-head">
            <h3>${section.level}: ${section.title}</h3>
            <span class="badge">${done}/${totalLessons} lessons</span>
          </div>
          <div class="progress"><span style="width:${percent}%"></span></div>
          <div class="unit-list">
            ${section.units
              .slice(0, 4)
              .map((unit) => {
                const completed = unit.lessons.filter((l) => state.completedLessons[l.id]).length;
                return `<div class="unit">
                  <div>
                    <strong>${unit.title}</strong>
                    <div class="badge">${completed}/${unit.lessons.length} complete</div>
                  </div>
                  <span>${unit.unlocked ? "🔓" : "🔒"}</span>
                </div>`;
              })
              .join("")}
          </div>
        </article>`;
    })
    .join("");
}

function renderPractice() {
  const root = document.getElementById("practice");
  const due = state.reviewQueue.filter((q) => q.due <= Date.now()).slice(0, 8);
  root.innerHTML = `
    <article class="card">
      <h3>Adaptive Practice Hub</h3>
      <p>Weak skills are prioritized using spaced repetition and your recent mistake history.</p>
      <div class="list">
        ${Object.entries(state.mastery)
          .map(([skill, level]) => `<div class="unit"><span>${skill}</span><strong>Mastery ${level.toFixed(1)}/5</strong></div>`)
          .join("")}
      </div>
    </article>
    <article class="card" style="margin-top:10px">
      <h3>Review Queue (${due.length} due)</h3>
      ${
        due.length
          ? `<div class="list">${due
              .map((item) => `<div class="unit"><span>${item.lessonId}</span><button class="btn secondary" data-review="${item.lessonId}">Quick review +8 FS</button></div>`)
              .join("")}</div>`
          : "<p>No items due. Complete new lessons to generate review cards.</p>"
      }
    </article>
  `;

  root.querySelectorAll("[data-review]").forEach((btn) => {
    btn.addEventListener("click", () => {
      awardFS(8);
      const id = btn.getAttribute("data-review");
      state.reviewQueue = state.reviewQueue.filter((q) => q.lessonId !== id);
      saveState();
      rerender();
    });
  });
}

function sampleLeaderboard() {
  const rows = [];
  for (let i = 1; i <= 30; i += 1) {
    const isUser = i === Math.max(1, 30 - Math.floor(state.weeklyFS / 100));
    rows.push({
      rank: i,
      name: isUser ? "You" : `Learner_${String(i).padStart(2, "0")}`,
      fs: Math.max(10, 1900 - i * 53 + (isUser ? state.weeklyFS : 0)),
      user: isUser,
    });
  }
  return rows.sort((a, b) => b.fs - a.fs).slice(0, 12);
}

function renderLeagues() {
  const root = document.getElementById("leagues");
  const table = sampleLeaderboard();
  root.innerHTML = `
    <article class="card">
      <h3>Weekly League: ${LEAGUES[state.leagueTier]}</h3>
      <p>Top 7 promote, bottom 5 relegate. Week resets every Monday.</p>
      <div class="list">
        ${table
          .map(
            (row) => `<div class="unit leader-row ${row.user ? "highlight" : ""}">
            <strong>#${row.rank} ${row.name}</strong>
            <span>${row.fs} FS</span>
          </div>`
          )
          .join("")}
      </div>
    </article>
  `;
}

function renderProfile() {
  const root = document.getElementById("profile");
  const challenges = [
    `Complete 3 lessons today`,
    `Earn 50 FS from listening exercises`,
    `Finish 1 review pack + 1 new lesson`,
  ];
  root.innerHTML = `
    <article class="card">
      <h3>Brio the Fox 🦊</h3>
      <p>"Tiny steps, big French wins. Keep your streak alive today!"</p>
      <p class="badge">Tone: supportive, witty, no-shame coaching.</p>
    </article>
    <article class="card" style="margin-top:10px">
      <h3>Badges</h3>
      <div class="list">
        ${state.badges.length ? state.badges.map((b) => `<div class="unit"><strong>${b}</strong><span>earned</span></div>`).join("") : "<p>No badges yet.</p>"}
      </div>
    </article>
    <article class="card" style="margin-top:10px">
      <h3>Daily Challenges</h3>
      <div class="list">${challenges.map((c) => `<div class="unit">${c}<button class="btn secondary" data-challenge="1">+20 FS</button></div>`).join("")}</div>
    </article>
  `;

  root.querySelectorAll("[data-challenge]").forEach((btn) => {
    btn.addEventListener("click", () => {
      awardFS(20);
      btn.disabled = true;
      btn.textContent = "Claimed";
      saveState();
      rerender();
    });
  });
}

function openLesson() {
  const target = nextLessonTarget();
  if (!target) return;

  const modal = document.getElementById("lessonModal");
  modal.classList.remove("hidden");

  modal.innerHTML = `
    <div class="box">
      <h3>${target.unit.title} • ${target.lesson.name}</h3>
      <div class="q">
        <p><strong>MCQ:</strong> Choose the correct translation of "I am eating"</p>
        <label class="choice"><input name="q1" type="radio" value="0"> Je mangeons</label>
        <label class="choice"><input name="q1" type="radio" value="1"> Je mange</label>
        <label class="choice"><input name="q1" type="radio" value="0"> Il mange</label>
      </div>
      <div class="q">
        <p><strong>Typing:</strong> Translate: "We are at the station."</p>
        <input id="typingInput" placeholder="Nous sommes..." style="width:100%;padding:10px;border-radius:10px;border:1px solid #ccd7ff" />
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="cancelLesson" class="btn secondary">Cancel</button>
        <button id="submitLesson" class="btn primary">Submit Lesson</button>
      </div>
      <p id="lessonResult"></p>
    </div>
  `;

  modal.querySelector("#cancelLesson").addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  modal.querySelector("#submitLesson").addEventListener("click", () => {
    const mcq = modal.querySelector('input[name="q1"]:checked');
    const typing = modal.querySelector("#typingInput").value.toLowerCase().trim();
    const correctTyping = ["nous sommes a la gare", "nous sommes à la gare"];
    const correct = (mcq && mcq.value === "1" ? 1 : 0) + (correctTyping.includes(typing) ? 1 : 0);
    const perfect = correct === 2;
    const fs = fsForLesson(target.lesson.difficulty, perfect);

    state.completedLessons[target.lesson.id] = true;
    target.unit.completed += 1;

    if (target.unit.completed >= Math.ceil(target.unit.lessons.length * 0.75)) {
      const section = state.course.find((s) => s.level === target.section.level);
      const unitIndex = section.units.findIndex((u) => u.id === target.unit.id);
      if (section.units[unitIndex + 1]) section.units[unitIndex + 1].unlocked = true;
      awardFS(30);
    }

    awardFS(fs);
    if (!perfect) pushReview(target.lesson.id);
    masteryUp(["grammar", "vocabulary", "listening", "speaking", "reading", "writing"][Math.floor(Math.random() * 6)]);

    const result = modal.querySelector("#lessonResult");
    result.className = perfect ? "success" : "warn";
    result.textContent = perfect ? `Perfect! +${fs} FS` : `Good effort! +${fs} FS. Added to review queue.`;

    saveState();
    setTimeout(() => {
      modal.classList.add("hidden");
      rerender();
    }, 900);
  });
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });
}

function rerender() {
  renderHeader();
  renderLearn();
  renderPractice();
  renderLeagues();
  renderProfile();
}

document.getElementById("startNextLesson").addEventListener("click", openLesson);
setupTabs();
rerender();
