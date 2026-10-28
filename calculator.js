
"use strict";

/* ============================================
   CPU SCHEDULING CALCULATOR
   FCFS, SJF, SRTF, Priority, and Round Robin
============================================ */

/* 1. HTML ELEMENTS */

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
const detailsArrivalHead = document.getElementById("details-arrival-head");
const averages = document.getElementById("averages");

const playButton = document.getElementById("play");
const pauseButton = document.getElementById("pause");
const restartButton = document.getElementById("restart");
const speedSelect = document.getElementById("speed");
const clock = document.getElementById("clock");

/* 2. COLORS AND SIMULATION STATE */

const COLORS = [
    "#238dff", "#a052ff", "#00c9a7", "#ff922e",
    "#f04f91", "#e5c93c", "#31c5dc", "#7cc65a"
];

let processCount = 0;
let schedule = [];
let processData = [];

let simTime = 0;
let running = false;
let animationId = null;
let lastFrame = null;

/* 3. HELPER FUNCTIONS */

function usesArrivalTime() {
    return algorithmSelect.value === "srtf";
}

function processIndex(id) {
    return Number(id.replace("P", "")) - 1;
}

function processColor(id) {
    const index = processIndex(id);
    return COLORS[((index % COLORS.length) + COLORS.length) % COLORS.length];
}

function fmt(number) {
    return String(Number(Number(number).toFixed(2)));
}

/* 4. ADD A PROCESS */

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
        <td class="arrival-cell" hidden>
            <input type="number" class="arrival" min="0" step="any"
                value="0" aria-label="${id} arrival time">
        </td>
        <td>
            <input type="number" class="burst" min="0.01" step="any"
                value="0" aria-label="${id} burst time">
        </td>
        <td class="priority-cell" hidden>
            <input type="number" class="priority" step="1"
                value="1" aria-label="${id} priority">
        </td>
        <td>
            <button type="button" class="remove-process"
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

/* 5. RENUMBER PROCESS IDs */

function renumberProcesses() {
    const rows = [...processBody.querySelectorAll("tr")];

    rows.forEach((row, index) => {
        const id = `P${index + 1}`;
        const color = COLORS[index % COLORS.length];

        row.dataset.id = id;
        row.querySelector(".process-name").innerHTML = `
            <span class="process-dot" style="background:${color}"></span>
            ${id}
        `;

        row.querySelector(".arrival").setAttribute("aria-label", `${id} arrival time`);
        row.querySelector(".burst").setAttribute("aria-label", `${id} burst time`);
        row.querySelector(".priority").setAttribute("aria-label", `${id} priority`);
        row.querySelector(".remove-process").setAttribute("aria-label", `Remove ${id}`);
    });

    processCount = rows.length;
}

/* 6. SHOW THE CORRECT INPUT FIELDS */

function updateAlgorithm() {
    const algorithm = algorithmSelect.value;
    const showArrival = usesArrivalTime();
    const isPriority = algorithm === "priority";
    const isRR = algorithm === "rr";

    quantumArea.hidden = !isRR;
    priorityHead.hidden = !isPriority;
    arrivalHead.hidden = !showArrival;
    detailsArrivalHead.hidden = !showArrival;

    processBody.querySelectorAll(".arrival-cell").forEach(cell => {
        cell.hidden = !showArrival;
    });

    processBody.querySelectorAll(".priority-cell").forEach(cell => {
        cell.hidden = !isPriority;
    });

    detailsBody.querySelectorAll(".arrival-result").forEach(cell => {
        cell.hidden = !showArrival;
    });
}

/* 7. READ PROCESS INPUTS */

function readProcesses() {
    const algorithm = algorithmSelect.value;

    return [...processBody.querySelectorAll("tr")].map(row => ({
        id: row.dataset.id,
        arrival: algorithm === "srtf" ? row.querySelector(".arrival").value.trim() : 0,
        burst: row.querySelector(".burst").value.trim(),
        priority: row.querySelector(".priority").value.trim()
    }));
}

/* 8. VALIDATE INPUTS */

