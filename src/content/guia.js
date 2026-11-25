'use strict';
/**
 * Contenido de la guía de uso: todo el texto que el sistema le explica a cada rol.
 * Las vistas y el recorrido guiado solo leen de aquí; para cambiar un texto se edita este archivo.
 */

const ROLES = ['ESTUDIANTE', 'FUNCIONARIO', 'ADMINISTRADOR', 'SUPERVISOR'];

const GUIA = {
  ESTUDIANTE: {
    nombre: 'Estudiante',
    resumen:
      'Tú pides los trámites: registras una solicitud, la sigues desde tu panel y recibes un aviso cada vez que avanza.',
    puedes: [
      'Registrar solicitudes de certificados, matrícula, apoyo financiero, bienestar, soporte o biblioteca.',
      'Ver el estado y el historial completo de tus solicitudes.',
      'Recibir avisos en el sistema (y por correo, si está activado) cuando algo cambia.',
      'Cambiar tu contraseña en «Mi cuenta».',
    ],
    noPuedes: [
      'Ver solicitudes de otras personas.',
      'Editar o cancelar una solicitud ya enviada.',
      'Asignar, resolver o cerrar solicitudes: eso lo hace el personal.',
    ],
    tareas: [
      {
        titulo: 'Registrar una solicitud',
        pasos: [
          'Entra a «Nueva solicitud» en el menú o con el botón amarillo del panel.',
          'Elige la categoría que mejor describe tu trámite.',
          'Marca la prioridad. Usa «Alta» solo si tienes una fecha límite cercana.',
          'Cuéntanos qué necesitas con el mayor detalle posible (mínimo 10 caracteres).',
          'Pulsa «Registrar solicitud». Te mostramos el código, por ejemplo SOL-2026-00031: guárdalo para consultas.',
        ],
      },
      {
        titulo: 'Saber en qué va tu solicitud',
        pasos: [
          'Abre «Mis solicitudes» y busca por código o filtra por estado.',
          'Pulsa «Abrir»: arriba verás el estado y abajo el historial, con quién hizo cada cambio y cuándo.',
          'Cuando la solicitud esté «Resuelta», ahí mismo aparece la solución que escribió el funcionario.',
        ],
      },
      {
        titulo: 'Enterarte de los cambios',
        pasos: [
          'La campana naranja y la opción «Avisos» muestran cuántos avisos tienes sin leer.',
          'Con el sistema abierto, cuando llega un aviso nuevo suena una campanita y sale un cartel arriba a la derecha. El botón del parlante, bajo la campana, silencia o activa el sonido (el navegador solo permite sonar después de que tocas la página una vez).',
          'Pulsa «Ver solicitud» en un aviso: se abre la solicitud y el aviso queda leído.',
          'Si el sistema tiene correo activado, recibes además un correo en cada cambio.',
        ],
      },
    ],
    faq: [
      ['¿Puedo cambiar o cancelar una solicitud que ya envié?', 'No. Si te equivocaste, registra una nueva y explica la situación en la descripción.'],
      ['¿Quién puede ver mi solicitud?', 'Tú, el funcionario que la atiende, los administradores y el supervisor.'],
      ['¿Por qué fue rechazada mi solicitud?', 'Quien la rechazó escribe el motivo y lo ves en el historial. Si crees que fue un error, registra una nueva con más detalle.'],
      ['La solución no es lo que pedí. ¿Qué hago?', 'Escribe a soporte: un administrador puede reabrir la solicitud una vez cerrada, indicando el motivo.'],
      ['Olvidé mi contraseña.', 'Pídele a un administrador que te asigne una nueva y cámbiala después en «Mi cuenta».'],
    ],
  },

  FUNCIONARIO: {
    nombre: 'Funcionario',
    resumen:
      'Atiendes las solicitudes que el administrador te asigna: las inicias, dejas observaciones y las resuelves con una solución escrita.',
    puedes: [
      'Ver las solicitudes que te asignaron.',
      'Iniciar la atención y dejar observaciones en el historial.',
      'Resolver una solicitud escribiendo la solución aplicada.',
      'Cerrar una solicitud resuelta, o rechazar una recién asignada indicando el motivo.',
    ],
    noPuedes: [
      'Ver solicitudes de otros funcionarios ni asignarte solicitudes.',
      'Reabrir una solicitud cerrada: lo hace un administrador.',
      'Modificar el historial: queda guardado tal como ocurrió.',
    ],
    tareas: [
      {
        titulo: 'Atender una solicitud',
        pasos: [
          'Abre «Mis asignadas». Empieza por las que están en estado «Asignada».',
          'Entra a la solicitud, lee la descripción y pulsa «Iniciar atención»: pasa a «En proceso».',
          'Mientras trabajas, usa «Agregar observación» para dejar notas en el historial (por ejemplo, si pides un dato al estudiante).',
        ],
      },
      {
        titulo: 'Resolver y cerrar',
        pasos: [
          'Cuando termines, escribe en «Solución aplicada» qué hiciste y cómo lo recibe el estudiante. Es obligatorio y él la lee tal cual.',
          'Pulsa «Resolver». El estudiante recibe un aviso.',
          'Cuando confirmes que quedó atendido, pulsa «Cerrar solicitud» y escribe una observación de cierre.',
        ],
      },
      {
        titulo: 'Rechazar una solicitud',
        pasos: [
          'Solo puedes rechazar una solicitud que está «Asignada» (todavía sin iniciar).',
          'Escribe el motivo del rechazo: el estudiante lo verá en el historial.',
          'Confirma. El rechazo es un estado final y no se puede deshacer.',
        ],
      },
    ],
    faq: [
      ['No veo ninguna solicitud.', 'Solo ves las que el administrador te asignó. Cuando te asignen una recibirás un aviso.'],
      ['¿Qué escribo en la solución?', 'Lo que hiciste y cómo continúa el estudiante, por ejemplo «Certificado enviado a tu correo institucional».'],
      ['Me equivoqué al resolver.', 'El historial no se puede editar. Cierra la solicitud y pide a un administrador que la reabra con el motivo; luego pulsa «Retomar atención».'],
      ['¿Para qué sirve «Reabierta»?', 'Es una solicitud cerrada que se volvió a abrir porque la solución no fue suficiente. Te llega un aviso y debes retomarla.'],
    ],
  },

  ADMINISTRADOR: {
    nombre: 'Administrador',
    resumen:
      'Eres quien organiza el trabajo: toda solicitud nueva pasa primero por ti. La asignas a un funcionario (o la rechazas con motivo), cambias de responsable si hace falta, cierras las resueltas, reabres las cerradas y gestionas usuarios, categorías y reportes.',
    puedes: [
      'Ver todas las solicitudes y filtrarlas por estado, categoría o responsable.',
      'Asignar una solicitud nueva a un funcionario y reasignarla mientras esté Asignada, En proceso o Reabierta.',
      'Rechazar (cancelar) una solicitud con motivo, mientras esté Registrada o Asignada.',
      'Cerrar las solicitudes resueltas y reabrir las cerradas, indicando el motivo.',
      'Crear, editar, cambiar el rol, restablecer la contraseña y desactivar usuarios.',
      'Crear, renombrar y desactivar categorías de solicitud.',
      'Ver reportes con filtros y exportarlos a CSV.',
    ],
    noPuedes: [
      'Atender ni resolver solicitudes: eso lo hace el funcionario asignado.',
      'Rechazar una solicitud que ya está En proceso, Resuelta o Cerrada: debe terminar su ciclo.',
      'Deshacer un rechazo: es un estado final, y el estudiante debe registrar una solicitud nueva.',
      'Borrar usuarios, categorías ni historial: solo se desactivan.',
      'Cambiar tu propio rol ni desactivarte a ti mismo.',
    ],
    tareas: [
      {
        titulo: 'Tu rutina de cada día',
        pasos: [
          'Entra al panel: la tarjeta «Por asignar» te dice cuántas solicitudes nuevas esperan responsable, y «Avisos» te muestra las que llegaron mientras no estabas.',
          'Asigna cada una a un funcionario, o recházala si no corresponde. Mientras más rápido tenga responsable, más rápido empieza el trámite.',
          'En «Solicitudes» filtra por estado «Asignada» o «En proceso» para ver las que llevan tiempo sin avanzar. Si un funcionario está sobrecargado, reasigna.',
          'Cierra las que estén «Resuelta» cuando confirmes que quedaron atendidas.',
          'De vez en cuando abre «Reportes» para revisar la carga por funcionario y los tiempos de resolución.',
        ],
      },
      {
        titulo: 'Asignar una solicitud nueva',
        pasos: [
          'En el panel, la tarjeta «Por asignar» te dice cuántas esperan responsable. Púlsala para verlas, o abre una desde «Avisos».',
          'Abre la solicitud: en «Acciones» verás «Asignar responsable».',
          'Elige un funcionario activo en la lista y, si quieres, escribe una nota (por ejemplo, qué debe revisar primero).',
          'Pulsa «Asignar»: la solicitud pasa a «Asignada», el funcionario y el estudiante reciben un aviso y todo queda en el historial.',
        ],
      },
      {
        titulo: 'Cambiar de responsable (reasignar)',
        pasos: [
          'Abre la solicitud. Mientras esté «Asignada», «En proceso» o «Reabierta», en «Acciones» aparece «Reasignar responsable» en lugar de «Asignar».',
          'Elige al nuevo funcionario y escribe una nota con el motivo del cambio.',
          'Pulsa «Reasignar»: el nuevo responsable recibe un aviso y el cambio queda en el historial. El estado de la solicitud no cambia.',
        ],
      },
      {
        titulo: 'Rechazar (cancelar) una solicitud',
        pasos: [
          'Solo se puede mientras esté «Registrada» o «Asignada». Una solicitud «En proceso» ya no se rechaza: déjala terminar o reasígnala si hay un problema.',
          'Abre la solicitud y, en «Acciones», escribe el «Motivo del rechazo». Es obligatorio y el estudiante lo verá en el historial, así que sé claro (por ejemplo: «Es un trámite de otra institución» o «Duplicada de otra solicitud»).',
          'Pulsa el botón rojo «Rechazar»: la solicitud pasa a «Rechazada» y el estudiante recibe un aviso con el motivo.',
          'Es un estado final: no se puede reabrir ni deshacer. Si fue un error, el estudiante debe registrar una solicitud nueva.',
        ],
      },
      {
        titulo: 'Cerrar una solicitud resuelta',
        pasos: [
          'Cuando el funcionario resuelve, la solicitud queda «Resuelta» y se muestra la solución aplicada. Léela y confirma que atiende lo pedido.',
          'En «Acciones», escribe una observación de cierre si quieres (es opcional) y pulsa «Cerrar solicitud». También puede cerrarla el funcionario responsable.',
          'La solicitud queda «Cerrada»: el trámite terminó y el estudiante recibe un aviso.',
        ],
      },
      {
        titulo: 'Reabrir una solicitud cerrada',
        pasos: [
          'Si el estudiante reporta que la solución no sirvió, abre la solicitud cerrada.',
          'Escribe el «Motivo de la reapertura» (obligatorio) y pulsa «Reabrir».',
          'La solicitud pasa a «Reabierta» y el funcionario responsable recibe un aviso para pulsar «Retomar atención». Si hace falta otra persona, reasígnala.',
        ],
      },
      {
        titulo: 'Crear un usuario',
        pasos: [
          'Entra a «Usuarios» y pulsa «Nuevo usuario».',
          'Escribe nombre y correo reales, elige el rol y define una contraseña inicial (mínimo 8 caracteres, con letras y números).',
          'Entrega la contraseña a la persona y pídele que la cambie en «Mi cuenta» en su primer ingreso.',
        ],
      },
      {
        titulo: 'Cambiar el rol, restablecer la contraseña o desactivar a alguien',
        pasos: [
          'En «Usuarios», pulsa «Editar» en la fila de la persona.',
          'Puedes cambiar su nombre y su rol. Si olvidó la contraseña, escribe una nueva y pídele que la cambie en «Mi cuenta».',
          'Para quitarle el acceso usa «Desactivar»: no se borra, para conservar el historial, y puedes volver a activarla cuando quieras.',
          'No puedes cambiar tu propio rol ni desactivarte a ti mismo.',
        ],
      },
      {
        titulo: 'Ordenar las categorías',
        pasos: [
          'En «Categorías» puedes renombrar, describir y desactivar cada una.',
          'Una categoría desactivada deja de ofrecerse en solicitudes nuevas; las que ya existen no cambian.',
          'Las categorías nuevas se agregan con el formulario de la derecha.',
        ],
      },
      {
        titulo: 'Sacar reportes',
        pasos: [
          'En «Reportes» filtra por fechas, estado, categoría o responsable y pulsa «Generar».',
          'Revisa las gráficas por estado, categoría y prioridad, y la carga por responsable.',
          'Pulsa «Exportar CSV» para llevar exactamente lo filtrado a una hoja de cálculo.',
        ],
      },
    ],
    faq: [
      ['¿Cómo cancelo una solicitud?', 'En el sistema se llama «Rechazar»: abre la solicitud, escribe el motivo y pulsa «Rechazar». Solo se puede mientras esté Registrada o Asignada, y no se deshace.'],
      ['¿Puedo rechazar una solicitud que ya está en proceso?', 'No. Una vez que el funcionario empezó, la solicitud debe llegar a «Resuelta» y luego «Cerrada». Si hay un problema, reasígnala a otro funcionario.'],
      ['Me equivoqué al asignar. ¿Qué hago?', 'Usa «Reasignar» y elige al funcionario correcto. El nuevo responsable recibe el aviso y el cambio queda en el historial.'],
      ['¿Por qué no veo el botón «Asignar»?', '«Asignar» solo aparece cuando la solicitud está «Registrada». Después verás «Reasignar», mientras esté Asignada, En proceso o Reabierta. Si está Resuelta, Cerrada o Rechazada, ya no se cambia el responsable.'],
      ['¿El estudiante se entera de lo que hago?', 'Sí. Cada asignación, rechazo, cierre o reapertura le genera un aviso en el sistema (y por correo si está configurado) y queda en el historial.'],
      ['¿Quién puede cerrar una solicitud?', 'Tú o el funcionario responsable, cuando la solicitud está «Resuelta».'],
      ['¿Puedo borrar un usuario?', 'No: se desactiva. Así el historial siempre conserva quién hizo cada cosa.'],
      ['Alguien olvidó su contraseña.', 'Edita su usuario y escribe una contraseña nueva; luego pídele que la cambie en «Mi cuenta».'],
      ['¿Qué pasa si desactivo una categoría?', 'Ya no aparece al registrar solicitudes nuevas. Las solicitudes existentes la conservan.'],
    ],
  },

  SUPERVISOR: {
    nombre: 'Supervisor',
    resumen:
      'Vigilas el servicio completo: consultas cualquier solicitud y analizas los reportes, siempre en modo lectura.',
    puedes: [
      'Ver todas las solicitudes con su historial.',
      'Generar reportes con filtros y exportarlos a CSV.',
      'Recibir avisos y cambiar tu contraseña en «Mi cuenta».',
    ],
    noPuedes: [
      'Crear, asignar, resolver ni cambiar solicitudes.',
      'Gestionar usuarios ni categorías.',
    ],
    tareas: [
      {
        titulo: 'Leer un reporte',
        pasos: [
          'Entra a «Reportes». Arriba ves el total de solicitudes y las horas promedio de resolución.',
          'Filtra por fechas, estado, categoría o responsable y pulsa «Generar».',
          'Las gráficas muestran la distribución por estado, categoría y prioridad; la tabla «Carga por responsable» compara a los funcionarios.',
        ],
      },
      {
        titulo: 'Exportar los datos',
        pasos: [
          'Aplica los filtros que necesites.',
          'Pulsa «Exportar CSV»: el archivo respeta los mismos filtros y se abre en Excel o Google Sheets.',
        ],
      },
      {
        titulo: 'Revisar una solicitud concreta',
        pasos: [
          'En «Solicitudes» busca por código o filtra por estado y responsable.',
          'Pulsa «Abrir» para ver los datos y el historial completo, solo en lectura.',
        ],
      },
    ],
    faq: [
      ['¿Qué significan las horas promedio de resolución?', 'Es el tiempo promedio entre que se registra una solicitud y la primera vez que queda «Resuelta».'],
      ['¿Por qué no puedo modificar una solicitud?', 'Tu rol es de consulta. Los cambios los hacen el administrador y los funcionarios.'],
    ],
  },
};

