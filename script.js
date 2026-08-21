let tasks = [];

function addTask() {

    let input = document.getElementById("taskInput");
    let taskText = input.value;

    let person = document.getElementById("personInput").value;
let important = document.getElementById("importantInput").checked;
    let note = document.getElementById("noteInput").value;
let day = document.getElementById("dayInput").value;


if (day === "Vandaag") {

    day = getTodayName();

    day =
    day.charAt(0).toUpperCase() +
    day.slice(1);

}

let repeat = document.getElementById("repeatInput").value;

    if (taskText === "") {
        return;
    }

let task = {
    naam: taskText,
    persoon: person,
    belangrijk: important,
    dag: day,
    herhaling: repeat,
    notitie: note,
    status: "open",
    dagStatus: {}
};

tasks.push(task);

localStorage.setItem("tasks", JSON.stringify(tasks));


let days = getTaskDays(task);


days.forEach(function(day) {

    createTask({
        ...task,
        dag: day
    });

});

    input.value = "";
    document.getElementById("taskForm").style.display = "none";

    loadTodayOverview();
}


function createTask(task, location = "day") {

    let li = document.createElement("li");

    li.classList.add("person-" + task.persoon);


    // Bovenste regel: checkbox + naam
    let topRow = document.createElement("div");
    topRow.className = "taskTop";


    let checkbox = document.createElement("input");
    checkbox.type = "checkbox";

let currentDayStatus = "open";


if (task.dagStatus && task.dagStatus[task.dag]) {

    currentDayStatus = task.dagStatus[task.dag];

}


if (currentDayStatus === "afgerond") {

    checkbox.checked = true;

    li.classList.add("completed");

}


checkbox.addEventListener("change", function() {

    let dayName = task.dag.toLowerCase();


    // Zorg dat dagStatus bestaat
    if (!task.dagStatus) {

        task.dagStatus = {};

    }


    if (checkbox.checked) {

        li.classList.add("completed");

        task.dagStatus[task.dag] = "afgerond";


        document
            .getElementById(dayName + "-done")
            .appendChild(li);


    } else {

        li.classList.remove("completed");

        task.dagStatus[task.dag] = "open";


        document
            .getElementById(dayName + "-open")
            .appendChild(li);

    }


    localStorage.setItem(
        "tasks",
        JSON.stringify(tasks)
    );


    updateCompletedCount(dayName);

});


    let index = tasks.findIndex(function(item) {
        return item.naam === task.naam;
    });

    if (index !== -1) {
        tasks[index] = task;
    }

    localStorage.setItem("tasks", JSON.stringify(tasks));


    let taskTextElement = document.createElement("span");
    taskTextElement.innerText = task.naam;


    topRow.appendChild(checkbox);
    topRow.appendChild(taskTextElement);



    // Details
let details = document.createElement("div");
details.className = "taskDetails";


let importantLabel = "";

if (task.belangrijk) {

    importantLabel = `
        <span class="importantLabel">
            Belangrijk
        </span>
    `;

}


details.innerHTML = `

    <span class="personName">
        ${task.persoon}
    </span>

    ${importantLabel}

`;


    // Verwijderen
  let deleteButton = document.createElement("button");

deleteButton.innerText = "×";

deleteButton.className = "deleteButton";


deleteButton.addEventListener("click", function() {

    li.remove();

    tasks = tasks.filter(function(item) {
        return item !== task;
    });

    localStorage.setItem("tasks", JSON.stringify(tasks));


    // Teller afgeronde taken bijwerken
if (task.status === "afgerond") {

    updateCompletedCount(task.dag.toLowerCase());

}
});



    // Alles samenvoegen
li.appendChild(topRow);
li.appendChild(details);


if (task.notitie) {
    let note = document.createElement("div");
    note.className = "taskNote";
note.innerText = task.notitie;
    li.appendChild(note);
}


li.appendChild(deleteButton);



    // Naar juiste dag sturen
let dayName = task.dag.toLowerCase();

if (location === "today") {

    document
        .getElementById("todayTasks")
        .appendChild(li);

}
else if (
    task.dagStatus &&
    task.dagStatus[task.dag] === "afgerond"
) {

    document
        .getElementById(dayName + "-done")
        .appendChild(li);

}
else {

    document
        .getElementById(dayName + "-open")
        .appendChild(li);

}

}


function loadTasks() {

    let savedTasks = localStorage.getItem("tasks");

    if (savedTasks) {

        tasks = JSON.parse(savedTasks);


        tasks.forEach(function(task) {

            if (!task.dagStatus) {
                task.dagStatus = {};
            }


            let days = getTaskDays(task);


            days.forEach(function(day) {

                createTask({
                    ...task,
                    dag: day
                });

            });

        });


        tasks.forEach(function(task) {

            let days = getTaskDays(task);

            days.forEach(function(day) {

                updateCompletedCount(day.toLowerCase());

            });

        });

    }

}

checkWeeklyReset();

loadTasks();

loadDayStates();

highlightToday();

loadTodayOverview();


function goToToday() {

    let days = [
        "zondag",
        "maandag",
        "dinsdag",
        "woensdag",
        "donderdag",
        "vrijdag",
        "zaterdag"
    ];

    let today = new Date().getDay();

    let content = document.getElementById(days[today] + "-content");

    if (content) {

        let section = content.parentElement;

        let position = section.getBoundingClientRect().top;
        let offset = 80;

        window.scrollTo({
            top: window.scrollY + position - offset,
            behavior: "smooth"
        });

    }

}

