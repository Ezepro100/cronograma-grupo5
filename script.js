const defaultSchedule = [
    {
        id: 1,
        week: "Semana 1",
        dates: "19 Noviembre",
        captain: "Daniel Casique",
        tasks: [
            "Baños (2 Voluntarios)",
            "Auditorio principal (2 Voluntarios)",
            "Plataforma (1 Voluntario)",
            "Pasillo y entrada principal (1 Voluntario)",
            "Sala B y lactantes (1 Voluntario)",
            "Patio trasero y pasillo (1 Voluntario)",
            "Proveedor de artículos (1 Voluntario)"
        ]
    },
    {
        id: 2,
        week: "Semana 2",
        dates: "10 Diciembre",
        captain: "Alberto Bardalez",
        tasks: [
            "Baños (2 Voluntarios)",
            "Auditorio principal (2 Voluntarios)",
            "Plataforma (1 Voluntario)",
            "Pasillo y entrada principal (1 Voluntario)",
            "Sala B y lactantes (1 Voluntario)",
            "Patio trasero y pasillo (1 Voluntario)",
            "Proveedor de artículos (1 Voluntario)"
        ]
    },
    {
        id: 3,
        week: "Semana 3",
        dates: "31 Diciembre",
        captain: "Marco Yovera",
        tasks: [
            "Baños (2 Voluntarios)",
            "Auditorio principal (2 Voluntarios)",
            "Plataforma (1 Voluntario)",
            "Pasillo y entrada principal (1 Voluntario)",
            "Sala B y lactantes (1 Voluntario)",
            "Patio trasero y pasillo (1 Voluntario)",
            "Proveedor de artículos (1 Voluntario)"
        ]
    },
    {
        id: 4,
        week: "Semana 4",
        dates: "21 Enero",
        captain: "Rodolfo Medrano",
        tasks: [
            "Baños (2 Voluntarios)",
            "Auditorio principal (2 Voluntarios)",
            "Plataforma (1 Voluntario)",
            "Pasillo y entrada principal (1 Voluntario)",
            "Sala B y lactantes (1 Voluntario)",
            "Patio trasero y pasillo (1 Voluntario)",
            "Proveedor de artículos (1 Voluntario)"
        ]
    }
];

let scheduleData = JSON.parse(localStorage.getItem('grupo5_schedule_v2')) || defaultSchedule;

const scheduleContainer = document.getElementById('schedule-container');
const weekSelect = document.getElementById('week-select');
const modal = document.getElementById('modal');
const addBtn = document.getElementById('add-btn');
const resetBtn = document.getElementById('reset-btn');
const closeModal = document.getElementById('close-modal');
const scheduleForm = document.getElementById('schedule-form');

// Rellenar las opciones del menú desplegable automáticamente
function updateWeekSelector() {
    if (!weekSelect) return;
    const currentValue = weekSelect.value;
    weekSelect.innerHTML = '<option value="all">Ver todas las semanas</option>';
    
    scheduleData.forEach(item => {
        const option = document.createElement('option');
        option.value = item.week;
        option.textContent = `${item.week} (${item.dates}) - Cap: ${item.captain}`;
        weekSelect.appendChild(option);
    });
    
    weekSelect.value = currentValue;
}

function renderSchedule(lista) {
    if (!scheduleContainer) return;
    scheduleContainer.innerHTML = '';
    
    if (lista.length === 0) {
        scheduleContainer.innerHTML = '<p class="no-results">No hay turnos disponibles.</p>';
        return;
    }

    lista.forEach(item => {
        const card = document.createElement('div');
        card.className = 'schedule-card';
        
        const tasksHtml = item.tasks.map(t => `<li>${t}</li>`).join('');

        card.innerHTML = `
            <div>
                <div class="card-header">
                    <span class="week-badge">${item.week}</span>
                    <div class="card-actions">
                        <button class="icon-btn edit" onclick="openEditModal(${item.id})" title="Modificar"><i class="fa-solid fa-pen"></i></button>
                        <button class="icon-btn delete" onclick="deleteItem(${item.id})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="card-body">
                    <p class="date-text"><i class="fa-regular fa-calendar"></i> ${item.dates}</p>
                    <h3><i class="fa-solid fa-user-shield"></i> ${item.captain}</h3>
                    <ul class="tasks-list">
                        ${tasksHtml}
                    </ul>
                </div>
            </div>
        `;
        scheduleContainer.appendChild(card);
    });
}

// Filtrar al cambiar de opción en el menú
if (weekSelect) {
    weekSelect.addEventListener('change', (e) => {
        const seleccion = e.target.value;
        if (seleccion === 'all') {
            renderSchedule(scheduleData);
        } else {
            const filtrados = scheduleData.filter(item => item.week === seleccion);
            renderSchedule(filtrados);
        }
    });
}

function saveToLocalStorage() {
    localStorage.setItem('grupo5_schedule_v2', JSON.stringify(scheduleData));
    updateWeekSelector();
}

if (addBtn) {
    addBtn.addEventListener('click', () => {
        document.getElementById('modal-title').textContent = 'Agregar Nuevo Turno';
        document.getElementById('item-id').value = '';
        document.getElementById('week-input').value = `Semana ${scheduleData.length + 1}`;
        document.getElementById('date-input').value = '';
        document.getElementById('captain-input').value = '';
        document.getElementById('tasks-input').value = '';
        modal.style.display = 'flex';
    });
}

window.openEditModal = function(id) {
    const item = scheduleData.find(i => i.id === id);
    if (!item) return;

    document.getElementById('modal-title').textContent = 'Modificar Turno';
    document.getElementById('item-id').value = item.id;
    document.getElementById('week-input').value = item.week;
    document.getElementById('date-input').value = item.dates;
    document.getElementById('captain-input').value = item.captain;
    document.getElementById('tasks-input').value = item.tasks.join(', ');
    modal.style.display = 'flex';
};

if (closeModal) closeModal.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

if (scheduleForm) {
    scheduleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('item-id').value;
        const week = document.getElementById('week-input').value;
        const dates = document.getElementById('date-input').value;
        const captain = document.getElementById('captain-input').value;
        const tasks = document.getElementById('tasks-input').value.split(',').map(t => t.trim()).filter(t => t.length > 0);

        if (id) {
            const index = scheduleData.findIndex(i => i.id == id);
            if (index !== -1) {
                scheduleData[index] = { id: Number(id), week, dates, captain, tasks };
            }
        } else {
            const newId = scheduleData.length > 0 ? Math.max(...scheduleData.map(i => i.id)) + 1 : 1;
            scheduleData.push({ id: newId, week, dates, captain, tasks });
        }

        saveToLocalStorage();
        renderSchedule(scheduleData);
        modal.style.display = 'none';
    });
}

window.deleteItem = function(id) {
    if (confirm('¿Estás seguro de eliminar este turno del cronograma?')) {
        scheduleData = scheduleData.filter(i => i.id !== id);
        saveToLocalStorage();
        renderSchedule(scheduleData);
    }
};

if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        if (confirm('¿Restaurar los turnos predeterminados? Se perderán los cambios guardados.')) {
            scheduleData = [...defaultSchedule];
            saveToLocalStorage();
            renderSchedule(scheduleData);
        }
    });
}

// Inicializar
updateWeekSelector();
renderSchedule(scheduleData);