/** Qué significa cada estado, quién actúa y a dónde puede ir. */
const ESTADOS_GUIA = [
  { nombre: 'REGISTRADA', significa: 'La solicitud llegó y espera que un administrador le asigne un responsable.', actua: 'Administrador', sigue: 'Asignada o Rechazada' },
  { nombre: 'ASIGNADA', significa: 'Ya tiene un funcionario responsable, que todavía no empieza.', actua: 'Funcionario (el administrador puede reasignar o rechazar)', sigue: 'En proceso o Rechazada' },
  { nombre: 'EN_PROCESO', significa: 'El funcionario está trabajando en ella y puede dejar observaciones.', actua: 'Funcionario (el administrador puede reasignar)', sigue: 'Resuelta' },
  { nombre: 'RESUELTA', significa: 'El funcionario escribió la solución. Falta cerrarla.', actua: 'Funcionario o administrador', sigue: 'Cerrada' },
  { nombre: 'CERRADA', significa: 'El trámite terminó y ya no se modifica.', actua: 'Administrador', sigue: 'Reabierta (con motivo)' },
  { nombre: 'REABIERTA', significa: 'Se volvió a abrir porque la solución no fue suficiente.', actua: 'Funcionario (el administrador puede reasignar)', sigue: 'En proceso' },
  { nombre: 'RECHAZADA', significa: 'No se atenderá. El motivo queda en el historial. Es un estado final.', actua: '—', sigue: 'Ninguno' },
];