function validateInputs(rows) {
    const algorithm = algorithmSelect.value;

    if (rows.length === 0) {
        alert("Please add at least one process.");
        return false;
    }

    for (const process of rows) {
        const burst = Number(process.burst);

        if (process.burst === "" || !Number.isFinite(burst) || burst <= 0) {
            alert(`${process.id}: Burst Time must be greater than 0.`);
            return false;
        }

        if (usesArrivalTime()) {
            const arrival = Number(process.arrival);

            if (process.arrival === "" || !Number.isFinite(arrival) || arrival < 0) {
                alert(`${process.id}: Arrival Time must be 0 or greater.`);
                return false;
            }
        }

        if (algorithm === "priority") {
            const priority = Number(process.priority);

            if (process.priority === "" || !Number.isFinite(priority) ||
                !Number.isInteger(priority)) {
                alert(`${process.id}: Priority must be a whole number.`);
                return false;
            }
        }
    }

    if (algorithm === "rr") {
        const quantum = Number(quantumInput.value);

        if (quantumInput.value.trim() === "" ||
            !Number.isFinite(quantum) || quantum <= 0) {
            alert("Time Quantum must be greater than 0.");
            return false;
        }
    }

    return true;
}

/* 9. PREPARE PROCESS OBJECTS */

function prepareProcesses(rows) {
    return rows.map(process => ({
        id: process.id,
        arrival: Number(process.arrival),
        burst: Number(process.burst),
        priority: process.priority === "" ? 1 : Number(process.priority),
        remaining: Number(process.burst),
        firstStart: null,
        completion: null,
        turnaround: 0,
        waiting: 0,
        response: 0
    }));
}

/* 10. ADD A GANTT SEGMENT

   mergeAdjacent defaults to true for algorithms where
   consecutive execution by the same process is one block.

   Round Robin passes false so each quantum turn remains
   visible, even when the same process runs consecutively.
*/

function addSegment(list, id, start, end, mergeAdjacent = true) {
    if (end <= start + 1e-9) return;

    const last = list[list.length - 1];

    if (
        mergeAdjacent &&
        last &&
        last.id === id &&
        Math.abs(last.end - start) < 1e-9
    ) {
        last.end = end;
    } else {
        list.push({ id, start, end });
    }
}

/* 11. FCFS */

function scheduleFCFS(ps) {
    const list = [];
    let time = 0;

    const ordered = [...ps].sort((a, b) => processIndex(a.id) - processIndex(b.id));

    for (const process of ordered) {
        process.firstStart = time;
        addSegment(list, process.id, time, time + process.burst);
        time += process.burst;
        process.remaining = 0;
        process.completion = time;
    }

    return list;
}

/* 12. SJF — NONPREEMPTIVE */

function scheduleSJF(ps) {
    const list = [];
    let time = 0;

    const ordered = [...ps].sort(
        (a, b) => a.burst - b.burst || processIndex(a.id) - processIndex(b.id)
    );

    for (const process of ordered) {
        process.firstStart = time;
        addSegment(list, process.id, time, time + process.burst);
        time += process.burst;
        process.remaining = 0;
        process.completion = time;
    }

    return list;
}

/* 13. PRIORITY — NONPREEMPTIVE */

function schedulePriority(ps) {
    const list = [];
    let time = 0;

    const ordered = [...ps].sort(
        (a, b) => a.priority - b.priority || processIndex(a.id) - processIndex(b.id)
    );

    for (const process of ordered) {
        process.firstStart = time;
        addSegment(list, process.id, time, time + process.burst);
        time += process.burst;
        process.remaining = 0;
        process.completion = time;
    }

    return list;
}

/* 14. SRTF — PREEMPTIVE */

function scheduleSRTF(ps) {
    const list = [];
    let time = 0;
    let done = 0;

    while (done < ps.length) {
        const ready = ps.filter(p => p.remaining > 1e-9 && p.arrival <= time);

        if (ready.length === 0) {
            const nextArrival = Math.min(
                ...ps.filter(p => p.remaining > 1e-9).map(p => p.arrival)
            );

            if (!Number.isFinite(nextArrival)) break;

            addSegment(list, "Idle", time, nextArrival);
            time = nextArrival;
            continue;
        }

        ready.sort((a, b) =>
            a.remaining - b.remaining ||
            a.arrival - b.arrival ||
            processIndex(a.id) - processIndex(b.id)
        );

        const process = ready[0];

        if (process.firstStart === null) process.firstStart = time;

        const futureArrivals = ps
            .filter(p => p.remaining > 1e-9 && p.arrival > time)
            .map(p => p.arrival);

        const nextArrival = futureArrivals.length ? Math.min(...futureArrivals) : Infinity;
        const runFor = Math.min(process.remaining, nextArrival - time);

        addSegment(list, process.id, time, time + runFor);
        time += runFor;
        process.remaining -= runFor;

        if (process.remaining <= 1e-9) {
            process.remaining = 0;
            process.completion = time;
            done++;
        }
    }

    return list;
}

