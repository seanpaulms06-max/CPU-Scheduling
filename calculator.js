
"use strict";

// ============================================
// CPU SCHEDULING CALCULATOR
// FCFS, SJF, SRTF, Priority, and Round Robin
// ============================================


// 1. GET HTML ELEMENTS

const processBody = document.getElementById("process-body");
const addButton = document.getElementById("add-process");
const calculateButton = document.getElementById("calculate");
const resetButton = document.getElementById("reset");

const algorithmSelect = document.getElementById("algorithm");
const arrivalHead = document.getElementById("arrival-head");
const priorityHead = document.getElementById("priority-head");
const quantumArea = document.getElementById("quantum-area");
const quantumInput = document.getElementById("quantum");

const emptyState = document.getElementById("empty-state");
const ganttSection = document.getElementById("gantt-section");
const animationSection = document.getElementById("animation-section");
const detailsSection = document.getElementById("details-section");

const ganttChart = document.getElementById("gantt-chart");
const ganttTicks = document.getElementById("gantt-ticks");
const tubes = document.getElementById("tubes");
const detailsBody = document.getElementById("details-body");
const detailsArrivalHead =
    document.getElementById("details-arrival-head");
const averages = document.getElementById("averages");

const playButton = document.getElementById("play");
const pauseButton = document.getElementById("pause");
const restartButton = document.getElementById("restart");
const speedSelect = document.getElementById("speed");
const clock = document.getElementById("clock");


// 2. COLORS AND VARIABLES

const COLORS = [
    "#238dff",
    "#a052ff",
    "#00c9a7",
    "#ff922e",
    "#f04f91",
    "#e5c93c",
    "#31c5dc",
    "#7cc65a"
];

let processCount = 0;
let schedule = [];
let processData = [];

let simTime = 0;
let running = false;
let animationId = null;
let lastFrame = null;


// 3. CHECK WHETHER ARRIVAL TIME IS NEEDED

function usesArrivalTime() {
    const algorithm = algorithmSelect.value;

    // Only SRTF displays and uses user-entered arrival times.
    // All other algorithms assume every process arrives at time 0.
    return algorithm === "srtf";
}


// 4. ADD A PROCESS ROW

function addProcess() {
    processCount++;

    const id = `P${processCount}`;
    const color = COLORS[(processCount - 1) % COLORS.length];

    const row = document.createElement("tr");
    row.dataset.id = id;

    row.innerHTML = `
        <td class="process-name">
            <span class="process-dot" style="background:${color}"></span>
            ${id}
        </td>

        <td class="arrival-cell">
            <input type="number"
                class="arrival"
                min="0"
                step="any"
                value="0"
                aria-label="${id} arrival time">
        </td>

        <td>
            <input type="number"
                class="burst"
                min="0.01"
                step="any"
                value="0"
                aria-label="${id} burst time">
        </td>

        <td class="priority-cell" hidden>
            <input type="number"
                class="priority"
                step="1"
                value="1"
                aria-label="${id} priority">
        </td>

        <td>
            <button type="button"
                class="remove-process"
                aria-label="Remove ${id}">×</button>
        </td>
    `;

    row.querySelector(".remove-process").addEventListener("click", () => {
        row.remove();
        renumberProcesses();
        clearResults();
    });

    processBody.appendChild(row);
    updateAlgorithm();
}


// 5. RENUMBER PROCESS IDs AFTER REMOVAL

function renumberProcesses() {
    const rows = processBody.querySelectorAll("tr");

    rows.forEach((row, index) => {
        const id = `P${index + 1}`;
        row.dataset.id = id;

        row.querySelector(".process-name").innerHTML = `
            <span class="process-dot"
                style="background:${COLORS[index % COLORS.length]}"></span>
            ${id}
        `;

        row.querySelector(".arrival").setAttribute(
            "aria-label", `${id} arrival time`
        );

        row.querySelector(".burst").setAttribute(
            "aria-label", `${id} burst time`
        );

        row.querySelector(".priority").setAttribute(
            "aria-label", `${id} priority`
        );

        row.querySelector(".remove-process").setAttribute(
            "aria-label", `Remove ${id}`
        );
    });

    processCount = rows.length;
}


// 6. SHOW OR HIDE INPUTS BASED ON THE ALGORITHM

