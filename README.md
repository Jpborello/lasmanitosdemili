# 💅 Las Manitos de Mili - Sistema de Reservas y Gestión

¡Bienvenido al sistema de gestión y reservas de turnos para **Las Manitos de Mili**, un salón de manicuría y pedicuría profesional! Este proyecto fue desarrollado utilizando el framework de React **Next.js** y está pensado tanto para las clientas (reserva rápida de turnos, envío de opiniones) como para la administradora (gestión de turnos, control de precios, bloqueo de horarios no laborables, métricas de recaudación y aprobación de opiniones).

---

## 🛠️ Stack Tecnológico

*   **Frontend y Backend**: [Next.js 16 (App Router)](https://nextjs.org/) con React 19.
*   **Base de Datos**: [SQLite / LibSQL](https://github.com/tursodatabase/libsql-client-js) (usando Turso en producción, o archivo local `local.db` para desarrollo rápido).
*   **Estilos**: CSS Puro mediante [CSS Modules](https://nextjs.org/docs/app/building-your-application/styling/css-modules).
*   **Iconos**: [Lucide React](https://lucide.dev/).

---

## 📂 Estructura del Proyecto

El proyecto sigue la convención estándar del App Router de Next.js:

```text
lasmanitosdemili/
├── public/                 # Recursos estáticos (Logos, imágenes de la galería, robots.txt)
│   └── images/             # Imágenes reales del salón y trabajos de uñas
├── src/
│   ├── app/                # Enrutamiento principal y APIs
│   │   ├── admin/          # Panel administrativo y pantalla de inicio de sesión
│   │   │   ├── login/      # Formulario de autenticación admin
│   │   │   └── page.js     # Dashboard general (Métricas, Turnos, Servicios, Opiniones)
│   │   ├── api/            # Rutas de la API (Endpoints de backend)
│   │   │   ├── admin/      # APIs protegidas para el administrador (métricas, settings, etc.)
│   │   │   ├── appointments/# APIs para turnos y autocompletado
│   │   │   └── reviews/    # APIs de opiniones (públicas y pendientes)
│   │   ├── favicon.ico
│   │   ├── globals.css     # Estilos globales y variables de diseño CSS (paleta rosa/dorada)
│   │   ├── layout.js       # Estructura HTML raíz
│   │   └── page.js         # Entrada principal (Redirige a la Landing)
│   ├── components/         # Componentes de React (Interface de usuario)
│   │   ├── BookingCalendar.js # Calendario interactivo de reservas y formulario de cliente
│   │   └── Landing.js      # Página de presentación, galería de trabajos y bienvenida
│   ├── lib/
│   │   └── db.js           # Inicialización y definición del esquema de la Base de Datos
│   └── styles/             # Hojas de estilo CSS Modules
│       ├── admin.module.css
│       ├── booking.module.css
│       └── landing.module.css
├── .env.local              # Variables de entorno locales (credenciales de DB y Admin)
├── local.db                # Archivo local de la base de datos (se crea automáticamente)
├── package.json            # Script de ejecución y dependencias
└── README.md               # Este archivo de documentación
```

---

## 🗄️ Modelo y Esquema de Base de Datos (`src/lib/db.js`)

El archivo [db.js](file:///d:/_PROYECTOS/clientes/lasmanitosdemili/src/lib/db.js) se encarga de conectar la base de datos y correr migraciones automáticas al iniciar la aplicación. Si las tablas no existen, las crea y las rellena con datos de prueba (*seed data*).

El esquema está compuesto por 4 tablas principales:

### 1. `appointments` (Turnos)
Guarda los turnos agendados por las clientas.
*   `id` (TEXT, PRIMARY KEY): Identificador único (UUID v4).
*   `client_name` (TEXT, NOT NULL): Nombre completo del cliente.
*   `client_phone` (TEXT, NOT NULL): Teléfono de contacto.
*   `client_email` (TEXT): Email opcional.
*   `appointment_date` (TEXT, NOT NULL): Fecha seleccionada (Formato `YYYY-MM-DD`).
*   `appointment_time` (TEXT, NOT NULL): Hora seleccionada (Formato `HH:MM`).
*   `service` (TEXT, NOT NULL): ID del servicio contratado.
*   `price` (INTEGER): Precio acordado al momento de reservar.
*   `created_at` (TEXT, NOT NULL): Fecha y hora de creación.

### 2. `services` (Servicios)
Lista de servicios de manicuría y pedicuría ofrecidos y configurables por el administrador.
*   `id` (TEXT, PRIMARY KEY): ID del servicio (Ej. `kapping`, `soft_gel`, `semi_mani`).
*   `category` (TEXT, NOT NULL): Categoría (`manicura` o `pedicura`).
*   `name` (TEXT, NOT NULL): Nombre del servicio para mostrar.
*   `price` (INTEGER, NOT NULL): Costo en pesos.
*   `duration` (TEXT, NOT NULL): Tiempo estimado (Ej. `90 min`).

### 3. `reviews` (Opiniones)
Sistema de testimonios con moderación integrada.
*   `id` (TEXT, PRIMARY KEY): UUID de la opinión.
*   `client_name` (TEXT, NOT NULL): Nombre del cliente.
*   `comment` (TEXT, NOT NULL): Texto de la reseña.
*   `rating` (INTEGER, NOT NULL): Valoración (de 1 a 5 estrellas).
*   `status` (TEXT, NOT NULL): Estado para filtrado (`pending` o `approved`).
*   `created_at` (TEXT, NOT NULL): Fecha de creación.

### 4. `settings` (Configuración de Bloqueos)
Almacena reglas de negocio y restricciones dinámicas en formato Clave-Valor:
*   `key` (TEXT, PRIMARY KEY): Identificador de la opción.
*   `value` (TEXT, NOT NULL): Valor guardado.
*   *Configuraciones Disponibles*:
    *   `enable_18_weekday` (`'true'` / `'false'`): Activa o desactiva el turno tardío de las 18:00hs en días hábiles.
    *   `blocked_weekdays` (Ej. `'0'`): Días de la semana cerrados por defecto (0 = Domingo, 1 = Lunes, etc.).
    *   `blocked_dates` (Ej. `'2026-07-30'`): Fechas específicas no disponibles por feriado, vacaciones o descanso.
    *   `blocked_slots` (Ej. `'2026-07-28_10:00'`): Bloqueo selectivo de un día y horario en particular.

---

## 👥 Flujo de Usuario (Cliente)

El flujo de navegación público está optimizado para agendar turnos de forma extremadamente sencilla y veloz:

1.  **Onboarding inicial (Paso Obligatorio)**:
    Al ingresar al sitio por primera vez (validado mediante `localStorage`), se muestra una pantalla de bienvenida.
    *   El usuario debe ingresar su **Celular** y **Nombre** (Email es opcional).
    *   **Acceso Admin Oculto**: Si el teléfono ingresado es `3413022674` (El teléfono de Mili), el sistema despliega dinámicamente un campo de contraseña para que la administradora inicie sesión.
2.  **Visualización**:
    Una vez ingresados los datos, se guarda la sesión localmente y se recarga la vista. La clienta puede ver la sección "Sobre mí", explorar el listado de servicios dinámicos con sus precios vigentes, y ver la galería de fotos.
3.  **Reserva de Turnos (Calendario Interactivo)**:
    Usa el componente [BookingCalendar.js](file:///d:/_PROYECTOS/clientes/lasmanitosdemili/src/components/BookingCalendar.js).
    *   **Paso 1**: La clienta elige un Servicio de la lista.
    *   **Paso 2**: Elige una fecha disponible en el calendario (los domingos y fechas bloqueadas por vacaciones se muestran deshabilitados).
    *   **Paso 3**: Al hacer clic en un día, se realiza una petición API para ver qué turnos ya están tomados y se generan dinámicamente las horas libres:
        *   *Lunes a Viernes*: `08:00`, `10:00`, `14:00`, `16:00` y `18:00` (esta última si está activa).
        *   *Sábados*: `08:00`, `10:00`, `12:00`, `14:00`, `16:00` y `18:00`.
    *   **Paso 4**: Los datos del formulario se pre-completan solos gracias al almacenamiento del onboarding, y si ya había agendado previamente, la API de autocompletado busca su última sesión para evitar repetir tipeos. Se confirma el turno y se guarda en la base de datos de manera inmediata.
4.  **Opiniones (Reviews)**:
    Cualquier clienta puede rellenar un formulario para dejar una valoración. Su comentario ingresa con estado `'pending'` para que la administradora lo apruebe antes de aparecer públicamente en la home.

---

## 👑 Flujo de Administración (Dashboard)

Para acceder al área administrativa, se puede iniciar sesión desde el onboarding de la home con el celular administrador o directamente navegando a `/admin` (que redirige al login `/admin/login` si no hay sesión activa). El token de autenticación se valida y almacena mediante cookies HttpOnly seguras.

El panel se compone de 5 secciones principales navegables mediante pestañas:

1.  **Turnos (Gestión de Agenda)**:
    *   **Vista Diaria**: Filtra los turnos de cualquier fecha seleccionada. Muestra datos del cliente (nombre, teléfono para WhatsApp rápido, email, servicio reservado y precio).
    *   **Vista General (Próximos)**: Lista cronológica de todos los turnos agendados de hoy en adelante.
    *   **Cancelar Turno**: Permite dar de baja un turno con un clic, eliminándolo físicamente de la base de datos para liberar el espacio.
2.  **Servicios (Edición de Precios)**:
    *   Muestra un listado interactivo con todos los servicios y sus precios actuales.
    *   Permite modificar los precios e impactar los cambios masivos a la base de datos de inmediato.
3.  **Opiniones (Moderación)**:
    *   Permite ver la cola de testimonios entrantes.
    *   **Aprobar**: Cambia el estado de una opinión a `'approved'` para que sea visible en el carrusel de la página de inicio.
    *   **Eliminar**: Borra de la base de datos los comentarios considerados spam o no deseados.
4.  **Configuración (Restricciones y Bloqueos)**:
    *   **Turno 18:00hs**: Un interruptor rápido (switch) para decidir si el horario de las 18:00hs de Lunes a Viernes está disponible o no.
    *   **Bloqueo de Días**: Permite definir qué días de la semana no se trabaja (por defecto, domingos).
    *   **Bloqueo de Fechas Completas**: Permite registrar fechas específicas (Ej. feriados o vacaciones) para que el calendario no permita reservar en esos días.
    *   **Bloqueo de Horas Específicas**: Permite inhabilitar una hora puntual de un día específico (Ej. cerrar el bloque del Martes a las 10:00hs por un turno médico).
5.  **Métricas (Estadísticas y Facturación)**:
    *   **Métricas Financieras**: Calcula el total de turnos agendados y la recaudación total acumulada en tres periodos:
        *   **Hoy**
        *   **Semana Actual** (Lunes a Domingo)
        *   **Mes en Curso**
    *   **Ranking de Clientes**: Un reporte que lista a las 15 clientas más recurrentes ordenadas de mayor a menor según el monto total que han abonado en sus servicios, ideal para programas de fidelización.

---

## 🚦 Endpoints de la API (`src/app/api/...`)

El proyecto cuenta con las siguientes APIs desarrolladas bajo el estándar Next.js Route Handlers:

### Turnos y Clientes
*   `GET /api/appointments`:
    *   *Si es público*: Pide la query `?date=YYYY-MM-DD`. Retorna los horarios reservados para deshabilitarlos en el calendario.
    *   *Si es administrador*: Retorna los detalles completos de todos los turnos del día o todos los próximos turnos si se llama con `?all=true`.
*   `POST /api/appointments`: Valida la fecha, comprueba si no está bloqueada, valida que el slot no esté duplicado, busca el precio actual del servicio y guarda el turno.
*   `DELETE /api/appointments?id=UUID`: Cancela una cita (requiere autorización de administrador).
*   `GET /api/appointments/autocomplete?phone=xxx`: Busca la cita más reciente del número telefónico provisto para retornar el nombre y email guardados previamente.

### Opiniones (Reviews)
*   `GET /api/reviews`: Obtiene la lista de opiniones aprobadas (`status = 'approved'`) ordenadas por fecha para mostrarlas en la landing page.
*   `POST /api/reviews`: Crea una nueva opinión en estado `'pending'`.
*   `GET /api/admin/reviews`: Obtiene todas las opiniones para moderación (Admin).
*   `POST /api/admin/reviews`: Aprueba una opinión mediante su `{ id }`.
*   `DELETE /api/admin/reviews?id=UUID`: Elimina una opinión de la base de datos.

### Ajustes, Precios y Métricas (Solo Admin)
*   `POST /api/admin/login`: Valida la clave contra `ADMIN_PASSWORD` y setea la cookie de sesión.
*   `GET /api/admin/login`: Chequea si el token de administrador es válido.
*   `DELETE /api/admin/login`: Borra la cookie de sesión (Cierre de sesión).
*   `GET /api/admin/metrics`: Ejecuta consultas SQL agrupadas para calcular recaudaciones mensuales/semanales/diarias y el ranking de clientes.
*   `GET /api/admin/services`: Trae la lista de servicios.
*   `POST /api/admin/services`: Recibe un JSON de precios actualizados e impacta los cambios en base de datos.
*   `GET /api/admin/settings`: Trae los bloqueos y ajustes vigentes.
*   `POST /api/admin/settings`: Actualiza o agrega valores de configuración para bloqueos y habilitaciones horarias.

---

## 💻 Configuración Local para Desarrollo

Para que tu amigo programador empiece a correr el proyecto en su máquina, debe seguir estos pasos sencillos:

1.  **Clonar el repositorio**:
    ```bash
    git clone <url-del-repositorio>
    cd lasmanitosdemili
    ```

2.  **Instalar las dependencias**:
    ```bash
    npm install
    ```

3.  **Configurar las Variables de Entorno**:
    Crear un archivo `.env.local` en la raíz del proyecto. Si desea correr la base de datos de manera local (SQLite en archivo), basta con configurar la contraseña y la ruta local de la base de datos:
    ```env
    # Contraseña para acceder al panel administrador
    ADMIN_PASSWORD=miliadmin123

    # Para usar SQLite local (Se creará el archivo local.db automáticamente al arrancar)
    DATABASE_URL=file:local.db
    # Si usas base de datos local, puedes dejar el TOKEN vacío
    DATABASE_AUTH_TOKEN=
    ```

4.  **Correr el Servidor de Desarrollo**:
    ```bash
    npm run dev
    ```
    Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 🚀 Despliegue en Producción

### 1. Base de Datos en la Nube (Turso / LibSQL)
Dado que Vercel tiene funciones Serverless que destruyen el almacenamiento local de archivos de manera constante, **no se debe usar `file:local.db` en producción**.
Recomendamos crear una base de datos gratis en **[Turso](https://turso.tech/)**:
1. Crea una cuenta e instala Turso CLI.
2. Ejecuta `turso db create lasmanitosdemili`.
3. Obtén la URL de conexión y el Token de acceso (`turso db show lasmanitosdemili` y `turso db tokens create lasmanitosdemili`).
4. Reemplaza los valores `DATABASE_URL` y `DATABASE_AUTH_TOKEN` en las variables de entorno de producción.

### 2. Frontend en Vercel
El proyecto está optimizado para ser desplegado con un solo clic en **[Vercel](https://vercel.com/)**:
1. Importa tu repositorio Git en Vercel.
2. Agrega las siguientes variables en el panel de configuración de Vercel (*Environment Variables*):
   *   `ADMIN_PASSWORD` (Tu contraseña de administrador deseada)
   *   `DATABASE_URL` (La URL que te dio Turso)
   *   `DATABASE_AUTH_TOKEN` (El Token de Turso)
3. Haz clic en **Deploy**. ¡Listo!