/** Qué hacer ahora según el rol y el estado (se muestra en el detalle de cada solicitud). */
const AYUDA_ESTADO = {
  ESTUDIANTE: {
    REGISTRADA: 'Tu solicitud llegó. Un administrador la revisará y la asignará a un funcionario; no necesitas hacer nada.',
    ASIGNADA: 'Ya tiene un responsable. En breve empezará la atención y recibirás un aviso.',
    EN_PROCESO: 'Están trabajando en tu solicitud. Revisa el historial por si dejan alguna observación.',
    RESUELTA: 'Ya tiene solución (arriba). En breve la cerrarán. Si no es lo que pedías, escribe a soporte.',
    CERRADA: 'El trámite terminó. Si la solución no corresponde a lo que pedías, pide a un administrador que la reabra.',
    REABIERTA: 'Se volvió a abrir y el funcionario la atenderá de nuevo.',
    RECHAZADA: 'No se atenderá. El motivo está en el historial. Si lo necesitas, registra una nueva solicitud con más detalle.',
  },
  FUNCIONARIO: {
    REGISTRADA: 'Todavía no está asignada.',
    ASIGNADA: 'Te la asignaron. Pulsa «Iniciar atención» para comenzar, o recházala con motivo si no corresponde.',
    EN_PROCESO: 'La estás atendiendo. Deja observaciones en el historial y, al terminar, escribe la solución y pulsa «Resolver».',
    RESUELTA: 'Ya escribiste la solución. Ciérrala cuando el estudiante haya recibido lo que pidió.',
    CERRADA: 'El trámite terminó. Solo un administrador puede reabrirla.',
    REABIERTA: 'La reabrieron porque la solución no fue suficiente. Revisa el motivo en el historial y pulsa «Retomar atención».',
    RECHAZADA: 'Estado final: no admite más cambios.',
  },
  ADMINISTRADOR: {
    REGISTRADA: 'Asígnala a un funcionario o recházala (cancelarla) escribiendo el motivo.',
    ASIGNADA: 'Esperando que el funcionario inicie. Puedes reasignarla, o rechazarla con motivo si no corresponde.',
    EN_PROCESO: 'En atención. Ya no se puede rechazar; si hace falta, reasigna el responsable.',
    RESUELTA: 'Puedes cerrarla cuando confirmes que quedó atendida.',
    CERRADA: 'Si el estudiante reporta un problema, puedes reabrirla indicando el motivo.',
    REABIERTA: 'Esperando que el funcionario retome la atención. Puedes reasignarla.',
    RECHAZADA: 'Estado final: no admite más cambios.',
  },
  SUPERVISOR: {},
};
const AYUDA_SUPERVISOR = 'Estás en modo consulta: puedes ver el estado y el historial, pero no modificar la solicitud.';

