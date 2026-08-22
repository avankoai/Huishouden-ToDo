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
        dagStatus: row.dag_status || {}
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
        dag_status: task.dagStatus || {}
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

    if (day === "Vandaag") {

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
        dagStatus: {}
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

    let days = getTaskDays(task);

    days.forEach(function(day) {

        createTask({
            ...task,
            dag: day
        });

    });

resetTaskForm();

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


checkbox.addEventListener("change", async function() {

    let dayName = task.dag.toLowerCase();

    if (!task.dagStatus) {
        task.dagStatus = {};
    }

    if (checkbox.checked) {

        task.dagStatus[task.dag] = "afgerond";

    } else {

        task.dagStatus[task.dag] = "open";

    }


    // Ook het originele task-object in de tasks-array bijwerken
    let originalTask = tasks.find(function(item) {
        return item.id === task.id;
    });

    if (originalTask) {
        originalTask.dagStatus = {
            ...originalTask.dagStatus,
            [task.dag]: task.dagStatus[task.dag]
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

// Bewerken

let editButton = document.createElement("button");

editButton.innerText = "✏️";

editButton.className = "editButton";

editButton.addEventListener("click", function() {

    openEditForm(task);

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
li.appendChild(topRow);
li.appendChild(details);


if (task.notitie) {
    let note = document.createElement("div");
    note.className = "taskNote";
note.innerText = task.notitie;
    li.appendChild(note);
}


li.appendChild(editButton);
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

    tasks.forEach(function(task) {

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

async function initializeApp() {

    await loadTasks();

    await checkWeeklyReset();

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

    title.innerHTML = dayName + badge;

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

    let lastReset = localStorage.getItem("lastReset");
    let currentWeek = getCurrentWeek();

    if (!lastReset) {
        localStorage.setItem("lastReset", currentWeek);
        return;
    }

    if (lastReset !== currentWeek) {

        await resetRecurringTasks();

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

    // Taken opnieuw in de week zetten
    tasks.forEach(function(task) {

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