/* 15. ROUND ROBIN

   Each quantum turn is kept as a separate Gantt segment.
   This preserves boundaries such as 83, 91, 99, and 107.
*/

function scheduleRR(ps, quantum) {
    const list = [];

    const queue = [...ps].sort((a, b) => processIndex(a.id) - processIndex(b.id));

    let time = 0;
    let done = 0;

    while (done < ps.length) {
        const process = queue.shift();
        if (!process) break;

        if (process.firstStart === null) process.firstStart = time;

        const runFor = Math.min(quantum, process.remaining);

        // IMPORTANT: false prevents consecutive RR turns from merging.
        addSegment(list, process.id, time, time + runFor, false);

        time += runFor;
        process.remaining -= runFor;

        if (process.remaining > 1e-9) {
            queue.push(process);
        } else {
            process.remaining = 0;
            process.completion = time;
            done++;
        }
    }

    return list;
}

/* 16. CALCULATE AND DISPLAY RESULTS */

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
        schedule = scheduleRR(processData, Number(quantumInput.value));
    }

    processData.forEach(process => {
        process.turnaround = process.completion - process.arrival;
        process.waiting = process.turnaround - process.burst;
        process.response = process.firstStart - process.arrival;
    });

    emptyState.hidden = true;
    ganttSection.hidden = false;
    animationSection.hidden = false;
    detailsSection.hidden = false;

    renderGantt();
    renderTubes();
    renderDetails();
    updateAlgorithm();

    simTime = 0;
    updateAnimation(0);

    playButton.disabled = false;
    pauseButton.disabled = true;
}

/* 17. DRAW THE GANTT CHART */

