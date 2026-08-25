console.log("SCRIPT IS GELADEN");

const SUPABASE_URL = "https://sbppjnbilqhriyburalx.supabase.co";
const SUPABASE_KEY = "sb_publishable_LTMhwEaoBcgn_DVnLbNmQA_3AVsrDDK";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let tasks = [];
let deleteTaskTarget = null;
let editingTaskId = null;

function dbRowToTask(row) {
    return {
        id: row.id,
        naam: row.naam,
        persoon: row.persoon,
        belangrijk: row.belangrijk,
        dag: row.dag,
        herhaling: row.herhaling,
        notitie: row.notitie || "",
        dagStatus: row.dag_status || {},
        type: row.type || "gepland"
    };
}

function taskToDb(task) {
    return {
        naam: task.naam,
        persoon: task.persoon,
        belangrijk: task.belangrijk,
        dag: task.dag,
        herhaling: task.herhaling,
        notitie: task.notitie,
        dag_status: task.dagStatus || {},
        type: task.type || "gepland"
    };
}

async function addTask() {

    let input = document.getElementById("taskInput");
    let taskText = input.value;
    let editId = document.getElementById("editTaskId").value;

    let person = document.getElementById("personInput").value;
    let important = document.getElementById("importantInput").checked;
    let note = document.getElementById("noteInput").value;
    let day = document.getElementById("dayInput").value;
    let repeat = document.getElementById("repeatInput").value;
    let taskType = document.getElementById("taskTypeInput").value;

if (taskType === "los") {

    day = null;
    repeat = "geen";

} else if (day === "Vandaag") {

    day = getTodayName();

    day =
        day.charAt(0).toUpperCase() +
        day.slice(1);
}

    if (taskText === "") {
        return;
    }

let newTask = {
    naam: taskText,
    persoon: person,
    belangrijk: important,
    dag: day,
    herhaling: repeat,
    notitie: note,
    dagStatus: {},
    type: taskType
};

let data;
let error;


if (editId) {


    const result = await supabaseClient
        .from("tasks")
        .update(taskToDb(newTask))
        .eq("id", editId)
        .select()
        .single();


    data = result.data;
    error = result.error;


} else {


    const result = await supabaseClient
        .from("tasks")
        .insert(taskToDb(newTask))
        .select()
        .single();


    data = result.data;
    error = result.error;

}

    if (error) {
        console.error("Taak opslaan mislukt:", error);
        return;
    }

    let task = dbRowToTask(data);

    tasks.push(task);

    renderAllTasks();

resetTaskForm();

document.getElementById("taskForm").style.display = "none";

    loadTodayOverview();
}