function updateAlgorithm() {
    const algorithm = algorithmSelect.value;
    const showArrival = usesArrivalTime();
    const isPriority = algorithm === "priority";
    const isRR = algorithm === "rr";

    // Time quantum is only needed for Round Robin.
    quantumArea.hidden = !isRR;

    // Priority inputs are only needed for Priority Scheduling.
    priorityHead.hidden = !isPriority;

    // Arrival Time appears only for SRTF.
    arrivalHead.hidden = !showArrival;

    processBody.querySelectorAll(".arrival-cell").forEach(cell => {
        cell.hidden = !showArrival;
    });

    processBody.querySelectorAll(".priority-cell").forEach(cell => {
        cell.hidden = !isPriority;
    });

    // Apply the same Arrival visibility rule to the results table.
    detailsArrivalHead.hidden = !showArrival;

    detailsBody.querySelectorAll(".arrival-result").forEach(cell => {
        cell.hidden = !showArrival;
    });
}


// 7. READ PROCESS INPUTS

function readProcesses() {
    const algorithm = algorithmSelect.value;

    return [...processBody.querySelectorAll("tr")].map(row => {
        const arrivalInput = row.querySelector(".arrival");

        return {
            id: row.dataset.id,

            // Only SRTF uses the arrival value entered by the user.
            // Other algorithms treat all processes as arriving at time 0.
            arrival: algorithm === "srtf"
                ? arrivalInput.value.trim()
                : 0,

            burst: row.querySelector(".burst").value.trim(),
            priority: row.querySelector(".priority").value.trim()
        };
    });
}


// 8. VALIDATE INPUTS

function validateInputs(rows) {
    const algorithm = algorithmSelect.value;

    if (rows.length === 0) {
        alert("Please add at least one process.");
        return false;
    }

    for (const p of rows) {
        if (p.burst === "") {
            alert(`${p.id} is missing Burst Time.`);
            return false;
        }

        if (
            usesArrivalTime() &&
            (
                p.arrival === "" ||
                !Number.isFinite(Number(p.arrival)) ||
                Number(p.arrival) < 0
            )
        ) {
            alert(`${p.id}: Arrival Time must be 0 or greater.`);
            return false;
        }

        if (
            !Number.isFinite(Number(p.burst)) ||
            Number(p.burst) <= 0
        ) {
            alert(`${p.id}: Burst Time must be greater than 0.`);
            return false;
        }

        if (
            algorithm === "priority" &&
            (
                p.priority === "" ||
                !Number.isInteger(Number(p.priority))
            )
        ) {
            alert(`${p.id}: Priority must be a whole number.`);
            return false;
        }
    }

    if (algorithm === "rr") {
        const quantum = Number(quantumInput.value);

        if (
            quantumInput.value.trim() === "" ||
            !Number.isFinite(quantum) ||
            quantum <= 0
        ) {
            alert("Time Quantum must be greater than 0.");
            return false;
        }
    }

    return true;
}


// 9. PREPARE PROCESSES FOR SCHEDULING

function prepareProcesses(rows) {
    return rows.map(p => ({
        id: p.id,
        arrival: Number(p.arrival),
        burst: Number(p.burst),
        priority: p.priority === "" ? 1 : Number(p.priority),
        remaining: Number(p.burst),
        firstStart: null,
        completion: null
    }));
}


// 10. ADD A SEGMENT TO THE GANTT TIMELINE

function addSegment(list, id, start, end) {
    if (end <= start) return;

    const last = list[list.length - 1];

    // Consecutive execution by the same process can be combined.
    if (
        last &&
        last.id === id &&
        Math.abs(last.end - start) < 1e-9
    ) {
        last.end = end;
    } else {
        list.push({ id, start, end });
    }
}


// 11. FCFS: FIRST COME, FIRST SERVED

function scheduleFCFS(ps) {
    const list = [];
    let time = 0;

    // All processes arrive at time 0, so use their table order.
    const ordered = [...ps].sort(
        (a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))
    );

    for (const p of ordered) {
        p.firstStart = time;

        addSegment(list, p.id, time, time + p.burst);

        time += p.burst;
        p.remaining = 0;
        p.completion = time;
    }

    return list;
}