function highlightToday() {

    let days = [
        "zondag",
        "maandag",
        "dinsdag",
        "woensdag",
        "donderdag",
        "vrijdag",
        "zaterdag"
    ];

    let today = new Date().getDay();

    let todayName = days[today];

    let todayElement = document.getElementById(todayName + "-content");


    if (todayElement) {

        let section = todayElement.parentElement;

        section.classList.add("today");

        // Vandaag altijd openen
        todayElement.style.display = "block";

        updateDayTitle(todayName, true);

    }

}


function toggleCompleted(day) {

    let list = document.getElementById(day + "-done");

    if (list.style.display === "none") {
        list.style.display = "block";
    } else {
        list.style.display = "none";
    }

}

function updateCompletedCount(day) {

    let list = document.getElementById(day + "-done");

    let count = list.children.length;

    let title = document.getElementById(day + "-done-title");

    if (title) {
        title.innerText = "▶ Afgerond (" + count + ")";
    }

}

function toggleDay(day) {

    let content = document.getElementById(day + "-content");

    if (content.style.display === "none") {

        content.style.display = "block";

        saveDayState(day, "open");

        updateDayTitle(day, true);

    } else {

        content.style.display = "none";

        saveDayState(day, "closed");

        updateDayTitle(day, false);

    }

}

function saveDayState(day, state) {

    let saved = JSON.parse(localStorage.getItem("dayStates")) || {};

    saved[day] = state;

    localStorage.setItem(
        "dayStates",
        JSON.stringify(saved)
    );

}

function loadDayStates() {

    let saved = JSON.parse(localStorage.getItem("dayStates")) || {};

    Object.keys(saved).forEach(function(day) {

        if (saved[day] === "closed") {

            let content = document.getElementById(day + "-content");
            let title = document.getElementById(day + "-title");

            if (content && title) {

                content.style.display = "none";
updateDayTitle(day, false);

            }

        }

    });

}

function toggleTaskForm() {

    let form = document.getElementById("taskForm");

    if (form.style.display === "none" || form.style.display === "") {
        form.style.display = "block";
    } else {
        form.style.display = "none";
    }

}

function updateDayTitle(day, open) {

    let title = document.getElementById(day + "-title");

    let dayName = day.charAt(0).toUpperCase() + day.slice(1);

    let arrow = open ? "▼" : "▶";

    let badge = "";

    if (day === getTodayName()) {
        badge = '<span class="todayBadge">Vandaag</span>';
    }

    title.innerHTML = arrow + " " + dayName + badge;

}

function getTodayName() {

    let days = [
        "zondag",
        "maandag",
        "dinsdag",
        "woensdag",
        "donderdag",
        "vrijdag",
        "zaterdag"
    ];

    return days[new Date().getDay()];

}

let repeatInput = document.getElementById("repeatInput");
let dayContainer = document.getElementById("dayContainer");

dayContainer.style.display = "block";

repeatInput.addEventListener("change", function() {

    if (repeatInput.value === "dagelijks") {

        dayContainer.style.display = "none";

    } else {

        dayContainer.style.display = "block";

    }

});

function getTaskDays(task) {

    if (task.herhaling === "dagelijks") {

        return [
            "Maandag",
            "Dinsdag",
            "Woensdag",
            "Donderdag",
            "Vrijdag",
            "Zaterdag",
            "Zondag"
        ];

    }


    if (task.herhaling === "wekelijks") {

        return [
            task.dag
        ];

    }


    return [
        task.dag
    ];

}

function resetRecurringTasks() {

    let savedTasks = localStorage.getItem("tasks");

    if (!savedTasks) {
        return;
    }


    let saved = JSON.parse(savedTasks);


    saved.forEach(function(task) {

        if (
            task.herhaling === "dagelijks" ||
            task.herhaling === "wekelijks"
        ) {

            task.dagStatus = {};

        }

    });


    localStorage.setItem(
        "tasks",
        JSON.stringify(saved)
    );

}

function checkWeeklyReset() {

    let lastReset = localStorage.getItem("lastReset");

    let currentWeek = getCurrentWeek();


    if (lastReset !== currentWeek) {

        resetRecurringTasks();


        localStorage.setItem(
            "lastReset",
            currentWeek
        );

    }

}

function getCurrentWeek() {

    let date = new Date();

    let firstDay = new Date(
        date.getFullYear(),
        0,
        1
    );


    let days = Math.floor(
        (date - firstDay) / 86400000
    );


    let week = Math.ceil(
        (days + firstDay.getDay() + 1) / 7
    );


    return date.getFullYear() + "-" + week;

}

function loadTodayOverview() {

    let todayName = getTodayName();

    todayName =
    todayName.charAt(0).toUpperCase() +
    todayName.slice(1);


    let container = document.getElementById("todayTasks");

    container.innerHTML = "";


    let foundTasks = [];


    tasks.forEach(function(task) {

        let taskDays = getTaskDays(task);


if (
    taskDays.includes(todayName) &&
    (!task.dagStatus || task.dagStatus[todayName] !== "afgerond")
) {

    foundTasks.push(task);

}

    });


    if (foundTasks.length === 0) {

        container.innerHTML =
        "<div class='empty'>Geen taken voor vandaag 🎉</div>";

        return;

    }


foundTasks.forEach(function(task) {

    createTask(
        {
            ...task,
            dag: todayName
        },
        "today"
    );

});

}