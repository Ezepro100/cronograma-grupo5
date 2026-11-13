const defaultSchedule = [
    {
        id: 1,
        week: "Semana 1",
        dates: "19 Noviembre",
        captain: "Daniel Casique",
        tasks: ["Baños, Auditorio principal, Plataforma, Pasillo y entrada principal, Sala B y lactantes, Patio trasero y pasillo, Proveedor de artículos"]
    },
    {
        id: 2,
        week: "Semana 2",
        dates: "10 Diciembre",
        captain: "Alberto Bardalez",
        tasks: ["Baños, Auditorio principal, Plataforma, Pasillo y entrada principal, Sala B y lactantes, Patio trasero y pasillo, Proveedor de artículos"]
    },
    {
        id: 3,
        week: "Semana 2",
        dates: "31 Diciembre",
        captain: "Marco Yovera",
        tasks: ["Baños, Auditorio principal, Plataforma, Pasillo y entrada principal, Sala B y lactantes, Patio trasero y pasillo, Proveedor de artículos"]
    }
    ,
    {
        id: 4,
        week: "Semana 2",
        dates: "21 Enero",
        captain: "Rodolfo Medrano",
        tasks: ["Baños, Auditorio principal, Plataforma, Pasillo y entrada principal, Sala B y lactantes, Patio trasero y pasillo, Proveedor de artículos"]
    }
    // Puedes agregar más semanas aquí si lo necesitas
];

// Cargar desde localStorage o usar valores por defecto
let scheduleData = JSON.parse(localStorage.getItem('grupo5_schedule')) || defaultSchedule;

// Elementos del DOM
const scheduleContainer = document.getElementById('schedule-container');
const modal = document.getElementById('modal');
const addBtn = document.getElementById('add-btn');
const resetBtn = document.getElementById('reset-btn');
const closeModal = document.getElementById('close-modal');
const scheduleForm = document.getElementById('schedule-form');

const modalTitle = document.getElementById('modal-title');
const itemIdInput = document.getElementById('item-id');
const weekInput = document.getElementById('week-input');
const dateInput = document.getElementById('date-input');
const captainInput = document.getElementById('captain-input');
const tasksInput = document.getElementById('tasks-input');

// Renderizar tarjetas en pantalla
function renderSchedule() {
    scheduleContainer.innerHTML = '';
    
    scheduleData.forEach(item => {
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

// Guardar en la memoria local del navegador
function saveToLocalStorage() {
    localStorage.setItem('grupo5_schedule', JSON.stringify(scheduleData));
}

// Abrir modal para crear nuevo turno
addBtn.addEventListener('click', () => {
    modalTitle.textContent = 'Agregar Nuevo Turno';
    itemIdInput.value = '';
    weekInput.value = `Semana ${scheduleData.length + 1}`;
    dateInput.value = '';
    captainInput.value = '';
    tasksInput.value = '';
    modal.style.display = 'flex';
});

// Abrir modal para editar turno existente
window.openEditModal = function(id) {
    const item = scheduleData.find(i => i.id === id);
    if (!item) return;

    modalTitle.textContent = 'Modificar Turno';
    itemIdInput.value = item.id;
    weekInput.value = item.week;
    dateInput.value = item.dates;
    captainInput.value = item.captain;
    tasksInput.value = item.tasks.join(', ');
    modal.style.display = 'flex';
};

// Cerrar modal
closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Manejar envío del formulario (Crear o Actualizar)
scheduleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = itemIdInput.value;
    const week = weekInput.value;
    const dates = dateInput.value;
    const captain = captainInput.value;
    const tasks = tasksInput.value.split(',').map(t => t.trim()).filter(t => t.length > 0);

    if (id) {
        // Actualizar
        const index = scheduleData.findIndex(i => i.id == id);
        if (index !== -1) {
            scheduleData[index] = { id: Number(id), week, dates, captain, tasks };
        }
    } else {
        // Crear nuevo
        const newId = scheduleData.length > 0 ? Math.max(...scheduleData.map(i => i.id)) + 1 : 1;
        scheduleData.push({ id: newId, week, dates, captain, tasks });
    }

    saveToLocalStorage();
    renderSchedule();
    modal.style.display = 'none';
});

// Eliminar un turno
window.deleteItem = function(id) {
    if (confirm('¿Estás seguro de eliminar este turno del cronograma?')) {
        scheduleData = scheduleData.filter(i => i.id !== id);
        saveToLocalStorage();
        renderSchedule();
    }
};

// Botón de restaurar datos originales
resetBtn.addEventListener('click', () => {
    if (confirm('¿Restaurar los turnos predeterminados? Se perderán los cambios guardados.')) {
        scheduleData = [...defaultSchedule];
        saveToLocalStorage();
        renderSchedule();
    }
});

// Inicializar app
renderSchedule();