// 12. SJF: SHORTEST JOB FIRST (NONPREEMPTIVE)

function scheduleSJF(ps) {
    const list = [];
    let time = 0;

    // Every process is ready at time 0.
    // Select the shortest burst first; use process order to break ties.
    const ordered = [...ps].sort(
        (a, b) =>
            a.burst - b.burst ||
            Number(a.id.slice(1)) - Number(b.id.slice(1))
    );

    for (const p of ordered) {
        p.firstStart = time;

        addSegment(list, p.id, time, time + p.burst);

        time += p.burst;
        p.remaining = 0;
        p.completion = time;
    }

    return list;
}


// 13. PRIORITY SCHEDULING (NONPREEMPTIVE)
// A smaller priority number means a higher priority.

function schedulePriority(ps) {
    const list = [];
    let time = 0;
    let done = 0;

    while (done < ps.length) {
        const ready = ps.filter(
            p => p.completion === null && p.arrival <= time
        );

        if (ready.length === 0) {
            const next = Math.min(
                ...ps
                    .filter(p => p.completion === null)
                    .map(p => p.arrival)
            );

            addSegment(list, "Idle", time, next);
            time = next;
            continue;
        }

        ready.sort(
            (a, b) =>
                a.priority - b.priority ||
                a.arrival - b.arrival ||
                Number(a.id.slice(1)) - Number(b.id.slice(1))
        );

        const p = ready[0];
        p.firstStart = time;

        addSegment(list, p.id, time, time + p.burst);

        time += p.burst;
        p.remaining = 0;
        p.completion = time;
        done++;
    }

    return list;
}


// 14. SRTF: SHORTEST REMAINING TIME FIRST (PREEMPTIVE)

function scheduleSRTF(ps) {
    const list = [];
    let time = 0;
    let done = 0;

    while (done < ps.length) {
        const ready = ps.filter(
            p => p.remaining > 1e-9 && p.arrival <= time
        );

        if (ready.length === 0) {
            const next = Math.min(
                ...ps
                    .filter(p => p.remaining > 1e-9)
                    .map(p => p.arrival)
            );

            addSegment(list, "Idle", time, next);
            time = next;
            continue;
        }

        ready.sort(
            (a, b) =>
                a.remaining - b.remaining ||
                a.arrival - b.arrival ||
                Number(a.id.slice(1)) - Number(b.id.slice(1))
        );

        const p = ready[0];

        if (p.firstStart === null) {
            p.firstStart = time;
        }

        const nextArrival = Math.min(
            ...ps
                .filter(x => x.remaining > 1e-9 && x.arrival > time)
                .map(x => x.arrival),
            Infinity
        );

        const runFor = Math.min(
            p.remaining,
            nextArrival - time
        );

        addSegment(list, p.id, time, time + runFor);

        time += runFor;
        p.remaining -= runFor;

        if (p.remaining <= 1e-9) {
            p.remaining = 0;
            p.completion = time;
            done++;
        }
    }

    return list;
}


// 15. ROUND ROBIN
// Every process arrives at time 0.

function scheduleRR(ps, quantum) {
    const list = [];

    const queue = [...ps].sort(
        (a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))
    );

    let time = 0;
    let done = 0;

    while (done < ps.length) {
        const p = queue.shift();

        if (!p) break;

        if (p.firstStart === null) {
            p.firstStart = time;
        }

        const runFor = Math.min(quantum, p.remaining);

        addSegment(list, p.id, time, time + runFor);

        time += runFor;
        p.remaining -= runFor;

        if (p.remaining > 1e-9) {
            queue.push(p);
        } else {
            p.remaining = 0;
            p.completion = time;
            done++;
        }
    }

    return list;
}


// 16. CALCULATE THE SCHEDULE

