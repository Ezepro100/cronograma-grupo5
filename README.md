# Cronograma de Limpieza · Grupo 5

Sitio estático (GitHub Pages) con base de datos en **Firebase Firestore**.

| Página | Para quién | Qué hace |
|---|---|---|
| `index.html` | Todos | **Solo lectura.** Una tarjeta centrada con el turno **Anterior · Actual · Próximo** (botones, flechas ← → o deslizar en el celular). Muestra capitán, tareas y voluntarios asignados. Se actualiza en vivo. |
| `admin.html` | Administradores (entrar escribiendo `/admin.html` en la URL) | Login + CRUD de **semanas** (con asignación de voluntarios por cupo), **voluntarios** y **tareas base**. |

Sin configurar Firebase, el sitio funciona en **modo local** (datos solo en ese navegador) para probar.

## Estructura

```
index.html        Vista de usuario
admin.html        Vista de administrador
css/style.css     Estilos compartidos
js/firebase-config.js   ← tu configuración de Firebase
js/db.js          Capa de datos (Firestore o modo local)
js/cards.js       Tarjeta de semana (compartida)
js/user.js        Lógica vista usuario
js/admin.js       Lógica vista admin (CRUD)
js/common.js      Utilidades
js/icons.js       Iconos SVG embebidos (reemplaza FontAwesome)
js/seed.js        Datos iniciales
firestore.rules   Reglas de seguridad
fondo.webp        Fondo (30 KB, antes 120 KB)
```

## Configurar la base de datos (10 minutos, plan gratuito)

1. Entra a <https://console.firebase.google.com> → **Agregar proyecto** (puedes desactivar Analytics).
2. **Compilación → Firestore Database → Crear base de datos** → modo *producción* → región `southamerica-east1` (o la más cercana).
3. **Compilación → Authentication → Comenzar** → habilita **Correo electrónico/contraseña**.
   - En la pestaña **Usuarios → Agregar usuario**: crea la cuenta del administrador (correo + contraseña).
   - En **Configuración → Dominios autorizados** agrega `albertobardalez.github.io`.
4. **Firestore → Datos → Iniciar colección** `admins` → ID del documento = **el correo del admin en minúsculas** (ej. `alberto@gmail.com`) → agrega cualquier campo (ej. `rol: "admin"`). Repite por cada admin.
5. **Firestore → Reglas**: pega el contenido de `firestore.rules` → **Publicar**.
6. **Configuración del proyecto (⚙️) → Tus apps → Web (`</>`)** → registra la app → copia el objeto `firebaseConfig` en `js/firebase-config.js`.
7. Sube los cambios a GitHub. Entra a `admin.html`, inicia sesión y pulsa **Cargar datos iniciales** (carga las 4 semanas, tareas y capitanes actuales).

> La `apiKey` de Firebase **no es secreta**: identifica el proyecto. La seguridad la dan las reglas de `firestore.rules` (lectura pública solo de `semanas`; escritura solo para correos listados en `admins`).

## Modelo de datos

```js
semanas/{id}     { titulo, fecha: "2026-11-19", capitan, tareas: [{ nombre, cupos, voluntarios: ["Ana", ""] }] }
voluntarios/{id} { nombre }
plantilla/{id}   { nombre, cupos, orden }   // tareas base para semanas nuevas
admins/{email}   { rol }                     // solo se edita desde la consola
```

## Optimizaciones

- Sin FontAwesome (≈1 MB entre CSS y fuentes) → sprite SVG de ~4 KB.
- Fondo en WebP (30 KB vs 120 KB).
- Firebase se carga por demanda; la vista de usuario no descarga Auth.
- Caché offline de Firestore: la segunda visita abre al instante, incluso sin red.
- Tiempo real (`onSnapshot`): los cambios del admin aparecen sin recargar.
- Tareas con `<details>` nativo (accesible, sin JS para abrir/cerrar). Texto escapado contra XSS.