function renderGantt() {
    ganttChart.replaceChildren();
    ganttTicks.replaceChildren();

    ganttChart.style.width = "";
    ganttChart.style.minWidth = "";
    ganttTicks.style.width = "";
    ganttTicks.style.minWidth = "";
    ganttTicks.style.marginLeft = "0";

    const timeline = ganttChart.closest(".gantt-timeline");
    if (!schedule.length) return;

    const chartStart = schedule[0].start;
    const chartEnd = schedule[schedule.length - 1].end;
    const totalDuration = chartEnd - chartStart;

    if (totalDuration <= 0) return;

    // Visual settings only; these do not change scheduling calculations.
    const MIN_SEGMENT_WIDTH = 64;
    const MIN_PIXELS_PER_UNIT = 24;

    const availableWidth = timeline
        ? timeline.clientWidth
        : ganttChart.parentElement.clientWidth;

    const pixelsPerUnit = Math.max(
        MIN_PIXELS_PER_UNIT,
        availableWidth / totalDuration
    );

    const segmentWidths = schedule.map(segment =>
        Math.max(
            MIN_SEGMENT_WIDTH,
            (segment.end - segment.start) * pixelsPerUnit
        )
    );

    const totalChartWidth = segmentWidths.reduce((sum, width) => sum + width, 0);

    const chartStyle = getComputedStyle(ganttChart);
    const borderLeft = parseFloat(chartStyle.borderLeftWidth) || 0;
    const borderRight = parseFloat(chartStyle.borderRightWidth) || 0;

    ganttChart.style.boxSizing = "border-box";
    ganttChart.style.width = `${totalChartWidth + borderLeft + borderRight}px`;
    ganttChart.style.minWidth = `${totalChartWidth + borderLeft + borderRight}px`;

    ganttTicks.style.position = "relative";
    ganttTicks.style.boxSizing = "border-box";
    ganttTicks.style.width = `${totalChartWidth}px`;
    ganttTicks.style.minWidth = `${totalChartWidth}px`;
    ganttTicks.style.marginLeft = `${borderLeft}px`;
    ganttTicks.style.overflow = "visible";

    schedule.forEach((segment, index) => {
        const width = segmentWidths[index];
        const block = document.createElement("div");

        block.className = "gantt-segment" +
            (segment.id === "Idle" ? " idle" : "");

        block.style.flex = `0 0 ${width}px`;
        block.style.width = `${width}px`;
        block.style.minWidth = `${width}px`;
        block.style.maxWidth = `${width}px`;
        block.style.boxSizing = "border-box";

        if (segment.id !== "Idle") {
            block.style.background = processColor(segment.id);
        }

        block.textContent = segment.id;
        block.title = `${segment.id}: ${fmt(segment.start)} to ${fmt(segment.end)}`;
        ganttChart.appendChild(block);
    });

    // Add the first start time and every segment end time.
    const boundaries = [{
        time: schedule[0].start,
        position: 0
    }];

    let position = 0;

    schedule.forEach((segment, index) => {
        position += segmentWidths[index];

        boundaries.push({
            time: segment.end,
            position
        });
    });

    boundaries.forEach((boundary, index) => {
        const tick = document.createElement("span");

        tick.textContent = fmt(boundary.time);
        tick.style.left = `${boundary.position}px`;
        tick.style.whiteSpace = "nowrap";
        tick.style.position = "absolute";
        tick.style.display = "block";
        tick.style.zIndex = "5";

        if (index === 0) {
            tick.className = "tick-start";
            tick.style.transform = "translateX(0)";
        } else if (index === boundaries.length - 1) {
            tick.className = "tick-end";
            tick.style.transform = "translateX(-100%)";
        } else {
            tick.className = "tick-middle";
            tick.style.transform = "translateX(-50%)";
        }

        ganttTicks.appendChild(tick);
    });

    if (timeline) {
        timeline.style.overflowX = "auto";
        timeline.style.overflowY = "hidden";
        timeline.scrollLeft = 0;
    }
}

/* 18. CREATE THE PROCESS ANIMATION */

function renderTubes() {
    tubes.innerHTML = "";

    processData.forEach(process => {
        const item = document.createElement("div");
        item.className = "tube-item";

        const color = processColor(process.id);

        item.innerHTML = `
            <div class="tube-label">${process.id}</div>
            <div class="cannon-bar">
                <div class="process-bar">
                    <div class="process-fill" id="fill-${process.id}"
                        style="background:linear-gradient(90deg, ${color}, #b18aff);">
                    </div>
                </div>
                <div class="cannon" id="cannon-${process.id}" aria-hidden="true">
                    <div class="cannon-glow"></div>
                    <div class="cannon-body"></div>
                    <div class="cannon-particles">
                        <span class="particle"></span>
                        <span class="particle"></span>
                        <span class="particle"></span>
                    </div>
                </div>
            </div>
            <div class="tube-percent" id="percent-${process.id}">
                <strong>0%</strong>
                <span>0 / ${fmt(process.burst)}</span>
            </div>
        `;

        tubes.appendChild(item);
    });
}

/* 19. UPDATE PROCESS PROGRESS */

function updateAnimation(time) {
    const end = schedule.length ? schedule[schedule.length - 1].end : 0;
    simTime = Math.max(0, Math.min(time, end));

    const progress = {};
    processData.forEach(process => progress[process.id] = 0);

    let active = null;

    for (const segment of schedule) {
        if (segment.id === "Idle") continue;

        const amount = Math.max(
            0,
            Math.min(simTime, segment.end) - segment.start
        );

        if (amount > 0) progress[segment.id] += amount;

        if (simTime >= segment.start && simTime < segment.end) {
            active = segment.id;
        }
    }

    processData.forEach(process => {
        const completed = Math.min(process.burst, progress[process.id]);
        const percent = process.burst > 0 ? completed / process.burst * 100 : 0;

        const fill = document.getElementById(`fill-${process.id}`);
        const cannon = document.getElementById(`cannon-${process.id}`);
        const label = document.getElementById(`percent-${process.id}`);

        if (fill) fill.style.width = `${percent}%`;

        if (cannon) {
            const bar = cannon.parentElement.querySelector(".process-bar");
            const barWidth = bar ? bar.clientWidth : 0;
            const cannonWidth = cannon.offsetWidth;
            const travelDistance = Math.max(0, barWidth - cannonWidth);

            cannon.style.left = `${percent / 100 * travelDistance}px`;
            cannon.classList.toggle("firing", active === process.id && running);
        }

        if (label) {
            label.innerHTML = `
                <strong>${Math.round(percent)}%</strong>
                <span>${fmt(completed)} / ${fmt(process.burst)}</span>
            `;
        }
    });

    clock.textContent = `Time: ${fmt(simTime)}` +
        (active ? ` · Running: ${active}` : "");
}