function calculateSchedule() {
    const rows = readProcesses();

    if (!validateInputs(rows)) return;

    stopAnimation();

    processData = prepareProcesses(rows);

    const algorithm = algorithmSelect.value;

    if (algorithm === "fcfs") {
        schedule = scheduleFCFS(processData);
    } else if (algorithm === "sjf") {
        schedule = scheduleSJF(processData);
    } else if (algorithm === "srtf") {
        schedule = scheduleSRTF(processData);
    } else if (algorithm === "priority") {
        schedule = schedulePriority(processData);
    } else {
        schedule = scheduleRR(
            processData,
            Number(quantumInput.value)
        );
    }

    // Calculate turnaround, waiting, and response times.
    processData.forEach(p => {
        p.turnaround = p.completion - p.arrival;
        p.waiting = p.turnaround - p.burst;
        p.response = p.firstStart - p.arrival;
    });

    emptyState.hidden = true;
    ganttSection.hidden = false;
    animationSection.hidden = false;
    detailsSection.hidden = false;

    renderGantt();
    renderTubes();
    renderDetails();

    simTime = 0;
    updateAnimation(0);

    playButton.disabled = false;
    pauseButton.disabled = true;

    updateAlgorithm();
}


// 17. DRAW THE GANTT CHART

function renderGantt() {
    ganttChart.innerHTML = "";
    ganttTicks.innerHTML = "";

    schedule.forEach(seg => {
        const block = document.createElement("div");

        block.className =
            "gantt-segment" + (seg.id === "Idle" ? " idle" : "");

        block.style.flex = `${seg.end - seg.start} 1 0`;

        if (seg.id !== "Idle") {
            block.style.background =
                COLORS[(Number(seg.id.slice(1)) - 1) % COLORS.length];
        }

        block.textContent = seg.id;
        block.title = `${seg.id}: ${fmt(seg.start)} to ${fmt(seg.end)}`;

        ganttChart.appendChild(block);
    });

    const points = schedule.length
        ? [schedule[0].start, ...schedule.map(seg => seg.end)]
        : [0];

    [...new Set(points)].forEach(value => {
        const tick = document.createElement("span");
        tick.textContent = fmt(value);
        ganttTicks.appendChild(tick);
    });
}


// 18. CREATE THE PROCESS TUBES

function renderTubes() {
    tubes.innerHTML = "";

    processData.forEach((p, i) => {
        const color = COLORS[i % COLORS.length];
        const item = document.createElement("div");

        item.className = "tube-item";

        item.innerHTML = `
            <div class="tube-label" style="color:${color}">
                ${p.id}
            </div>

            <div class="tube">
                <div class="tube-fill"
                    id="fill-${p.id}"
                    style="background:linear-gradient(
                        0deg, ${color}, ${lighten(color)}
                    )">
                </div>
            </div>

            <div class="tube-percent" id="percent-${p.id}">
                <strong>0%</strong>
                0 / ${fmt(p.burst)}
            </div>
        `;

        tubes.appendChild(item);
    });
}


// 19. LIGHTEN THE TUBE COLORS

function lighten(hex) {
    const n = parseInt(hex.slice(1), 16);

    const r = Math.min(255, ((n >> 16) & 255) + 65);
    const g = Math.min(255, ((n >> 8) & 255) + 65);
    const b = Math.min(255, (n & 255) + 65);

    return `rgb(${r}, ${g}, ${b})`;
}


// 20. FORMAT DISPLAYED NUMBERS

function fmt(number) {
    return Number.isInteger(number)
        ? String(number)
        : Number(number.toFixed(2)).toString();
}


// 21. UPDATE THE TUBE ANIMATION

function updateAnimation(time) {
    const end = schedule.length
        ? schedule[schedule.length - 1].end
        : 0;

    simTime = Math.max(0, Math.min(time, end));

    const progress = {};

    processData.forEach(p => {
        progress[p.id] = 0;
    });

    let active = null;

    for (const seg of schedule) {
        if (seg.id === "Idle") continue;

        const amount = Math.max(
            0,
            Math.min(simTime, seg.end) - seg.start
        );

        if (amount > 0) {
            progress[seg.id] += amount;
        }

        if (simTime >= seg.start && simTime < seg.end) {
            active = seg.id;
        }
    }

    processData.forEach(p => {
        const completed = Math.min(p.burst, progress[p.id]);
        const percent = completed / p.burst * 100;

        const fill = document.getElementById(`fill-${p.id}`);
        const label = document.getElementById(`percent-${p.id}`);

        if (fill) {
            fill.style.height = `${percent}%`;
        }

        if (label) {
            label.innerHTML = `
                <strong>${Math.round(percent)}%</strong>
                ${fmt(completed)} / ${fmt(p.burst)}
            `;
        }
    });

    clock.textContent =
        `Time: ${fmt(simTime)}` +
        (active ? ` · Running: ${active}` : "");
}


