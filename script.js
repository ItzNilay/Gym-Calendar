document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const monthDisplay = document.getElementById('month-display');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');

    const entryModal = document.getElementById('entry-modal');
    const saveBtn = document.getElementById('save-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const workoutInput1 = document.getElementById('workout-input-1');
    const workoutInput2 = document.getElementById('workout-input-2');
    const durationInput = document.getElementById('duration-input');
    const emojiSelector = document.getElementById('emoji-selector');
    const modalDateDisplay = document.getElementById('modal-date-display');

    const statsBtn = document.getElementById('stats-btn');
    const statsModal = document.getElementById('stats-modal');
    const statsTitle = document.getElementById('stats-title');
    const statsDropdown = document.getElementById('stats-dropdown');
    const statsContentContainer = document.getElementById('stats-content-container');
    const overallTotalTimeDisplay = document.getElementById('overall-total-time');
    const closeStatsBtn = document.getElementById('close-stats-btn');

    // --- State Management ---
    let nav = Number(localStorage.getItem('nav')) || 0;
    let clickedDate = null;
    let workoutEntries = JSON.parse(localStorage.getItem('workoutEntries')) || {};
    let selectedEmoji = null;

    function loadCalendar() {
    const dt = new Date();
    if (nav !== 0) dt.setMonth(new Date().getMonth() + nav, 1);
    // Save nav to localStorage so month navigation persists
    localStorage.setItem('nav', nav);

        const month = dt.getMonth();
        const year = dt.getFullYear();

        monthDisplay.innerText = `${dt.toLocaleDateString('en-us', { month: 'long' })} ${year}`;
        calendarGrid.innerHTML = '';

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const paddingDays = new Date(year, month, 1).getDay();

        for (let i = 1; i <= paddingDays + daysInMonth; i++) {
            const daySquare = document.createElement('div');
            daySquare.classList.add('day');
            const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i - paddingDays).padStart(2, '0')}`;

            if (i > paddingDays) {
                const dayNumber = i - paddingDays;
                let contentHTML = `
                    <div class="day-content-wrapper">
                        <div class="date-number">${dayNumber}</div>
                        <div class="workout-texts">`;
                
                const entry = workoutEntries[dayString];
                if (entry) {
                    // --- FONT SIZE LOGIC RE-IMPLEMENTED HERE ---
                    if (entry.text1) {
                        const class1 = entry.text1.length > 8 ? 'workout-text-small' : '';
                        contentHTML += `<div class="workout-text ${class1}">${entry.text1}</div>`;
                    }
                    if (entry.text2) {
                        const class2 = entry.text2.length > 8 ? 'workout-text-small' : '';
                        contentHTML += `<div class="workout-text ${class2}">${entry.text2}</div>`;
                    }
                }
                contentHTML += `</div><div class="workout-emoji">`;
                if(entry && entry.emoji) contentHTML += entry.emoji;
                contentHTML += `</div></div>`;
                
                daySquare.innerHTML = contentHTML;
                daySquare.addEventListener('click', () => openModal(dayString));
            } else {
                daySquare.classList.add('padding-day');
            }
            calendarGrid.appendChild(daySquare);
        }
    }

    function openModal(date) {
        clickedDate = date;
        const [year, month, day] = date.split('-');
        modalDateDisplay.textContent = new Date(year, month - 1, day).toLocaleDateString('en-us', { month: 'long', day: 'numeric' });
        
        const existingEntry = workoutEntries[date];
        if (existingEntry) {
            workoutInput1.value = existingEntry.text1 || '';
            workoutInput2.value = existingEntry.text2 || '';
            durationInput.value = existingEntry.duration || '';
            selectEmoji(existingEntry.emoji || null);
        } else {
            workoutInput1.value = '';
            workoutInput2.value = '';
            durationInput.value = '';
            selectEmoji(null);
        }
        entryModal.classList.remove('hidden');
    }

    function saveEntry() {
        if (workoutInput1.value.trim() || workoutInput2.value.trim() || selectedEmoji) {
            workoutEntries[clickedDate] = {
                text1: workoutInput1.value.trim(),
                text2: workoutInput2.value.trim(),
                emoji: selectedEmoji,
                duration: durationInput.value.trim(),
            };
        } else {
            delete workoutEntries[clickedDate];
        }
        localStorage.setItem('workoutEntries', JSON.stringify(workoutEntries));
        entryModal.classList.add('hidden');
        loadCalendar();
    }
    
    function deleteEntry() {
        delete workoutEntries[clickedDate];
        localStorage.setItem('workoutEntries', JSON.stringify(workoutEntries));
        entryModal.classList.add('hidden');
        loadCalendar();
    }
    
    function selectEmoji(emoji) {
        document.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('selected'));
        if (emoji) {
            const emojiEl = document.querySelector(`.emoji-option[data-emoji="${emoji}"]`);
            if (emojiEl) emojiEl.classList.add('selected');
        }
        selectedEmoji = emoji;
    }

    function parseDurationToMinutes(durationStr) {
        if (!durationStr) return 0;
        let totalMinutes = 0;
        const hoursMatch = durationStr.match(/(\d+)\s*[hH]/);
        const minutesMatch = durationStr.match(/(\d+)\s*[mM]/);
        if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60;
        if (minutesMatch) totalMinutes += parseInt(minutesMatch[1]);
        if (!hoursMatch && !minutesMatch && /^\d+$/.test(durationStr)) {
            totalMinutes = parseInt(durationStr);
        }
        return totalMinutes;
    }

    function formatMinutesToTime(totalMinutes) {
        if (isNaN(totalMinutes) || totalMinutes === 0) return "N/A";
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);
        let result = '';
        if (hours > 0) result += `${hours}h `;
        if (minutes > 0) result += `${minutes}m`;
        return result.trim() || "0m";
    }

    function calculateMonthlyStats() {
        const dt = new Date();
        dt.setMonth(new Date().getMonth() + nav, 1);
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const year = dt.getFullYear();
        
        const stats = {};
        let totalDurationAcrossAllSessions = 0;

        for (const date in workoutEntries) {
            if (date.startsWith(`${year}-${month}`)) {
                const entry = workoutEntries[date];
                const workouts = [entry.text1, entry.text2].filter(t => t);
                const duration = parseDurationToMinutes(entry.duration);
                
                if (workouts.length > 0) {
                    totalDurationAcrossAllSessions += duration;
                }

                workouts.forEach(workout => {
                    if (!stats[workout]) {
                        stats[workout] = { count: 0, totalMinutes: 0 };
                    }
                    stats[workout].count++;
                    stats[workout].totalMinutes += (workouts.length > 1) ? (duration / workouts.length) : duration;
                });
            }
        }
        return {
            individualStats: stats,
            totalDuration: totalDurationAcrossAllSessions
        };
    }

    function renderStats() {
        const selectedWorkout = statsDropdown.value;
        const { individualStats, totalDuration } = calculateMonthlyStats();
        
        statsContentContainer.innerHTML = '';
        overallTotalTimeDisplay.innerHTML = '';

        if (selectedWorkout === 'All') {
            renderAllStatsGraph(individualStats, totalDuration);
        } else {
            renderSingleStat(individualStats, selectedWorkout);
        }
    }
    
    function renderSingleStat(stats, workoutName) {
        const workoutData = stats[workoutName];
        if (workoutData && workoutData.count > 0) {
            statsContentContainer.innerHTML = `
                <div class="stats-text-view">
                    <p><strong>${workoutName}:</strong></p>
                    <p>Times done: ${workoutData.count}</p>
                    <p>Total duration: ${formatMinutesToTime(workoutData.totalMinutes)}</p>
                </div>
            `;
        } else {
            statsContentContainer.innerHTML = `<p>No data for ${workoutName} this month.</p>`;
        }
    }

    function renderAllStatsGraph(stats, totalDuration) {
        const workoutNames = Object.keys(stats).sort();
        
        if (workoutNames.length === 0) {
            statsContentContainer.innerHTML = "<p>No workouts logged to display stats.</p>";
            overallTotalTimeDisplay.innerHTML = '';
            return;
        }

        const maxCount = Math.max(...workoutNames.map(name => stats[name].count), 0);
        
        statsContentContainer.innerHTML = `
            <div class="chart-wrapper">
                <div class="y-axis"></div>
                <div class="chart-area"></div>
            </div>
        `;
        const yAxis = statsContentContainer.querySelector('.y-axis');
        const chartArea = statsContentContainer.querySelector('.chart-area');

        const numLabels = Math.min(maxCount, 4);
        for (let i = numLabels; i >= 0; i--) {
            const labelValue = Math.ceil(maxCount / numLabels) * i;
            const labelDiv = document.createElement('div');
            labelDiv.textContent = isNaN(labelValue) ? 0 : labelValue;
            yAxis.appendChild(labelDiv);
        }

        workoutNames.forEach(workout => {
            const data = stats[workout];
            const barHeight = maxCount > 0 ? (data.count / maxCount) * 100 : 0;
            
            const barItem = document.createElement('div');
            barItem.classList.add('bar-item');
            barItem.innerHTML = `
                <div class="bar" style="height: ${barHeight}%;"></div>
                <div class="bar-label">${workout}</div>
            `;
            chartArea.appendChild(barItem);
        });

        overallTotalTimeDisplay.innerHTML = `Total workout time this month: <strong>${formatMinutesToTime(totalDuration)}</strong>`;
    }

    function showStatsModal() {
        const dt = new Date();
        dt.setMonth(new Date().getMonth() + nav, 1);
        statsTitle.innerText = `Stats for ${dt.toLocaleDateString('en-us', { month: 'long' })}`;
        statsDropdown.value = 'All';
        renderStats();
        statsModal.classList.remove('hidden');
    }

// --- Event Listeners ---
    prevMonthBtn.addEventListener('click', () => {
        nav--;
        localStorage.setItem('nav', nav);
        loadCalendar();
    });
    nextMonthBtn.addEventListener('click', () => {
        nav++;
        localStorage.setItem('nav', nav);
        loadCalendar();
    });
    saveBtn.addEventListener('click', saveEntry);
    deleteBtn.addEventListener('click', deleteEntry);
    entryModal.querySelector('#close-modal-btn').addEventListener('click', () => entryModal.classList.add('hidden'));

    statsBtn.addEventListener('click', showStatsModal);
    closeStatsBtn.addEventListener('click', () => statsModal.classList.add('hidden'));
    statsDropdown.addEventListener('change', renderStats);

    emojiSelector.addEventListener('click', (e) => {
        if (e.target.classList.contains('emoji-option')) {
            const clickedEmoji = e.target.dataset.emoji;
            selectEmoji(clickedEmoji === selectedEmoji ? null : clickedEmoji);
        }
    });

    loadCalendar();
});