/* 20. ANIMATION FRAME */

function animationFrame(timestamp) {
    if (!running) return;

    if (lastFrame === null) lastFrame = timestamp;

    const delta = timestamp - lastFrame;
    lastFrame = timestamp;

    const simulatedDelta = delta / Number(speedSelect.value);
    const end = schedule.length ? schedule[schedule.length - 1].end : 0;

    updateAnimation(simTime + simulatedDelta);

    if (simTime >= end) {
        running = false;
        animationId = null;
        lastFrame = null;

        updateAnimation(end);
        playButton.disabled = true;
        pauseButton.disabled = true;
        return;
    }

    animationId = requestAnimationFrame(animationFrame);
}

/* 21. PLAY */

function playAnimation() {
    if (!schedule.length || running) return;

    const end = schedule[schedule.length - 1].end;
    if (simTime >= end) updateAnimation(0);

    running = true;
    lastFrame = null;

    playButton.disabled = true;
    pauseButton.disabled = false;

    updateAnimation(simTime);
    animationId = requestAnimationFrame(animationFrame);
}

/* 22. PAUSE */

function stopAnimation() {
    running = false;

    if (animationId !== null) cancelAnimationFrame(animationId);

    animationId = null;
    lastFrame = null;

    playButton.disabled = false;
    pauseButton.disabled = true;

    tubes.querySelectorAll(".cannon").forEach(cannon => {
        cannon.classList.remove("firing");
    });
}

/* 23. RESTART */

function restartAnimation() {
    stopAnimation();
    updateAnimation(0);

    playButton.disabled = false;
    pauseButton.disabled = true;
}

/* 24. RENDER SCHEDULING DETAILS */

function renderDetails() {
    detailsBody.innerHTML = "";

    const showArrival = usesArrivalTime();

    processData.forEach(process => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <span class="process-dot"
                    style="background:${processColor(process.id)}"></span>
                ${process.id}
            </td>
            <td class="arrival-result" ${showArrival ? "" : "hidden"}>
                ${fmt(process.arrival)}
            </td>
            <td>${fmt(process.burst)}</td>
            <td>${fmt(process.completion)}</td>
            <td>${fmt(process.turnaround)}</td>
            <td>${fmt(process.waiting)}</td>
            <td>${fmt(process.response)}</td>
        `;

        detailsBody.appendChild(row);
    });

    const average = key => {
        if (processData.length === 0) return 0;

        return processData.reduce((sum, process) => sum + process[key], 0) /
            processData.length;
    };

    averages.innerHTML = `
        <span>Average Turnaround: <strong>${fmt(average("turnaround"))}</strong></span>
        <span>Average Waiting: <strong>${fmt(average("waiting"))}</strong></span>
        <span>Average Response: <strong>${fmt(average("response"))}</strong></span>
    `;
}

/* 25. CLEAR RESULTS */

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

    ganttChart.style.width = "";
    ganttChart.style.minWidth = "";
    ganttTicks.style.width = "";
    ganttTicks.style.minWidth = "";
    ganttTicks.style.marginLeft = "0";

    const timeline = ganttChart.closest(".gantt-timeline");
    if (timeline) timeline.scrollLeft = 0;

    tubes.innerHTML = "";
    detailsBody.innerHTML = "";
    averages.innerHTML = "";

    clock.textContent = "Time: 0";
}

/* 26. RESET EVERYTHING */

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

/* 27. CONNECT BUTTONS AND EVENTS */

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

/* 28. INITIAL SETUP */

addProcess();
addProcess();
updateAlgorithm();