// 22. ANIMATION FRAME

function animationFrame(timestamp) {
    if (!running) return;

    if (lastFrame === null) {
        lastFrame = timestamp;
    }

    const delta = timestamp - lastFrame;
    lastFrame = timestamp;

    const simulatedDelta = delta / Number(speedSelect.value);

    const end = schedule.length
        ? schedule[schedule.length - 1].end
        : 0;

    updateAnimation(simTime + simulatedDelta);

    if (simTime >= end) {
        running = false;
        animationId = null;
        lastFrame = null;

        playButton.disabled = true;
        pauseButton.disabled = true;
        return;
    }

    animationId = requestAnimationFrame(animationFrame);
}


// 23. PLAY THE ANIMATION

function playAnimation() {
    if (!schedule.length || running) return;

    const end = schedule[schedule.length - 1].end;

    if (simTime >= end) {
        updateAnimation(0);
    }

    running = true;
    lastFrame = null;

    playButton.disabled = true;
    pauseButton.disabled = false;

    animationId = requestAnimationFrame(animationFrame);
}


// 24. PAUSE THE ANIMATION

function stopAnimation() {
    running = false;

    if (animationId !== null) {
        cancelAnimationFrame(animationId);
    }

    animationId = null;
    lastFrame = null;

    playButton.disabled = false;
    pauseButton.disabled = true;
}


// 25. RESTART THE ANIMATION

function restartAnimation() {
    stopAnimation();
    updateAnimation(0);
    playButton.disabled = false;
}


// 26. DISPLAY THE RESULTS TABLE

function renderDetails() {
    detailsBody.innerHTML = "";

    const showArrival = usesArrivalTime();

    processData.forEach((p, i) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <span class="process-dot"
                    style="background:${COLORS[i % COLORS.length]}"></span>
                ${p.id}
            </td>

            <td class="arrival-result" ${showArrival ? "" : "hidden"}>
                ${fmt(p.arrival)}
            </td>

            <td>${fmt(p.burst)}</td>
            <td>${fmt(p.completion)}</td>
            <td>${fmt(p.turnaround)}</td>
            <td>${fmt(p.waiting)}</td>
            <td>${fmt(p.response)}</td>
        `;

        detailsBody.appendChild(row);
    });

    const average = key =>
        processData.reduce((sum, p) => sum + p[key], 0) /
        processData.length;

    averages.innerHTML = `
        <span>
            Average Turnaround:
            <strong>${fmt(average("turnaround"))}</strong>
        </span>

        <span>
            Average Waiting:
            <strong>${fmt(average("waiting"))}</strong>
        </span>

        <span>
            Average Response:
            <strong>${fmt(average("response"))}</strong>
        </span>
    `;
}


// 27. CLEAR RESULTS WHEN INPUTS CHANGE

function clearResults() {
    stopAnimation();

    schedule = [];
    processData = [];
    simTime = 0;

    ganttSection.hidden = true;
    animationSection.hidden = true;
    detailsSection.hidden = true;
    emptyState.hidden = false;

    ganttChart.innerHTML = "";
    ganttTicks.innerHTML = "";
    tubes.innerHTML = "";
    detailsBody.innerHTML = "";
    averages.innerHTML = "";

    clock.textContent = "Time: 0";
}


// 28. RESET EVERYTHING

function resetAll() {
    stopAnimation();

    processBody.innerHTML = "";
    processCount = 0;

    algorithmSelect.value = "fcfs";
    quantumInput.value = "2";

    addProcess();
    addProcess();

    clearResults();
    updateAlgorithm();
}


// 29. CONNECT BUTTONS

addButton.addEventListener("click", () => {
    addProcess();
    clearResults();
});

algorithmSelect.addEventListener("change", () => {
    updateAlgorithm();
    clearResults();
});

calculateButton.addEventListener("click", calculateSchedule);
resetButton.addEventListener("click", resetAll);
playButton.addEventListener("click", playAnimation);
pauseButton.addEventListener("click", stopAnimation);
restartButton.addEventListener("click", restartAnimation);


// 30. INITIAL SETUP

addProcess();
addProcess();
updateAlgorithm();