function createTask(task, location = "day") {

    console.log(
    "CREATE TASK:",
    task.naam,
    "ID:",
    task.id,
    "DAG:",
    task.dag,
    "LOCATIE:",
    location
);

    let li = document.createElement("li");

    li.classList.add("person-" + task.persoon);


    // Bovenste regel: checkbox + naam
    let topRow = document.createElement("div");
    topRow.className = "taskTop";


    let checkbox = document.createElement("input");
    checkbox.type = "checkbox";

let statusKey;

if (task.type === "los") {
    statusKey = "los";
} else {
    statusKey = task.dag;
}


let currentDayStatus = "open";

if (task.dagStatus && task.dagStatus[statusKey]) {

    currentDayStatus = task.dagStatus[statusKey];

}

if (currentDayStatus === "afgerond") {

    checkbox.checked = true;

    li.classList.add("completed");

}


checkbox.addEventListener("change", async function() {


    if (!task.dagStatus) {
        task.dagStatus = {};
    }

if (checkbox.checked) {

    task.dagStatus[statusKey] = "afgerond";

} else {

    task.dagStatus[statusKey] = "open";

}


    // Ook het originele task-object in de tasks-array bijwerken
    let originalTask = tasks.find(function(item) {
        return item.id === task.id;
    });

if (originalTask) {

    originalTask.dagStatus = {
        ...originalTask.dagStatus,
        [statusKey]: task.dagStatus[statusKey]
    };

}


    // Nieuwe status naar Supabase sturen
    const { error } = await supabaseClient
        .from("tasks")
        .update({
            dag_status: originalTask
                ? originalTask.dagStatus
                : task.dagStatus
        })
        .eq("id", task.id);


    if (error) {

        console.error("Status bijwerken mislukt:", error);

        // Checkbox terugzetten als opslaan mislukt
        checkbox.checked = !checkbox.checked;

        return;
    }


renderAllTasks();

});

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

// Bewerken

let editButton = document.createElement("button");

editButton.innerText = "✏️";

editButton.className = "editButton";

editButton.addEventListener("click", function() {

    openInlineEdit(task, li);

});

// Inline bewerkingsformulier

let editForm = document.createElement("div");

editForm.className = "inlineEditForm";

editForm.style.display = "none";


editForm.innerHTML = `

<label>Taak</label>
<input class="editName" value="${task.naam}">


<label>Persoon</label>

<select class="editPerson">

<option value="Anthony" ${task.persoon === "Anthony" ? "selected" : ""}>
Anthony
</option>

<option value="Danique" ${task.persoon === "Danique" ? "selected" : ""}>
Danique
</option>

<option value="Samen" ${task.persoon === "Samen" ? "selected" : ""}>
Samen
</option>

</select>


<label>Notitie</label>

<textarea class="editNote">${task.notitie}</textarea>


<label class="editImportant">

<input type="checkbox" class="editImportantCheckbox" ${task.belangrijk ? "checked" : ""}>

Belangrijke taak

</label>


<label>Herhaling</label>

<select class="editRepeat">

<option value="eenmalig" ${task.herhaling === "eenmalig" ? "selected" : ""}>
Eenmalig
</option>

<option value="dagelijks" ${task.herhaling === "dagelijks" ? "selected" : ""}>
Dagelijks
</option>

<option value="wekelijks" ${task.herhaling === "wekelijks" ? "selected" : ""}>
Wekelijks
</option>

</select>


<label>Dag</label>

<select class="editDay">

<option value="Maandag" ${task.dag === "Maandag" ? "selected" : ""}>
Maandag
</option>

<option value="Dinsdag" ${task.dag === "Dinsdag" ? "selected" : ""}>
Dinsdag
</option>

<option value="Woensdag" ${task.dag === "Woensdag" ? "selected" : ""}>
Woensdag
</option>

<option value="Donderdag" ${task.dag === "Donderdag" ? "selected" : ""}>
Donderdag
</option>

<option value="Vrijdag" ${task.dag === "Vrijdag" ? "selected" : ""}>
Vrijdag
</option>

<option value="Zaterdag" ${task.dag === "Zaterdag" ? "selected" : ""}>
Zaterdag
</option>

<option value="Zondag" ${task.dag === "Zondag" ? "selected" : ""}>
Zondag
</option>

</select>


<div class="inlineEditButtons">

<button class="saveInlineEdit">
Opslaan
</button>

<button class="cancelInlineEdit">
Annuleren
</button>

</div>

`;

let cancelInlineButton = editForm.querySelector(".cancelInlineEdit");

cancelInlineButton.addEventListener("click", function() {

    editForm.style.display = "none";


    let view = li.querySelector(".taskView");


    if (view) {

        view.style.display = "block";

    }

});

let saveInlineButton = editForm.querySelector(".saveInlineEdit");


saveInlineButton.addEventListener("click", async function() {


let updatedTask = {

    naam: editForm.querySelector(".editName").value,

    persoon: editForm.querySelector(".editPerson").value,

    notitie: editForm.querySelector(".editNote").value,

    belangrijk: editForm.querySelector(".editImportantCheckbox").checked,

    herhaling: editForm.querySelector(".editRepeat").value,

    dag: editForm.querySelector(".editDay").value,

    dagStatus: task.dagStatus || {},

    type: task.type || "gepland"

};


    const { error } = await supabaseClient

        .from("tasks")

        .update(taskToDb(updatedTask))

        .eq("id", task.id);



    if (error) {

        console.error(
            "Taak aanpassen mislukt:",
            error
        );

        return;

    }


let updated = {
    ...task,
    ...updatedTask,
    id: task.id
};


// bestaande taak in array vervangen

let index = tasks.findIndex(function(item) {

    return item.id === task.id;

});


if (index !== -1) {

    tasks[index] = updated;

}


// alles opnieuw tekenen

renderAllTasks();

});

    // Verwijderen
  let deleteButton = document.createElement("button");

deleteButton.innerText = "×";

deleteButton.className = "deleteButton";


deleteButton.addEventListener("click", function() {

    deleteTaskTarget = task;

    document
        .getElementById("deleteModal")
        .style.display = "flex";

});



    // Alles samenvoegen
let taskView = document.createElement("div");

taskView.className = "taskView";


taskView.appendChild(topRow);
taskView.appendChild(details);


if (task.notitie) {

    let note = document.createElement("div");

    note.className = "taskNote";

    note.innerText = task.notitie;

    taskView.appendChild(note);

}


taskView.appendChild(editButton);
taskView.appendChild(deleteButton);



li.appendChild(taskView);

li.appendChild(editForm);


    // Naar juiste dag sturen
// Naar juiste plek sturen

if (location === "today") {

    document
        .getElementById("todayTasks")
        .appendChild(li);

}

else if (location === "losse") {

    if (
        task.dagStatus &&
        task.dagStatus["los"] === "afgerond"
    ) {

        document
            .getElementById("losse-done")
            .appendChild(li);

    } else {

        document
            .getElementById("losse-open")
            .appendChild(li);

    }

}

else {

    let dayName = task.dag.toLowerCase();

    if (
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

}


async function loadTasks() {

    const { data, error } = await supabaseClient
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Taken laden mislukt:", error);
        return;
    }

    tasks = data.map(dbRowToTask);

tasks = data.map(dbRowToTask);

    tasks.forEach(function(task) {

        let days = getTaskDays(task);

        days.forEach(function(day) {
            updateCompletedCount(day.toLowerCase());
        });

    });
}

async function initializeApp() {

    await loadTasks();

    await checkWeeklyReset();

    renderAllTasks();

    closeAllDays();
    highlightToday();
    loadTodayOverview();

    subscribeToTaskChanges();
}

initializeApp();


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

function closeAllDays() {

    let days = [
        "maandag",
        "dinsdag",
        "woensdag",
        "donderdag",
        "vrijdag",
        "zaterdag",
        "zondag"
    ];

    days.forEach(function(day) {

        let content = document.getElementById(day + "-content");

        if (content) {
            content.style.display = "none";
        }

        updateDayTitle(day, false);

    });

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

function updateLooseTaskCount() {

    let looseTasks = tasks.filter(function(task) {
        return task.type === "los";
    });

    let openLooseTasks = looseTasks.filter(function(task) {
        return (
            !task.dagStatus ||
            task.dagStatus["los"] !== "afgerond"
        );
    });

    let indicator = document.getElementById("looseTaskCount");

    if (!indicator) {
        return;
    }

    // Er bestaan losse taken en ze zijn allemaal afgerond
if (looseTasks.length > 0 && openLooseTasks.length === 0) {

    indicator.className = "taskCount completedCount";
    indicator.innerText = "✓";

    document
        .querySelector(".looseTasksSection")
        .classList.add("completedLooseTasks");

    return;
}

document
    .querySelector(".looseTasksSection")
    .classList.remove("completedLooseTasks");

    let count = openLooseTasks.length;

    let countClass = "green";

    if (count > 5) {
        countClass = "red";
    } else if (count > 0) {
        countClass = "orange";
    }

    indicator.className = "taskCount " + countClass;
    indicator.innerText = count;
}

function getOpenTaskCount(day) {

    let formattedDay =
        day.charAt(0).toUpperCase() + day.slice(1);


    return tasks.filter(function(task){

        return (
            getTaskDays(task).includes(formattedDay)
            &&
            (
                !task.dagStatus ||
                task.dagStatus[formattedDay] !== "afgerond"
            )
        );

    }).length;

}

function isDayCompleted(day) {

    let formattedDay =
        day.charAt(0).toUpperCase() + day.slice(1);

    let dayTasks = tasks.filter(function(task) {

        return getTaskDays(task).includes(formattedDay);

    });


    if (dayTasks.length === 0) {
        return false;
    }


    return dayTasks.every(function(task) {

        return (
            task.dagStatus &&
            task.dagStatus[formattedDay] === "afgerond"
        );

    });

}

function toggleDay(day) {

    let content = document.getElementById(day + "-content");

    if (content.style.display === "none") {

        content.style.display = "block";

        updateDayTitle(day, true);

    } else {

        content.style.display = "none";

        updateDayTitle(day, false);

    }

}

function toggleLooseTasks() {

    let content = document.getElementById("losse-content");

    if (content.style.display === "none") {

        content.style.display = "block";

    } else {

        content.style.display = "none";

    }

}


function toggleTaskForm() {

let form = document.getElementById("taskForm");


if (form.style.display === "none" || form.style.display === "") {


    resetTaskForm();

    form.style.display = "block";


} else {


    form.style.display = "none";


}

}

function openEditForm(task) {

    document.getElementById("taskInput").value = task.naam;

    document.getElementById("personInput").value = task.persoon;

    document.getElementById("noteInput").value = task.notitie;

    document.getElementById("importantInput").checked = task.belangrijk;

    document.getElementById("repeatInput").value = task.herhaling;

    document.getElementById("dayInput").value = task.dag;


    document.getElementById("editTaskId").value = task.id;


    document.getElementById("taskForm").style.display = "block";

    document.getElementById("saveTaskButton").innerText = "Opslaan";

    document.getElementById("taskFormTitle").innerText =
    "Taak aanpassen";
}

function openInlineEdit(task, li) {

    let form = li.querySelector(".inlineEditForm");

    let view = li.querySelector(".taskView");


    if (!form || !view) {
        return;
    }


    view.style.display = "none";

    form.style.display = "block";

}

function resetTaskForm() {

    document.getElementById("taskInput").value = "";

    document.getElementById("noteInput").value = "";

    document.getElementById("importantInput").checked = false;

    document.getElementById("repeatInput").value = "eenmalig";

    document.getElementById("dayInput").value = "Vandaag";

    document.getElementById("editTaskId").value = "";

    document.getElementById("saveTaskButton").innerText = "Toevoegen";

    document.getElementById("taskFormTitle").innerText =
    "Nieuwe taak toevoegen";

}

function cancelEdit() {

    resetTaskForm();

    document
        .getElementById("taskForm")
        .style.display = "none";

}

function updateDayTitle(day, open) {

    let title = document.getElementById(day + "-title");

    let dayName = day.charAt(0).toUpperCase() + day.slice(1);


    let badge = "";

    if (day === getTodayName()) {

        badge = '<span class="todayBadge">Vandaag</span>';

    }


let count = getOpenTaskCount(day);

let completed = isDayCompleted(day);

let taskCount = "";

let countClass = "green";


if (completed) {

    taskCount = `
    <span class="taskCount completedCount">
        ✓
    </span>

    <span class="dayArrow">
        ⌄
    </span>
    `;

} else {

    if (count > 5) {

        countClass = "red";

    } else if (count > 0) {

        countClass = "orange";

    }


    taskCount = `
    <span class="taskCount ${countClass}">
        ${count}
    </span>

    <span class="dayArrow">
        ⌄
    </span>
    `;

}

if (completed) {

    title.parentElement.classList.add("completedDay");

} else {

    title.parentElement.classList.remove("completedDay");

}

title.innerHTML = `

<span class="dayLeft">

    <span class="dayName">
        ${dayName}
    </span>

    ${badge}

</span>


<span class="dayRight">

    ${taskCount}

</span>

`;

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

let taskTypeInput = document.getElementById("taskTypeInput");
let repeatContainer = document.getElementById("repeatContainer");

taskTypeInput.addEventListener("change", function() {

    if (taskTypeInput.value === "los") {

        repeatContainer.style.display = "none";
        dayContainer.style.display = "none";

    } else {

        repeatContainer.style.display = "block";
        dayContainer.style.display = "block";

    }

});

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

const looseTaskTypeSelect = document.getElementById("taskTypeInput");
const looseRepeatContainer = document.getElementById("repeatContainer");

if (looseTaskTypeSelect && looseRepeatContainer) {

    looseTaskTypeSelect.addEventListener("change", function() {

        if (looseTaskTypeSelect.value === "los") {

            looseRepeatContainer.style.display = "none";
            dayContainer.style.display = "none";

        } else {

            looseRepeatContainer.style.display = "block";

            if (repeatInput.value === "dagelijks") {
                dayContainer.style.display = "none";
            } else {
                dayContainer.style.display = "block";
            }

        }

    });

}

// Herhaling wijzigen bij geplande taak
repeatInput.addEventListener("change", function() {

    if (repeatInput.value === "dagelijks") {

        dayContainer.style.display = "none";

    } else {

        dayContainer.style.display = "block";

    }

});

function getTaskDays(task) {

    // Losse taken horen niet bij een weekdag
    if (task.type === "los") {
        return [];
    }

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

async function resetRecurringTasks() {

    const recurringTasks = tasks.filter(function(task) {
        return (
            task.herhaling === "dagelijks" ||
            task.herhaling === "wekelijks"
        );
    });

    for (const task of recurringTasks) {

        const { error } = await supabaseClient
            .from("tasks")
            .update({
                dag_status: {}
            })
            .eq("id", task.id);

        if (error) {
            console.error(
                "Weekreset mislukt voor taak:",
                task.naam,
                error
            );
            continue;
        }

        task.dagStatus = {};
    }

    renderAllTasks();
}

async function checkWeeklyReset() {

    let currentWeek = getCurrentWeek();

    const { data, error } = await supabaseClient
        .from("app_settings")
        .select("value")
        .eq("id", "last_weekly_reset")
        .single();

    if (error) {
        console.error(
            "Laatste weekreset ophalen mislukt:",
            error
        );
        return;
    }

    let lastReset = data.value;

    // Eerste keer: huidige week registreren,
    // zonder taken te resetten
    if (!lastReset) {

        const { error: updateError } = await supabaseClient
            .from("app_settings")
            .update({
                value: currentWeek
            })
            .eq("id", "last_weekly_reset");

        if (updateError) {
            console.error(
                "Eerste weekreset registreren mislukt:",
                updateError
            );
        }

        return;
    }

    // Nieuwe week gevonden
    if (lastReset !== currentWeek) {

        await resetRecurringTasks();

        const { error: updateError } = await supabaseClient
            .from("app_settings")
            .update({
                value: currentWeek
            })
            .eq("id", "last_weekly_reset");

        if (updateError) {
            console.error(
                "Weekreset registreren mislukt:",
                updateError
            );
        }
    }
}

function getCurrentWeek() {

    let date = new Date();

    // JS: zondag = 0, maandag = 1, ... zaterdag = 6
    let day = date.getDay();

    // Hoeveel dagen terug naar maandag?
    let daysSinceMonday = day === 0 ? 6 : day - 1;

    let monday = new Date(date);

    monday.setDate(
        date.getDate() - daysSinceMonday
    );

    let year = monday.getFullYear();

    let month = String(
        monday.getMonth() + 1
    ).padStart(2, "0");

    let dayOfMonth = String(
        monday.getDate()
    ).padStart(2, "0");

    return year + "-" + month + "-" + dayOfMonth;
}

function loadTodayOverview() {

    let todayName = getTodayName();
let todayCount = getOpenTaskCount(todayName);

let todayClass = "green";

if (todayCount > 5) {

    todayClass = "red";

} else if (todayCount > 0) {

    todayClass = "orange";

}
    todayName =
    todayName.charAt(0).toUpperCase() +
    todayName.slice(1);


    let container = document.getElementById("todayTasks");

    container.innerHTML = "";

    let todayIndicator = document.getElementById("todayCount");

if (todayIndicator) {

    let todayCompleted = isDayCompleted(todayName);

    if (todayCompleted) {

        todayIndicator.className = "taskCount completedCount";
        todayIndicator.innerText = "✓";

    } else {

        todayIndicator.className = "taskCount " + todayClass;
        todayIndicator.innerText = todayCount;

    }

}

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

foundTasks.sort(function(a, b) {

    if (a.belangrijk === b.belangrijk) {
        return 0;
    }

    return a.belangrijk ? -1 : 1;
});

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

function renderAllTasks() {

    let days = [
        "maandag",
        "dinsdag",
        "woensdag",
        "donderdag",
        "vrijdag",
        "zaterdag",
        "zondag"
    ];

    // Alle bestaande kaarten verwijderen
    days.forEach(function(day) {

        document.getElementById(day + "-open").innerHTML = "";
        document.getElementById(day + "-done").innerHTML = "";

    });

    document.getElementById("losse-open").innerHTML = "";
    document.getElementById("losse-done").innerHTML = "";

// Taken sorteren:
// belangrijke taken eerst, normale taken daarna
let sortedTasks = [...tasks].sort(function(a, b) {

    if (a.belangrijk === b.belangrijk) {
        return 0;
    }

    return a.belangrijk ? -1 : 1;
});


// Taken opnieuw in de week zetten
sortedTasks.forEach(function(task) {

    // Losse taak
    if (task.type === "los") {

        createTask(task, "losse");

        return;
    }

    // Normale geplande taak
    let taskDays = getTaskDays(task);

    taskDays.forEach(function(day) {

        createTask({
            ...task,
            dag: day
        });

    });

});

    // Afgerond-tellers opnieuw berekenen
    days.forEach(function(day) {
        updateCompletedCount(day);
    });

updateCompletedCount("losse");
updateLooseTaskCount();

days.forEach(function(day) {
    updateDayTitle(day, false);
});

    // Vandaag opnieuw opbouwen
    loadTodayOverview();
}

async function refreshTasksFromSupabase() {

    const { data, error } = await supabaseClient
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Realtime vernieuwen mislukt:", error);
        return;
    }

    tasks = data.map(dbRowToTask);

    renderAllTasks();

}

function subscribeToTaskChanges() {

    supabaseClient
        .channel("tasks-realtime")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "tasks"
            },
            async function() {

                await refreshTasksFromSupabase();

            }
        )
        .subscribe();

}

if ("serviceWorker" in navigator) {

    window.addEventListener("load", function() {

        navigator.serviceWorker
            .register("./service_worker.js")
            .then(function(registration) {
                console.log("Service Worker actief:", registration.scope);
            })
            .catch(function(error) {
                console.error("Service Worker fout:", error);
            });

    });

} 

document
.getElementById("cancelDelete")
.addEventListener("click", function() {

    deleteTaskTarget = null;

    document.getElementById("deleteModal").style.display = "none";

});


document
.getElementById("confirmDelete")
.addEventListener("click", async function() {


    if (!deleteTaskTarget) {
        return;
    }


    const { error } = await supabaseClient
        .from("tasks")
        .delete()
        .eq("id", deleteTaskTarget.id);


    if (error) {

        console.error(
            "Taak verwijderen mislukt:",
            error
        );

        return;

    }


    tasks = tasks.filter(function(item) {

        return item.id !== deleteTaskTarget.id;

    });


    deleteTaskTarget = null;


    document.getElementById("deleteModal").style.display = "none";


    renderAllTasks();

});

document
.getElementById("cancelEditButton")
.addEventListener("click", function() {

    cancelEdit();

});