/** Ayuda breve de cada pantalla, por rol. */
const AYUDA_PAGINA = {
  solicitudes: {
    ESTUDIANTE: { texto: 'Aquí están todas las solicitudes que has registrado. Busca por código o por una palabra de la descripción, o filtra por estado. Pulsa «Abrir» para ver el historial completo.' },
    FUNCIONARIO: { texto: 'Solo aparecen las solicitudes que el administrador te asignó. Empieza por las «Asignada»: están esperando que las inicies. Filtra por estado para organizar tu trabajo.' },
    ADMINISTRADOR: { texto: 'Todas las solicitudes del sistema. Filtra por estado «Registrada» y responsable «Sin asignar» para ver las que esperan responsable, o por funcionario para ver su carga.' },
    SUPERVISOR: { texto: 'Consulta general de todas las solicitudes, en solo lectura. Usa los filtros para revisar por estado, categoría o responsable.' },
  },
  detalle: {
    ESTUDIANTE: { texto: 'Aquí ves tu solicitud completa. El recuadro amarillo te dice qué significa el estado actual, y el historial muestra cada paso con quién lo hizo y cuándo.' },
    FUNCIONARIO: {
      texto: 'En «Acciones» solo aparecen los botones que puedes usar según el estado:',
      pasos: [
        'Asignada: pulsa «Iniciar atención» para empezar (o «Rechazar» con motivo si no corresponde).',
        'En proceso: deja observaciones en el historial y, al terminar, escribe la solución y pulsa «Resolver».',
        'Resuelta: puedes cerrarla. Reabierta: pulsa «Retomar atención».',
      ],
    },
    ADMINISTRADOR: {
      texto: 'En «Acciones» solo aparecen los botones que puedes usar según el estado:',
      pasos: [
        'Registrada: «Asignar» a un funcionario, o «Rechazar» (cancelar) escribiendo el motivo.',
        'Asignada, En proceso o Reabierta: «Reasignar» para cambiar de responsable. Asignada también se puede rechazar.',
        'Resuelta: «Cerrar solicitud». Cerrada: «Reabrir» con motivo. Rechazada es final.',
      ],
    },
    SUPERVISOR: { texto: 'Esta pantalla es de consulta: ves el estado, la solución y el historial completo, pero no puedes modificar la solicitud.' },
  },
  nueva: {
    ESTUDIANTE: {
      texto: 'Llenar este formulario toma un minuto:',
      pasos: [
        'Elige la categoría que mejor describe tu trámite.',
        'Marca la prioridad. «Alta» solo si tienes una fecha límite cercana.',
        'Describe qué necesitas con detalle: entre más claro, más rápido te atienden.',
        'Pulsa «Registrar solicitud». Guarda el código que te mostramos.',
      ],
    },
  },
  usuarios: {
    ADMINISTRADOR: { texto: 'Aquí das de alta a estudiantes, funcionarios, supervisores y otros administradores. Nadie se borra: si alguien ya no debe entrar, desactívalo y el historial se conserva.' },
  },
  'usuario-formulario': {
    ADMINISTRADOR: {
      texto: 'Datos del usuario:',
      pasos: [
        'Usa el nombre y el correo reales: el correo es con el que la persona inicia sesión y recibe los avisos.',
        'El rol define qué ve y qué puede hacer (estudiante, funcionario, supervisor o administrador).',
        'La contraseña inicial debe tener mínimo 8 caracteres con letras y números. Pídele a la persona que la cambie en «Mi cuenta».',
      ],
    },
  },
  categorias: {
    ADMINISTRADOR: { texto: 'Las categorías son las opciones que ve el estudiante al registrar una solicitud. Puedes renombrarlas, describirlas, desactivarlas (dejan de ofrecerse, pero las solicitudes existentes no cambian) o crear nuevas a la derecha.' },
  },
  reportes: {
    ADMINISTRADOR: { texto: 'Filtra por fechas, estado, categoría o responsable y pulsa «Generar». Las gráficas y la tabla se actualizan, y «Exportar CSV» descarga exactamente lo filtrado.' },
    SUPERVISOR: { texto: 'Filtra por fechas, estado, categoría o responsable y pulsa «Generar». Las gráficas y la tabla se actualizan, y «Exportar CSV» descarga exactamente lo filtrado.' },
  },
  notificaciones: {
    ESTUDIANTE: { texto: 'Cada vez que tu solicitud cambia de estado aparece un aviso aquí. «Ver solicitud» la abre y deja el aviso como leído. Con el sistema abierto, suena una campanita cuando llega un aviso nuevo; el botón del parlante, junto a la campana, la silencia.' },
    FUNCIONARIO: { texto: 'Te avisamos cuando te asignan una solicitud, cuando se reabre una tuya o cuando cambia algo que te involucra. «Ver solicitud» la abre y deja el aviso como leído. Con el sistema abierto, suena una campanita cuando llega un aviso nuevo; el botón del parlante, junto a la campana, la silencia.' },
    ADMINISTRADOR: { texto: 'Te avisamos cuando un estudiante registra una solicitud nueva y queda por asignar. «Ver solicitud» la abre y deja el aviso como leído. Con el sistema abierto, suena una campanita cuando llega un aviso nuevo; el botón del parlante, junto a la campana, la silencia.' },
    SUPERVISOR: { texto: 'Aquí llegan los avisos que te corresponden. «Ver solicitud» abre la solicitud y deja el aviso como leído. Con el sistema abierto, suena una campanita cuando llega un aviso nuevo; el botón del parlante, junto a la campana, la silencia.' },
  },
};

const BIENVENIDA = {
  titulo: 'Bienvenido(a) a UniSolicita',
  texto: 'Te mostramos en un minuto cómo moverte por el sistema. Puedes salir cuando quieras y repetir este recorrido desde «Ayuda».',
};

/** Recorrido guiado del panel. Un paso sin selector es un mensaje centrado. */
const TOUR = {
  ESTUDIANTE: [
    { selector: '.hero .acciones', titulo: 'Tu panel', texto: 'Desde aquí registras una solicitud nueva o entras a la lista de las que ya hiciste.' },
    { selector: '.estrella-caja', titulo: 'Solicitudes abiertas', texto: 'Cuántas de tus solicitudes siguen en trámite.' },
    { selector: '.menu a[href="/solicitudes/nueva"]', titulo: 'Nueva solicitud', texto: 'Aquí empiezas un trámite: eliges la categoría, la prioridad y cuentas qué necesitas.' },
    { selector: '.menu a[href="/solicitudes"]', titulo: 'Mis solicitudes', texto: 'Todas tus solicitudes con su estado. Al abrir una ves su historial completo.' },
    { selector: '.contadores', titulo: 'Resumen por estado', texto: 'Cada cuadro cuenta tus solicitudes en ese estado. Púlsalo para filtrar la lista.' },
    { selector: '.menu a[href="/notificaciones"]', titulo: 'Avisos', texto: 'Cada vez que una solicitud cambia de estado te avisamos aquí, y por correo si está activado.' },
    { selector: '.sesion', titulo: 'Tu cuenta', texto: 'Pulsa tu nombre para cambiar tu contraseña. Cuando termines, usa «Salir».' },
    { selector: '.menu a[href="/ayuda"]', titulo: 'Ayuda', texto: 'La guía completa siempre está aquí: pasos, significado de cada estado y preguntas frecuentes.' },
  ],
  FUNCIONARIO: [
    { selector: '.estrella-caja', titulo: 'Solicitudes abiertas', texto: 'Cuántas de las solicitudes que te asignaron siguen sin cerrar.' },
    { selector: '.rapidas', titulo: 'Accesos rápidos', texto: '«Por iniciar» son las que te asignaron y aún no empiezas; «En proceso» las que atiendes ahora.' },
    { selector: '.menu a[href="/solicitudes"]', titulo: 'Mis asignadas', texto: 'Solo ves las solicitudes que el administrador te asignó. Ábrelas para iniciar la atención, dejar observaciones y resolver.' },
    { selector: '.contadores', titulo: 'Resumen por estado', texto: 'Tu carga de trabajo por estado. Púlsalo para filtrar la lista.' },
    { selector: '.menu a[href="/notificaciones"]', titulo: 'Avisos', texto: 'Te avisamos cuando te asignan una solicitud o cuando una cerrada se reabre.' },
    { selector: '.sesion', titulo: 'Tu cuenta', texto: 'Pulsa tu nombre para cambiar tu contraseña. Cuando termines, usa «Salir».' },
    { selector: '.menu a[href="/ayuda"]', titulo: 'Ayuda', texto: 'Aquí está el paso a paso para atender, resolver y cerrar solicitudes.' },
  ],
  ADMINISTRADOR: [
    { selector: '.estrella-caja', titulo: 'Solicitudes abiertas', texto: 'Todas las solicitudes del sistema que siguen en trámite.' },
    { selector: '.rapidas', titulo: 'Lo primero del día', texto: '«Por asignar» cuenta las solicitudes nuevas que esperan responsable. Revísalas primero.' },
    { selector: '.menu a[href="/solicitudes"]', titulo: 'Solicitudes', texto: 'Todas las solicitudes. Abre una y, en «Acciones», podrás asignarla o reasignarla, rechazarla (cancelarla con motivo), cerrarla o reabrirla.' },
    { selector: '.menu a[href="/usuarios"]', titulo: 'Usuarios', texto: 'Crea cuentas, cambia roles y desactiva a quien ya no deba entrar. Nadie se borra.' },
    { selector: '.menu a[href="/categorias"]', titulo: 'Categorías', texto: 'Las opciones que ve el estudiante al registrar una solicitud.' },
    { selector: '.menu a[href="/reportes"]', titulo: 'Reportes', texto: 'Gráficas y tablas con filtros, y exportación a CSV.' },
    { selector: '.contadores', titulo: 'Resumen por estado', texto: 'Cuántas solicitudes hay en cada estado. Púlsalo para filtrar la lista.' },
    { selector: '.menu a[href="/notificaciones"]', titulo: 'Avisos', texto: 'Te avisamos cuando llega una solicitud nueva por asignar.' },
    { selector: '.sesion', titulo: 'Tu cuenta', texto: 'Pulsa tu nombre para cambiar tu contraseña. Cuando termines, usa «Salir».' },
    { selector: '.menu a[href="/ayuda"]', titulo: 'Ayuda', texto: 'Pasos para asignar, reasignar, rechazar, cerrar y reabrir solicitudes, crear usuarios, ordenar categorías y sacar reportes.' },
  ],
  SUPERVISOR: [
    { selector: '.estrella-caja', titulo: 'Solicitudes abiertas', texto: 'Cuántas solicitudes siguen en trámite en todo el sistema.' },
    { selector: '.menu a[href="/solicitudes"]', titulo: 'Solicitudes', texto: 'Consulta cualquier solicitud y su historial. Es solo lectura.' },
    { selector: '.menu a[href="/reportes"]', titulo: 'Reportes', texto: 'Tu herramienta principal: gráficas, tiempos de resolución, carga por responsable y exportación a CSV.' },
    { selector: '.contadores', titulo: 'Resumen por estado', texto: 'Cuántas solicitudes hay en cada estado. Púlsalo para filtrar la lista.' },
    { selector: '.menu a[href="/notificaciones"]', titulo: 'Avisos', texto: 'Aquí llegan los avisos que te corresponden.' },
    { selector: '.sesion', titulo: 'Tu cuenta', texto: 'Pulsa tu nombre para cambiar tu contraseña. Cuando termines, usa «Salir».' },
    { selector: '.menu a[href="/ayuda"]', titulo: 'Ayuda', texto: 'Guía completa de lo que puedes hacer y cómo leer los reportes.' },
  ],
};

function guiaDeRol(rol) {
  return GUIA[rol] || GUIA.ESTUDIANTE;
}

function ayudaPagina(rol, pagina) {
  return (AYUDA_PAGINA[pagina] || {})[rol] || null;
}

function ayudaEstado(rol, estado) {
  if (rol === 'SUPERVISOR') return AYUDA_SUPERVISOR;
  return (AYUDA_ESTADO[rol] || {})[estado] || null;
}

function pasosTour(rol) {
  return [{ ...BIENVENIDA }, ...(TOUR[rol] || [])];
}

module.exports = { ROLES, GUIA, ESTADOS_GUIA, guiaDeRol, ayudaPagina, ayudaEstado, pasosTour };
